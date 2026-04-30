import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  STRIPE_API_VERSION,
  type BillingInterval,
  type SupportedPlan,
  getBasePriceKey,
  isSupportedPlan,
} from "../_shared/stripe-plans.ts";
import { findPriceByKey } from "../_shared/stripe-subscriptions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plan, interval } = await req.json();

    if (!isSupportedPlan(plan)) throw new Error("Invalid plan");
    if (!["monthly", "yearly"].includes(interval)) throw new Error("Invalid interval");

    const targetPlan = plan as SupportedPlan;
    const targetInterval = interval as BillingInterval;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, plan_name, billing_interval")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id || !sub?.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: STRIPE_API_VERSION });

    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    if (!["active", "trialing"].includes(currentSub.status)) {
      throw new Error("Subscription not active");
    }

    const baseItem = currentSub.items.data.find(
      (item) => (item.price?.metadata as Record<string, string>)?.lf_kind === "plan_base"
    );
    if (!baseItem) {
      throw new Error("No base subscription item found");
    }

    // Always use EUR prices (our base currency)
    const targetPrice = await findPriceByKey(stripe, getBasePriceKey(targetPlan, targetInterval), "eur");

    // If already on target plan+interval, no proration needed
    if (baseItem.price?.id === targetPrice.id) {
      return new Response(JSON.stringify({
        alreadyOnPlan: true,
        amountDue: 0,
        credit: 0,
        currency: "eur",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Preview the upcoming invoice with the plan change
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: sub.stripe_customer_id,
      subscription: sub.stripe_subscription_id,
      subscription_items: [
        {
          id: baseItem.id,
          price: targetPrice.id,
          quantity: 1,
        },
      ],
      subscription_proration_behavior: "create_prorations",
    });

    // Calculate ONLY proration amounts (what they pay TODAY for the upgrade)
    // Exclude the next period's regular charge
    let prorationCredit = 0;
    let prorationCharge = 0;

    for (const line of upcomingInvoice.lines.data) {
      if (line.proration) {
        if (line.amount < 0) {
          prorationCredit += Math.abs(line.amount);
        } else {
          prorationCharge += line.amount;
        }
      }
    }

    // Net amount due TODAY for the upgrade (proration only)
    const upgradeAmountDue = Math.max(0, prorationCharge - prorationCredit);

    return new Response(JSON.stringify({
      alreadyOnPlan: false,
      amountDue: upgradeAmountDue,
      credit: prorationCredit,
      prorationCharge,
      fullPlanPrice: targetPrice.unit_amount ?? 0,
      currency: "eur",
      currentPlan: sub.plan_name,
      currentInterval: sub.billing_interval,
      targetPlan,
      targetInterval,
      periodEnd: currentSub.current_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("preview-upgrade error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

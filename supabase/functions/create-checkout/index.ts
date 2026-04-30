import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { findPriceByKey } from "../_shared/stripe-subscriptions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { productKey: string; leadsIncluded: number; overageCents: number; funnels: number; workspaces: number; seats: number }> = {
  starter: { productKey: "plan_starter", leadsIncluded: 200,  overageCents: 50, funnels: 2,  workspaces: 1,  seats: 1 },
  grow:    { productKey: "plan_grow",    leadsIncluded: 500,  overageCents: 35, funnels: 10, workspaces: 3,  seats: 3 },
  scale:   { productKey: "plan_scale",   leadsIncluded: 1000, overageCents: 20, funnels: 50, workspaces: 10, seats: 10 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const { plan, interval } = await req.json();
    const planDef = PLANS[plan];
    if (!planDef) throw new Error("Invalid plan: " + plan);
    if (plan !== "starter") throw new Error("New subscriptions must start on starter");
    if (interval !== "monthly" && interval !== "yearly") throw new Error("Invalid interval");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });

    // Get/create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      // Keep customer metadata in sync for robust webhook reconciliation.
      await stripe.customers.update(customerId, {
        metadata: {
          ...(customers.data[0].metadata ?? {}),
          user_id: user.id,
        },
      });
    } else {
      customerId = (await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })).id;
    }

    // Resolve precreated base price (overage attached by webhook based on final interval)
    const baseKey = `${plan}_base_${interval}`;
    const basePrice = await findPriceByKey(stripe, baseKey, "eur");
    const basePriceId = basePrice.id;

    const headerOrigin = req.headers.get("x-app-origin")
      || req.headers.get("origin")
      || req.headers.get("referer")
      || "http://localhost:3000";
    const origin = headerOrigin.replace(/\/$/, "");

    // Single subscription, single visible line item (base).
    // The metered overage price is attached server-side after the subscription
    // is created (see stripe-webhook → checkout.session.completed) so the
    // checkout page shows just one clean line: "LeadFlow Starter — 49€/mes".
    const session = await stripe.checkout.sessions.create({
      adaptive_pricing: { enabled: true },
      customer: customerId,
      customer_update: { name: "auto", address: "auto" },
      line_items: [
        { price: basePriceId, quantity: 1 },
      ],
      mode: "subscription",
      // Collect first/last name + billing address (required for VAT calculation)
      billing_address_collection: "required",
      // Allow customers to enter their company VAT number
      tax_id_collection: { enabled: true },
      // Stripe automatically calculates VAT based on the customer location.
      // Because all prices have tax_behavior=inclusive, the displayed amount
      // already includes VAT — Stripe just splits subtotal/tax on the invoice.
      automatic_tax: { enabled: true },
      custom_text: {
        submit: {
          message: `Incluye ${planDef.leadsIncluded.toLocaleString("es-ES")} leads/mes. Cada lead extra: ${(planDef.overageCents / 100).toLocaleString("es-ES", { minimumFractionDigits: 2 })} EUR (facturado al final del ciclo). IVA incluido.`,
        },
      },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan_name: plan,
        plan_limits: JSON.stringify({
          funnels: planDef.funnels,
          workspaces: planDef.workspaces,
          seats: planDef.seats,
          leads: planDef.leadsIncluded,
        }),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_name: plan,
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

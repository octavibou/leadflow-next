import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  STRIPE_API_VERSION,
  type BillingInterval,
  SUPPORTED_PLANS,
  type SupportedPlan,
  getBasePriceKey,
  isSupportedPlan,
} from "../_shared/stripe-plans.ts";
import {
  clearPendingPortalUpgrade,
  ensureMeteredItemMatchesBasePlan,
  findPriceByKey,
  prepareSubscriptionForPortalUpgrade,
} from "../_shared/stripe-subscriptions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function createUpgradePortalConfiguration(
  stripe: Stripe,
  interval: BillingInterval,
  selectedPlan: SupportedPlan,
): Promise<string> {
  const orderedPlans: SupportedPlan[] = [
    selectedPlan,
    ...SUPPORTED_PLANS.filter((plan): plan is SupportedPlan => plan !== selectedPlan),
  ];

  const products = await Promise.all(
    orderedPlans.map(async (plan) => {
      const basePrice = await findPriceByKey(stripe, getBasePriceKey(plan, interval));
      const productId = typeof basePrice.product === "string"
        ? basePrice.product
        : basePrice.product.id;

      return {
        product: productId,
        prices: [basePrice.id],
      };
    }),
  );

  const configuration = await stripe.billingPortal.configurations.create({
    name: `LeadFlow upgrade ${interval} ${Date.now()}`,
    metadata: {
      lf_kind: "subscription_upgrade",
      lf_interval: interval,
      lf_selected_plan: selectedPlan,
    },
    features: {
      payment_method_update: {
        enabled: true,
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "always_invoice",
        billing_cycle_anchor: "unchanged",
        trial_update_behavior: "continue_trial",
        products,
      },
    },
  });

  return configuration.id;
}

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
    if (!isSupportedPlan(plan)) throw new Error("Invalid plan");
    if (!["monthly", "yearly"].includes(interval)) throw new Error("Invalid interval");

    const selectedPlan = plan;
    const billingInterval = interval as BillingInterval;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id || !sub?.stripe_customer_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: STRIPE_API_VERSION });
    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

    const UPDATABLE = ["active", "trialing", "past_due"];
    if (!UPDATABLE.includes(currentSub.status)) {
      return new Response(JSON.stringify({
        error: `Subscription status "${currentSub.status}" cannot be updated. Please create a new subscription.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://leadflow.es";
    const returnUrl = `${origin.replace(/\/$/, "")}/profile`;
    let preparedSub: Stripe.Subscription | null = null;

    try {
      preparedSub = await prepareSubscriptionForPortalUpgrade(stripe, currentSub, {
        plan: selectedPlan,
        interval: billingInterval,
      });

      if ((preparedSub.items.data?.length ?? 0) !== 1) {
        throw new Error("La suscripción sigue teniendo varios conceptos y Stripe no puede abrir el cambio de plan.");
      }

      const baseItem = preparedSub.items.data[0];
      const targetPrice = await findPriceByKey(stripe, getBasePriceKey(selectedPlan, billingInterval));

      const configurationId = await createUpgradePortalConfiguration(stripe, billingInterval, selectedPlan);

      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        configuration: configurationId,
        return_url: returnUrl,
        flow_data: {
          type: "subscription_update_confirm",
          after_completion: {
            type: "redirect",
            redirect: { return_url: returnUrl },
          },
          subscription_update_confirm: {
            subscription: preparedSub.id,
            items: [
              {
                id: baseItem.id,
                price: targetPrice.id,
                quantity: 1,
              },
            ],
          },
        },
      });

      return new Response(JSON.stringify({
        ok: true,
        plan: selectedPlan,
        interval: billingInterval,
        portalUrl: portal.url,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (portalError) {
      if (preparedSub) {
        try {
          let restoredSubscription = await stripe.subscriptions.retrieve(preparedSub.id);
          restoredSubscription = await ensureMeteredItemMatchesBasePlan(stripe, restoredSubscription);
          await clearPendingPortalUpgrade(stripe, restoredSubscription);
        } catch (restoreError) {
          console.error("Failed to restore subscription after portal error:", restoreError);
        }
      }
      throw portalError;
    }
  } catch (error: any) {
    console.error("update-subscription error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

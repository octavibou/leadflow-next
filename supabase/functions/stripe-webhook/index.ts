import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  STRIPE_API_VERSION,
  getPlanLimits,
  isSupportedPlan,
} from "../_shared/stripe-plans.ts";
import {
  clearPendingPortalUpgrade,
  detectPlanFromSubscription,
  doesSubscriptionMatchPendingTarget,
  ensureMeteredItemMatchesBasePlan,
  getItemMetadata,
  getPendingPortalUpgrade,
} from "../_shared/stripe-subscriptions.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: STRIPE_API_VERSION });

const LEGACY_PLAN_DEFAULTS: Record<string, { funnels: number; workspaces: number; seats: number; leads: number }> = {
  start:  { funnels: 2, workspaces: 1, seats: 1, leads: 100 },
  expand: { funnels: 20, workspaces: 3, seats: 3, leads: 1000 },
};

function getPlanLimitsFor(plan: string) {
  if (isSupportedPlan(plan)) {
    return getPlanLimits(plan);
  }

  return LEGACY_PLAN_DEFAULTS[plan] ?? getPlanLimits("starter");
}

function buildSubscriptionSyncPayload(
  subscription: Stripe.Subscription,
  planLimitsOverride?: { funnels: number; workspaces: number; seats: number; leads: number },
) {
  const { interval, meteredItemId, plan } = detectPlanFromSubscription(subscription);

  return {
    billing_interval: interval,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    metered_subscription_item_id: meteredItemId,
    period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    plan_limits: planLimitsOverride ?? getPlanLimitsFor(plan),
    plan_name: plan,
    status: subscription.status,
  };
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!userId) break;

        let subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Attach metered overage price (kept hidden during checkout for a
        // clean single-line UX). Idempotent: only adds if not already present.
        const meteredPriceToAttach = session.metadata?.attach_metered_price
          ?? (subscription.metadata as Record<string, string> | undefined)?.attach_metered_price;
        const alreadyHasMetered = subscription.items.data.some(
          (it) => (it.price.metadata as Record<string, string> | null)?.lf_kind === "plan_overage"
        );
        if (meteredPriceToAttach && !alreadyHasMetered) {
          await stripe.subscriptionItems.create({
            subscription: subscriptionId,
            price: meteredPriceToAttach,
            proration_behavior: "none",
          });
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        subscription = await ensureMeteredItemMatchesBasePlan(stripe, subscription);
        const planLimits = session.metadata?.plan_limits
          ? JSON.parse(session.metadata.plan_limits)
          : undefined;

        await supabaseAdmin.from("subscriptions").upsert({
          ...buildSubscriptionSyncPayload(subscription, planLimits),
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          currency: "eur",
          leads_used_current_period: 0,
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.updated": {
        let subscription = event.data.object as Stripe.Subscription;
        const pendingUpgrade = getPendingPortalUpgrade(subscription);

        if (!pendingUpgrade || doesSubscriptionMatchPendingTarget(subscription, pendingUpgrade)) {
          subscription = await ensureMeteredItemMatchesBasePlan(stripe, subscription);

          if (pendingUpgrade) {
            subscription = await clearPendingPortalUpgrade(stripe, subscription);
          }
        }

        await supabaseAdmin.from("subscriptions").update({
          ...buildSubscriptionSyncPayload(subscription),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        // Reset metered counter at start of new period
        const periodStart = invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : new Date().toISOString();

        await supabaseAdmin.rpc("reset_leads_usage_for_subscription", {
          _stripe_subscription_id: subscriptionId,
          _period_start: periodStart,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from("subscriptions")
          .update({ status: "canceled", metered_subscription_item_id: null })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), { status: 500 });
  }
});

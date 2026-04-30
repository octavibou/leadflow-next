import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  STRIPE_API_VERSION,
  getPlanLimits,
  isSupportedPlan,
  getOveragePriceKey,
  type SupportedPlan,
  type BillingInterval,
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

function readPresentmentDetails(
  source: any,
): { presentmentCurrency: string | null; presentmentAmount: number | null } {
  const details = source?.presentment_details;
  const presentmentCurrency = typeof details?.presentment_currency === "string"
    ? details.presentment_currency.toLowerCase()
    : null;
  const presentmentAmount = typeof details?.presentment_amount === "number"
    ? details.presentment_amount
    : null;

  return { presentmentCurrency, presentmentAmount };
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
    currency: subscription.currency,
  };
}

async function findUserIdByCustomer(
  stripe: Stripe,
  supabaseAdmin: ReturnType<typeof createClient>,
  customerId: string,
): Promise<string | null> {
  const bySubscription = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (bySubscription.data?.user_id) return bySubscription.data.user_id as string;

  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return null;

  const customerMetaUserId = (customer.metadata?.user_id ?? "").trim();
  if (customerMetaUserId) return customerMetaUserId;

  const email = customer.email?.toLowerCase().trim();
  if (!email) return null;

  // Fallback for legacy customers without metadata.
  const users = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const matched = users.data.users.find((u) => (u.email ?? "").toLowerCase().trim() === email);
  return matched?.id ?? null;
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
        const presentment = readPresentmentDetails(session as any);

        let userId = session.metadata?.user_id ?? null;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!userId && customerId) {
          userId = await findUserIdByCustomer(stripe, supabaseAdmin, customerId);
        }
        if (!userId) {
          console.error("Unable to resolve user_id for checkout.session.completed", {
            customerId,
            subscriptionId,
            metadataUserId: session.metadata?.user_id ?? null,
          });
          break;
        }

        let subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Attach metered overage price matching the subscription's interval
        // (user may have toggled to yearly via upsell in checkout)
        const alreadyHasMetered = subscription.items.data.some(
          (it) => (it.price.metadata as Record<string, string> | null)?.lf_kind === "plan_overage"
        );
        if (!alreadyHasMetered) {
          const { plan, interval } = detectPlanFromSubscription(subscription);
          if (isSupportedPlan(plan)) {
            const overageKey = getOveragePriceKey(plan as SupportedPlan, interval as BillingInterval);
            const overageSearch = await stripe.prices.search({
              query: `metadata['lf_price_key']:'${overageKey}' AND currency:'eur' AND active:'true'`,
              limit: 1,
            });
            if (overageSearch.data.length > 0) {
              await stripe.subscriptionItems.create({
                subscription: subscriptionId,
                price: overageSearch.data[0].id,
                proration_behavior: "none",
              });
              subscription = await stripe.subscriptions.retrieve(subscriptionId);
            }
          }
        }

        try {
          subscription = await ensureMeteredItemMatchesBasePlan(stripe, subscription);
        } catch (err) {
          console.error("Metered item sync failed on checkout.session.completed:", err);
          // Do not block subscription activation if overage wiring fails.
          // Access must be granted when payment succeeded.
        }
        const planLimits = session.metadata?.plan_limits
          ? JSON.parse(session.metadata.plan_limits)
          : undefined;

        await supabaseAdmin.from("subscriptions").upsert({
          ...buildSubscriptionSyncPayload(subscription, planLimits),
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          currency: subscription.currency ?? "eur",
          presentment_currency: presentment.presentmentCurrency,
          presentment_amount: presentment.presentmentAmount,
          leads_used_current_period: 0,
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const presentment = readPresentmentDetails(subscription as any);
        await supabaseAdmin.from("subscriptions").update({
          currency: subscription.currency ?? "eur",
          presentment_currency: presentment.presentmentCurrency,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.updated": {
        let subscription = event.data.object as Stripe.Subscription;
        const pendingUpgrade = getPendingPortalUpgrade(subscription);

        if (!pendingUpgrade || doesSubscriptionMatchPendingTarget(subscription, pendingUpgrade)) {
          try {
            subscription = await ensureMeteredItemMatchesBasePlan(stripe, subscription);
          } catch (err) {
            console.error("Metered item sync failed on customer.subscription.updated:", err);
          }

          if (pendingUpgrade) {
            subscription = await clearPendingPortalUpgrade(stripe, subscription);
          }
        }

        await supabaseAdmin.from("subscriptions").update({
          ...buildSubscriptionSyncPayload(subscription),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = typeof paymentIntent.invoice === "string" ? paymentIntent.invoice : null;
        if (!invoiceId) break;

        const invoice = await stripe.invoices.retrieve(invoiceId);
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
        if (!subscriptionId) break;

        const presentment = readPresentmentDetails(paymentIntent as any);
        await supabaseAdmin.from("subscriptions").update({
          presentment_currency: presentment.presentmentCurrency,
          presentment_amount: presentment.presentmentAmount,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscriptionId);
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

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await supabaseAdmin.from("subscriptions")
          .update({ status: "canceled", metered_subscription_item_id: null })
          .eq("stripe_customer_id", customer.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    const message = error?.message ?? "Unknown webhook error";
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        error: "Webhook handler failed",
        reason: message,
      }),
      { status: 500 }
    );
  }
});

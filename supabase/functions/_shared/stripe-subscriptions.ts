import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  type BillingInterval,
  PORTAL_PENDING_UPGRADE_TTL_MS,
  type SupportedPlan,
  getOveragePriceKey,
  isSupportedPlan,
} from "./stripe-plans.ts";

export type PendingPortalUpgrade = {
  interval: BillingInterval;
  plan: SupportedPlan;
  startedAtMs: number | null;
};

export async function findPriceByKey(stripe: Stripe, key: string): Promise<Stripe.Price> {
  const search = await stripe.prices.search({
    query: `metadata['lf_price_key']:'${key}' AND active:'true'`,
    limit: 1,
  });

  if (search.data.length === 0) {
    throw new Error(`Price ${key} not found.`);
  }

  return search.data[0];
}

export function getItemMetadata(item: Stripe.SubscriptionItem): Record<string, string> {
  return (item.price?.metadata as Record<string, string> | null) ?? {};
}

export function detectPlanFromSubscription(subscription: Stripe.Subscription): {
  interval: BillingInterval;
  meteredItemId: string | null;
  plan: string;
} {
  let plan = "starter";
  let interval: BillingInterval = "monthly";
  let meteredItemId: string | null = null;

  for (const item of subscription.items?.data ?? []) {
    const metadata = getItemMetadata(item);

    if (metadata.lf_kind === "plan_base" && metadata.lf_plan) {
      plan = metadata.lf_plan;
      interval = metadata.lf_interval === "yearly" ? "yearly" : "monthly";
    }

    if (metadata.lf_kind === "plan_overage") {
      meteredItemId = item.id;
    }
  }

  return { plan, interval, meteredItemId };
}

export async function ensureMeteredItemMatchesBasePlan(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  const baseItem = subscription.items?.data.find((item) => getItemMetadata(item).lf_kind === "plan_base");
  if (!baseItem) return subscription;

  const desiredPlan = getItemMetadata(baseItem).lf_plan;
  if (!desiredPlan || !isSupportedPlan(desiredPlan)) return subscription;

  const desiredMeteredPrice = await findPriceByKey(stripe, getOveragePriceKey(desiredPlan));
  const meteredItem = subscription.items?.data.find((item) => getItemMetadata(item).lf_kind === "plan_overage");

  if (meteredItem?.price?.id === desiredMeteredPrice.id) {
    return subscription;
  }

  if (meteredItem) {
    await stripe.subscriptionItems.update(meteredItem.id, {
      price: desiredMeteredPrice.id,
      proration_behavior: "none",
    });
  } else {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: desiredMeteredPrice.id,
      proration_behavior: "none",
    });
  }

  return await stripe.subscriptions.retrieve(subscription.id);
}

export async function prepareSubscriptionForPortalUpgrade(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  pendingTarget: { interval: BillingInterval; plan: SupportedPlan },
): Promise<Stripe.Subscription> {
  const overageItems = subscription.items?.data.filter((item) => getItemMetadata(item).lf_kind === "plan_overage") ?? [];
  const metadata = {
    ...(subscription.metadata ?? {}),
    lf_portal_upgrade_pending: "true",
    lf_pending_upgrade_plan: pendingTarget.plan,
    lf_pending_upgrade_interval: pendingTarget.interval,
    lf_pending_upgrade_started_at: String(Date.now()),
  };

  const params: Stripe.SubscriptionUpdateParams = { metadata };

  if (overageItems.length > 0) {
    params.items = overageItems.map((item) => ({
      id: item.id,
      deleted: true,
      clear_usage: true,
    }));
    params.proration_behavior = "none";
  }

  return await stripe.subscriptions.update(subscription.id, params);
}

export async function clearPendingPortalUpgrade(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscription.id, {
    metadata: {
      ...(subscription.metadata ?? {}),
      lf_portal_upgrade_pending: "",
      lf_pending_upgrade_plan: "",
      lf_pending_upgrade_interval: "",
      lf_pending_upgrade_started_at: "",
    },
  });
}

export function getPendingPortalUpgrade(subscription: Stripe.Subscription): PendingPortalUpgrade | null {
  const metadata = subscription.metadata ?? {};
  const plan = metadata.lf_pending_upgrade_plan;
  const interval = metadata.lf_pending_upgrade_interval;

  if (metadata.lf_portal_upgrade_pending !== "true") return null;
  if (!plan || !interval) return null;
  if (!isSupportedPlan(plan)) return null;
  if (interval !== "monthly" && interval !== "yearly") return null;

  const parsed = Number(metadata.lf_pending_upgrade_started_at ?? "");

  return {
    plan,
    interval,
    startedAtMs: Number.isFinite(parsed) ? parsed : null,
  };
}

export function doesSubscriptionMatchPendingTarget(
  subscription: Stripe.Subscription,
  pendingUpgrade: PendingPortalUpgrade,
): boolean {
  const { interval, plan } = detectPlanFromSubscription(subscription);
  return plan === pendingUpgrade.plan && interval === pendingUpgrade.interval;
}

export function isPendingPortalUpgradeFresh(pendingUpgrade: PendingPortalUpgrade, now = Date.now()): boolean {
  if (pendingUpgrade.startedAtMs === null) return false;
  return now - pendingUpgrade.startedAtMs < PORTAL_PENDING_UPGRADE_TTL_MS;
}
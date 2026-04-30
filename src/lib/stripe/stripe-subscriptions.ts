import Stripe from "stripe";
import {
  type BillingInterval,
  PORTAL_PENDING_UPGRADE_TTL_MS,
  STRIPE_CATALOG_NAMESPACE,
  type SupportedPlan,
  getOveragePriceKey,
  getExpectedProductKeyForLfPriceKey,
  isSupportedPlan,
} from "./stripe-plans";

export type PendingPortalUpgrade = {
  interval: BillingInterval;
  plan: SupportedPlan;
  startedAtMs: number | null;
};

const STARTER_CANONICAL_PRODUCT_ID = "prod_ULdxdZCd3IOivd";

export async function findPriceByKey(stripe: Stripe, key: string, currency?: string): Promise<Stripe.Price> {
  const currencyFilter = currency ? ` AND currency:'${currency.toLowerCase()}'` : "";
  const isStarterBasePriceKey = key.startsWith("starter_base_");
  const starterProductFilter = isStarterBasePriceKey ? ` AND product:'${STARTER_CANONICAL_PRODUCT_ID}'` : "";
  const search = await stripe.prices.search({
    query: `metadata['lf_price_key']:'${key}'${currencyFilter}${starterProductFilter} AND active:'true'`,
    limit: 20,
  });

  if (search.data.length === 0) {
    if (isStarterBasePriceKey) {
      throw new Error(
        `Price ${key} not found on starter canonical product ${STARTER_CANONICAL_PRODUCT_ID}. ` +
          `Desarchiva ese precio en ese producto para usar siempre el mismo checkout.`,
      );
    }
    throw new Error(`Price ${key} not found.`);
  }

  if (isStarterBasePriceKey) {
    return search.data[0];
  }

  const expectedProduct = getExpectedProductKeyForLfPriceKey(key);
  if (!expectedProduct) {
    return search.data[0];
  }

  const withProduct = await Promise.all(
    search.data.map(async (p) => {
      return await stripe.prices.retrieve(p.id, { expand: ["product"] });
    }),
  );

  const catalogMatches = withProduct.filter((p) => {
    const product = p.product as Stripe.Product;
    const meta = product?.metadata ?? {};
    return (
      meta.lf_namespace === STRIPE_CATALOG_NAMESPACE &&
      meta.lf_product === expectedProduct
    );
  });

  if (catalogMatches.length > 0) {
    return catalogMatches[0];
  }

  throw new Error(
    `No active price for "${key}" on catalog product (lf_namespace=${STRIPE_CATALOG_NAMESPACE}, lf_product=${expectedProduct}). ` +
      `Unarchive the price on the correct product, or remove duplicate active prices. Found ${search.data.length} price(s) with this lf_price_key, none on the catalog product.`,
  );
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

  const baseMetadata = getItemMetadata(baseItem);
  const desiredPlan = baseMetadata.lf_plan;
  const desiredInterval: BillingInterval = baseMetadata.lf_interval === "yearly" ? "yearly" : "monthly";
  if (!desiredPlan || !isSupportedPlan(desiredPlan)) return subscription;

  const desiredMeteredPrice = await findPriceByKey(stripe, getOveragePriceKey(desiredPlan, desiredInterval), "eur");
  const overageItems = subscription.items?.data.filter((item) => getItemMetadata(item).lf_kind === "plan_overage") ?? [];

  const matchingItem = overageItems.find((item) => item.price?.id === desiredMeteredPrice.id) ?? null;

  if (matchingItem) {
    const extras = overageItems.filter((item) => item.id !== matchingItem.id);
    for (const extra of extras) {
      await stripe.subscriptionItems.del(extra.id, { clear_usage: true });
    }
    return await stripe.subscriptions.retrieve(subscription.id);
  }

  if (overageItems.length > 0) {
    const [primary, ...extras] = overageItems;
    await stripe.subscriptionItems.update(primary.id, {
      price: desiredMeteredPrice.id,
      proration_behavior: "none",
    });
    for (const extra of extras) {
      await stripe.subscriptionItems.del(extra.id, { clear_usage: true });
    }
  } else {
    await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: desiredMeteredPrice.id,
      proration_behavior: "none",
    });
  }

  return await stripe.subscriptions.retrieve(subscription.id);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  STRIPE_API_VERSION,
  STRIPE_CATALOG_NAMESPACE,
  LEGACY_CATALOG_NAMESPACE_PREFIX,
  EUR_TO_USD_RATE,
  SUPPORTED_PLANS,
  type SupportedPlan,
  buildBaseDescription,
  buildOverageDescription,
  getBasePriceKey,
  getOveragePriceKey,
  getPlanConfig,
} from "../_shared/stripe-plans.ts";

function eurToUsdCents(eurCents: number): number {
  return Math.round(eurCents * EUR_TO_USD_RATE);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PRICE_KEYS = new Set(
  SUPPORTED_PLANS.flatMap((plan) => [
    getBasePriceKey(plan, "monthly"),
    getBasePriceKey(plan, "yearly"),
    getOveragePriceKey(plan, "monthly"),
    getOveragePriceKey(plan, "yearly"),
    // Legacy keys (without interval suffix)
    `${plan}_overage`,
  ]),
);

function isCatalogPrice(price: Stripe.Price): boolean {
  const metadata = price.metadata ?? {};
  const namespace = metadata.lf_namespace ?? "";
  const priceKey = metadata.lf_price_key ?? "";

  return VALID_PRICE_KEYS.has(priceKey) || namespace.startsWith(LEGACY_CATALOG_NAMESPACE_PREFIX);
}

function getPlanFromPrice(price: Stripe.Price): SupportedPlan | null {
  const metadata = price.metadata ?? {};

  if (metadata.lf_plan && SUPPORTED_PLANS.includes(metadata.lf_plan as SupportedPlan)) {
    return metadata.lf_plan as SupportedPlan;
  }

  for (const plan of SUPPORTED_PLANS) {
    if ((metadata.lf_price_key ?? "").startsWith(`${plan}_`)) {
      return plan;
    }
  }

  return null;
}

async function listActivePricesForProduct(stripe: Stripe, productId: string): Promise<Stripe.Price[]> {
  const prices: Stripe.Price[] = [];
  let cursor: string | undefined;

  while (true) {
    const page = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
      starting_after: cursor,
    });

    prices.push(...page.data);

    if (!page.has_more) break;
    cursor = page.data[page.data.length - 1]?.id;
  }

  return prices;
}

async function archivePrice(stripe: Stripe, priceId: string): Promise<boolean> {
  try {
    await stripe.prices.update(priceId, { active: false });
    return true;
  } catch {
    return false;
  }
}

async function detachDefaultPrice(stripe: Stripe, product: Stripe.Product): Promise<void> {
  if (!product.default_price) return;

  try {
    await stripe.products.update(product.id, { default_price: "" } as never);
  } catch {
    // ignore cleanup failures here
  }
}

async function findOrCreateOveragePrice(
  stripe: Stripe,
  productId: string,
  plan: SupportedPlan,
  interval: "monthly" | "yearly",
): Promise<string> {
  const config = getPlanConfig(plan);
  const priceKey = getOveragePriceKey(plan, interval);
  
  const search = await stripe.prices.search({
    query: `product:'${productId}' AND metadata['lf_price_key']:'${priceKey}' AND active:'true'`,
    limit: 1,
  });

  if (search.data.length > 0) {
    const existingPrice = search.data[0];
    const hasCurrencyOptions = existingPrice.currency_options && Object.keys(existingPrice.currency_options).length > 0;
    if (!hasCurrencyOptions) {
      await stripe.prices.update(existingPrice.id, {
        currency_options: {
          usd: {
            unit_amount: eurToUsdCents(config.overageCents),
            tax_behavior: "inclusive",
          },
        },
      });
    }
    return existingPrice.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: config.overageCents,
    currency: "eur",
    currency_options: {
      usd: {
        unit_amount: eurToUsdCents(config.overageCents),
        tax_behavior: "inclusive",
      },
    },
    recurring: {
      interval: interval === "yearly" ? "year" : "month",
      usage_type: "metered",
      aggregate_usage: "sum",
    },
    tax_behavior: "inclusive",
    nickname: `${config.baseName} Overage ${interval === "yearly" ? "Yearly" : "Monthly"} (per lead)`,
    metadata: {
      lf_namespace: STRIPE_CATALOG_NAMESPACE,
      lf_price_key: priceKey,
      lf_kind: "plan_overage",
      lf_plan: plan,
      lf_interval: interval,
    },
  });

  return price.id;
}

async function findOrCreateOverageProduct(stripe: Stripe, plan: SupportedPlan): Promise<string> {
  const config = getPlanConfig(plan);
  const search = await stripe.products.search({
    query: `metadata['lf_namespace']:'${STRIPE_CATALOG_NAMESPACE}' AND metadata['lf_product']:'${config.overageProductKey}' AND active:'true'`,
    limit: 1,
  });

  if (search.data.length > 0) {
    const product = search.data[0];
    await stripe.products.update(product.id, {
      name: config.overageName,
      description: buildOverageDescription(plan),
      metadata: {
        ...(product.metadata ?? {}),
        lf_namespace: STRIPE_CATALOG_NAMESPACE,
        lf_product: config.overageProductKey,
        lf_kind: "plan_overage_product",
        lf_plan: plan,
      },
    });
    return product.id;
  }

  const product = await stripe.products.create({
    name: config.overageName,
    description: buildOverageDescription(plan),
    metadata: {
      lf_namespace: STRIPE_CATALOG_NAMESPACE,
      lf_product: config.overageProductKey,
      lf_kind: "plan_overage_product",
      lf_plan: plan,
    },
  });
  return product.id;
}

async function ensureCanonicalOverageCatalog(stripe: Stripe): Promise<{
  archivedPrices: number;
  createdProducts: number;
  overageByPlan: Record<SupportedPlan, { monthlyPriceId: string; yearlyPriceId: string; productId: string }>;
}> {
  const overageByPlan = {} as Record<SupportedPlan, { monthlyPriceId: string; yearlyPriceId: string; productId: string }>;
  let archivedPrices = 0;
  let createdProducts = 0;

  for (const plan of SUPPORTED_PLANS) {
    const productId = await findOrCreateOverageProduct(stripe, plan);
    
    // Archive legacy overage prices (without interval suffix)
    const legacySearch = await stripe.prices.search({
      query: `metadata['lf_price_key']:'${plan}_overage' AND active:'true'`,
      limit: 100,
    });
    for (const legacyPrice of legacySearch.data) {
      if (await archivePrice(stripe, legacyPrice.id)) archivedPrices++;
    }

    const monthlyPriceId = await findOrCreateOveragePrice(stripe, productId, plan, "monthly");
    const yearlyPriceId = await findOrCreateOveragePrice(stripe, productId, plan, "yearly");

    overageByPlan[plan] = { monthlyPriceId, yearlyPriceId, productId };
    createdProducts++;
  }

  return { archivedPrices, createdProducts, overageByPlan };
}

async function archiveCatalogBaseArtifacts(
  stripe: Stripe,
  preservedProductIds: Set<string>,
): Promise<{ productsArchived: number; pricesArchived: number }> {
  let productsArchived = 0;
  let pricesArchived = 0;
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.products.list({ active: true, limit: 100, starting_after: startingAfter });

    for (const product of page.data) {
      if (preservedProductIds.has(product.id)) continue;

      const prices = await listActivePricesForProduct(stripe, product.id);
      const catalogPrices = prices.filter(isCatalogPrice);
      if (catalogPrices.length === 0) continue;

      await detachDefaultPrice(stripe, product);

      for (const price of catalogPrices) {
        if (await archivePrice(stripe, price.id)) pricesArchived++;
      }

      const remainingActivePrices = await listActivePricesForProduct(stripe, product.id);
      if (remainingActivePrices.length > 0) continue;

      try {
        await stripe.products.update(product.id, { active: false });
        productsArchived++;
      } catch {
        // ignore product cleanup failures and continue rebuilding
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  return { productsArchived, pricesArchived };
}

async function findOrCreateBaseProduct(stripe: Stripe, plan: SupportedPlan): Promise<string> {
  const config = getPlanConfig(plan);
  const search = await stripe.products.search({
    query: `metadata['lf_namespace']:'${STRIPE_CATALOG_NAMESPACE}' AND metadata['lf_product']:'${config.baseProductKey}' AND active:'true'`,
    limit: 1,
  });

  if (search.data.length > 0) {
    await stripe.products.update(search.data[0].id, {
      name: config.baseName,
      description: buildBaseDescription(plan),
      metadata: {
        ...(search.data[0].metadata ?? {}),
        lf_namespace: STRIPE_CATALOG_NAMESPACE,
        lf_product: config.baseProductKey,
        lf_kind: "plan_base_product",
        lf_plan: plan,
      },
    });
    return search.data[0].id;
  }

  const product = await stripe.products.create({
    name: config.baseName,
    description: buildBaseDescription(plan),
    metadata: {
      lf_namespace: STRIPE_CATALOG_NAMESPACE,
      lf_product: config.baseProductKey,
      lf_kind: "plan_base_product",
      lf_plan: plan,
    },
  });

  return product.id;
}

async function findOrCreateBasePrice(
  stripe: Stripe,
  productId: string,
  plan: SupportedPlan,
  interval: "monthly" | "yearly",
): Promise<string> {
  const config = getPlanConfig(plan);
  const priceKey = getBasePriceKey(plan, interval);
  const search = await stripe.prices.search({
    query: `product:'${productId}' AND metadata['lf_price_key']:'${priceKey}' AND active:'true'`,
    limit: 1,
  });

  const amountEur = interval === "yearly"
    ? config.baseYearlyCents
    : config.baseMonthlyCents;
  const amountUsd = eurToUsdCents(amountEur);

  if (search.data.length > 0) {
    const existingPrice = search.data[0];
    
    // If amount matches, just ensure currency_options exist
    if (existingPrice.unit_amount === amountEur) {
      const hasCurrencyOptions = existingPrice.currency_options && Object.keys(existingPrice.currency_options).length > 0;
      if (!hasCurrencyOptions) {
        try {
          await stripe.prices.update(existingPrice.id, {
            currency_options: {
              usd: {
                unit_amount: amountUsd,
                tax_behavior: "inclusive",
              },
            },
          });
        } catch {
          // Ignore currency_options update errors
        }
      }
      return existingPrice.id;
    }
    
    // Amount changed - archive old price and create new one
    await stripe.prices.update(existingPrice.id, { active: false });
  }

  return (await stripe.prices.create({
    product: productId,
    unit_amount: amountEur,
    currency: "eur",
    currency_options: {
      usd: {
        unit_amount: amountUsd,
        tax_behavior: "inclusive",
      },
    },
    recurring: { interval: interval === "yearly" ? "year" : "month" },
    tax_behavior: "inclusive",
    nickname: `${config.baseName} ${interval === "yearly" ? "Yearly" : "Monthly"}`,
    metadata: {
      lf_namespace: STRIPE_CATALOG_NAMESPACE,
      lf_price_key: priceKey,
      lf_kind: "plan_base",
      lf_plan: plan,
      lf_interval: interval,
      lf_leads_included: String(config.leadsIncluded),
    },
  })).id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin-only setup function - no auth required (called manually)
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: STRIPE_API_VERSION });

    const url = new URL(req.url);
    const cleanCatalog = url.searchParams.get("clean") !== "false";
    const overageCatalog = await ensureCanonicalOverageCatalog(stripe);
    // Resolve canonical base product ids before cleanup so we never archive their prices (only overage was preserved before = bug)
    const baseProductIds = await Promise.all(
      SUPPORTED_PLANS.map((plan) => findOrCreateBaseProduct(stripe, plan)),
    );
    const preservedProductIds = new Set<string>([
      ...Object.values(overageCatalog.overageByPlan).map((e) => e.productId),
      ...baseProductIds,
    ]);
    const cleanup = cleanCatalog
      ? await archiveCatalogBaseArtifacts(stripe, preservedProductIds)
      : { productsArchived: 0, pricesArchived: 0 };

    const results: Array<Record<string, unknown>> = [];

    for (const plan of SUPPORTED_PLANS) {
      const config = getPlanConfig(plan);
      const baseProductId = await findOrCreateBaseProduct(stripe, plan);
      const monthlyPriceId = await findOrCreateBasePrice(stripe, baseProductId, plan, "monthly");
      const yearlyPriceId = await findOrCreateBasePrice(stripe, baseProductId, plan, "yearly");
      const overage = overageCatalog.overageByPlan[plan];

      results.push({
        plan,
        baseProductId,
        monthlyPriceId,
        yearlyPriceId,
        meteredMonthlyPriceId: overage.monthlyPriceId,
        meteredYearlyPriceId: overage.yearlyPriceId,
        overageProductId: overage.productId,
        leadsIncluded: config.leadsIncluded,
        overageCents: config.overageCents,
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      cleanup: {
        ...cleanup,
        pricesArchived: cleanup.pricesArchived + overageCatalog.archivedPrices,
        overageProductsCreated: overageCatalog.createdProducts,
      },
      plans: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

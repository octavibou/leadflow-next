// ── Pricing Configuration (Metered model) ──────────────────────────────
// Zapier-style: flat plan price + per-lead overage charged at end of cycle.
// Plans differ in funnels, workspaces, seats, included leads & overage rate.

export type PlanName = "starter" | "grow" | "scale";
export type BillingInterval = "monthly" | "yearly";
export type Currency = "eur" | "usd";

export interface PlanTier {
  name: PlanName;
  label: string;
  basePriceMonthly: number;        // EUR
  basePriceYearly: number;         // EUR (total yearly, not monthly equivalent)
  funnels: number;                 // hard limit
  workspaces: number;              // hard limit
  seats: number;                   // hard limit
  leadsIncluded: number;           // before overage kicks in
  leadOveragePrice: number;        // EUR per extra lead
}

export const PLANS: PlanTier[] = [
  {
    name: "starter",
    label: "Starter",
    basePriceMonthly: 49,
    basePriceYearly: 499,
    funnels: 2,
    workspaces: 1,
    seats: 1,
    leadsIncluded: 200,
    leadOveragePrice: 0.50,
  },
  {
    name: "grow",
    label: "Grow",
    basePriceMonthly: 149,
    basePriceYearly: 1499,
    funnels: 10,
    workspaces: 3,
    seats: 3,
    leadsIncluded: 500,
    leadOveragePrice: 0.35,
  },
  {
    name: "scale",
    label: "Scale",
    basePriceMonthly: 299,
    basePriceYearly: 2999,
    funnels: 50,
    workspaces: 10,
    seats: 10,
    leadsIncluded: 1_000,
    leadOveragePrice: 0.20,
  },
];

// ── Price calculation ──────────────────────────────────────────────────

export interface PricingSelection {
  plan: PlanName;
  interval: BillingInterval;
  currency?: Currency;
}

export interface PriceBreakdown {
  planBase: number;
  total: number;                   // monthly equivalent after discount
  interval: BillingInterval;
  leadsIncluded: number;
  leadOveragePrice: number;
}

export function calculatePrice(selection: PricingSelection): PriceBreakdown {
  const plan = PLANS.find((p) => p.name === selection.plan)!;
  const currency = selection.currency ?? "eur";
  const fxRate = getFxRate(currency);
  const toCurrency = (amountEur: number) => Math.round(amountEur * fxRate * 100) / 100;
  
  // For yearly, return monthly equivalent (yearly price / 12)
  const total = selection.interval === "yearly"
    ? toCurrency(plan.basePriceYearly / 12)
    : toCurrency(plan.basePriceMonthly);

  return {
    planBase: toCurrency(plan.basePriceMonthly),
    total,
    interval: selection.interval,
    leadsIncluded: plan.leadsIncluded,
    leadOveragePrice: toCurrency(plan.leadOveragePrice),
  };
}

/**
 * Estimate monthly cost given expected lead volume.
 * Returns base + overage (0 if under included).
 */
export function estimateMonthlyCost(
  plan: PlanName,
  projectedLeads: number,
  interval: BillingInterval = "monthly",
  currency: Currency = "eur",
): { base: number; overage: number; total: number; extraLeads: number } {
  const planDef = PLANS.find((p) => p.name === plan)!;
  const fxRate = getFxRate(currency);
  const toCurrency = (amountEur: number) => Math.round(amountEur * fxRate * 100) / 100;
  const base = interval === "yearly"
    ? toCurrency(planDef.basePriceYearly / 12)
    : toCurrency(planDef.basePriceMonthly);
  const extraLeads = Math.max(0, projectedLeads - planDef.leadsIncluded);
  const overage = Math.round(extraLeads * toCurrency(planDef.leadOveragePrice) * 100) / 100;
  return { base, overage, total: Math.round((base + overage) * 100) / 100, extraLeads };
}

/**
 * Get the yearly total price for a plan in the specified currency.
 */
export function getYearlyPrice(plan: PlanName, currency: Currency = "eur"): number {
  const planDef = PLANS.find((p) => p.name === plan)!;
  const fxRate = getFxRate(currency);
  return Math.round(planDef.basePriceYearly * fxRate * 100) / 100;
}

// ── Format helpers ─────────────────────────────────────────────────────

export function formatPrice(amount: number, currency: Currency = "eur"): string {
  const locale = currency === "usd" ? "en-US" : "es-ES";
  const currencyCode = currency === "usd" ? "USD" : "EUR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount);
}

function getFxRate(currency: Currency): number {
  // Keep this stable and deterministic in UI. Stripe final amount
  // is authoritative because prices are created per-currency there.
  // Must match EUR_TO_USD_RATE in supabase/functions/_shared/stripe-plans.ts
  return currency === "usd" ? 1.10 : 1;
}

/**
 * Convert an amount from one currency to another using our FX rate.
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  // EUR -> USD: multiply by rate
  // USD -> EUR: divide by rate
  const rate = 1.10;
  if (from === "eur" && to === "usd") {
    return Math.round(amount * rate * 100) / 100;
  }
  if (from === "usd" && to === "eur") {
    return Math.round((amount / rate) * 100) / 100;
  }
  return amount;
}

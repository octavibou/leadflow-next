// ── Pricing Configuration (Metered model) ──────────────────────────────
// Zapier-style: flat plan price + per-lead overage charged at end of cycle.
// Plans differ in funnels, workspaces, seats, included leads & overage rate.

export type PlanName = "starter" | "grow" | "scale";
export type BillingInterval = "monthly" | "yearly";
export type Currency = "eur";

export interface PlanTier {
  name: PlanName;
  label: string;
  basePriceMonthly: number;        // EUR
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
    funnels: 50,
    workspaces: 10,
    seats: 10,
    leadsIncluded: 1_000,
    leadOveragePrice: 0.20,
  },
];

export const YEARLY_DISCOUNT = 0.2;

// ── Price calculation ──────────────────────────────────────────────────

export interface PricingSelection {
  plan: PlanName;
  interval: BillingInterval;
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
  const total = selection.interval === "yearly"
    ? Math.round(plan.basePriceMonthly * (1 - YEARLY_DISCOUNT) * 100) / 100
    : plan.basePriceMonthly;

  return {
    planBase: plan.basePriceMonthly,
    total,
    interval: selection.interval,
    leadsIncluded: plan.leadsIncluded,
    leadOveragePrice: plan.leadOveragePrice,
  };
}

/**
 * Estimate monthly cost given expected lead volume.
 * Returns base + overage (0 if under included).
 */
export function estimateMonthlyCost(
  plan: PlanName,
  projectedLeads: number,
  interval: BillingInterval = "monthly"
): { base: number; overage: number; total: number; extraLeads: number } {
  const planDef = PLANS.find((p) => p.name === plan)!;
  const base = interval === "yearly"
    ? Math.round(planDef.basePriceMonthly * (1 - YEARLY_DISCOUNT) * 100) / 100
    : planDef.basePriceMonthly;
  const extraLeads = Math.max(0, projectedLeads - planDef.leadsIncluded);
  const overage = Math.round(extraLeads * planDef.leadOveragePrice * 100) / 100;
  return { base, overage, total: Math.round((base + overage) * 100) / 100, extraLeads };
}

// ── Format helpers ─────────────────────────────────────────────────────

export function formatPrice(amount: number, _currency: Currency = "eur"): string {
  const formatted = amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
  return `€${formatted}`;
}

export const STRIPE_API_VERSION = "2023-10-16";
export const STRIPE_CATALOG_NAMESPACE = "leadflow_metered_v3";
export const LEGACY_CATALOG_NAMESPACE_PREFIX = "leadflow_metered_";
export const YEARLY_DISCOUNT_FACTOR = 0.8;
export const PORTAL_PENDING_UPGRADE_TTL_MS = 30 * 60 * 1000;

export const SUPPORTED_PLANS = ["starter", "grow", "scale"] as const;
export type SupportedPlan = (typeof SUPPORTED_PLANS)[number];
export type BillingInterval = "monthly" | "yearly";

type PlanDefinition = {
  label: string;
  baseName: string;
  overageName: string;
  baseProductKey: string;
  overageProductKey: string;
  baseMonthlyCents: number;
  overageCents: number;
  leadsIncluded: number;
  funnels: number;
  workspaces: number;
  seats: number;
};

export const PLAN_CATALOG: Record<SupportedPlan, PlanDefinition> = {
  starter: {
    label: "Starter",
    baseName: "Plan Starter",
    overageName: "Extra Leads Plan Starter",
    baseProductKey: "plan_starter_base",
    overageProductKey: "plan_starter_overage",
    baseMonthlyCents: 4900,
    overageCents: 50,
    leadsIncluded: 200,
    funnels: 2,
    workspaces: 1,
    seats: 1,
  },
  grow: {
    label: "Grow",
    baseName: "Plan Grow",
    overageName: "Extra Leads Plan Grow",
    baseProductKey: "plan_grow_base",
    overageProductKey: "plan_grow_overage",
    baseMonthlyCents: 14900,
    overageCents: 35,
    leadsIncluded: 500,
    funnels: 10,
    workspaces: 3,
    seats: 3,
  },
  scale: {
    label: "Scale",
    baseName: "Plan Scale",
    overageName: "Extra Leads Plan Scale",
    baseProductKey: "plan_scale_base",
    overageProductKey: "plan_scale_overage",
    baseMonthlyCents: 29900,
    overageCents: 20,
    leadsIncluded: 1000,
    funnels: 50,
    workspaces: 10,
    seats: 10,
  },
};

export function isSupportedPlan(value: string): value is SupportedPlan {
  return SUPPORTED_PLANS.includes(value as SupportedPlan);
}

export function getPlanConfig(plan: SupportedPlan): PlanDefinition {
  return PLAN_CATALOG[plan];
}

export function getBasePriceKey(plan: SupportedPlan, interval: BillingInterval): string {
  return `${plan}_base_${interval}`;
}

export function getOveragePriceKey(plan: SupportedPlan): string {
  return `${plan}_overage`;
}

export function getPlanLimits(plan: SupportedPlan) {
  const config = getPlanConfig(plan);
  return {
    funnels: config.funnels,
    workspaces: config.workspaces,
    seats: config.seats,
    leads: config.leadsIncluded,
  };
}

export function buildBaseDescription(plan: SupportedPlan): string {
  const config = getPlanConfig(plan);
  return `Incluye ${config.leadsIncluded.toLocaleString("es-ES")} leads/mes. Cada lead extra: ${formatEur(config.overageCents)} € (facturado al final del ciclo). IVA incluido.`;
}

export function buildOverageDescription(plan: SupportedPlan): string {
  const config = getPlanConfig(plan);
  return `Lead extra del plan ${config.label}: ${formatEur(config.overageCents)} € por lead, facturado al final del ciclo. IVA incluido.`;
}

function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}
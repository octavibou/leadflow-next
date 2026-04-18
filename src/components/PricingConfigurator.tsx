import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkles, ArrowRight, Loader2, Check } from "lucide-react";
import {
  PLANS,
  calculatePrice,
  estimateMonthlyCost,
  formatPrice,
  type PlanName,
  type BillingInterval,
  type Currency,
  type PriceBreakdown,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface PricingConfiguratorProps {
  onCheckout: (selection: {
    plan: PlanName;
    interval: BillingInterval;
    currency: Currency;
    breakdown: PriceBreakdown;
  }) => void;
  loading?: boolean;
  currentPlan?: PlanName;
  currentInterval?: BillingInterval;
}

export function PricingConfigurator({ onCheckout, loading, currentPlan, currentInterval }: PricingConfiguratorProps) {
  const [interval, setInterval] = useState<BillingInterval>(currentInterval ?? "monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanName>(currentPlan ?? "starter");
  const [projectedLeads, setProjectedLeads] = useState(300);

  const breakdown = useMemo(
    () => calculatePrice({ plan: selectedPlan, interval }),
    [selectedPlan, interval]
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Elige tu plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pagas una tarifa fija. Si superas los leads incluidos, se factura el extra al final del ciclo.
        </p>
      </div>

      {/* Interval toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="inline-flex rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              interval === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              interval === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual <span className="text-primary font-semibold">-20%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.name;
          const isCurrent = currentPlan === plan.name;
          const price = interval === "yearly"
            ? Math.round(plan.basePriceMonthly * 0.8 * 100) / 100
            : plan.basePriceMonthly;

          return (
            <button
              key={plan.name}
              onClick={() => {
                setSelectedPlan(plan.name);
                setProjectedLeads(plan.leadsIncluded);
              }}
              className={cn(
                "relative rounded-xl border-2 p-5 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/30 bg-background"
              )}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                    <Sparkles className="h-3 w-3" /> Plan actual
                  </Badge>
                </div>
              )}
              <div className={cn("font-bold text-xl", isSelected ? "text-primary" : "text-foreground")}>
                {plan.label}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-foreground">{formatPrice(price)}</span>
                <span className="text-sm text-muted-foreground">/mes</span>
              </div>
              {interval === "yearly" && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  facturado anualmente
                </div>
              )}

              <div className="mt-5 space-y-2 text-sm text-foreground">
                <Feature>{plan.funnels} funnels</Feature>
                <Feature>{plan.workspaces} {plan.workspaces === 1 ? "workspace" : "workspaces"}</Feature>
                <Feature>{plan.seats} {plan.seats === 1 ? "seat" : "seats"}</Feature>
                <Feature>{plan.leadsIncluded.toLocaleString()} leads incluidos / mes</Feature>
                <Feature>
                  Lead extra: <span className="font-semibold">{formatPrice(plan.leadOveragePrice)}</span>
                </Feature>
                <Feature>Skool community</Feature>
                <Feature>Private Discord</Feature>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lead estimator */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-foreground">¿Cuántos leads esperas al mes?</h3>
            <p className="text-xs text-muted-foreground">Estimación de coste mensual con overage incluido</p>
          </div>
          <span className="text-2xl font-bold text-foreground">{projectedLeads.toLocaleString()}</span>
        </div>
        <Slider
          value={[projectedLeads]}
          min={50}
          max={3000}
          step={50}
          onValueChange={(v) => setProjectedLeads(v[0])}
        />
        {(() => {
          const estimates = PLANS.map((plan) => ({
            plan,
            est: estimateMonthlyCost(plan.name, projectedLeads, interval),
          }));
          const cheapestTotal = Math.min(...estimates.map((e) => e.est.total));
          const recommendedName = estimates.find((e) => e.est.total === cheapestTotal)!.plan.name;
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {estimates.map(({ plan, est }) => {
                const isRecommended = plan.name === recommendedName;
                return (
                  <div
                    key={plan.name}
                    className={cn(
                      "relative rounded-lg border p-3 text-sm transition-all",
                      isRecommended
                        ? "border-primary border-2 bg-primary/5 shadow-sm"
                        : "border-border bg-background/60"
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2.5 left-3">
                        <Badge className="bg-primary text-primary-foreground text-[10px] gap-1 px-2 py-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Recomendado
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium", isRecommended ? "text-primary" : "text-foreground")}>
                        {plan.label}
                      </span>
                      <span className="font-bold text-foreground">{formatPrice(est.total)}/mes</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatPrice(est.base)} base
                      {est.extraLeads > 0 && (
                        <> + {est.extraLeads.toLocaleString()} extra ({formatPrice(est.overage)})</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* CTA bar */}
      <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-foreground text-background rounded-xl flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {PLANS.find((p) => p.name === selectedPlan)!.label}
            </span>
            <span className="text-2xl font-extrabold">{formatPrice(breakdown.total)}</span>
            <span className="text-sm opacity-70">/mes</span>
          </div>
          <div className="text-xs opacity-60">
            facturación {interval === "yearly" ? "anual" : "mensual"} · {breakdown.leadsIncluded.toLocaleString()} leads incluidos · {formatPrice(breakdown.leadOveragePrice)}/lead extra
          </div>
        </div>
        {currentPlan === selectedPlan && currentInterval === interval ? (
          <Button size="lg" variant="secondary" disabled className="gap-2 opacity-60">
            Ya estás en este plan
          </Button>
        ) : (
          <Button
            size="lg"
            variant="secondary"
            disabled={loading}
            onClick={() => onCheckout({ plan: selectedPlan, interval, currency: "eur", breakdown })}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

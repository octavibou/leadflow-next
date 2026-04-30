import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkles, ArrowRight, Loader2, Check, Zap } from "lucide-react";
import {
  PLANS,
  calculatePrice,
  estimateMonthlyCost,
  formatPrice,
  getYearlyPrice,
  type PlanName,
  type BillingInterval,
  type PriceBreakdown,
  type Currency,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import starterPlanImg from "@/assets/plans/starter.png";
import growPlanImg from "@/assets/plans/grow.png";
import scalePlanImg from "@/assets/plans/scale.png";

const PLAN_IMAGES: Record<PlanName, any> = {
  starter: starterPlanImg,
  grow: growPlanImg,
  scale: scalePlanImg,
};

type ProrationPreview = {
  alreadyOnPlan: boolean;
  amountDue: number;
  credit: number;
  fullPlanPrice?: number;
  currency: string;
} | null;

type AllProrationPreviews = Record<string, ProrationPreview>; // key: "plan_interval"

interface PricingConfiguratorProps {
  onCheckout: (selection: {
    plan: PlanName;
    interval: BillingInterval;
    breakdown: PriceBreakdown;
  }) => void;
  loading?: boolean;
  currentPlan?: PlanName;
  currentInterval?: BillingInterval;
  fixedPlan?: PlanName;
}

export function PricingConfigurator({ onCheckout, loading, currentPlan, currentInterval, fixedPlan }: PricingConfiguratorProps) {
  const [interval, setInterval] = useState<BillingInterval>(currentInterval ?? "monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanName>(fixedPlan ?? currentPlan ?? "starter");
  const currency: Currency = "eur";
  const [projectedLeads, setProjectedLeads] = useState(300);
  const plansToShow = fixedPlan ? PLANS.filter((plan) => plan.name === fixedPlan) : PLANS;

  // Proration preview state (only for upgrade mode)
  const isUpgradeMode = !!currentPlan && isSupabaseConfigured;
  const [prorationPreview, setProrationPreview] = useState<ProrationPreview>(null);
  const [prorationLoading, setProrationLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // All proration previews for showing "free upgrade" badges
  const [allProrations, setAllProrations] = useState<AllProrationPreviews>({});
  const [allProrationsLoading, setAllProrationsLoading] = useState(false);

  // Fetch proration preview when selection changes (upgrade mode only)
  useEffect(() => {
    console.log("[Proration] Mode check:", { isUpgradeMode, currentPlan, currentInterval, selectedPlan, interval });
    
    if (!isUpgradeMode) {
      console.log("[Proration] Not in upgrade mode, skipping");
      return;
    }
    if (selectedPlan === currentPlan && interval === currentInterval) {
      console.log("[Proration] Same plan and interval, clearing preview");
      setProrationPreview(null);
      return;
    }

    const fetchProration = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setProrationLoading(true);
      console.log("[Proration] Fetching preview for:", { selectedPlan, interval });
      
      try {
        if (!supabase) {
          console.error("[Proration] Supabase client not configured");
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.error("[Proration] No access token");
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        console.log("[Proration] Calling:", `${supabaseUrl}/functions/v1/preview-upgrade`);

        const res = await fetch(
          `${supabaseUrl}/functions/v1/preview-upgrade`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan: selectedPlan, interval }),
            signal: abortControllerRef.current.signal,
          }
        );

        const data = await res.json();
        console.log("[Proration] Response:", res.status, data);
        
        if (!res.ok) throw new Error(data.error || "Failed to fetch proration");
        setProrationPreview(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[Proration] Error:", err);
          setProrationPreview(null);
        }
      } finally {
        setProrationLoading(false);
      }
    };

    const debounce = setTimeout(fetchProration, 300);
    return () => {
      clearTimeout(debounce);
      abortControllerRef.current?.abort();
    };
  }, [isUpgradeMode, selectedPlan, interval, currentPlan, currentInterval]);

  // Fetch all proration previews when upgrade mode activates or interval changes
  useEffect(() => {
    if (!isUpgradeMode || !supabase) return;
    
    const fetchAllProrations = async () => {
      setAllProrationsLoading(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const plans: PlanName[] = ["starter", "grow", "scale"];
        
        // Fetch proration for all plans with current interval
        const results = await Promise.all(
          plans.map(async (planName) => {
            // Skip current plan with current interval
            if (planName === currentPlan && interval === currentInterval) {
              return { key: `${planName}_${interval}`, data: null };
            }
            
            try {
              const res = await fetch(
                `${supabaseUrl}/functions/v1/preview-upgrade`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ plan: planName, interval }),
                }
              );
              
              if (!res.ok) return { key: `${planName}_${interval}`, data: null };
              const data = await res.json();
              return { key: `${planName}_${interval}`, data };
            } catch {
              return { key: `${planName}_${interval}`, data: null };
            }
          })
        );
        
        const newProrations: AllProrationPreviews = {};
        results.forEach(({ key, data }) => {
          if (data) newProrations[key] = data;
        });
        
        setAllProrations(prev => ({ ...prev, ...newProrations }));
      } catch (err) {
        console.error("[AllProrations] Error:", err);
      } finally {
        setAllProrationsLoading(false);
      }
    };
    
    fetchAllProrations();
  }, [isUpgradeMode, interval, currentPlan, currentInterval]);

  const breakdown = useMemo(
    () => calculatePrice({ plan: selectedPlan, interval, currency }),
    [selectedPlan, interval, currency]
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Elige tu plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pagas una tarifa fija. Si superas los leads incluidos, se factura el extra al final del ciclo.
        </p>
      </div>

      {/* Interval toggle - hidden for new users (fixedPlan), Stripe upsell handles it */}
      {!fixedPlan && (
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
      )}

      {/* Plan cards */}
      <div className={cn(
        "grid gap-4",
        fixedPlan 
          ? "grid-cols-1 max-w-md mx-auto" 
          : "grid-cols-1 md:grid-cols-3"
      )}>
        {plansToShow.map((plan, index) => {
          const isSelected = selectedPlan === plan.name;
          const isSamePlanAndInterval = currentPlan === plan.name && interval === currentInterval;
          const isCurrentPlanName = currentPlan === plan.name;
          const price = calculatePrice({ plan: plan.name, interval, currency }).total;
          const monthlyBasePrice = calculatePrice({ plan: plan.name, interval: "monthly", currency }).total;
          const yearlyTotal = getYearlyPrice(plan.name, currency);
          
          // Plan tier comparison (for determining if it's an upgrade)
          const planTiers: Record<PlanName, number> = { starter: 0, grow: 1, scale: 2 };
          const currentTier = currentPlan ? planTiers[currentPlan] : -1;
          const thisTier = planTiers[plan.name];
          const isHigherTier = thisTier > currentTier;
          
          // Check if this plan has a free upgrade (proration = 0)
          const prorationKey = `${plan.name}_${interval}`;
          const planProration = allProrations[prorationKey];
          const isFreeUpgrade = isUpgradeMode && isHigherTier && planProration && 
            !planProration.alreadyOnPlan && planProration.amountDue === 0;

          return (
            <button
              key={plan.name}
              onClick={() => {
                if (fixedPlan || isSamePlanAndInterval) return;
                setSelectedPlan(plan.name);
                setProjectedLeads(plan.leadsIncluded);
              }}
              className={cn(
                "relative rounded-xl border-2 p-5 text-left transition-all",
                fixedPlan && "cursor-default",
                // Current exact plan+interval: disabled look
                isSamePlanAndInterval
                  ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                  // Current plan name but different interval: slightly muted
                  : isUpgradeMode && isCurrentPlanName
                    ? "border-border bg-muted/20 hover:border-border"
                    // Selected state
                    : isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      // Normal state (including free upgrade - badge handles the highlight)
                      : "border-border hover:border-primary/30 bg-background"
              )}
            >
              {isSamePlanAndInterval && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Check className="h-3 w-3" /> Tu plan actual
                  </Badge>
                </div>
              )}
              {isUpgradeMode && isCurrentPlanName && !isSamePlanAndInterval && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className="text-xs bg-background">
                    Tu plan
                  </Badge>
                </div>
              )}
              {isFreeUpgrade && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white text-xs gap-1 shadow-sm">
                    <Zap className="h-3 w-3" /> Upgrade gratis
                  </Badge>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className={cn(
                  "font-bold text-xl",
                  isSamePlanAndInterval ? "text-muted-foreground"
                    : isSelected ? "text-primary"
                    : "text-foreground"
                )}>
                  {plan.label}
                </div>
                <Image
                  src={PLAN_IMAGES[plan.name]}
                  alt={`Icono plan ${plan.label}`}
                  width={60}
                  height={60}
                  className={cn(
                    "h-14 w-14 rounded-2xl object-cover",
                    isSamePlanAndInterval ? "opacity-70" : "opacity-100"
                  )}
                  priority={plan.name === "grow"}
                />
              </div>
              <div className="mt-2">
                {interval === "yearly" ? (
                  <>
                    <span className={cn(
                      "text-3xl font-extrabold",
                      isSamePlanAndInterval ? "text-muted-foreground" : "text-foreground"
                    )}>{formatPrice(yearlyTotal, currency)}</span>
                    <span className="text-sm text-muted-foreground">/año</span>
                  </>
                ) : (
                  <>
                    <span className={cn(
                      "text-3xl font-extrabold",
                      isSamePlanAndInterval ? "text-muted-foreground" : "text-foreground"
                    )}>{formatPrice(price, currency)}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </>
                )}
              </div>
              {interval === "yearly" && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="line-through opacity-70">
                    {formatPrice(monthlyBasePrice, currency)}
                  </span>
                  <span className="font-medium text-foreground/85">
                    {formatPrice(price, currency)}/mes facturado anualmente
                  </span>
                </div>
              )}

              <div className="mt-5 space-y-2 text-sm text-foreground">
                <Feature>{plan.funnels} funnels</Feature>
                <Feature>{plan.workspaces} {plan.workspaces === 1 ? "workspace" : "workspaces"}</Feature>
                <Feature>{plan.seats} {plan.seats === 1 ? "seat" : "seats"}</Feature>
                <Feature>{plan.leadsIncluded.toLocaleString()} leads incluidos / mes</Feature>
                <Feature>
                  Lead extra: <span className="font-semibold">{formatPrice(calculatePrice({ plan: plan.name, interval, currency }).leadOveragePrice, currency)}</span>
                </Feature>
                <Feature>Skool community</Feature>
                <Feature>Private Discord</Feature>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lead estimator - hidden for new users (fixedPlan) */}
      {!fixedPlan && <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
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
            est: estimateMonthlyCost(plan.name, projectedLeads, interval, currency),
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
                      <span className="font-bold text-foreground">{formatPrice(est.total, currency)}/mes</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatPrice(est.base, currency)} base
                      {est.extraLeads > 0 && (
                        <> + {est.extraLeads.toLocaleString()} extra ({formatPrice(est.overage, currency)})</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>}

      {/* CTA bar */}
      <div className={cn(
        "sticky bottom-0 z-10 py-4 bg-foreground text-background rounded-xl flex items-center justify-between flex-wrap gap-3",
        fixedPlan ? "max-w-md mx-auto px-5" : "-mx-4 px-4"
      )}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {PLANS.find((p) => p.name === selectedPlan)!.label}
            </span>
            {interval === "yearly" ? (
              <>
                <span className="text-2xl font-extrabold">{formatPrice(getYearlyPrice(selectedPlan, currency), currency)}</span>
                <span className="text-sm opacity-70">/año</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-extrabold">{formatPrice(breakdown.total, currency)}</span>
                <span className="text-sm opacity-70">/mes</span>
              </>
            )}
          </div>
          <div className="text-xs opacity-60">
            {!fixedPlan && interval === "yearly" && <>{formatPrice(breakdown.total, currency)}/mes · </>}
            {breakdown.leadsIncluded.toLocaleString()} leads incluidos · {formatPrice(breakdown.leadOveragePrice, currency)}/lead extra
          </div>

          {/* Proration preview for upgrades */}
          {isUpgradeMode && (selectedPlan !== currentPlan || interval !== currentInterval) && (
            <div className="mt-2 pt-2 border-t border-background/20">
              {prorationLoading ? (
                <div className="flex items-center gap-2 text-sm opacity-70">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Calculando prorrateo...
                </div>
              ) : prorationPreview && !prorationPreview.alreadyOnPlan ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">
                      Pagas hoy: {formatPrice(prorationPreview.amountDue / 100, currency)}
                    </span>
                  </div>
                  {prorationPreview.credit > 0 && (
                    <p className="text-xs opacity-70">
                      Crédito de tu plan actual: -{formatPrice(prorationPreview.credit / 100, currency)}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {currentPlan === selectedPlan && currentInterval === interval ? (
          <Button size="lg" variant="secondary" disabled className="gap-2 opacity-60">
            Ya estás en este plan
          </Button>
        ) : (
          <Button
            size="lg"
            variant="secondary"
            disabled={loading || prorationLoading}
            onClick={() => onCheckout({ plan: selectedPlan, interval, breakdown })}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isUpgradeMode && prorationPreview && !prorationPreview.alreadyOnPlan
              ? `Pagar ${formatPrice(prorationPreview.amountDue / 100, currency)}`
              : "Continuar"}
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

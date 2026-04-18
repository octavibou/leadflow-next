'use client';

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User, Mail, CreditCard, Loader2, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PricingConfigurator } from "@/components/PricingConfigurator";
import { PLANS, formatPrice, type PlanName, type BillingInterval, type Currency, type PriceBreakdown } from "@/lib/pricing";

const Profile = () => {
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const { limits, usage, planName, loading: limitsLoading, leadOveragePrice, overageAmount } = usePlanLimits();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");
      const meta = (user.user_metadata || {}) as Record<string, any>;
      setUserName(meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : ""));

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setSubscription(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-portal", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setPortalLoading(false);
    }
  };

  // Open Stripe Billing so the user can confirm the plan change and pay the proration there.
  const handleChangePlan = async (selection: {
    plan: PlanName;
    interval: BillingInterval;
    currency: Currency;
    breakdown: PriceBreakdown;
  }) => {
    setChangePlanLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("update-subscription", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { plan: selection.plan, interval: selection.interval },
      });
      if (res.error) throw res.error;
      const { portalUrl } = res.data ?? {};
      setChangePlanOpen(false);
      if (!portalUrl) throw new Error("No se pudo abrir Stripe");
      toast.success("Te llevamos a Stripe para confirmar el cambio y pagar el prorrateo de hoy.", {
        duration: 5000,
      });
      setTimeout(() => {
        window.location.href = portalUrl;
      }, 250);
    } catch (e: any) {
      toast.error("Error al cambiar de plan: " + e.message);
      setChangePlanLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
          <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-4 w-64" /></CardContent>
        </Card>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Activa", variant: "default" },
    trialing: { label: "Prueba", variant: "secondary" },
    past_due: { label: "Pago pendiente", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "outline" },
  };

  const statusInfo = statusMap[subscription?.status] || { label: subscription?.status || "Sin suscripción", variant: "outline" as const };

  const currentPlan = PLANS.find((p) => p.name === planName);
  const interval = (subscription?.billing_interval as BillingInterval) || "monthly";

  const planPrice = currentPlan
    ? interval === "yearly"
      ? Math.round(currentPlan.basePriceMonthly * 0.8 * 100) / 100
      : currentPlan.basePriceMonthly
    : 0;

  // Project full-cycle estimate based on current pace
  const periodStart = subscription?.period_start ? new Date(subscription.period_start) : null;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  let projectedExtra = 0;
  if (periodStart && periodEnd) {
    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const elapsedMs = Math.max(1, Date.now() - periodStart.getTime());
    const projectedTotal = Math.round((usage.leadsThisPeriod / elapsedMs) * totalMs);
    projectedExtra = Math.max(0, projectedTotal - limits.leads);
  }
  const projectedOverage = Math.round(projectedExtra * leadOveragePrice * 100) / 100;

  const initials = (userName || email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "U";
  const currentPlanLabel = currentPlan?.label ?? "Starter";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Account header */}
      <Card>
        <CardContent className="pt-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold text-foreground truncate">
              {userName || "Usuario"}
            </p>
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Plan {currentPlanLabel}
              {subscription?.status === "trialing" && (
                <span className="text-muted-foreground font-normal"> · Trial</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg">
                  Plan {currentPlan?.label ?? "Starter"}
                </p>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(planPrice)}/mes
                {interval === "yearly" && " (facturación anual)"}
              </p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Próxima factura: {new Date(subscription.current_period_end).toLocaleDateString("es")}
                </p>
              )}
            </div>
          </div>
          {subscription && (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setChangePlanOpen(true)} variant="default">
                Cambiar plan
              </Button>
              <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Gestionar pagos
              </Button>
            </div>
          )}

          <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cambiar plan</DialogTitle>
              </DialogHeader>
              <PricingConfigurator
                onCheckout={handleChangePlan}
                loading={changePlanLoading}
                currentPlan={planName as PlanName | undefined}
                currentInterval={interval}
              />
            </DialogContent>
          </Dialog>


        </CardContent>
      </Card>

      {/* Cycle usage (overage info) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Uso de este ciclo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {limitsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <UsageRow
                label="Leads"
                used={usage.leadsThisPeriod}
                limit={limits.leads}
                showOverage
              />
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Coste extra acumulado</span>
                <span className="font-bold text-foreground">{formatPrice(overageAmount)}</span>
              </div>
              {projectedExtra > 0 && (
                <p className="text-xs text-muted-foreground">
                  A este ritmo, tu próxima factura será aproximadamente{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(planPrice + projectedOverage)}
                  </span>{" "}
                  ({projectedExtra.toLocaleString()} leads extra estimados).
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Cada lead por encima de los {limits.leads.toLocaleString()} incluidos cuesta{" "}
                <span className="font-semibold text-foreground">{formatPrice(leadOveragePrice)}</span>.
                No hay bloqueo: tus funnels siguen capturando leads sin interrupción.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Límites del plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {limitsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <UsageRow label="Funnels" used={usage.funnels} limit={limits.funnels} />
              <UsageRow label="Workspaces" used={usage.workspaces} limit={limits.workspaces} />
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="font-medium text-foreground">Seats (miembros)</span>
                <span className="text-muted-foreground">{limits.seats}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function UsageRow({ label, used, limit, showOverage }: { label: string; used: number; limit: number; showOverage?: boolean }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isAtLimit = used >= limit;
  const isNearLimit = pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={!showOverage && isAtLimit ? "text-destructive font-semibold" : "text-muted-foreground"}>
          {used.toLocaleString()} / {limit.toLocaleString()}
          {showOverage && used > limit && (
            <span className="text-primary font-semibold"> (+{(used - limit).toLocaleString()})</span>
          )}
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${!showOverage && isAtLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-warning" : ""}`}
      />
    </div>
  );
}

export default Profile;

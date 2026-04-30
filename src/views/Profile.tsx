'use client';

import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Envelope,
  CreditCard,
  CircleNotch,
  ChartBar,
  TrendUp,
  Bell,
  ShieldCheck,
  Plug,
  PaintBrush,
  Key,
  SignOut,
  MagnifyingGlass,
} from "@phosphor-icons/react";
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
import { PLANS, calculatePrice, formatPrice, type PlanName, type BillingInterval, type Currency, type PriceBreakdown } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Profile = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [changePlanLoading, setChangePlanLoading] = useState(false);
  const { limits, usage, planName, loading: limitsLoading, leadOveragePrice, overageAmount } = usePlanLimits();

  const [activeSection, setActiveSection] = useState<
    "account" | "billing" | "notifications" | "security" | "preferences" | "integrations"
  >("account");
  const [navQuery, setNavQuery] = useState("");

  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [prefLocale, setPrefLocale] = useLocalStorageState<string>("leadflow.settings.locale", "es-ES");
  const [prefTimezone, setPrefTimezone] = useLocalStorageState<string>("leadflow.settings.timezone", "Europe/Madrid");
  const [prefWeekStart, setPrefWeekStart] = useLocalStorageState<"monday" | "sunday">("leadflow.settings.weekStart", "monday");
  const [prefTheme, setPrefTheme] = useLocalStorageState<"system" | "light" | "dark">("leadflow.settings.theme", "system");

  const [notifProduct, setNotifProduct] = useLocalStorageState<boolean>("leadflow.settings.notif.product", true);
  const [notifBilling, setNotifBilling] = useLocalStorageState<boolean>("leadflow.settings.notif.billing", true);
  const [notifLeads, setNotifLeads] = useLocalStorageState<boolean>("leadflow.settings.notif.leads", false);

  const [securityNotes, setSecurityNotes] = useLocalStorageState<string>("leadflow.settings.security.notes", "");

  const getAccessToken = async (): Promise<string> => {
    // Always try to refresh once before sensitive billing calls.
    // This avoids gateway 401 when UI session exists but access token is stale.
    const refreshed = await supabase.auth.refreshSession();
    let session = refreshed.data.session ?? null;

    if (!session?.access_token) {
      const current = await supabase.auth.getSession();
      session = current.data.session ?? null;
    }
    if (!session?.access_token) {
      throw new Error("Tu sesión expiró. Inicia sesión de nuevo e inténtalo otra vez.");
    }

    // Validate token against current Supabase project to avoid stale local sessions.
    const { error: userError } = await supabase.auth.getUser(session.access_token);
    if (userError) {
      throw new Error("Tu sesión no es válida para este entorno. Inicia sesión de nuevo.");
    }
    return session.access_token;
  };

  const invokeEdgeWithAuth = async <T,>(fnName: string, body?: Record<string, unknown>): Promise<T> => {
    const accessToken = await getAccessToken();
    const localApiPath =
      fnName === "update-subscription"
        ? "/api/billing/update-subscription"
        : fnName === "create-portal"
          ? "/api/billing/create-portal"
          : null;

    if (!localApiPath) {
      throw new Error(`Edge function no soportada en cliente: ${fnName}`);
    }

    const res = await fetch(localApiPath, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(body ?? {}),
        access_token: accessToken,
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = (payload as any)?.error || (payload as any)?.message || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return payload as T;
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || "");
      const meta = (user.user_metadata || {}) as Record<string, any>;
      const name = meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "");
      setUserName(name);
      setProfileNameDraft(name);

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

  const handleSaveProfile = async () => {
    const next = profileNameDraft.trim();
    if (!next) return;
    setProfileSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: next },
      });
      if (error) throw error;
      setUserName(next);
      toast.success("Perfil actualizado");
    } catch (e: any) {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const data = await invokeEdgeWithAuth<{ url?: string }>("create-portal");
      const { url } = data;
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
    breakdown: PriceBreakdown;
  }) => {
    setChangePlanLoading(true);
    try {
      const data = await invokeEdgeWithAuth<{ portalUrl?: string; url?: string }>("update-subscription", {
        plan: selection.plan,
        interval: selection.interval,
      });
      const { portalUrl, url } = data;
      const destination = portalUrl || url;
      setChangePlanOpen(false);
      if (!destination) throw new Error("No se pudo abrir Stripe");
      toast.success("Te llevamos a Stripe para confirmar el cambio y pagar el prorrateo de hoy.", {
        duration: 5000,
      });
      setTimeout(() => {
        window.location.href = destination;
      }, 250);
    } catch (e: any) {
      toast.error("Error al cambiar de plan: " + e.message);
    } finally {
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
  const subscriptionCurrency = (subscription?.currency as Currency) || "eur";
  const presentmentCurrency = (subscription?.presentment_currency as string | null) ?? null;
  const presentmentAmount = typeof subscription?.presentment_amount === "number"
    ? subscription.presentment_amount
    : null;

  const planPrice = currentPlan
    ? calculatePrice({ plan: currentPlan.name, interval, currency: subscriptionCurrency }).total
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

  const sectionItems: Array<{
    id: typeof activeSection;
    label: string;
    description: string;
    icon: any;
  }> = [
    { id: "account", label: "Cuenta", description: "Perfil, email y datos personales", icon: User },
    { id: "billing", label: "Facturación", description: "Plan, pagos, uso y límites", icon: CreditCard },
    { id: "notifications", label: "Notificaciones", description: "Preferencias de avisos", icon: Bell },
    { id: "security", label: "Seguridad", description: "Contraseña y sesión", icon: ShieldCheck },
    { id: "preferences", label: "Preferencias", description: "Idioma, zona horaria y tema", icon: PaintBrush },
    { id: "integrations", label: "Integraciones", description: "API keys y webhooks (próximamente)", icon: Plug },
  ];

  const q = navQuery.trim().toLowerCase();
  const sections = q
    ? sectionItems.filter((s) => `${s.label} ${s.description}`.toLowerCase().includes(q))
    : sectionItems;

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight">Settings</h1>
          <p className="text-sm text-muted-foreground truncate">Ajustes de tu cuenta y facturación</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleSignOut}>
          <SignOut className="h-4 w-4" weight="bold" />
          Cerrar sesión
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        {/* Sidebar */}
        <aside className="h-fit self-start rounded-lg border bg-background p-3">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" weight="bold" />
            <Input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Buscar settings…"
              className="h-9 pl-9"
            />
          </div>
          <div className="mt-3 space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = s.id === activeSection;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left transition",
                    active ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-muted-foreground" weight="bold" />
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-6">
          {activeSection === "account" && (
            <div className="space-y-6">
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
                      <Envelope className="h-3.5 w-3.5" weight="bold" />
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" weight="bold" />
                    Perfil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nombre</Label>
                    <Input
                      id="profile-name"
                      value={profileNameDraft}
                      onChange={(e) => setProfileNameDraft(e.target.value)}
                      placeholder="Tu nombre"
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nombre se mostrará en la app y en emails del producto.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} disabled />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveProfile} disabled={profileSaving || !profileNameDraft.trim()}>
                      {profileSaving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                    <Button variant="outline" onClick={() => setProfileNameDraft(userName)} disabled={profileSaving}>
                      Restablecer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "billing" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" weight="bold" />
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
                        {formatPrice(planPrice, subscriptionCurrency)}/mes
                        {interval === "yearly" && " (facturación anual)"}
                      </p>
                      {presentmentCurrency && presentmentCurrency !== subscriptionCurrency && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Cobro localizado activo: pagas en {presentmentCurrency.toUpperCase()} (precio base en {subscriptionCurrency.toUpperCase()}).
                          {presentmentAmount !== null && (
                            <> Último cobro: {formatMinorUnitAmount(presentmentAmount, presentmentCurrency)}.</>
                          )}
                        </p>
                      )}
                      {subscription?.current_period_end && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Próxima factura: {new Date(subscription.current_period_end).toLocaleDateString("es")}
                        </p>
                      )}
                    </div>
                  </div>

                  {subscription ? (
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={() => setChangePlanOpen(true)} variant="default">
                        Cambiar plan
                      </Button>
                      <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
                        {portalLoading ? <CircleNotch className="h-4 w-4 animate-spin mr-2" weight="bold" /> : <CreditCard className="h-4 w-4 mr-2" weight="bold" />}
                        Gestionar pagos
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hemos encontrado una suscripción activa para este usuario.
                    </p>
                  )}

                  <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
                    <DialogContent className="w-[min(95vw,72rem)] sm:max-w-[72rem] max-h-[90vh] overflow-y-auto">
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendUp className="h-4 w-4" weight="bold" />
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
                        <span className="font-bold text-foreground">{formatPrice(overageAmount, subscriptionCurrency)}</span>
                      </div>
                      {projectedExtra > 0 && (
                        <p className="text-xs text-muted-foreground">
                          A este ritmo, tu próxima factura será aproximadamente{" "}
                          <span className="font-semibold text-foreground">
                            {formatPrice(planPrice + projectedOverage, subscriptionCurrency)}
                          </span>{" "}
                          ({projectedExtra.toLocaleString()} leads extra estimados).
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Cada lead por encima de los {limits.leads.toLocaleString()} incluidos cuesta{" "}
                        <span className="font-semibold text-foreground">{formatPrice(leadOveragePrice, subscriptionCurrency)}</span>.
                        No hay bloqueo: tus funnels siguen capturando leads sin interrupción.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChartBar className="h-4 w-4" weight="bold" />
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
          )}

          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" weight="bold" />
                  Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SettingToggle
                  label="Novedades del producto"
                  description="Recibe emails con mejoras y cambios importantes."
                  value={notifProduct}
                  onChange={setNotifProduct}
                />
                <SettingToggle
                  label="Alertas de facturación"
                  description="Recibe avisos sobre pagos, facturas y fallos de cobro."
                  value={notifBilling}
                  onChange={setNotifBilling}
                />
                <SettingToggle
                  label="Resumen de leads"
                  description="Un resumen periódico de leads y conversiones."
                  value={notifLeads}
                  onChange={setNotifLeads}
                />
                <p className="text-xs text-muted-foreground">
                  Estas preferencias se guardan localmente en este navegador por ahora.
                </p>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" weight="bold" />
                    Seguridad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Contraseña</p>
                      <p className="text-sm text-muted-foreground">Cambia tu contraseña o actualiza tu acceso.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/reset-password")}>
                      Cambiar contraseña
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Cerrar sesión</p>
                      <p className="text-sm text-muted-foreground">Cierra la sesión en este dispositivo.</p>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={handleSignOut}>
                      <SignOut className="h-4 w-4" weight="bold" />
                      Cerrar sesión
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4" weight="bold" />
                    Notas de seguridad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    value={securityNotes}
                    onChange={(e) => setSecurityNotes(e.target.value)}
                    placeholder="Notas privadas (ej. checklist de seguridad, recordatorios, etc.)"
                    className="min-h-28"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se guarda localmente en este navegador.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PaintBrush className="h-4 w-4" weight="bold" />
                  Preferencias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select value={prefLocale} onValueChange={(v) => setPrefLocale(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es-ES">Español</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Zona horaria</Label>
                    <Select value={prefTimezone} onValueChange={(v) => setPrefTimezone(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona zona horaria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                        <SelectItem value="Europe/Lisbon">Europe/Lisbon</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inicio de semana</Label>
                    <Select value={prefWeekStart} onValueChange={(v) => setPrefWeekStart(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Lunes</SelectItem>
                        <SelectItem value="sunday">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select value={prefTheme} onValueChange={(v) => setPrefTheme(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Sistema</SelectItem>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Oscuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Estas preferencias se guardan localmente en este navegador.
                </p>
              </CardContent>
            </Card>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plug className="h-4 w-4" weight="bold" />
                    Integraciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Aquí aparecerán integraciones, webhooks y claves de API.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Próximamente.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4" weight="bold" />
                    API Keys
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium">Leadflow API (próximamente)</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">lf_live_••••••••••••••••••••••••</p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" disabled>Generar key</Button>
                      <Button variant="outline" disabled>Copiar</Button>
                      <Button variant="destructive" disabled>Revocar</Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cuando activemos la API, aquí podrás generar y rotar claves.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function SettingToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

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

function formatMinorUnitAmount(amount: number, currency: string): string {
  const upper = currency.toUpperCase();
  const locale = upper === "USD" ? "en-US" : "es-ES";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: upper,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function useLocalStorageState<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return;
      setValue(JSON.parse(raw) as T);
    } catch {
      // ignore invalid json / SSR
    }
  }, [key]);

  const setAndPersist = (next: T) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return [value, setAndPersist];
}

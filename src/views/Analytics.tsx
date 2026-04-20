"use client";

import { useEffect, useState, useMemo } from "react";
import { CaretDown, CaretUpDown, Trophy } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { FunnelStep } from "@/types/funnel";

type DateRange = "today" | "7d" | "month" | "year" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  month: "Este mes",
  year: "Este año",
  all: "Siempre",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];

function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") return now.toISOString().split("T")[0] + "T00:00:00";
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] + "T00:00:00";
  if (range === "year") return new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0] + "T00:00:00";
  return null;
}

function getCvrStyle(cvr: number): { color: string; bg: string; icon: any } {
  if (cvr >= 10)  return { color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Trophy };
  if (cvr >= 5)   return { color: "text-green-600",  bg: "bg-green-500/10",  icon: null };
  if (cvr >= 3)   return { color: "text-orange-600", bg: "bg-orange-500/10", icon: null };
  return           { color: "text-red-600",    bg: "bg-red-500/10",    icon: null };
}

export default function Analytics() {
  const { funnels: allFunnels, loading: funnelsLoading, fetchFunnels } = useFunnelStore();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [funnelConversions, setFunnelConversions] = useState<Record<string, number>>({});

  // Only live funnels have analytics
  const funnels = allFunnels.filter((f) => !!f.saved_at && f.saved_at !== f.updated_at);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  // Fetch per-funnel conversion rates for dropdown ordering + badges
  useEffect(() => {
    const fetchConversions = async () => {
      if (funnels.length === 0) return;
      const ids = funnels.map((f) => f.id);
      const [eventsRes, leadsRes] = await Promise.all([
        supabase.from("events").select("funnel_id").eq("event_type", "form_submit").in("funnel_id", ids),
        supabase.from("leads").select("funnel_id").in("funnel_id", ids),
      ]);
      const submits: Record<string, number> = {};
      const leadsMap: Record<string, number> = {};
      funnels.forEach((f) => { submits[f.id] = 0; leadsMap[f.id] = 0; });
      eventsRes.data?.forEach((e) => { if (e.funnel_id) submits[e.funnel_id] = (submits[e.funnel_id] || 0) + 1; });
      leadsRes.data?.forEach((l) => { if (l.funnel_id) leadsMap[l.funnel_id] = (leadsMap[l.funnel_id] || 0) + 1; });
      const cvrs: Record<string, number> = {};
      funnels.forEach((f) => {
        cvrs[f.id] = submits[f.id] > 0 ? (leadsMap[f.id] / submits[f.id]) * 100 : 0;
      });
      setFunnelConversions(cvrs);
    };
    fetchConversions();
  }, [funnels.length]);

  useEffect(() => {
    const load = async () => {
      if (funnels.length === 0) return;
      setLoading(true);
      const fromDate = getFromDate(dateRange);
      const funnelIds = funnels.map((f) => f.id);

      let eventsQuery = supabase
        .from("events")
        .select("event_type, metadata, created_at, funnel_id");

      let leadsQuery = supabase
        .from("leads")
        .select("created_at, funnel_id");

      if (selectedFunnelId === "all") {
        eventsQuery = eventsQuery.in("funnel_id", funnelIds);
        leadsQuery = leadsQuery.in("funnel_id", funnelIds);
      } else {
        eventsQuery = eventsQuery.eq("funnel_id", selectedFunnelId);
        leadsQuery = leadsQuery.eq("funnel_id", selectedFunnelId);
      }

      if (fromDate) {
        eventsQuery = eventsQuery.gte("created_at", fromDate);
        leadsQuery = leadsQuery.gte("created_at", fromDate);
      }

      const [eventsRes, leadsRes] = await Promise.all([eventsQuery, leadsQuery]);
      setEvents(eventsRes.data || []);
      setLeads(leadsRes.data || []);
      setLoading(false);
    };
    load();
  }, [selectedFunnelId, dateRange, funnels]);

  const selectedFunnel = selectedFunnelId === "all" ? null : funnels.find((f) => f.id === selectedFunnelId);
  const steps = (selectedFunnel?.steps as FunnelStep[]) || [];

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const totalLeads = leads.length;
    const ctr = pageViews > 0 ? (formSubmits / pageViews) * 100 : 0;
    const cvr = formSubmits > 0 ? (totalLeads / formSubmits) * 100 : 0;

    // Landing variants mock (in future, pull from campaigns/variants table)
    const variants = [
      { id: "original", name: "Original", views: pageViews, clicks: formSubmits },
    ];
    // Sort by CTR
    const sortedVariants = [...variants].sort((a, b) => {
      const ctrA = a.views > 0 ? a.clicks / a.views : 0;
      const ctrB = b.views > 0 ? b.clicks / b.views : 0;
      return ctrB - ctrA;
    });
    const bestVariantId = sortedVariants[0]?.id;

    // Step funnel data (exclude intro, start from first question step)
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const funnelSteps = steps.filter((s) => s.type !== "intro");
    const stepFunnel = funnelSteps.map((step, i) => {
      const count = stepViews.filter((e) => e.metadata?.step_id === step.id).length || (i === 0 ? formSubmits : 0);
      return { id: step.id, name: step.title || `Paso ${i + 1}`, count };
    });

    // Chart data
    const now = new Date();
    let buckets: { key: string; label: string }[] = [];

    if (dateRange === "today") {
      buckets = Array.from({ length: 12 }, (_, i) => ({
        key: `${now.toISOString().split("T")[0]}T${String(i * 2).padStart(2, "0")}`,
        label: `${String(i * 2).padStart(2, "0")}h`,
      }));
    } else if (dateRange === "7d") {
      buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return { key: d.toISOString().split("T")[0], label: DAY_LABELS[d.getDay()] };
      });
    } else if (dateRange === "month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      buckets = Array.from({ length: Math.ceil(daysInMonth / 2) }, (_, i) => {
        const day = i * 2 + 1;
        return { key: new Date(now.getFullYear(), now.getMonth(), day).toISOString().split("T")[0], label: String(day) };
      });
    } else {
      const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      for (let m = 0; m <= now.getMonth(); m++) {
        buckets.push({ key: `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`, label: MONTH_LABELS[m] });
      }
    }

    const chartData = buckets.map(({ key, label }) => ({
      label,
      leads: leads.filter((l) => l.created_at?.startsWith(key)).length,
    }));

    return { pageViews, formSubmits, totalLeads, ctr, cvr, variants: sortedVariants, bestVariantId, stepFunnel, chartData };
  }, [events, leads, steps, dateRange]);

  if (funnelsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (funnels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Crea tu primer funnel para ver analytics</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 group outline-none">
              <h1 className="text-2xl font-bold">{selectedFunnel?.name || "Todos los Funnels"}</h1>
              <CaretUpDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem
              onClick={() => setSelectedFunnelId("all")}
              className={selectedFunnelId === "all" ? "font-medium" : ""}
            >
              Todos los Funnels
            </DropdownMenuItem>
            {[...funnels]
              .sort((a, b) => (funnelConversions[b.id] || 0) - (funnelConversions[a.id] || 0))
              .map((f) => {
                const cvr = funnelConversions[f.id] || 0;
                const { color, bg, icon: BadgeIcon } = getCvrStyle(cvr);
                return (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => setSelectedFunnelId(f.id)}
                    className={cn("justify-between gap-2", selectedFunnelId === f.id ? "font-medium" : "")}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0", bg, color)}>
                      {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5" weight="fill" />}
                      {cvr.toFixed(1)}%
                    </span>
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm font-normal text-muted-foreground hover:text-foreground px-2.5">
              {DATE_RANGE_LABELS[dateRange]}
              <CaretDown className="h-3 w-3" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
              <DropdownMenuItem key={key} onClick={() => setDateRange(key)} className={dateRange === key ? "font-medium" : ""}>
                {DATE_RANGE_LABELS[key]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded-lg animate-pulse" />
          <div className="h-80 bg-muted rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* LANDING SECTION */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Landing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Landing KPIs */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Visitas</p>
                  <p className="text-xl font-bold mt-0.5">{stats.pageViews.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Clics</p>
                  <p className="text-xl font-bold mt-0.5">{stats.formSubmits.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">CTR</p>
                  <p className="text-xl font-bold mt-0.5">{stats.ctr.toFixed(1)}%</p>
                </div>
              </div>

              {/* Variants */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Variantes</p>
                <div className="space-y-2">
                  {stats.variants.map((variant) => {
                    const variantCtr = variant.views > 0 ? (variant.clicks / variant.views) * 100 : 0;
                    const isBest = variant.id === stats.bestVariantId;
                    return (
                      <div
                        key={variant.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          isBest ? "border-primary/30 bg-primary/5" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isBest && <Trophy className="h-4 w-4 text-primary" weight="fill" />}
                          <span className="text-sm font-medium">{variant.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Visitas</p>
                            <p className="text-sm font-semibold">{variant.views.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Clics</p>
                            <p className="text-sm font-semibold">{variant.clicks.toLocaleString()}</p>
                          </div>
                          <div className="text-right min-w-[50px]">
                            <p className="text-[10px] text-muted-foreground">CTR</p>
                            <p className={cn("text-sm font-semibold", isBest && "text-primary")}>{variantCtr.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FUNNEL SECTION */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Funnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Funnel KPIs */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Iniciados</p>
                  <p className="text-xl font-bold mt-0.5">{stats.formSubmits.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Leads</p>
                  <p className="text-xl font-bold mt-0.5">{stats.totalLeads.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Conversión</p>
                  <p className="text-xl font-bold mt-0.5">{stats.cvr.toFixed(1)}%</p>
                </div>
              </div>

              {/* Step by step funnel — horizontal */}
              <div>
                <p className="text-[11px] text-muted-foreground mb-3">Pasos</p>
                {stats.stepFunnel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay pasos en este funnel</p>
                ) : (
                  <div className="flex items-end gap-0 overflow-x-auto pb-1">
                    {stats.stepFunnel.map((step, idx) => {
                      const maxCount = Math.max(...stats.stepFunnel.map((s) => s.count), 1);
                      const heightPct = Math.max((step.count / maxCount) * 64, 8);
                      const prev = idx === 0 ? stats.formSubmits : stats.stepFunnel[idx - 1].count;
                      const dropoff = prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : 0;
                      const isLast = idx === stats.stepFunnel.length - 1;

                      return (
                        <div key={step.id} className="flex items-end gap-0 flex-1 min-w-0">
                          {/* Step column */}
                          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                            {/* Drop-off badge */}
                            {idx > 0 && dropoff > 0 ? (
                              <span className={cn(
                                "text-[9px] font-medium px-1 py-0.5 rounded",
                                dropoff > 50 ? "bg-red-500/10 text-red-600"
                                  : dropoff > 25 ? "bg-orange-500/10 text-orange-600"
                                  : "bg-green-500/10 text-green-600"
                              )}>-{dropoff}%</span>
                            ) : <span className="h-[18px]" />}
                            {/* Bar */}
                            <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                              <div
                                className="w-full bg-primary/20 rounded-t-sm relative group"
                                style={{ height: heightPct }}
                              >
                                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary rounded-t-sm" />
                              </div>
                            </div>
                            {/* Count + label */}
                            <p className="text-xs font-semibold leading-none">{step.count}</p>
                            <p className="text-[10px] text-muted-foreground text-center truncate w-full px-1 leading-tight">{step.name}</p>
                            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[9px] font-semibold">{idx + 1}</span>
                          </div>
                          {/* Arrow connector */}
                          {!isLast && (
                            <div className="flex items-center pb-10 px-0.5 text-muted-foreground/30 text-xs shrink-0">›</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CHART - Full width */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Leads en el tiempo</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 4, right: 16, left: 16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-popover border rounded-lg px-2 py-1 text-xs shadow-md">
                            <span className="font-semibold">{label}</span>
                            <span className="ml-2 text-muted-foreground">{payload[0].value} leads</span>
                          </div>
                        ) : null
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      fill="url(#gradLeads)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between px-4 pb-3 pt-1">
                {stats.chartData.map((item) => (
                  <span key={item.label} className="text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

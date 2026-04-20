'use client';

import { useEffect, useState, useMemo } from "react";
import { ChartBar, CaretDown, Eye, Users, Target, ArrowRight, TrendUp, TrendDown, Funnel as FunnelIcon, Lightning, Browser, CaretUpDown } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { FunnelStep } from "@/types/funnel";

// Types
interface EventRow {
  campaign_id: string | null;
  event_type: string;
  metadata: any;
  created_at: string;
}

interface LeadRow {
  campaign_id: string | null;
  result: string | null;
  created_at: string;
}

type DateRange = "today" | "7d" | "30d" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "today": "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "all": "Todo",
};

const STEP_TYPE_LABELS: Record<string, string> = {
  intro: "Landing",
  question: "Pregunta",
  contact: "Contacto",
  results: "Resultados",
  booking: "Reserva",
  vsl: "VSL",
  delivery: "Entrega",
  thankyou: "Gracias",
};

function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") return now.toISOString().split("T")[0] + "T00:00:00";
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  return null;
}

const AnalyticsPage = () => {
  const { funnels, loading: funnelsLoading, fetchFunnels } = useFunnelStore();
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  useEffect(() => {
    if (funnels.length > 0 && !selectedFunnelId) {
      setSelectedFunnelId(funnels[0].id);
    }
  }, [funnels, selectedFunnelId]);

  useEffect(() => {
    if (selectedFunnelId) {
      fetchCampaigns(selectedFunnelId);
    }
  }, [selectedFunnelId, fetchCampaigns]);

  // Fetch events and leads
  useEffect(() => {
    if (!selectedFunnelId) return;
    const load = async () => {
      setLoading(true);
      const fromDate = getFromDate(dateRange);
      
      let eventsQuery = supabase
        .from("events")
        .select("campaign_id, event_type, metadata, created_at")
        .eq("funnel_id", selectedFunnelId)
        .order("created_at", { ascending: true });
      
      let leadsQuery = supabase
        .from("leads")
        .select("campaign_id, result, created_at")
        .eq("funnel_id", selectedFunnelId);

      if (fromDate) {
        eventsQuery = eventsQuery.gte("created_at", fromDate);
        leadsQuery = leadsQuery.gte("created_at", fromDate);
      }

      const [eventsRes, leadsRes] = await Promise.all([eventsQuery, leadsQuery]);
      setEvents((eventsRes.data as EventRow[]) || []);
      setLeads((leadsRes.data as LeadRow[]) || []);
      setLoading(false);
    };
    load();
  }, [selectedFunnelId, dateRange]);

  const selectedFunnel = funnels.find((f) => f.id === selectedFunnelId);
  const steps = (selectedFunnel?.steps as FunnelStep[]) || [];

  // Computed stats
  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const totalLeads = leads.length;
    const ctr = pageViews > 0 ? (formSubmits / pageViews) * 100 : 0;
    const cvr = pageViews > 0 ? (totalLeads / pageViews) * 100 : 0;

    // Landing variants (campaigns) performance
    const landingVariants = campaigns.map((c) => {
      const cEvents = events.filter((e) => e.campaign_id === c.id);
      const cViews = cEvents.filter((e) => e.event_type === "page_view").length;
      const cClicks = cEvents.filter((e) => e.event_type === "form_submit").length;
      const cLeads = leads.filter((l) => l.campaign_id === c.id).length;
      return {
        id: c.id,
        name: c.name,
        views: cViews,
        clicks: cClicks,
        leads: cLeads,
        ctr: cViews > 0 ? (cClicks / cViews) * 100 : 0,
        cvr: cViews > 0 ? (cLeads / cViews) * 100 : 0,
      };
    });

    // Add direct traffic
    const directEvents = events.filter((e) => !e.campaign_id);
    const directViews = directEvents.filter((e) => e.event_type === "page_view").length;
    const directClicks = directEvents.filter((e) => e.event_type === "form_submit").length;
    const directLeads = leads.filter((l) => !l.campaign_id).length;
    if (directViews > 0 || directLeads > 0) {
      landingVariants.unshift({
        id: "direct",
        name: "Tráfico directo",
        views: directViews,
        clicks: directClicks,
        leads: directLeads,
        ctr: directViews > 0 ? (directClicks / directViews) * 100 : 0,
        cvr: directViews > 0 ? (directLeads / directViews) * 100 : 0,
      });
    }

    // Step funnel data
    const stepFunnel = steps.map((step, i) => {
      let count = 0;
      if (step.type === "intro") {
        count = pageViews;
      } else {
        count = stepViews.filter((e) => e.metadata?.step_id === step.id).length;
        if (step.type === "contact" && count === 0) count = formSubmits;
      }
      const prev = i === 0 ? count : (steps[i - 1] ? stepViews.filter((e) => e.metadata?.step_id === steps[i - 1].id).length || pageViews : pageViews);
      const dropoff = prev > 0 ? ((prev - count) / prev) * 100 : 0;
      return {
        id: step.id,
        name: step.type === "question" && step.question ? step.question.text.substring(0, 25) + (step.question.text.length > 25 ? "..." : "") : STEP_TYPE_LABELS[step.type],
        type: step.type,
        count,
        dropoff,
        pctTotal: pageViews > 0 ? (count / pageViews) * 100 : 0,
      };
    });

    // Time series for chart
    const days = dateRange === "today" ? 24 : dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 30;
    const chartData = Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date();
      if (dateRange === "today") {
        d.setHours(d.getHours() - (days - 1 - i));
        const hourStr = d.toISOString().substring(0, 13);
        return {
          label: `${d.getHours()}h`,
          views: events.filter((e) => e.created_at.startsWith(hourStr) && e.event_type === "page_view").length,
          leads: leads.filter((l) => l.created_at.startsWith(hourStr)).length,
        };
      } else {
        d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
        const dateStr = d.toISOString().split("T")[0];
        return {
          label: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
          views: events.filter((e) => e.created_at.startsWith(dateStr) && e.event_type === "page_view").length,
          leads: leads.filter((l) => l.created_at.startsWith(dateStr)).length,
        };
      }
    });

    return { pageViews, formSubmits, totalLeads, ctr, cvr, landingVariants, stepFunnel, chartData };
  }, [events, leads, campaigns, steps, dateRange]);

  const bestCtr = Math.max(...stats.landingVariants.map((v) => v.ctr), 0);

  if (funnelsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChartBar className="h-6 w-6 text-primary" weight="fill" />
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Funnel selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 gap-2 text-sm font-normal min-w-[180px] justify-between">
                <span className="truncate">{selectedFunnel?.name || "Seleccionar funnel"}</span>
                <CaretUpDown className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              {funnels.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => setSelectedFunnelId(f.id)}
                  className={selectedFunnelId === f.id ? "font-medium" : ""}
                >
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm font-normal text-muted-foreground hover:text-foreground px-2.5">
                {DATE_RANGE_LABELS[dateRange]}
                <CaretDown className="h-3 w-3" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setDateRange(key)}
                  className={dateRange === key ? "font-medium" : ""}
                >
                  {DATE_RANGE_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!selectedFunnel ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FunnelIcon className="h-12 w-12 mx-auto mb-4 opacity-30" weight="bold" />
            <p className="text-sm">Selecciona un funnel para ver sus analytics</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Landing Performance (1/3) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Browser className="h-4 w-4 text-muted-foreground" weight="bold" />
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Landing</h2>
            </div>

            {/* Landing KPIs */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Impresiones" value={stats.pageViews} />
              <MetricCard label="CTR" value={`${stats.ctr.toFixed(1)}%`} trend={stats.ctr > 5 ? "up" : stats.ctr > 0 ? "neutral" : "down"} />
            </div>

            {/* Variants comparison */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Variantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.landingVariants.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sin variantes</p>
                ) : (
                  stats.landingVariants.map((v) => (
                    <div key={v.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[140px]">{v.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{v.views} vis</span>
                          <span className={cn(
                            "text-xs font-semibold px-1.5 py-0.5 rounded",
                            v.ctr === bestCtr && bestCtr > 0 ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                          )}>
                            {v.ctr.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            v.ctr === bestCtr && bestCtr > 0 ? "bg-green-500" : "bg-primary/60"
                          )}
                          style={{ width: `${Math.min(v.ctr * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Mini chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="landingGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        fill="url(#landingGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Funnel Performance (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FunnelIcon className="h-4 w-4 text-muted-foreground" weight="bold" />
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Funnel</h2>
            </div>

            {/* Funnel KPIs */}
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Iniciados" value={stats.formSubmits} />
              <MetricCard label="Leads" value={stats.totalLeads} />
              <MetricCard label="Conv. Rate" value={`${stats.cvr.toFixed(1)}%`} trend={stats.cvr > 10 ? "up" : stats.cvr > 0 ? "neutral" : "down"} />
              <MetricCard label="Drop-off avg" value={`${stats.stepFunnel.length > 1 ? (stats.stepFunnel.slice(1).reduce((a, s) => a + s.dropoff, 0) / (stats.stepFunnel.length - 1)).toFixed(0) : 0}%`} trend="neutral" />
            </div>

            {/* Step-by-step timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Embudo paso a paso</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.stepFunnel.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin pasos</p>
                ) : (
                  <div className="space-y-1">
                    {stats.stepFunnel.map((step, i) => (
                      <div key={step.id} className="relative">
                        {/* Connection line */}
                        {i < stats.stepFunnel.length - 1 && (
                          <div className="absolute left-[19px] top-10 w-0.5 h-4 bg-border" />
                        )}
                        <div className="flex items-center gap-3 py-2">
                          {/* Step indicator */}
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold",
                            i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </div>

                          {/* Step info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium truncate">{step.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold">{step.count}</span>
                                {i > 0 && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded font-medium",
                                    step.dropoff > 50 ? "bg-red-500/10 text-red-600" :
                                    step.dropoff > 25 ? "bg-orange-500/10 text-orange-600" :
                                    "bg-green-500/10 text-green-600"
                                  )}>
                                    -{step.dropoff.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  i === 0 ? "bg-primary" : "bg-primary/60"
                                )}
                                style={{ width: `${step.pctTotal}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leads over time chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Leads en el tiempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="bg-popover border rounded-lg px-2 py-1.5 text-xs shadow-md">
                              <p className="font-medium mb-0.5">{label}</p>
                              <p className="text-muted-foreground">{payload[0].value} leads</p>
                            </div>
                          ) : null
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        fill="url(#leadsGrad)"
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
function MetricCard({ label, value, trend }: { label: string; value: string | number; trend?: "up" | "down" | "neutral" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-bold">{value}</span>
          {trend && (
            <span className={cn(
              "h-4 w-4 flex items-center justify-center rounded-full",
              trend === "up" ? "bg-green-500/10 text-green-600" :
              trend === "down" ? "bg-red-500/10 text-red-600" :
              "bg-muted text-muted-foreground"
            )}>
              {trend === "up" ? <TrendUp className="h-2.5 w-2.5" weight="bold" /> :
               trend === "down" ? <TrendDown className="h-2.5 w-2.5" weight="bold" /> :
               <ArrowRight className="h-2.5 w-2.5" weight="bold" />}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsPage;

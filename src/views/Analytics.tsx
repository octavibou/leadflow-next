"use client";

import { useEffect, useState, useMemo } from "react";
import { CaretDown, CaretUpDown, Trophy } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { FunnelStep } from "@/types/funnel";

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

type DateRange = "today" | "7d" | "month" | "year" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  "7d": "Últimos 7 días",
  month: "Este mes",
  year: "Este año",
  all: "Siempre",
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

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const totalLeads = leads.length;
    const ctr = pageViews > 0 ? (formSubmits / pageViews) * 100 : 0;
    const cvr = pageViews > 0 ? (totalLeads / pageViews) * 100 : 0;

    // Landing variants
    const landingVariants = campaigns.map((c) => {
      const cEvents = events.filter((e) => e.campaign_id === c.id);
      const cViews = cEvents.filter((e) => e.event_type === "page_view").length;
      const cClicks = cEvents.filter((e) => e.event_type === "form_submit").length;
      return {
        id: c.id,
        name: c.name,
        views: cViews,
        clicks: cClicks,
        ctr: cViews > 0 ? (cClicks / cViews) * 100 : 0,
      };
    });

    const directEvents = events.filter((e) => !e.campaign_id);
    const directViews = directEvents.filter((e) => e.event_type === "page_view").length;
    const directClicks = directEvents.filter((e) => e.event_type === "form_submit").length;
    if (directViews > 0) {
      landingVariants.unshift({
        id: "direct",
        name: "Tráfico directo",
        views: directViews,
        clicks: directClicks,
        ctr: directViews > 0 ? (directClicks / directViews) * 100 : 0,
      });
    }

    // Step funnel
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
        name: step.type === "question" && step.question ? step.question.text.substring(0, 30) + (step.question.text.length > 30 ? "..." : "") : STEP_TYPE_LABELS[step.type],
        type: step.type,
        count,
        dropoff,
      };
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
      views: events.filter((e) => e.event_type === "page_view" && e.created_at?.startsWith(key)).length,
    }));

    return { pageViews, formSubmits, totalLeads, ctr, cvr, landingVariants, stepFunnel, chartData };
  }, [events, leads, campaigns, steps, dateRange]);

  const bestCtr = Math.max(...stats.landingVariants.map((v) => v.ctr), 0);

  if (funnelsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-6">
            <div className="h-80 bg-muted rounded" />
            <div className="h-80 bg-muted rounded col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 gap-2 text-sm font-normal min-w-[180px] justify-between">
                <span className="truncate">{selectedFunnel?.name || "Seleccionar funnel"}</span>
                <CaretUpDown className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {funnels.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => setSelectedFunnelId(f.id)} className={selectedFunnelId === f.id ? "font-medium" : ""}>
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

      {!selectedFunnel ? (
        <div className="text-center text-muted-foreground py-20">
          <p>Selecciona un funnel para ver sus analytics</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Landing Performance - 1/3 */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Landing Performance</CardTitle>
              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Visitas</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.pageViews.toLocaleString()}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Clics</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.formSubmits.toLocaleString()}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">CTR</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.ctr.toFixed(1)}%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Variants */}
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Variantes</p>
                {stats.landingVariants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin variantes</p>
                ) : (
                  <div className="space-y-2">
                    {stats.landingVariants.map((v, idx) => (
                      <div key={v.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          {v.ctr === bestCtr && bestCtr > 0 && <Trophy className="h-3.5 w-3.5 text-yellow-500" weight="fill" />}
                          <span className="text-sm">{v.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">{v.views}</span>
                          <span className={cn("font-semibold", v.ctr === bestCtr && bestCtr > 0 ? "text-green-600" : "text-foreground")}>
                            {v.ctr.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-popover border rounded-lg px-2 py-1 text-xs shadow-md">
                            <span className="font-semibold">{label}</span>
                            <span className="ml-2 text-muted-foreground">{payload[0].value} visitas</span>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="views" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#gradViews)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between px-1">
                {stats.chartData.map((item) => (
                  <span key={item.label} className="text-[10px] text-muted-foreground">{item.label}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Funnel Performance - 2/3 */}
          <Card className="col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Funnel Performance</CardTitle>
              <div className="flex items-center gap-4 mt-3">
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Iniciados</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.formSubmits.toLocaleString()}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Leads</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.totalLeads.toLocaleString()}</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Conv.</p>
                  <p className="text-sm font-semibold mt-0.5">{stats.cvr.toFixed(1)}%</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Drop-off avg</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {stats.stepFunnel.length > 1 ? (stats.stepFunnel.slice(1).reduce((a, s) => a + s.dropoff, 0) / (stats.stepFunnel.length - 1)).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step timeline */}
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Flujo del Funnel</p>
                {stats.stepFunnel.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Sin pasos en este funnel</p>
                ) : (
                  <div className="space-y-0">
                    {stats.stepFunnel.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                            idx === 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                          )}>
                            {idx + 1}
                          </div>
                          {idx < stats.stepFunnel.length - 1 && <div className="w-0.5 h-6 bg-border" />}
                        </div>
                        <div className="flex-1 flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium">{step.name}</p>
                            <p className="text-xs text-muted-foreground">{step.count} visitas</p>
                          </div>
                          {idx > 0 && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              step.dropoff < 20 ? "bg-green-500/10 text-green-600" :
                              step.dropoff < 40 ? "bg-yellow-500/10 text-yellow-600" :
                              "bg-red-500/10 text-red-600"
                            )}>
                              -{step.dropoff.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leads chart */}
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Leads generados</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
                      <Area type="monotone" dataKey="leads" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#gradLeads)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between px-1 mt-1">
                  {stats.chartData.map((item) => (
                    <span key={item.label} className="text-[10px] text-muted-foreground">{item.label}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;

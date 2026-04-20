"use client";

import { useEffect, useState, useMemo } from "react";
import { CaretDown, CaretUpDown } from "@phosphor-icons/react";
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

export default function Analytics() {
  const { funnels, loading: funnelsLoading, fetchFunnels } = useFunnelStore();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
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
    if (!selectedFunnelId) return;
    const load = async () => {
      setLoading(true);
      const fromDate = getFromDate(dateRange);

      let eventsQuery = supabase
        .from("events")
        .select("event_type, metadata, created_at")
        .eq("funnel_id", selectedFunnelId);

      let leadsQuery = supabase
        .from("leads")
        .select("created_at")
        .eq("funnel_id", selectedFunnelId);

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
  }, [selectedFunnelId, dateRange]);

  const selectedFunnel = funnels.find((f) => f.id === selectedFunnelId);
  const steps = (selectedFunnel?.steps as FunnelStep[]) || [];

  const stats = useMemo(() => {
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const totalLeads = leads.length;
    const ctr = pageViews > 0 ? (formSubmits / pageViews) * 100 : 0;
    const cvr = pageViews > 0 ? (totalLeads / pageViews) * 100 : 0;

    // Step funnel data
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const stepFunnel = steps.map((step, i) => {
      let count = 0;
      if (step.type === "intro") {
        count = pageViews;
      } else {
        count = stepViews.filter((e) => e.metadata?.step_id === step.id).length;
      }
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

    return { pageViews, formSubmits, totalLeads, ctr, cvr, stepFunnel, chartData };
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
              <h1 className="text-2xl font-bold">{selectedFunnel?.name || "Seleccionar"}</h1>
              <CaretUpDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-[11px] text-muted-foreground leading-none">Impresiones</p>
                <p className="text-2xl font-bold mt-1">{stats.pageViews.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-[11px] text-muted-foreground leading-none">CTR</p>
                <p className="text-2xl font-bold mt-1">{stats.ctr.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-[11px] text-muted-foreground leading-none">Leads</p>
                <p className="text-2xl font-bold mt-1">{stats.totalLeads.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-[11px] text-muted-foreground leading-none">Conversión</p>
                <p className="text-2xl font-bold mt-1">{stats.cvr.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-3 gap-4">
            {/* Funnel Steps */}
            <Card className="col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Embudo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.stepFunnel.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin pasos</p>
                ) : (
                  stats.stepFunnel.map((step, idx) => {
                    const maxCount = Math.max(...stats.stepFunnel.map((s) => s.count), 1);
                    const width = (step.count / maxCount) * 100;
                    const prev = idx === 0 ? step.count : stats.stepFunnel[idx - 1].count;
                    const dropoff = prev > 0 ? Math.round(((prev - step.count) / prev) * 100) : 0;

                    return (
                      <div key={step.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-4">{idx + 1}</span>
                            <span className="text-sm truncate">{step.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{step.count}</span>
                            {idx > 0 && dropoff > 0 && (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                dropoff > 50 ? "bg-red-500/10 text-red-600" :
                                dropoff > 25 ? "bg-orange-500/10 text-orange-600" :
                                "bg-green-500/10 text-green-600"
                              )}>
                                -{dropoff}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="h-48 w-full">
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
                    <span key={item.label} className="text-[10px] text-muted-foreground">{item.label}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

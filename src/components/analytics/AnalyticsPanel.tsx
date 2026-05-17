"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiSessionState } from "@/hooks/useUiSessionState";
import { CaretUpDown, Info } from "@phosphor-icons/react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Funnel, FunnelStep } from "@/types/funnel";
import {
  buildSessionDetails,
  classifySessionSource,
  computeAnalyticsSummary,
  type SessionDetail,
  type LeadDealRow,
} from "@/lib/sessionAnalytics";
import { AnalyticsRevenueTab } from "@/components/analytics/AnalyticsRevenueTab";
import { computeFunnelHealthScore, getMetricHealth } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";
import { AnalyticsKpiRow } from "@/components/analytics/AnalyticsKpiRow";
import { AnalyticsGeneralTab } from "@/components/analytics/AnalyticsGeneralTab";
import { AnalyticsSourcesTab } from "@/components/analytics/AnalyticsSourcesTab";
import { AnalyticsFunnelsTab } from "@/components/analytics/AnalyticsFunnelsTab";
import {
  AnalyticsSessionsTable,
  type SessionsTableFilters,
} from "@/components/analytics/AnalyticsSessionsTable";
import { AnalyticsHealthTooltipFooter } from "@/components/analytics/AnalyticsHealthTooltipFooter";

type DateRange = "today" | "yesterday" | "7d" | "month" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7d": "7d",
  month: "Mes",
  all: "Siempre",
};

type AnalyticsFilters = {
  dateRange: DateRange;
  excludeNoise: boolean;
  search: string;
  channelFilter: SessionsTableFilters["channelFilter"];
  statusFilter: SessionsTableFilters["statusFilter"];
};

const ANALYTICS_FILTER_DEFAULT: AnalyticsFilters = {
  dateRange: "7d",
  excludeNoise: false,
  search: "",
  channelFilter: "all",
  statusFilter: "all",
};

/** Inclusive lower bound para `created_at`. */
function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") return now.toISOString().split("T")[0] + "T00:00:00";
  if (range === "yesterday") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] + "T00:00:00";
  return null;
}

/** Exclusive upper bound para `created_at` (solo ayer). */
function getBeforeDate(range: DateRange): string | null {
  if (range !== "yesterday") return null;
  const now = new Date();
  return now.toISOString().split("T")[0] + "T00:00:00";
}

/**
 * Devuelve el rango anterior de la misma duración para calcular deltas.
 * No aplica para `today`/`yesterday`/`all` (deltas omitidas en el componente).
 */
function getPreviousRange(range: DateRange): { from: string; before: string } | null {
  if (range !== "7d" && range !== "month") return null;
  const from = getFromDate(range);
  if (!from) return null;
  const fromTs = new Date(from).getTime();
  if (!Number.isFinite(fromTs)) return null;
  const span = Date.now() - fromTs;
  if (span <= 0) return null;
  const prevBefore = new Date(fromTs).toISOString();
  const prevFrom = new Date(fromTs - span).toISOString();
  return { from: prevFrom, before: prevBefore };
}

export function AnalyticsPanel({
  funnels,
  mode,
}: {
  funnels: Funnel[];
  mode: { kind: "workspace" } | { kind: "funnel"; funnelId: string };
}) {
  const liveFunnels = useMemo(
    () => funnels.filter((f) => !!f.saved_at && f.saved_at !== f.updated_at),
    [funnels],
  );

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() =>
    mode.kind === "funnel" ? mode.funnelId : "all",
  );
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [deals, setDeals] = useState<LeadDealRow[]>([]);
  const [prevEvents, setPrevEvents] = useState<any[]>([]);
  const [prevLeads, setPrevLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; funnel_id: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useUiSessionState<AnalyticsFilters>(
    "workspace-filters",
    ANALYTICS_FILTER_DEFAULT,
    {
      debounceMs: 280,
      sessionPathOverride: mode.kind === "funnel" ? `/analytics/funnel/${mode.funnelId}` : "/analytics",
    },
  );
  const { dateRange, excludeNoise } = filters;
  const setDateRange = (d: DateRange) => setFilters((f) => ({ ...f, dateRange: d }));
  const setExcludeNoise = (v: boolean) => setFilters((f) => ({ ...f, excludeNoise: v }));

  const [activeTab, setActiveTab] = useState<"general" | "sources" | "funnels" | "sessions" | "revenue">("general");

  useEffect(() => {
    if (mode.kind === "funnel") setSelectedFunnelId(mode.funnelId);
  }, [mode]);

  useEffect(() => {
    if (mode.kind !== "workspace") return;
    if (selectedFunnelId === "all") return;
    if (!liveFunnels.some((f) => f.id === selectedFunnelId)) {
      setSelectedFunnelId("all");
    }
  }, [liveFunnels, selectedFunnelId, mode]);

  const funnelIds = useMemo(() => {
    const ids = liveFunnels.map((f) => f.id);
    if (mode.kind === "funnel") return [mode.funnelId];
    if (selectedFunnelId === "all") return ids;
    if (ids.includes(selectedFunnelId)) return [selectedFunnelId];
    return ids;
  }, [liveFunnels, selectedFunnelId, mode]);

  const funnelIdsKey = useMemo(() => funnelIds.join("|"), [funnelIds]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (funnelIds.length === 0) {
        if (!cancelled) {
          setEvents([]);
          setLeads([]);
          setDeals([]);
          setPrevEvents([]);
          setPrevLeads([]);
          setCampaigns([]);
          setBranches([]);
          setLoading(false);
        }
        return;
      }
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setEvents([]);
          setLeads([]);
          setDeals([]);
          setPrevEvents([]);
          setPrevLeads([]);
          setCampaigns([]);
          setBranches([]);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      const fromDate = getFromDate(dateRange);
      const beforeDate = getBeforeDate(dateRange);
      const prev = getPreviousRange(dateRange);

      const baseEvent = () =>
        supabase!
          .from("events")
          .select("id, event_type, metadata, created_at, funnel_id, campaign_id, branch_id, deployment_id")
          .in("funnel_id", funnelIds);
      const baseLead = () =>
        supabase!
          .from("leads")
          .select("id, created_at, funnel_id, campaign_id, result, answers, metadata, branch_id, deployment_id")
          .in("funnel_id", funnelIds);

      let evQuery = baseEvent();
      let ldQuery = baseLead();
      if (fromDate) {
        evQuery = evQuery.gte("created_at", fromDate);
        ldQuery = ldQuery.gte("created_at", fromDate);
      }
      if (beforeDate) {
        evQuery = evQuery.lt("created_at", beforeDate);
        ldQuery = ldQuery.lt("created_at", beforeDate);
      }

      const prevPromises = prev
        ? [
            baseEvent().gte("created_at", prev.from).lt("created_at", prev.before).order("created_at", { ascending: true }).limit(10000),
            baseLead().gte("created_at", prev.from).lt("created_at", prev.before).order("created_at", { ascending: true }).limit(10000),
          ]
        : [Promise.resolve({ data: [], error: null }), Promise.resolve({ data: [], error: null })];

      const campQuery = supabase!
        .from("campaigns")
        .select("id, name, funnel_id")
        .in("funnel_id", funnelIds);

      const dealsQuery = supabase!
        .from("lead_deals")
        .select("*")
        .in("funnel_id", funnelIds);

      const branchesQuery = supabase!
        .from("funnel_branches")
        .select("id, name, slug")
        .in("funnel_id", funnelIds);

      let dealsQueryFiltered = dealsQuery;
      if (fromDate) {
        dealsQueryFiltered = dealsQueryFiltered.gte("created_at", fromDate);
      }
      if (beforeDate) {
        dealsQueryFiltered = dealsQueryFiltered.lt("created_at", beforeDate);
      }

      const [evRes, ldRes, campRes, dealsRes, branchesRes, prevEvRes, prevLdRes] = await Promise.all([
        evQuery.order("created_at", { ascending: true }).limit(10000),
        ldQuery.order("created_at", { ascending: true }).limit(10000),
        campQuery.order("created_at", { ascending: true }).limit(1000),
        dealsQueryFiltered.order("created_at", { ascending: false }).limit(5000),
        branchesQuery.order("created_at", { ascending: true }).limit(100),
        prevPromises[0],
        prevPromises[1],
      ]);

      if (cancelled) return;

      if (evRes.error) console.error("[AnalyticsPanel] Error events:", evRes.error);
      if (ldRes.error) console.error("[AnalyticsPanel] Error leads:", ldRes.error);
      if (campRes.error) console.error("[AnalyticsPanel] Error campaigns:", campRes.error);
      if (dealsRes.error) console.error("[AnalyticsPanel] Error deals:", dealsRes.error);

      setEvents(evRes.data || []);
      setLeads(ldRes.data || []);
      setDeals((dealsRes.data || []) as LeadDealRow[]);
      setCampaigns(campRes.data || []);
      setBranches(branchesRes.data || []);
      setPrevEvents((prevEvRes as { data?: any[] }).data || []);
      setPrevLeads((prevLdRes as { data?: any[] }).data || []);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [funnelIdsKey, dateRange]);

  const funnelNameById = useMemo(
    () => new Map(liveFunnels.map((f) => [f.id, f.name] as [string, string])),
    [liveFunnels],
  );
  const campaignNameById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name] as [string, string])),
    [campaigns],
  );

  const sessionDetailsAll = useMemo(
    () => buildSessionDetails(events, leads, funnelNameById, campaignNameById),
    [events, leads, funnelNameById, campaignNameById],
  );

  const prevSessionDetailsAll = useMemo(
    () => buildSessionDetails(prevEvents, prevLeads, funnelNameById, campaignNameById),
    [prevEvents, prevLeads, funnelNameById, campaignNameById],
  );

  /** Filtro global "Excluir Directo / Otro" — se aplica a todo el dashboard. */
  const applyExclusion = (rows: SessionDetail[]): SessionDetail[] => {
    if (!excludeNoise) return rows;
    return rows.filter((s) => {
      const k = classifySessionSource(s);
      return k !== "direct" && k !== "other";
    });
  };

  const sessions = useMemo(() => applyExclusion(sessionDetailsAll), [sessionDetailsAll, excludeNoise]);
  const previousSessions = useMemo(
    () => applyExclusion(prevSessionDetailsAll),
    [prevSessionDetailsAll, excludeNoise],
  );

  const stepsByFunnelId = useMemo(() => {
    const m = new Map<string, FunnelStep[]>();
    for (const f of liveFunnels) {
      m.set(f.id, [...((f.steps as FunnelStep[]) || [])]);
    }
    return m;
  }, [liveFunnels]);

  const stepOrderByFunnelId = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const [funnelId, steps] of stepsByFunnelId.entries()) {
      const questionSteps = (steps || [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .filter((s) => s.type === "question");
      const orderMap = new Map<string, number>();
      questionSteps.forEach((s, idx) => {
        orderMap.set(s.id, idx + 1);
      });
      m.set(funnelId, orderMap);
    }
    return m;
  }, [stepsByFunnelId]);

  const summary = useMemo(() => computeAnalyticsSummary(sessions), [sessions]);
  const previousSummary = useMemo(() => {
    const prev = getPreviousRange(dateRange);
    if (!prev) return null;
    return computeAnalyticsSummary(previousSessions);
  }, [previousSessions, dateRange]);

  const titleRight = mode.kind === "funnel"
    ? (funnelNameById.get(mode.funnelId) || "—")
    : (selectedFunnelId === "all" ? "Workspace" : (funnelNameById.get(selectedFunnelId) || "—"));

  const sessionsTableFilters: SessionsTableFilters = {
    search: filters.search,
    channelFilter: filters.channelFilter,
    statusFilter: filters.statusFilter,
  };
  const setSessionsTableFilters = (
    next: SessionsTableFilters | ((prev: SessionsTableFilters) => SessionsTableFilters),
  ) => {
    setFilters((f) => {
      const prevSlice: SessionsTableFilters = {
        search: f.search,
        channelFilter: f.channelFilter,
        statusFilter: f.statusFilter,
      };
      const resolved = typeof next === "function" ? (next as (p: SessionsTableFilters) => SessionsTableFilters)(prevSlice) : next;
      return { ...f, ...resolved };
    });
  };

  const fromIso = getFromDate(dateRange);
  const toIso = getBeforeDate(dateRange) ?? new Date().toISOString();

  const overallFunnelPct = summary.overallFunnelConversionRate * 100;

  const funnelHealth = computeFunnelHealthScore({
    quizStartRate: summary.landingConversionRate * 100,
    quizCompletionRate: summary.quizCompletionRate * 100,
    qualificationRate: summary.qualificationRate * 100,
    leadConversionRate: summary.formConversionRate * 100,
    overallFunnelConversion: summary.overallFunnelConversionRate * 100,
  });

  const overallHealth = getMetricHealth("overallFunnelConversion", overallFunnelPct);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <TooltipProvider>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
              <span className="text-sm text-muted-foreground truncate max-w-[min(100%,14rem)] sm:max-w-none">
                {titleRight}
              </span>
            </div>

            <div className="flex max-w-xl flex-col gap-0 rounded-xl border border-border/50 bg-muted/10 p-1 sm:flex-row sm:items-stretch sm:gap-0 sm:p-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 cursor-default items-center justify-between gap-3 px-3 py-2.5 sm:justify-start sm:py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Funnel health
                      </p>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                          {funnelHealth.score}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <HealthBadge health={funnelHealth.status} size="sm" variant="minimal" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[300px] flex-col items-start gap-0 px-3 py-2.5 text-left text-[11px]"
                >
                  <p className="text-background/95">
                    Score ponderado basado en las tasas de conversión de cada etapa del embudo, comparadas con
                    benchmarks de la industria.
                  </p>
                  <AnalyticsHealthTooltipFooter />
                </TooltipContent>
              </Tooltip>

              <div className="mx-3 h-px bg-border/60 sm:mx-0 sm:h-auto sm:w-px sm:self-stretch sm:bg-border/60" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-1 cursor-default items-center justify-between gap-3 px-3 py-2.5 sm:justify-start sm:py-2.5">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Overall conversion
                      </p>
                      <p className="mt-0.5 text-xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                        {overallFunnelPct.toFixed(1)}%
                      </p>
                    </div>
                    <HealthBadge health={overallHealth} size="sm" variant="minimal" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[300px] flex-col items-start gap-0 px-3 py-2.5 text-left text-[11px]"
                >
                  <p className="text-background/95">
                    Porcentaje de visitas que acaban enviando el formulario de contacto (tras cualificar), frente al
                    total de visitas en el rango seleccionado.
                  </p>
                  <AnalyticsHealthTooltipFooter />
                </TooltipContent>
              </Tooltip>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Visitas, atribución y calidad (first-touch) a partir de `events` y `leads`.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px]">
              <Checkbox
                checked={excludeNoise}
                onCheckedChange={(v) => setExcludeNoise(!!v)}
              />
              <span className="text-foreground">Excluir Directo / Otro</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[260px] text-[11px]">
                  Oculta visitas sin atribución clara (canal Directo y Otro). No se contabilizan en ninguna métrica, gráfico ni tabla.
                </TooltipContent>
              </Tooltip>
            </label>
            {mode.kind === "workspace" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    {selectedFunnelId === "all" ? "Todos los funnels" : (funnelNameById.get(selectedFunnelId) || "Seleccionar")}
                    <CaretUpDown className="h-3.5 w-3.5" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setSelectedFunnelId("all")}>
                    Todos los funnels
                  </DropdownMenuItem>
                  {liveFunnels.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => setSelectedFunnelId(f.id)}>
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
            <div className="inline-flex w-full rounded-lg border border-border bg-muted p-1 sm:w-auto sm:self-end">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={dateRange === key ? "secondary" : "ghost"}
                  onClick={() => setDateRange(key)}
                  className="h-7 px-2.5 text-xs"
                >
                  {DATE_RANGE_LABELS[key]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <AnalyticsKpiRow summary={summary} previousSummary={previousSummary} />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="gap-3"
        >
          <TabsList variant="line" className="gap-3 self-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="sources">Fuentes</TabsTrigger>
            {mode.kind === "workspace" && (
              <TabsTrigger value="funnels">Funnels</TabsTrigger>
            )}
            <TabsTrigger value="sessions">Visitas</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3">
            <AnalyticsGeneralTab sessions={sessions} fromIso={fromIso} toIso={toIso} />
          </TabsContent>

          <TabsContent value="sources" className="space-y-3">
            <AnalyticsSourcesTab sessions={sessions} />
          </TabsContent>

          {mode.kind === "workspace" && (
            <TabsContent value="funnels" className="space-y-3">
              <AnalyticsFunnelsTab sessions={sessions} funnelNameById={funnelNameById} />
            </TabsContent>
          )}

          <TabsContent value="sessions" className="space-y-3">
            <AnalyticsSessionsTable
              loading={loading}
              sessions={sessions}
              leads={leads}
              filters={sessionsTableFilters}
              onFiltersChange={setSessionsTableFilters}
              stepsByFunnelId={stepsByFunnelId}
              stepOrderByFunnelId={stepOrderByFunnelId}
            />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-3">
            <AnalyticsRevenueTab
              deals={deals}
              totalLeads={summary.totalLeads}
              totalSessions={summary.sessions}
              branches={branches}
            />
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}

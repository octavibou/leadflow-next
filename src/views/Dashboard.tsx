'use client';

import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus, DotsThree, Copy, Trash, Pencil, Megaphone, MagnifyingGlass, SquaresFour, List, Lock, ArrowRight, Rocket, Link, CaretDown, SquaresFour as SquaresFourIcon, Star, NotePencil, LinkSimple, Power, Archive, Export, CaretUpDown } from "@phosphor-icons/react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { FUNNEL_TYPE_LABELS } from "@/types/funnel";
import { exportFunnelToHtml } from "@/lib/exportHtml";
import { supabase } from "@/integrations/supabase/client";
import { getSessionIdFromRow } from "@/lib/sessionAnalytics";
import { cn } from "@/lib/utils";

const TemplatePicker = dynamic(
  () => import("@/components/TemplatePicker").then((m) => m.TemplatePicker),
  { ssr: false }
);

const PendingInvitations = dynamic(
  () => import("@/components/workspace/PendingInvitations").then((m) => m.PendingInvitations),
  { ssr: false }
);

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function pct(numer: number, denom: number): number {
  if (!denom) return 0;
  return clampPct((numer / denom) * 100);
}

function HealthRing({
  label,
  valuePct,
  detail,
  colorClass,
}: {
  label: string;
  valuePct: number;
  detail: string;
  colorClass: string;
}) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clampPct(valuePct) / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dasharray] duration-300", colorClass)}
            style={{
              strokeDasharray: `${dash} ${c - dash}`,
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-sm font-semibold tabular-nums">{Math.round(clampPct(valuePct))}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{detail}</div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { funnels, loading, fetchFunnels, deleteFunnel, duplicateFunnel, saveFunnel, unpublishFunnel } = useFunnelStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const { canCreateFunnel, usage, limits, loading: limitsLoading } = usePlanLimits();
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>("all");
  const router = useRouter();

  const handleNewFunnel = () => {
    if (!canCreateFunnel) {
      toast.error(`Has alcanzado el limite de ${limits.funnels} funnels de tu plan. Actualiza tu plan para crear mas.`);
      return;
    }
    setShowPicker(true);
  };

  useEffect(() => {
    fetchFunnels(currentWorkspaceId || undefined);
  }, [fetchFunnels, currentWorkspaceId]);

  const [funnelLeadCounts, setFunnelLeadCounts] = useState<Record<string, number>>({});
  const [funnelImpressionCounts, setFunnelImpressionCounts] = useState<Record<string, number>>({});
  const [funnelMetrics, setFunnelMetrics] = useState<Record<string, FunnelMetrics>>({});

  const firstQuestionStepIdByFunnel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of funnels) {
      const sorted = [...(f.steps || [])].sort((a: any, b: any) => a.order - b.order);
      const firstQ = sorted.find((s: any) => s.type === "question");
      if (firstQ?.id) map[f.id] = firstQ.id;
    }
    return map;
  }, [funnels]);

  const [health, setHealth] = useState<{
    sessions: number;
    firstAnswered: number;
    completed: number;
    qualified: number;
  }>({ sessions: 0, firstAnswered: 0, completed: 0, qualified: 0 });

  useEffect(() => {
    const loadHealth = async () => {
      if (!supabase || funnels.length === 0) {
        setHealth({ sessions: 0, firstAnswered: 0, completed: 0, qualified: 0 });
        return;
      }
      const ids = funnels.map((f) => f.id);
      const fromDate = getFromDate(dateRange);
      let q = supabase
        .from("events")
        .select("event_type, metadata, created_at, funnel_id")
        .in("funnel_id", ids)
        .in("event_type", ["session_started", "step_view", "qualification_evaluated"]);
      if (fromDate) q = q.gte("created_at", fromDate);
      const { data } = await q;
      const sessionStarted = new Set<string>();
      const firstAnswered = new Set<string>();
      const completed = new Set<string>();
      const qualified = new Set<string>();
      (data || []).forEach((e: any) => {
        const sid = getSessionIdFromRow(e);
        if (!sid) return;
        if (e.event_type === "session_started") {
          sessionStarted.add(sid);
          return;
        }
        if (e.event_type === "step_view") {
          const stepId = (e.metadata || {})?.step_id;
          const first = firstQuestionStepIdByFunnel[e.funnel_id];
          if (first && stepId === first) firstAnswered.add(sid);
          return;
        }
        if (e.event_type === "qualification_evaluated") {
          completed.add(sid);
          if ((e.metadata || {})?.qualified === true) qualified.add(sid);
        }
      });
      setHealth({
        sessions: sessionStarted.size,
        firstAnswered: firstAnswered.size,
        completed: completed.size,
        qualified: qualified.size,
      });
    };
    loadHealth();
  }, [funnels, dateRange, firstQuestionStepIdByFunnel]);

  // Fetch lead and impression counts for all funnels to sort by performance
  useEffect(() => {
    const fetchCounts = async () => {
      if (funnels.length === 0) return;
      const ids = funnels.map(f => f.id);

      const [leadsRes, eventsRes] = await Promise.all([
        supabase.from('leads').select('funnel_id').in('funnel_id', ids),
        supabase.from('events').select('funnel_id').eq('event_type', 'page_view').in('funnel_id', ids),
      ]);

      if (leadsRes.data) {
        const counts: Record<string, number> = {};
        funnels.forEach(f => counts[f.id] = 0);
        leadsRes.data.forEach(l => {
          if (l.funnel_id) counts[l.funnel_id] = (counts[l.funnel_id] || 0) + 1;
        });
        setFunnelLeadCounts(counts);
      }

      if (eventsRes.data) {
        const counts: Record<string, number> = {};
        funnels.forEach(f => counts[f.id] = 0);
        eventsRes.data.forEach(e => {
          if (e.funnel_id) counts[e.funnel_id] = (counts[e.funnel_id] || 0) + 1;
        });
        setFunnelImpressionCounts(counts);
      }
    };
    fetchCounts();
  }, [funnels]);

  // Fetch card metrics in one batch to avoid N+1 requests (2 per funnel)
  useEffect(() => {
    const fetchCardMetrics = async () => {
      if (!supabase || funnels.length === 0) {
        setFunnelMetrics({});
        return;
      }

      const ids = funnels.map((f) => f.id);
      const fromDate = getFromDate(dateRange);

      let leadsQuery = supabase.from("leads").select("funnel_id, created_at").in("funnel_id", ids);
      let eventsQuery = supabase.from("events").select("funnel_id, event_type, created_at").in("funnel_id", ids);
      if (fromDate) {
        leadsQuery = leadsQuery.gte("created_at", fromDate);
        eventsQuery = eventsQuery.gte("created_at", fromDate);
      }

      const [leadsRes, eventsRes] = await Promise.all([leadsQuery, eventsQuery]);
      const nextMetrics: Record<string, FunnelMetrics> = {};
      const leadsCreatedAtByFunnel: Record<string, string[]> = {};

      ids.forEach((id) => {
        leadsCreatedAtByFunnel[id] = [];
        nextMetrics[id] = {
          leadsTotal: 0,
          impressions: 0,
          formStarts: 0,
          chartData: [],
        };
      });

      leadsRes.data?.forEach((lead: any) => {
        const funnelId = lead.funnel_id;
        if (!funnelId || !nextMetrics[funnelId]) return;
        nextMetrics[funnelId].leadsTotal += 1;
        if (lead.created_at) leadsCreatedAtByFunnel[funnelId].push(lead.created_at);
      });

      eventsRes.data?.forEach((event: any) => {
        const funnelId = event.funnel_id;
        if (!funnelId || !nextMetrics[funnelId]) return;
        if (event.event_type === "page_view") nextMetrics[funnelId].impressions += 1;
        if (event.event_type === "form_submit") nextMetrics[funnelId].formStarts += 1;
      });

      ids.forEach((id) => {
        nextMetrics[id].chartData = buildLeadChartData(leadsCreatedAtByFunnel[id], dateRange);
      });

      setFunnelMetrics(nextMetrics);
    };

    fetchCardMetrics();
  }, [funnels, dateRange]);

  // Status priority: Live (0) > Borrador (1) > Archived (2)
  const getFunnelStatusPriority = (f: any): number => {
    if (!!f.archived_at) return 2;
    if (!!f.saved_at && f.saved_at !== f.updated_at) return 0;
    return 1;
  };

  const filteredFunnels = funnels
    .filter((f) => {
      if (!f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const isLive = !!f.saved_at && f.saved_at !== f.updated_at;
      const isArchived = !!(f as any).archived_at;
      const isDraft = !isLive && !isArchived;
      if (funnelFilter === "live")     return isLive;
      if (funnelFilter === "drafts")   return isDraft;
      if (funnelFilter === "archived") return isArchived;
      if (funnelFilter === "offline")  return !isLive && !isArchived;
      // favorites and shared: not yet implemented, show all for now
      return true;
    })
    .sort((a, b) => {
      const statusDiff = getFunnelStatusPriority(a) - getFunnelStatusPriority(b);
      if (statusDiff !== 0) return statusDiff;
      // Second: leads descending
      const leadsDiff = (funnelLeadCounts[b.id] || 0) - (funnelLeadCounts[a.id] || 0);
      if (leadsDiff !== 0) return leadsDiff;
      // Third: impressions descending (tiebreaker when leads are equal)
      return (funnelImpressionCounts[b.id] || 0) - (funnelImpressionCounts[a.id] || 0);
    });

  const handleExport = (id: string) => {
    const funnel = useFunnelStore.getState().getFunnel(id);
    if (!funnel) return;
    const html = exportFunnelToHtml(funnel);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${funnel.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PendingInvitations />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 group outline-none">
              <h1 className="text-2xl font-bold">
                {FUNNEL_FILTER_OPTIONS.find(o => o.value === funnelFilter)?.label}
              </h1>
              <CaretUpDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-0.5" weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {FUNNEL_FILTER_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setFunnelFilter(value)}
                className={`gap-2.5 ${funnelFilter === value ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4 shrink-0" weight="bold" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-2">

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" weight="bold" />
            <Input
              placeholder="Buscar funnels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

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

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* View toggle */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${viewMode === "grid" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
              onClick={() => setViewMode("grid")}
            >
              <SquaresFour className="h-4 w-4" weight="bold" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" weight="bold" />
            </Button>
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1" />

          {/* New funnel */}
          {canCreateFunnel ? (
            <PlasticButton onClick={handleNewFunnel} className="h-8 px-3 text-sm">
              <Plus className="h-3.5 w-3.5" weight="bold" />
              Nuevo funnel
              {!limitsLoading && (
                <span className="text-xs opacity-70">({usage.funnels}/{limits.funnels})</span>
              )}
            </PlasticButton>
          ) : (
            <Button onClick={handleNewFunnel} size="sm" className="h-8 gap-1.5" variant="outline">
              <Lock className="h-3.5 w-3.5" weight="bold" />
              Nuevo funnel
              {!limitsLoading && (
                <span className="text-xs opacity-60">({usage.funnels}/{limits.funnels})</span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Overview (light analytics style) */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen</CardTitle>
            <CardDescription className="text-xs">
              Sesiones, progreso del quiz y calidad del tráfico ({DATE_RANGE_LABELS[dateRange]}).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] text-muted-foreground">Sesiones</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{health.sessions.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] text-muted-foreground">1ª pregunta (rellenada)</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{health.firstAnswered.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] text-muted-foreground">Completadas</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{health.completed.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] text-muted-foreground">Cualificadas</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{health.qualified.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Health Scores</CardTitle>
            <CardDescription className="text-xs">Indicadores rápidos del estado del funnel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthRing
              label="Landing Conversion"
              valuePct={pct(health.firstAnswered, health.sessions)}
              detail={`${health.firstAnswered.toLocaleString()} / ${health.sessions.toLocaleString()} sesiones`}
              colorClass="stroke-emerald-500"
            />
            <HealthRing
              label="Completion Rate"
              valuePct={pct(health.completed, health.sessions)}
              detail={`${health.completed.toLocaleString()} / ${health.sessions.toLocaleString()} iniciadas`}
              colorClass="stroke-blue-500"
            />
            <HealthRing
              label="Traffic Quality"
              valuePct={pct(health.qualified, health.sessions)}
              detail={`${health.qualified.toLocaleString()} cualificadas`}
              colorClass="stroke-violet-500"
            />
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-[16/10] w-full rounded-t-lg" />
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFunnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="rounded-2xl bg-accent/50 p-6 mb-6">
            <Plus className="h-12 w-12 text-primary" weight="bold" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {searchQuery ? "Sin resultados" : "Crea tu primer funnel"}
          </h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {searchQuery
              ? "No se encontraron funnels con ese nombre."
              : "Construye funnels de quiz de alta conversion y compartelos con un link unico."}
          </p>
          {!searchQuery && (
            <Button size="lg" onClick={() => setShowPicker(true)}>
              <Plus className="h-4 w-4 mr-2" weight="bold" /> New Funnel
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFunnels.map((f) => (
            <FunnelCard
              key={f.id}
              funnel={f}
              dateRange={dateRange}
              metrics={funnelMetrics[f.id]}
              onEdit={() => router.push(`/editor/${f.id}`)}
              onCampaigns={() => router.push(`/editor/${f.id}?tab=landing`)}
              onDuplicate={() => duplicateFunnel(f.id)}
              onExport={() => handleExport(f.id)}
              onDelete={() => deleteFunnel(f.id)}
              onTogglePublish={() => {
                const isLive = !!f.saved_at && f.saved_at !== f.updated_at;
                isLive ? unpublishFunnel(f.id) : saveFunnel(f.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFunnels.map((f) => (
            <FunnelListItem
              key={f.id}
              funnel={f}
              onEdit={() => router.push(`/editor/${f.id}`)}
              onCampaigns={() => router.push(`/editor/${f.id}?tab=landing`)}
              onDuplicate={() => duplicateFunnel(f.id)}
              onExport={() => handleExport(f.id)}
              onDelete={() => deleteFunnel(f.id)}
              onTogglePublish={() => {
                const isLive = !!f.saved_at && f.saved_at !== f.updated_at;
                isLive ? unpublishFunnel(f.id) : saveFunnel(f.id);
              }}
            />
          ))}
        </div>
      )}

      <TemplatePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>
  );
};

interface FunnelActionProps {
  funnel: any;
  dateRange?: DateRange;
  metrics?: FunnelMetrics;
  onEdit: () => void;
  onCampaigns: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}

type FunnelFilter = "all" | "favorites" | "drafts" | "live" | "offline" | "archived" | "shared";

const FUNNEL_FILTER_OPTIONS: { value: FunnelFilter; label: string; icon: any }[] = [
  { value: "all",       label: "Todos los Funnels", icon: SquaresFourIcon },
  { value: "favorites", label: "Favoritos",          icon: Star },
  { value: "drafts",    label: "Borradores",          icon: NotePencil },
  { value: "live",      label: "Live",                icon: LinkSimple },
  { value: "offline",   label: "Offline",             icon: Power },
  { value: "archived",  label: "Archivados",          icon: Archive },
  { value: "shared",    label: "Compartidos",         icon: Export },
];

type DateRange = "today" | "7d" | "month" | "year" | "all";
type ChartPoint = { day: string; leads: number };
type FunnelMetrics = {
  leadsTotal: number;
  impressions: number;
  formStarts: number;
  chartData: ChartPoint[];
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "today": "Hoy",
  "7d": "Últimos 7 días",
  "month": "Este mes",
  "year": "Este año",
  "all": "Siempre",
};

function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") {
    return now.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "year") {
    return new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0] + "T00:00:00";
  }
  return null; // all time
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sab"];

function buildLeadChartData(leadsCreatedAt: string[], dateRange: DateRange): ChartPoint[] {
  const now = new Date();
  let buckets: Array<{ key: string; label: string }> = [];

  if (dateRange === "today") {
    const todayKey = now.toISOString().split("T")[0];
    buckets = Array.from({ length: 12 }, (_, i) => {
      const hour = i * 2;
      return {
        key: `${todayKey}T${String(hour).padStart(2, "0")}`,
        label: `${String(hour).padStart(2, "0")}h`,
      };
    });
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
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      return { key: d.toISOString().split("T")[0], label: String(day) };
    });
  } else if (dateRange === "year" || dateRange === "all") {
    const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const startYear = dateRange === "year"
      ? now.getFullYear()
      : (leadsCreatedAt.length > 0 ? new Date(leadsCreatedAt[leadsCreatedAt.length - 1]).getFullYear() : now.getFullYear());

    for (let y = startYear; y <= now.getFullYear(); y++) {
      const endM = y < now.getFullYear() ? 11 : now.getMonth();
      for (let m = 0; m <= endM; m++) {
        const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
        buckets.push({ key: monthKey, label: MONTH_LABELS[m] });
      }
    }
  }

  return buckets.map(({ key, label }) => ({
    day: label,
    leads: leadsCreatedAt.filter((createdAt) => createdAt?.startsWith(key)).length,
  }));
}

function FunnelCard({ funnel, dateRange = "7d", metrics, onEdit, onCampaigns, onDuplicate, onExport, onDelete, onTogglePublish }: FunnelActionProps) {
  const leadsTotal = metrics?.leadsTotal || 0;
  const impressions = metrics?.impressions || 0;
  const formStarts = metrics?.formStarts || 0;
  const chartData = metrics?.chartData || buildLeadChartData([], dateRange);

  const isLive = !!funnel.saved_at && funnel.saved_at !== funnel.updated_at;
  const ctr = impressions > 0 ? ((formStarts / impressions) * 100).toFixed(1) : "0.0";
  const convRate = impressions > 0 ? ((leadsTotal / impressions) * 100).toFixed(1) : "0.0";

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative group"
      onClick={onEdit}
    >
      {/* Three dots top-right */}
      <div
        className="absolute top-3 right-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <FunnelDropdown
          funnel={funnel}
          onEdit={onEdit}
          onCampaigns={onCampaigns}
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
        />
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 pr-8">
          {funnel.name}
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </span>
          )}
          {!isLive && (
            <span className="text-xs font-normal text-yellow-600">Borrador</span>
          )}
        </CardTitle>

        {/* Metrics row */}
        <div className="flex items-center gap-4 mt-3">
          <div>
            <p className="text-[11px] text-muted-foreground leading-none">Impresiones</p>
            <p className="text-sm font-semibold mt-0.5">{impressions.toLocaleString()}</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-none">CTR</p>
            <p className="text-sm font-semibold mt-0.5">{ctr}%</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-none">Leads</p>
            <p className="text-sm font-semibold mt-0.5">{leadsTotal.toLocaleString()}</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-none">Conv.</p>
            <p className="text-sm font-semibold mt-0.5">{convRate}%</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${funnel.id}`} x1="0" y1="0" x2="0" y2="1">
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
                fill={`url(#grad-${funnel.id})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between px-4 pb-3 pt-1">
          {chartData.map((item) => (
            <span key={item.day} className="text-[10px] text-muted-foreground">{item.day}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelListItem({ funnel, onEdit, onCampaigns, onDuplicate, onExport, onDelete, onTogglePublish }: FunnelActionProps) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group"
      onClick={onEdit}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{funnel.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium truncate">{funnel.name}</h3>
        <p className="text-xs text-muted-foreground">
          {new Date(funnel.updated_at).toLocaleDateString("es-ES")}
        </p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {FUNNEL_TYPE_LABELS[funnel.type as keyof typeof FUNNEL_TYPE_LABELS]}
      </Badge>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <FunnelDropdown
          funnel={funnel}
          onEdit={onEdit}
          onCampaigns={onCampaigns}
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
          onTogglePublish={onTogglePublish}
        />
      </div>
    </div>
  );
}

function FunnelDropdown({ funnel, onEdit, onCampaigns, onDuplicate, onExport, onDelete, onTogglePublish }: FunnelActionProps) {
  const isLive = !!funnel.saved_at && funnel.saved_at !== funnel.updated_at;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <DotsThree className="h-4 w-4" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" weight="bold" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTogglePublish}>
          {isLive ? (
            <>
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" weight="bold" /> Despublicar
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" weight="bold" /> Publicar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCampaigns}>
          <Megaphone className="h-4 w-4 mr-2" weight="bold" /> Campanas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" weight="bold" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const url = `${window.location.origin}/f/${funnel.id}`;
          navigator.clipboard.writeText(url);
          toast.success("Link copiado");
        }}>
          <Link className="h-4 w-4 mr-2" weight="bold" /> Copiar link
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-2" weight="bold" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Dashboard;

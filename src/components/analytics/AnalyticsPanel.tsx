"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, CaretUpDown } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Funnel, FunnelStep } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { GeoCountryCityInline } from "@/components/GeoCountryCityInline";
import {
  buildSessionDetails,
  classifySessionSource,
  getSessionIdFromRow,
  formatDurationMs,
  sessionSourceShortLabel,
  type SessionDetail,
} from "@/lib/sessionAnalytics";
import { FunnelSessionDetailSheet } from "@/components/editor/FunnelSessionDetailSheet";

type DateRange = "today" | "7d" | "month" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Hoy",
  "7d": "7d",
  month: "Mes",
  all: "Siempre",
};

function getFromDate(range: DateRange): string | null {
  const now = new Date();
  if (range === "today") return now.toISOString().split("T")[0] + "T00:00:00";
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0] + "T00:00:00";
  }
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0] + "T00:00:00";
  return null;
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

  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(() => (mode.kind === "funnel" ? mode.funnelId : "all"));
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; funnel_id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "facebook" | "google" | "direct" | "other">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "qualified" | "disqualified" | "lead" | "pending">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (mode.kind === "funnel") setSelectedFunnelId(mode.funnelId);
  }, [mode]);

  const funnelIds = useMemo(() => {
    const ids = liveFunnels.map((f) => f.id);
    if (mode.kind === "funnel") return [mode.funnelId];
    if (selectedFunnelId === "all") return ids;
    return [selectedFunnelId];
  }, [liveFunnels, selectedFunnelId, mode]);

  const funnelIdsKey = useMemo(() => funnelIds.join("|"), [funnelIds]);

  useEffect(() => {
    const load = async () => {
      if (funnelIds.length === 0) {
        setEvents([]);
        setLeads([]);
        setCampaigns([]);
        return;
      }
      setLoading(true);
      const fromDate = getFromDate(dateRange);

      let evQuery = supabase
        .from("events")
        .select("id, event_type, metadata, created_at, funnel_id, campaign_id")
        .in("funnel_id", funnelIds);
      let ldQuery = supabase
        .from("leads")
        .select("id, created_at, funnel_id, campaign_id, result, answers, metadata")
        .in("funnel_id", funnelIds);
      let campQuery = supabase
        .from("campaigns")
        .select("id, name, funnel_id")
        .in("funnel_id", funnelIds);

      if (fromDate) {
        evQuery = evQuery.gte("created_at", fromDate);
        ldQuery = ldQuery.gte("created_at", fromDate);
      }

      const [evRes, ldRes, campRes] = await Promise.all([
        evQuery.order("created_at", { ascending: true }),
        ldQuery.order("created_at", { ascending: true }),
        campQuery.order("created_at", { ascending: true }),
      ]);

      setEvents(evRes.data || []);
      setLeads(ldRes.data || []);
      setCampaigns(campRes.data || []);
      setLoading(false);
    };
    load();
  }, [funnelIds, funnelIdsKey, dateRange]);

  const funnelNameById = useMemo(() => new Map(liveFunnels.map((f) => [f.id, f.name] as [string, string])), [liveFunnels]);
  const campaignNameById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name] as [string, string])),
    [campaigns],
  );

  const sessionDetails = useMemo(
    () => buildSessionDetails(events, leads, funnelNameById, campaignNameById),
    [events, leads, funnelNameById, campaignNameById],
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

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessionDetails.filter((s) => {
      if (q) {
        const hay = [
          s.sessionId,
          s.attribution?.fbclid || "",
          s.attribution?.landing_url || "",
          s.attribution?.resolvedSource || "",
          s.campaignName || "",
          s.funnelName || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (channelFilter !== "all" && classifySessionSource(s) !== channelFilter) return false;
      if (statusFilter === "qualified") return s.qualified === true;
      if (statusFilter === "disqualified") return s.qualified === false;
      if (statusFilter === "lead") return s.hasLead;
      if (statusFilter === "pending") return s.qualified === null;
      return true;
    });
  }, [sessionDetails, search, channelFilter, statusFilter]);

  function sessionQuestionNumber(s: SessionDetail): number | null {
    if (!s.lastAnsweredStepId) return null;
    const map = stepOrderByFunnelId.get(s.funnelId);
    const n = map?.get(s.lastAnsweredStepId);
    return typeof n === "number" ? n : null;
  }

  const selectedDetail = selectedSessionId
    ? sessionDetails.find((x) => x.sessionId === selectedSessionId) ?? null
    : null;
  const selectedLead = selectedSessionId
    ? leads.find((l) => getSessionIdFromRow(l) === selectedSessionId) ?? null
    : null;

  const leadFormData =
    selectedLead?.metadata && typeof (selectedLead.metadata as any).formData === "object"
      ? ((selectedLead.metadata as any).formData as Record<string, string>)
      : null;
  const leadAnswers = (selectedLead?.answers as Record<string, string> | undefined) ?? null;
  const leadMetadataRaw =
    selectedLead?.metadata && typeof selectedLead.metadata === "object"
      ? (selectedLead.metadata as Record<string, unknown>)
      : null;

  const stats = useMemo(() => {
    const sessionRows = sessionDetails;
    const evaluated = sessionRows.filter((s) => s.qualified !== null);
    const qualified = evaluated.filter((s) => s.qualified === true);
    const qualityScore = evaluated.length > 0 ? (qualified.length / evaluated.length) * 100 : 0;

    const attributionBuckets = (() => {
      const firstSeen = new Set<string>();
      const counts = { Meta: 0, Google: 0, Directo: 0, Otro: 0 };
      const sorted = [...events].sort((a, b) =>
        String(a.created_at || "").localeCompare(String(b.created_at || "")),
      );
      for (const e of sorted) {
        if (e.event_type !== "session_started" && e.event_type !== "page_view") continue;
        const sid = e.metadata?.session_id;
        if (typeof sid !== "string" || !sid || firstSeen.has(sid)) continue;
        firstSeen.add(sid);
        const m = e.metadata || {};
        if (m.fbclid) counts.Meta++;
        else if (m.gclid) counts.Google++;
        else if (m.attribution_source === "direct" || m.attribution_medium === "none") counts.Directo++;
        else counts.Otro++;
      }
      return counts;
    })();

    return {
      totalSessions: sessionRows.length,
      evaluatedSessions: evaluated.length,
      qualifiedSessions: qualified.length,
      qualityScore,
      attributionBuckets,
    };
  }, [events, sessionDetails]);

  const titleRight = mode.kind === "funnel"
    ? (funnelNameById.get(mode.funnelId) || "—")
    : (selectedFunnelId === "all" ? "Workspace" : (funnelNameById.get(selectedFunnelId) || "—"));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xl font-semibold">Analytics</h2>
            <span className="text-sm text-muted-foreground truncate">{titleRight}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Sesiones, atribución y calidad (first-touch) a partir de `events` y `leads`.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sesiones por canal (first-touch)</CardTitle>
          <p className="text-[11px] text-muted-foreground font-normal">
            Basado en la primera vista (`session_started` / `page_view`) con metadata de atribución.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(
              [
                ["Meta", stats.attributionBuckets.Meta],
                ["Google", stats.attributionBuckets.Google],
                ["Directo", stats.attributionBuckets.Directo],
                ["Otro", stats.attributionBuckets.Otro],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{n}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones evaluadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.evaluatedSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sesiones cualificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.qualifiedSessions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">% cualificación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.qualityScore.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="text-base">Todas las sesiones</CardTitle>
          <Input
            placeholder="Buscar por id de sesión, fbclid, landing, funnel o campaña…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-md text-sm"
          />
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">Canal</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "Todos"],
                  ["facebook", "Meta"],
                  ["google", "Google"],
                  ["direct", "Directo"],
                  ["other", "Otro"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={channelFilter === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setChannelFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "Todas"],
                  ["qualified", "Cualificado"],
                  ["disqualified", "Descualificado"],
                  ["lead", "Con lead"],
                  ["pending", "Sin eval."],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={statusFilter === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando sesiones…</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay sesiones que coincidan</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              {/* Un solo área scroll: si el scroll vertical solo aplicara al body, la barra estrecha las filas y desalinea los títulos. */}
              <div className="max-h-[520px] min-w-[1080px] overflow-y-auto [scrollbar-gutter:stable]">
                <table className="w-full caption-bottom border-collapse text-xs table-fixed">
                  <colgroup>
                    {/* ID solo necesita ~9 chars + línea de hora; el exceso empujaba país muy a la derecha. */}
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/80">
                    <tr className="text-[11px] font-medium text-muted-foreground">
                      <th className="py-2 pl-3 pr-2 text-left font-medium align-middle">ID / hora / día</th>
                      <th className="py-2 pl-2 pr-3 text-center font-medium align-middle">País</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Fuente</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Tiempo total</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">1ª preg.</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Se fue en</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Acabó</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Tiempo form</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Cualificado</th>
                      <th className="px-3 py-2 text-center font-medium align-middle">Visitas</th>
                      <th className="px-3 py-2 text-right font-medium align-middle">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                  {filteredRows.map((s) => {
                    const formTime =
                      s.contactViewAt && s.formSubmitAt
                        ? formatDurationMs(s.contactViewAt, s.formSubmitAt)
                        : "—";
                    const totalTime =
                      s.landingStartAt && s.sessionEndAt
                        ? formatDurationMs(s.landingStartAt, s.sessionEndAt)
                        : "—";
                    const finalStatusLabel =
                      s.qualified === true
                        ? "Cualificado"
                        : s.qualified === false
                          ? "Descualificado"
                          : "—";
                    const finalStatusClass =
                      s.qualified === true ? "bg-green-500/10 text-green-700" :
                      s.qualified === false ? "bg-red-500/10 text-red-700" :
                      "bg-zinc-500/10 text-zinc-600";

                    const hasStarted = s.startedQuiz;
                    const leftAt = sessionQuestionNumber(s);
                    const finished = s.completedQuiz;

                    const visits = s.sessionStarts > 0 ? s.sessionStarts : 1;
                    const when = s.lastSeen ? new Date(s.lastSeen) : null;
                    const whenTime = when
                      ? when.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                      : "—";
                    const whenDay = when
                      ? when.toLocaleDateString("es-ES", { dateStyle: "short" })
                      : "—";

                    return (
                      <tr key={s.sessionId} className="hover:bg-muted/30">
                        <td className="min-w-0 py-2 pl-3 pr-2 align-middle">
                          <p className="font-mono text-[10px] truncate" title={s.sessionId}>
                            {s.sessionId.slice(0, 8)}…
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {whenTime} · {whenDay}
                            {s.campaignName ? ` · ${s.campaignName}` : ""}
                          </p>
                        </td>
                        <td className="min-w-0 py-2 pl-2 pr-3 text-center align-middle">
                          {s.geo?.country || s.geo?.city ? (
                            <p
                              className="flex min-w-0 items-center justify-center gap-1 truncate text-[11px] font-medium"
                              title={[s.geo?.country, s.geo?.city].filter(Boolean).join(" · ")}
                            >
                              <GeoCountryCityInline country={s.geo?.country} city={s.geo?.city} />
                            </p>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="flex justify-center">
                            <Badge variant="outline" className="w-fit text-[10px] font-normal">
                              {sessionSourceShortLabel(s)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle text-[10px] tabular-nums text-muted-foreground">
                          {totalTime}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-center">
                            {hasStarted ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Sí
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle font-medium tabular-nums">{leftAt ? `P${leftAt}` : "—"}</td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-center">
                            {finished ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                Sí
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle text-[10px] tabular-nums text-muted-foreground">
                          {formTime}
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="flex justify-center">
                            <span className={cn("inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-medium", finalStatusClass)}>
                              {finalStatusLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center align-middle font-medium tabular-nums">{visits}</td>
                        <td className="px-3 py-2 text-right align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() => {
                              setSelectedSessionId(s.sessionId);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" weight="bold" />
                            Detalle
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Mostrando {filteredRows.length} de {sessionDetails.length} sesiones en este rango.
          </p>
        </CardContent>
      </Card>

      <FunnelSessionDetailSheet
        open={!!selectedSessionId}
        onOpenChange={(v) => {
          if (!v) setSelectedSessionId(null);
        }}
        detail={selectedDetail}
        stepsByFunnelId={stepsByFunnelId}
        leadAnswers={leadAnswers}
        leadFormData={leadFormData}
        leadMetadataRaw={leadMetadataRaw}
      />
    </div>
  );
}


"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { CaretDown, CaretUpDown, Rows, Trophy } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

function getCvrStyle(cvr: number, isBest: boolean = false): { color: string; bg: string; icon: any } {
  if (isBest)     return { color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Trophy };
  if (cvr >= 10)  return { color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Trophy };
  if (cvr >= 5)   return { color: "text-green-600",  bg: "bg-green-500/10",  icon: null };
  if (cvr >= 3)   return { color: "text-orange-600", bg: "bg-orange-500/10", icon: null };
  return           { color: "text-red-600",    bg: "bg-red-500/10",    icon: null };
}

function getSessionIdFromRow(row: { metadata?: unknown } | null): string | null {
  const m = row?.metadata as Record<string, unknown> | undefined;
  const value = m?.session_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

type SessionUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

type SessionDetail = {
  sessionId: string;
  funnelId: string;
  funnelName: string;
  campaignId: string | null;
  campaignName: string | null;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  pageViews: number;
  stepViews: number;
  formSubmits: number;
  sessionStarts: number;
  resultAssigned: number;
  qualified: boolean | null;
  hasLead: boolean;
  leadResult: string | null;
  leadAt: string | null;
  utm: SessionUtm;
  timeline: Array<{
    id: string;
    created_at: string;
    event_type: string;
    funnel_id: string;
    campaign_id: string | null;
    metadata: Record<string, unknown>;
  }>;
};

function pickUtmsFromMetadata(meta: Record<string, unknown> | undefined): SessionUtm {
  if (!meta) return {};
  const out: SessionUtm = {};
  const pairs: [keyof SessionUtm, string][] = [
    ["source", "utm_source"],
    ["medium", "utm_medium"],
    ["campaign", "utm_campaign"],
    ["term", "utm_term"],
    ["content", "utm_content"],
  ];
  pairs.forEach(([k, raw]) => {
    const v = meta[raw];
    if (typeof v === "string" && v.length > 0) out[k] = v;
  });
  return out;
}

function mergeUtms(a: SessionUtm, b: SessionUtm): SessionUtm {
  return { ...a, ...Object.fromEntries(Object.entries(b).filter(([, v]) => v)) };
}

function formatDurationMs(start: string, end: string): string {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return "—";
  const sec = Math.round((b - a) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function timelineEventTitle(eventType: string): string {
  const map: Record<string, string> = {
    session_started: "Inicio de sesión",
    page_view: "Página (landing)",
    step_view: "Respuesta al quiz",
    qualification_evaluated: "Cualificación final",
    form_submit: "Formulario de contacto",
    result_assigned: "Pantalla de resultados",
    lead_saved: "Lead en base de datos",
  };
  return map[eventType] || eventType;
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-medium break-words text-foreground/95">{value}</span>
    </div>
  );
}

function UtmFieldBlock({ utm }: { utm: SessionUtm }) {
  const rows: { label: string; value: string }[] = [];
  if (utm.source) rows.push({ label: "Origen (UTM)", value: utm.source });
  if (utm.medium) rows.push({ label: "Medio (UTM)", value: utm.medium });
  if (utm.campaign) rows.push({ label: "Campaña (UTM)", value: utm.campaign });
  if (utm.term) rows.push({ label: "Término (UTM)", value: utm.term });
  if (utm.content) rows.push({ label: "Contenido (UTM)", value: utm.content });
  if (rows.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
      {rows.map((r) => (
        <FieldRow key={r.label} label={r.label} value={r.value} />
      ))}
    </div>
  );
}

function TimelineEventDetails({
  eventType,
  funnelId,
  metadata,
  stepsByFunnelId,
}: {
  eventType: string;
  funnelId: string;
  metadata: Record<string, unknown>;
  stepsByFunnelId: Map<string, FunnelStep[]>;
}): ReactNode {
  const m = metadata;

  if (eventType === "step_view") {
    const stepId = typeof m.step_id === "string" ? m.step_id : "";
    const answerVal = typeof m.answer === "string" ? m.answer : "";
    const steps = stepsByFunnelId.get(funnelId) || [];
    const step = steps.find((s) => s.id === stepId);
    const q = step?.type === "question" ? step.question : undefined;
    const opt = q?.options.find((o) => o.value === answerVal);
    const questionText = q?.text || "Paso del funnel";
    const answerLabel = opt?.label || answerVal || "—";
    const qualifies = opt ? opt.qualifies : m.qualifies;

    return (
      <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Pregunta" value={questionText} />
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2">
          <span className="text-[10px] text-muted-foreground">Respuesta</span>
          <span className="text-[11px] font-medium text-foreground/95">
            {opt?.emoji && <span className="mr-1">{opt.emoji}</span>}
            {answerLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2 sm:items-center">
          <span className="text-[10px] text-muted-foreground">Impacto cualificación</span>
          <span>
            {qualifies === true && (
              <Badge variant="secondary" className="text-[9px] font-normal">Cualifica</Badge>
            )}
            {qualifies === false && (
              <Badge variant="destructive" className="text-[9px] font-normal">Descualifica</Badge>
            )}
            {qualifies == null && <span className="text-[11px] text-muted-foreground">—</span>}
          </span>
        </div>
      </div>
    );
  }

  if (eventType === "session_started" || eventType === "page_view") {
    const utm = pickUtmsFromMetadata(m);
    if (Object.keys(utm).length > 0) {
      return <UtmFieldBlock utm={utm} />;
    }
    return (
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {eventType === "page_view" ? "Vista de la página de entrada" : "Seguimiento de la visita iniciado"}
      </p>
    );
  }

  if (eventType === "qualification_evaluated") {
    const ok = m.qualified === true;
    const no = m.qualified === false;
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow
          label="Resultado del quiz"
          value={ok ? "Cualificado" : no ? "No cualificado" : "—"}
        />
        {typeof m.evaluated_questions === "number" && (
          <FieldRow label="Preguntas evaluadas" value={String(m.evaluated_questions)} />
        )}
      </div>
    );
  }

  if (eventType === "form_submit") {
    return (
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Se enviaron los datos del paso de contacto (creación de lead).
      </p>
    );
  }

  if (eventType === "result_assigned") {
    const r = typeof m.result === "string" ? m.result : "—";
    const steps = stepsByFunnelId.get(funnelId) || [];
    const stepId = typeof m.step_id === "string" ? m.step_id : "";
    const step = steps.find((s) => s.id === stepId);
    const stepName =
      step?.type === "results" && step.resultsConfig
        ? "Pantalla de resultados"
        : step
          ? `Paso (${step.type})`
          : stepId
            ? `Paso ${stepId.slice(0, 8)}…`
            : "—";
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Paso" value={stepName} />
        <FieldRow label="Resultado" value={r} />
      </div>
    );
  }

  if (eventType === "lead_saved") {
    const r = typeof m.result === "string" ? m.result : "—";
    const note = typeof m.note === "string" ? m.note : "";
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Estado" value={r} />
        {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
      </div>
    );
  }

  const keys = Object.keys(m).filter((k) => k !== "session_id");
  if (keys.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-muted/30 p-2">
      {keys.map((k) => (
        <FieldRow key={k} label={k} value={String(m[k])} />
      ))}
    </div>
  );
}

function buildSessionDetails(
  events: any[],
  leads: any[],
  funnelNameById: Map<string, string>,
  campaignNameById: Map<string, string>
): SessionDetail[] {
  const eventGroups = new Map<string, any[]>();
  for (const e of events) {
    const sid = getSessionIdFromRow(e);
    if (!sid) continue;
    if (!eventGroups.has(sid)) eventGroups.set(sid, []);
    eventGroups.get(sid)!.push(e);
  }

  const leadBySession = new Map<string, (typeof leads)[0]>();
  leads.forEach((l) => {
    const sid = getSessionIdFromRow(l);
    if (sid) leadBySession.set(sid, l);
  });

  const allIds = new Set<string>([...eventGroups.keys(), ...leadBySession.keys()]);
  const rows: SessionDetail[] = [];

  for (const sessionId of allIds) {
    const evs = (eventGroups.get(sessionId) || [])
      .slice()
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const lead = leadBySession.get(sessionId) ?? null;

    const funnelId = (evs[0]?.funnel_id as string) || (lead?.funnel_id as string) || "";
    const funnelName = funnelNameById.get(funnelId) || funnelId.slice(0, 8) || "—";

    let campaignId: string | null = (evs[0]?.campaign_id as string | null) ?? (lead?.campaign_id as string | null) ?? null;
    for (const e of evs) {
      if (e.campaign_id) {
        campaignId = e.campaign_id as string;
        break;
      }
    }
    const campaignName = campaignId ? campaignNameById.get(campaignId) ?? null : null;

    let firstSeen = evs[0]?.created_at as string | undefined;
    let lastSeen = evs[evs.length - 1]?.created_at as string | undefined;
    if (lead?.created_at) {
      const lc = String(lead.created_at);
      if (!firstSeen || lc < firstSeen) firstSeen = lc;
      if (!lastSeen || lc > lastSeen) lastSeen = lc;
    }
    if (!firstSeen) firstSeen = lastSeen || "";
    if (!lastSeen) lastSeen = firstSeen;

    let utm: SessionUtm = {};
    for (const e of evs) {
      const meta = (e.metadata || {}) as Record<string, unknown>;
      const part = pickUtmsFromMetadata(meta);
      if (Object.keys(part).length) utm = mergeUtms(utm, part);
    }
    if (lead?.metadata && typeof lead.metadata === "object") {
      utm = mergeUtms(utm, pickUtmsFromMetadata(lead.metadata as Record<string, unknown>));
    }

    let pageViews = 0;
    let stepViews = 0;
    let formSubmits = 0;
    let sessionStarts = 0;
    let resultAssigned = 0;
    let qualified: boolean | null = null;

    for (const e of evs) {
      const t = e.event_type as string;
      if (t === "page_view") pageViews += 1;
      if (t === "step_view") stepViews += 1;
      if (t === "form_submit") formSubmits += 1;
      if (t === "session_started") sessionStarts += 1;
      if (t === "result_assigned") resultAssigned += 1;
      if (t === "qualification_evaluated") {
        qualified = Boolean((e.metadata as any)?.qualified);
      }
    }

    if (qualified === null && lead) {
      if (lead.result === "qualified") qualified = true;
      if (lead.result === "disqualified") qualified = false;
    }

    const timeline = evs.map((e) => ({
      id: String(e.id),
      created_at: String(e.created_at),
      event_type: String(e.event_type),
      funnel_id: String(e.funnel_id || funnelId),
      campaign_id: (e.campaign_id as string | null) ?? null,
      metadata: { ...((e.metadata || {}) as Record<string, unknown>) },
    }));

    if (lead && !timeline.some((t) => t.event_type === "form_submit")) {
      timeline.push({
        id: `lead-${lead.id}`,
        created_at: String(lead.created_at),
        event_type: "lead_saved",
        funnel_id: String(lead.funnel_id),
        campaign_id: (lead.campaign_id as string | null) ?? null,
        metadata: {
          result: lead.result,
          note: "Registro en tabla leads (puede coincidir con form_submit)",
        },
      });
      timeline.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }

    rows.push({
      sessionId,
      funnelId,
      funnelName,
      campaignId,
      campaignName,
      firstSeen,
      lastSeen,
      eventCount: evs.length,
      pageViews,
      stepViews,
      formSubmits,
      sessionStarts,
      resultAssigned,
      qualified,
      hasLead: !!lead,
      leadResult: lead ? (lead.result as string | null) : null,
      leadAt: lead ? String(lead.created_at) : null,
      utm,
      timeline,
    });
  }

  rows.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  return rows;
}

export default function Analytics() {
  const { funnels: allFunnels, loading: funnelsLoading, fetchFunnels } = useFunnelStore();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [events, setEvents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [funnelConversions, setFunnelConversions] = useState<Record<string, number>>({});
  const [campaignMetrics, setCampaignMetrics] = useState<Record<string, { views: number; clicks: number }>>({});
  const [sessionsSheetOpen, setSessionsSheetOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<"all" | "qualified" | "disqualified" | "lead" | "pending">("all");

  // Only live funnels have analytics
  const funnels = useMemo(
    () => allFunnels.filter((f) => !!f.saved_at && f.saved_at !== f.updated_at),
    [allFunnels]
  );

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  // Fetch campaigns in one batched query (avoid N requests for N funnels)
  useEffect(() => {
    const loadCampaigns = async () => {
      if (!supabase || funnels.length === 0) {
        setCampaigns([]);
        return;
      }

      let query = supabase.from("campaigns").select("id, funnel_id, name");
      if (selectedFunnelId === "all") {
        query = query.in("funnel_id", funnels.map((f) => f.id));
      } else {
        query = query.eq("funnel_id", selectedFunnelId);
      }

      const { data } = await query.order("created_at", { ascending: true });
      setCampaigns(data || []);
    };

    loadCampaigns();
  }, [selectedFunnelId, funnels]);

  useEffect(() => {
    if (campaigns.length === 0) {
      setCampaignMetrics({});
    }
  }, [campaigns]);

  // Fetch per-funnel conversion rates for dropdown ordering + badges
  // Conversion = leads / page_views (impressions)
  useEffect(() => {
    const fetchConversions = async () => {
      if (funnels.length === 0) return;
      const ids = funnels.map((f) => f.id);
      const [impressionsRes, leadsRes] = await Promise.all([
        supabase.from("events").select("funnel_id").eq("event_type", "page_view").in("funnel_id", ids),
        supabase.from("leads").select("funnel_id").in("funnel_id", ids),
      ]);
      const impressions: Record<string, number> = {};
      const leadsMap: Record<string, number> = {};
      funnels.forEach((f) => { impressions[f.id] = 0; leadsMap[f.id] = 0; });
      impressionsRes.data?.forEach((e) => { if (e.funnel_id) impressions[e.funnel_id] = (impressions[e.funnel_id] || 0) + 1; });
      leadsRes.data?.forEach((l) => { if (l.funnel_id) leadsMap[l.funnel_id] = (leadsMap[l.funnel_id] || 0) + 1; });
      const cvrs: Record<string, number> = {};
      funnels.forEach((f) => {
        cvrs[f.id] = impressions[f.id] > 0 ? (leadsMap[f.id] / impressions[f.id]) * 100 : 0;
      });
      setFunnelConversions(cvrs);
    };
    fetchConversions();
  }, [funnels]);

  useEffect(() => {
    const load = async () => {
      if (funnels.length === 0) return;
      setLoading(true);
      const fromDate = getFromDate(dateRange);
      const funnelIds = funnels.map((f) => f.id);

      let eventsQuery = supabase
        .from("events")
        .select("id, event_type, metadata, created_at, funnel_id, campaign_id");

      let leadsQuery = supabase
        .from("leads")
        .select("created_at, funnel_id, metadata, result");

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
      
      // Fetch campaign metrics (views and clicks by campaign)
      const campaignIds = campaigns.map(c => c.id);
      if (campaignIds.length > 0) {
        const campaignEventsRes = await (supabase as any)
          .from("events")
          .select("metadata, event_type")
          .in("metadata->>campaign_id", campaignIds);
        
        const metrics: Record<string, { views: number; clicks: number }> = {};
        campaigns.forEach(c => { metrics[c.id] = { views: 0, clicks: 0 }; });
        campaignEventsRes.data?.forEach((e) => {
          const campaignId = e.metadata?.campaign_id;
          if (campaignId && metrics[campaignId]) {
            if (e.event_type === "page_view") metrics[campaignId].views++;
            if (e.event_type === "form_submit") metrics[campaignId].clicks++;
          }
        });
        setCampaignMetrics(metrics);
      }
      
      setLoading(false);
    };
    load();
  }, [selectedFunnelId, dateRange, funnels, campaigns]);

  const selectedFunnel = useMemo(
    () => (selectedFunnelId === "all" ? null : funnels.find((f) => f.id === selectedFunnelId) ?? null),
    [funnels, selectedFunnelId]
  );

  const steps = useMemo((): FunnelStep[] => {
    const raw = selectedFunnel?.steps;
    return Array.isArray(raw) ? (raw as FunnelStep[]) : [];
  }, [selectedFunnel]);

  const stats = useMemo(() => {
    const uniqueSessions = (rows: any[]): Set<string> => {
      const set = new Set<string>();
      rows.forEach((row) => {
        const sessionId = getSessionIdFromRow(row);
        if (sessionId) set.add(sessionId);
      });
      return set;
    };

    const funnelNameById = new Map(funnels.map((f) => [f.id, f.name] as [string, string]));
    const campaignNameById = new Map(campaigns.map((c) => [c.id, c.name] as [string, string]));

    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const formSubmits = events.filter((e) => e.event_type === "form_submit").length;
    const totalLeads = leads.length;
    
    const landingSessions = uniqueSessions(events.filter((e) => e.event_type === "page_view"));
    const startedFunnelSessions = uniqueSessions(events.filter((e) => e.event_type === "step_view"));
    const formSubmitSessions = uniqueSessions(events.filter((e) => e.event_type === "form_submit"));
    const sessionStartedEvents = uniqueSessions(events.filter((e) => e.event_type === "session_started"));
    const totalSessions = sessionStartedEvents.size || landingSessions.size;

    const qualificationBySession = new Map<string, boolean>();
    events
      .filter((e) => e.event_type === "qualification_evaluated")
      .forEach((event) => {
        const sessionId = getSessionIdFromRow(event);
        if (!sessionId) return;
        qualificationBySession.set(sessionId, Boolean(event.metadata?.qualified));
      });
    leads.forEach((lead: { metadata?: unknown; result?: string | null }) => {
      const sessionId = getSessionIdFromRow(lead);
      if (!sessionId || qualificationBySession.has(sessionId)) return;
      if (lead.result === "qualified") qualificationBySession.set(sessionId, true);
      if (lead.result === "disqualified") qualificationBySession.set(sessionId, false);
    });

    const sessionDetails = buildSessionDetails(events, leads, funnelNameById, campaignNameById);

    const evaluatedSessions = qualificationBySession.size;
    const qualifiedSessions = Array.from(qualificationBySession.values()).filter(Boolean).length;
    const disqualifiedSessions = Math.max(0, evaluatedSessions - qualifiedSessions);
    const qualityScore = evaluatedSessions > 0 ? (qualifiedSessions / evaluatedSessions) * 100 : 0;
    const disqualifiedRate = evaluatedSessions > 0 ? (disqualifiedSessions / evaluatedSessions) * 100 : 0;
    const landingConversion = landingSessions.size > 0 ? (startedFunnelSessions.size / landingSessions.size) * 100 : 0;
    const funnelConversion = startedFunnelSessions.size > 0 ? (formSubmitSessions.size / startedFunnelSessions.size) * 100 : 0;
    const healthScore = (landingConversion * 0.35) + (funnelConversion * 0.35) + (qualityScore * 0.3);

    // CTR = clicks (form_submit) / impressions (page_view)
    const ctr = pageViews > 0 ? (formSubmits / pageViews) * 100 : 0;
    // CVR = leads / impressions (from visitor to lead)
    const cvr = pageViews > 0 ? (totalLeads / pageViews) * 100 : 0;

    // Step funnel data (exclude intro, start from first question step)
    const stepViews = events.filter((e) => e.event_type === "step_view");
    const funnelSteps = steps.filter((s) => s.type !== "intro");
    const stepFunnel = funnelSteps.map((step) => {
      const count = stepViews.filter((e) => e.metadata?.step_id === step.id).length;
      const stepName = (step as any).title ?? (step as any).name ?? step.id;
      return { id: step.id, name: stepName, count };
    });
    
    // Iniciados = first step views (the highest count in stepFunnel, or form_submits as fallback)
    const iniciados = stepFunnel.length > 0 
      ? Math.max(...stepFunnel.map(s => s.count), formSubmits)
      : formSubmits;

    // Landing variants from campaigns table + the funnel itself
    const campaignVariants = campaigns.length > 0 
      ? campaigns.map(c => ({
          id: c.id,
          name: c.name,
          views: campaignMetrics[c.id]?.views || 0,
          clicks: campaignMetrics[c.id]?.clicks || 0,
          isFunnel: false,
        }))
      : [];
    
    // Add the funnel as a variant (shows funnel entry performance)
    const funnelVariant = {
      id: "funnel",
      name: "Funnel",
      views: iniciados,
      clicks: totalLeads,
      isFunnel: true,
    };
    
    const variants = [...campaignVariants, funnelVariant];
    
    // Sort by CTR
    const sortedVariants = [...variants].sort((a, b) => {
      const ctrA = a.views > 0 ? a.clicks / a.views : 0;
      const ctrB = b.views > 0 ? b.clicks / b.views : 0;
      return ctrB - ctrA;
    });
    const bestVariantId = sortedVariants[0]?.id;

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

    return {
      pageViews,
      formSubmits,
      totalLeads,
      totalSessions,
      evaluatedSessions,
      qualifiedSessions,
      disqualifiedSessions,
      qualityScore,
      disqualifiedRate,
      landingConversion,
      funnelConversion,
      healthScore,
      ctr,
      cvr,
      iniciados,
      variants: sortedVariants,
      bestVariantId,
      stepFunnel,
      chartData,
      sessionDetails,
    };
  }, [events, leads, steps, dateRange, campaigns, campaignMetrics, funnels]);

  const stepsByFunnelId = useMemo(() => {
    const m = new Map<string, FunnelStep[]>();
    funnels.forEach((f) => m.set(f.id, [ ...((f.steps as FunnelStep[]) || []) ]));
    campaigns.forEach((c) => {
      const campaignSteps = (c.steps as FunnelStep[]) || [];
      if (campaignSteps.length === 0) return;
      const existing = m.get(c.funnel_id) || [];
      const byId = new Map<string, FunnelStep>();
      existing.forEach((s) => byId.set(s.id, s));
      campaignSteps.forEach((s) => byId.set(s.id, s));
      m.set(c.funnel_id, Array.from(byId.values()));
    });
    return m;
  }, [funnels, campaigns]);

  const filteredSessionDetails = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    return stats.sessionDetails.filter((s) => {
      if (q) {
        const hay = [s.sessionId, s.funnelName, s.campaignName || "", s.funnelId]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (sessionStatusFilter === "qualified") return s.qualified === true;
      if (sessionStatusFilter === "disqualified") return s.qualified === false;
      if (sessionStatusFilter === "lead") return s.hasLead;
      if (sessionStatusFilter === "pending") return s.qualified === null;
      return true;
    });
  }, [stats.sessionDetails, sessionSearch, sessionStatusFilter]);

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
              .map((f, idx) => {
                const cvr = funnelConversions[f.id] || 0;
                const isBest = idx === 0;
                const { color, bg, icon: BadgeIcon } = getCvrStyle(cvr, isBest);
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
              <p className="text-xl font-bold mt-0.5">{stats.iniciados.toLocaleString()}</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Quality</p>
                  <p className="text-xl font-bold mt-0.5">{stats.qualityScore.toFixed(1)}%</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">Health</p>
                  <p className="text-xl font-bold mt-0.5">{stats.healthScore.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">Sesiones</p>
                  <p className="text-lg font-semibold mt-1">{stats.totalSessions.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">Sesiones cualificadas</p>
                  <p className="text-lg font-semibold mt-1">
                    {stats.qualifiedSessions.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1">/ {stats.evaluatedSessions.toLocaleString()}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {stats.qualityScore.toFixed(1)}% cualificadas
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">Sesiones no cualificadas</p>
                  <p className="text-lg font-semibold mt-1">
                    {stats.disqualifiedSessions.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1">/ {stats.evaluatedSessions.toLocaleString()}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {stats.disqualifiedRate.toFixed(1)}% no cualificadas
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">Conv. Landing</p>
                  <p className="text-lg font-semibold mt-1">{stats.landingConversion.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">Conv. Funnel</p>
                  <p className="text-lg font-semibold mt-1">{stats.funnelConversion.toFixed(1)}%</p>
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
                      const prev = idx === 0 ? stats.iniciados : stats.stepFunnel[idx - 1].count;
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

              {/* Session explorer (preview + sheet) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">Sesiones (detalle)</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 shrink-0"
                    onClick={() => setSessionsSheetOpen(true)}
                    disabled={stats.sessionDetails.length === 0}
                  >
                    <Rows className="h-4 w-4" weight="bold" />
                    Explorar
                    <Badge variant="secondary" className="px-1.5 font-mono text-[10px] tabular-nums">
                      {stats.sessionDetails.length}
                    </Badge>
                  </Button>
                </div>
                {stats.sessionDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay sesiones con id en este rango</p>
                ) : (
                  <div className="space-y-2">
                    {stats.sessionDetails.slice(0, 3).map((s) => (
                      <div
                        key={s.sessionId}
                        className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-muted-foreground truncate">{s.sessionId}</p>
                          <p className="truncate text-[11px] text-foreground/80">
                            {s.funnelName}
                            {s.campaignName ? ` · ${s.campaignName}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {s.qualified === true && <Badge className="text-[9px]">Cualif.</Badge>}
                          {s.qualified === false && <Badge variant="destructive" className="text-[9px]">No cualif.</Badge>}
                          {s.qualified === null && <Badge variant="outline" className="text-[9px]">Sin eval.</Badge>}
                          {s.hasLead && <Badge variant="secondary" className="text-[9px]">Lead</Badge>}
                        </div>
                      </div>
                    ))}
                    {stats.sessionDetails.length > 3 && (
                      <p className="text-center text-[10px] text-muted-foreground">
                        +{stats.sessionDetails.length - 3} más: abre Explorar
                      </p>
                    )}
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

          {/* ALL SESSIONS ROW LIST */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Todas las sesiones</CardTitle>
                <Badge variant="secondary" className="px-2 font-mono text-[10px] tabular-nums">
                  {stats.sessionDetails.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {stats.sessionDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay sesiones con id en este rango</p>
              ) : (
                <div className="space-y-2">
                  {stats.sessionDetails.map((s) => (
                    <div
                      key={s.sessionId}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{s.sessionId}</p>
                        <p className="truncate text-[11px] text-foreground/80">
                          {s.funnelName}
                          {s.campaignName ? ` · ${s.campaignName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {s.qualified === true && <Badge className="text-[9px]">Cualif.</Badge>}
                        {s.qualified === false && <Badge variant="destructive" className="text-[9px]">No cualif.</Badge>}
                        {s.qualified === null && <Badge variant="outline" className="text-[9px]">Sin eval.</Badge>}
                        {s.hasLead && <Badge variant="secondary" className="text-[9px]">Lead</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={sessionsSheetOpen} onOpenChange={setSessionsSheetOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 border-l p-0 sm:max-w-2xl md:max-w-4xl"
          side="right"
        >
          <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
            <SheetTitle className="text-base">Todas las sesiones</SheetTitle>
            <SheetDescription>
              Timeline, UTMs, funnel y calificación. Mostrando {filteredSessionDetails.length} de {stats.sessionDetails.length} con el filtro activo.
            </SheetDescription>
          </SheetHeader>
          <div className="shrink-0 space-y-3 border-b px-6 py-3">
            <Input
              placeholder="Buscar por id, funnel o campaña…"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="h-9 text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "Todas"],
                  ["qualified", "Cualificadas"],
                  ["disqualified", "No cualif."],
                  ["lead", "Con lead"],
                  ["pending", "Sin evaluar"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={sessionStatusFilter === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setSessionStatusFilter(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-4">
              {filteredSessionDetails.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Ninguna sesión coincide con el criterio</p>
              ) : (
                filteredSessionDetails.map((s) => (
                  <Collapsible key={s.sessionId} className="rounded-lg border bg-card text-left">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-mono text-[10px] text-muted-foreground">
                            {s.sessionId}
                          </p>
                          <p className="mt-0.5 text-sm font-medium">{s.funnelName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.campaignName || "Sin campaña"} · {formatDurationMs(s.firstSeen, s.lastSeen)} ·{" "}
                            {s.lastSeen ? new Date(s.lastSeen).toLocaleString("es-ES") : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="flex flex-wrap justify-end gap-1">
                            {s.qualified === true && <Badge className="text-[9px]">Cualif.</Badge>}
                            {s.qualified === false && <Badge variant="destructive" className="text-[9px]">No cualif.</Badge>}
                            {s.qualified === null && <Badge variant="outline" className="text-[9px]">Sin eval.</Badge>}
                            {s.hasLead && <Badge variant="secondary" className="text-[9px]">Lead</Badge>}
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {s.eventCount} eventos
                          </span>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-3 border-t bg-muted/20 px-3 py-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Page views</p>
                            <p className="font-medium tabular-nums">{s.pageViews}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Preguntas (steps)</p>
                            <p className="font-medium tabular-nums">{s.stepViews}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Formularios</p>
                            <p className="font-medium tabular-nums">{s.formSubmits}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Funnel / campaña</p>
                            <p className="font-medium line-clamp-2">{s.funnelName}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{s.campaignName || "—"}</p>
                          </div>
                        </div>
                        {(s.utm.source || s.utm.medium || s.utm.campaign) && (
                          <div>
                            <p className="mb-1 text-[10px] text-muted-foreground">UTM</p>
                            <p className="font-mono text-[10px] leading-relaxed break-all">
                              {[
                                s.utm.source && `source=${s.utm.source}`,
                                s.utm.medium && `medium=${s.utm.medium}`,
                                s.utm.campaign && `campaign=${s.utm.campaign}`,
                                s.utm.term && `term=${s.utm.term}`,
                                s.utm.content && `content=${s.utm.content}`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        )}
                        {s.hasLead && (
                          <p className="text-[11px] text-muted-foreground">
                            Lead: <span className="font-medium text-foreground">{s.leadResult || "—"}</span>
                            {s.leadAt && ` · ${new Date(s.leadAt).toLocaleString("es-ES")}`}
                          </p>
                        )}
                        <div>
                          <p className="mb-2 text-[10px] font-medium text-muted-foreground">Timeline</p>
                          <ol className="space-y-2 border-l border-border pl-3">
                            {s.timeline.map((ev) => (
                              <li key={ev.id} className="relative">
                                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(ev.created_at).toLocaleString("es-ES")}
                                </p>
                                <p className="font-medium text-foreground">{timelineEventTitle(ev.event_type)}</p>
                                <TimelineEventDetails
                                  eventType={ev.event_type}
                                  funnelId={ev.funnel_id}
                                  metadata={ev.metadata || {}}
                                  stepsByFunnelId={stepsByFunnelId}
                                />
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

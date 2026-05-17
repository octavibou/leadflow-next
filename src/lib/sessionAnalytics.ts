/** Sesiones agregadas desde `events` + `leads` por metadata.session_id */

export type SessionUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type SessionAttribution = {
  resolvedSource: string;
  resolvedMedium: string;
  landing_url?: string;
  referrer?: string;
  referrer_host?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  msclkid?: string;
};

export type SessionDetail = {
  sessionId: string;
  funnelId: string;
  funnelName: string;
  campaignId: string | null;
  campaignName: string | null;
  leadId: string | null;
  /** Geo (si se captura en metadata). */
  geo: {
    country?: string;
    city?: string;
  } | null;
  /** Inicio “landing” (primer session_started/page_view si existe). */
  landingStartAt: string | null;
  /**
   * Fin de sesión para Analytics:
   * - si completó quiz: timestamp de `qualification_evaluated` (si existe)
   * - si no: última actividad (último evento)
   */
  sessionEndAt: string | null;
  /** Duración total de sesión (landingStartAt → sessionEndAt). */
  sessionTimeMs: number | null;
  firstSeen: string;
  lastSeen: string;
  eventCount: number;
  pageViews: number;
  stepViews: number;
  formSubmits: number;
  /** Primer momento en el que se vio el formulario de contacto (evento `contact_view`). */
  contactViewAt: string | null;
  /** Momento del primer submit (evento `form_submit`). */
  formSubmitAt: string | null;
  /** Tiempo dedicado al formulario (contact_view → form_submit). */
  formTimeMs: number | null;
  sessionStarts: number;
  resultAssigned: number;
  qualified: boolean | null;
  /**
   * Cualificación “en curso” derivada de `step_view.qualifies`.
   * null = aún no ha respondido ninguna pregunta.
   */
  qualifiedSoFar: boolean | null;
  /** Respondió al menos una pregunta (`step_view`). */
  startedQuiz: boolean;
  /** Número de preguntas respondidas (step_view únicos por step_id). */
  answeredQuestions: number;
  /** Último step_id (pregunta) respondido. */
  lastAnsweredStepId: string | null;
  /** Timestamp del último `step_view`. */
  lastAnsweredAt: string | null;
  /** Se marca cuando existe `qualification_evaluated`. */
  completedQuiz: boolean;
  /** Total de preguntas evaluadas según `qualification_evaluated.evaluated_questions` (si existe). */
  evaluatedQuestions: number | null;
  hasLead: boolean;
  leadResult: string | null;
  leadAt: string | null;
  /** Primer `deployment_id` de la visita (columna o metadata); null si campaña `?c=` o sin Publish v1. */
  visitDeploymentId: string | null;
  /** Etiqueta legible: `main · v3` o `Campaña (?c=)`. */
  visitDeploymentLabel: string | null;
  /** `landing` | `quiz_only` desde metadata de la primera vista. */
  visitEntrySurface: string | null;
  utm: SessionUtm;
  attribution: SessionAttribution | null;
  timeline: Array<{
    id: string;
    created_at: string;
    event_type: string;
    funnel_id: string;
    campaign_id: string | null;
    metadata: Record<string, unknown>;
  }>;
};

export function getSessionIdFromRow(row: { metadata?: unknown } | null): string | null {
  const m = row?.metadata as Record<string, unknown> | undefined;
  const value = m?.session_id;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function pickUtmsFromMetadata(meta: Record<string, unknown> | undefined): SessionUtm {
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

export function mergeUtms(a: SessionUtm, b: SessionUtm): SessionUtm {
  return { ...a, ...Object.fromEntries(Object.entries(b).filter(([, v]) => v)) };
}

export function parseSessionAttribution(meta: Record<string, unknown> | undefined): SessionAttribution | null {
  if (!meta) return null;
  const utm = pickUtmsFromMetadata(meta);
  const hasSignal =
    utm.source ||
    utm.medium ||
    typeof meta.attribution_source === "string" ||
    typeof meta.fbclid === "string" ||
    typeof meta.landing_url === "string";
  if (!hasSignal) return null;

  const resolvedSource =
    utm.source ||
    (typeof meta.attribution_source === "string" ? meta.attribution_source : "") ||
    (typeof meta.fbclid === "string" ? "facebook" : "") ||
    "";
  const resolvedMedium =
    utm.medium ||
    (typeof meta.attribution_medium === "string" ? meta.attribution_medium : "") ||
    "";

  return {
    resolvedSource,
    resolvedMedium,
    landing_url: typeof meta.landing_url === "string" ? meta.landing_url : undefined,
    referrer: typeof meta.referrer === "string" ? meta.referrer : undefined,
    referrer_host: typeof meta.referrer_host === "string" ? meta.referrer_host : undefined,
    fbclid: typeof meta.fbclid === "string" ? meta.fbclid : undefined,
    gclid: typeof meta.gclid === "string" ? meta.gclid : undefined,
    ttclid: typeof meta.ttclid === "string" ? meta.ttclid : undefined,
    msclkid: typeof meta.msclkid === "string" ? meta.msclkid : undefined,
  };
}

function parseSessionGeo(meta: Record<string, unknown> | undefined): { country?: string; city?: string } | null {
  if (!meta) return null;
  const country =
    (typeof meta.geo_country === "string" && meta.geo_country.trim()) ||
    (typeof meta.country === "string" && meta.country.trim()) ||
    "";
  const city =
    (typeof meta.geo_city === "string" && meta.geo_city.trim()) ||
    (typeof meta.city === "string" && meta.city.trim()) ||
    "";
  if (!country && !city) return null;
  return {
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
  };
}

export function classifySessionSource(s: SessionDetail): "facebook" | "google" | "direct" | "other" {
  if (s.attribution?.fbclid) return "facebook";
  if (s.attribution?.gclid) return "google";
  if (!s.attribution && !s.utm.source) return "other";

  const src = (s.attribution?.resolvedSource || s.utm.source || "").toLowerCase();
  const med = (s.attribution?.resolvedMedium || s.utm.medium || "").toLowerCase();
  if (src.includes("facebook") || src.includes("instagram") || src === "fb" || src.includes("meta")) return "facebook";
  if (src.includes("google") || med.includes("google")) return "google";
  if (src === "direct" || med === "none") return "direct";
  return "other";
}

export function sessionSourceShortLabel(s: SessionDetail): string {
  const m: Record<ReturnType<typeof classifySessionSource>, string> = {
    facebook: "Meta",
    google: "Google",
    direct: "Directo",
    other: "Otro",
  };
  return m[classifySessionSource(s)];
}

export function formatDurationMs(start: string, end: string): string {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return "—";
  const totalSec = Math.round((b - a) / 1000);
  if (totalSec < 60) return `${totalSec}s`;

  const days = Math.floor(totalSec / 86400);
  const dayRemainder = totalSec % 86400;
  const hours = Math.floor(dayRemainder / 3600);
  const hourRemainder = dayRemainder % 3600;
  const minutes = Math.floor(hourRemainder / 60);
  const seconds = hourRemainder % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

export function timelineEventTitle(eventType: string): string {
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

export function buildSessionDetails(
  events: any[],
  leads: any[],
  funnelNameById: Map<string, string>,
  campaignNameById: Map<string, string>,
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

    let attribution: SessionAttribution | null = null;
    for (const e of evs) {
      const t = e.event_type as string;
      if (t !== "session_started" && t !== "page_view") continue;
      const parsed = parseSessionAttribution((e.metadata || {}) as Record<string, unknown>);
      if (parsed) {
        attribution = parsed;
        break;
      }
    }
    if (!attribution && lead?.metadata && typeof lead.metadata === "object") {
      attribution = parseSessionAttribution(lead.metadata as Record<string, unknown>);
    }

    let pageViews = 0;
    let stepViews = 0;
    let formSubmits = 0;
    let contactViewAt: string | null = null;
    let formSubmitAt: string | null = null;
    let formTimeMs: number | null = null;
    let sessionStarts = 0;
    let resultAssigned = 0;
    let qualified: boolean | null = null;
    let qualifiedSoFar: boolean | null = null;
    let completedQuiz = false;
    let evaluatedQuestions: number | null = null;
    const answeredStepIds = new Set<string>();
    let lastAnsweredStepId: string | null = null;
    let lastAnsweredAt: string | null = null;
    let geo: { country?: string; city?: string } | null = null;
    let landingStartAt: string | null = null;
    let sessionEndAt: string | null = null;
    let sessionTimeMs: number | null = null;
    let qualificationEvaluatedAt: string | null = null;

    for (const e of evs) {
      const t = e.event_type as string;
      if (t === "page_view") pageViews += 1;
      if (t === "step_view") stepViews += 1;
      if (t === "form_submit") formSubmits += 1;
      if (t === "session_started") sessionStarts += 1;
      if (t === "result_assigned") resultAssigned += 1;
      if (!landingStartAt && (t === "session_started" || t === "page_view")) {
        landingStartAt = String(e.created_at);
      }
      if (!geo && (t === "session_started" || t === "page_view")) {
        geo = parseSessionGeo((e.metadata || {}) as Record<string, unknown>);
      }
      if (t === "qualification_evaluated") {
        completedQuiz = true;
        const q = (e.metadata as any)?.qualified;
        if (typeof q === "boolean") qualified = q;
        if (!qualificationEvaluatedAt) qualificationEvaluatedAt = String(e.created_at);
        const eq = (e.metadata as any)?.evaluated_questions;
        evaluatedQuestions = typeof eq === "number" ? eq : (typeof eq === "string" && eq ? Number(eq) : null);
        if (evaluatedQuestions !== null && !Number.isFinite(evaluatedQuestions)) evaluatedQuestions = null;
      }
      if (t === "contact_view" && !contactViewAt) {
        contactViewAt = String(e.created_at);
      }
      if (t === "form_submit" && !formSubmitAt) {
        formSubmitAt = String(e.created_at);
      }
      if (t === "step_view") {
        const meta = (e.metadata || {}) as Record<string, unknown>;
        const sid = typeof meta.step_id === "string" ? meta.step_id : null;
        if (sid) answeredStepIds.add(sid);
        if (sid) {
          lastAnsweredStepId = sid;
          lastAnsweredAt = String(e.created_at);
        }
        const q = (meta as any)?.qualifies;
        if (typeof q === "boolean") {
          if (qualifiedSoFar === null) qualifiedSoFar = true;
          if (q === false) qualifiedSoFar = false;
        }
      }
    }

    if (contactViewAt && formSubmitAt) {
      const start = new Date(contactViewAt).getTime();
      const end = new Date(formSubmitAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        formTimeMs = end - start;
      }
    }

    // Total session time: landingStartAt → end (qualification_evaluated si existe, si no lastSeen)
    sessionEndAt = completedQuiz ? qualificationEvaluatedAt : (lastSeen || null);
    if (landingStartAt && sessionEndAt) {
      const start = new Date(landingStartAt).getTime();
      const end = new Date(sessionEndAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        sessionTimeMs = end - start;
      }
    }

    /* La cualificación de negocio solo aplica cuando el cliente emitió `qualification_evaluated`
       (quiz terminado según tracking). No inferir cualificado/desde tabla leads aquí — evita
       sesiones abandonadas a mitad del quiz apareciendo como evaluadas. */
    if (!completedQuiz) {
      qualified = null;
    }
    if (!geo && lead?.metadata && typeof lead.metadata === "object") {
      geo = parseSessionGeo(lead.metadata as Record<string, unknown>);
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

    let visitDeploymentId: string | null = null;
    let visitDeploymentLabel: string | null = null;
    let visitEntrySurface: string | null = null;
    for (const e of evs) {
      const t = e.event_type as string;
      if (t !== "session_started" && t !== "page_view") continue;
      const meta = (e.metadata || {}) as Record<string, unknown>;
      const depFromRow = typeof e.deployment_id === "string" && e.deployment_id ? e.deployment_id : null;
      const depFromMeta = typeof meta.deployment_id === "string" ? meta.deployment_id : null;
      const did = depFromRow || depFromMeta;
      if (did) {
        visitDeploymentId = did;
        const slug = typeof meta.branch_slug === "string" ? meta.branch_slug : "?";
        const ver = meta.deployment_version != null ? String(meta.deployment_version) : "?";
        visitDeploymentLabel = `${slug} · v${ver}`;
        const es = meta.entry_surface;
        visitEntrySurface = es === "quiz_only" || es === "landing" ? es : null;
        break;
      }
      if (e.campaign_id) {
        visitDeploymentLabel = "Campaña (?c=)";
        visitDeploymentId = null;
        visitEntrySurface = null;
        break;
      }
    }
    if (!visitDeploymentLabel && lead) {
      const lm = (lead.metadata || {}) as Record<string, unknown>;
      const depLead = typeof lead.deployment_id === "string" && lead.deployment_id ? lead.deployment_id : null;
      const depLm = typeof lm.deployment_id === "string" ? lm.deployment_id : null;
      const did = depLead || depLm;
      if (did) {
        visitDeploymentId = did;
        const slug = typeof lm.branch_slug === "string" ? lm.branch_slug : "?";
        const ver = lm.deployment_version != null ? String(lm.deployment_version) : "?";
        visitDeploymentLabel = `${slug} · v${ver}`;
        const es = lm.entry_surface;
        visitEntrySurface = es === "quiz_only" || es === "landing" ? es : null;
      } else if (lead.campaign_id) {
        visitDeploymentLabel = "Campaña (?c=)";
      }
    }

    rows.push({
      sessionId,
      funnelId,
      funnelName,
      campaignId,
      campaignName,
      leadId: lead?.id ? String(lead.id) : null,
      geo,
      landingStartAt,
      sessionEndAt,
      sessionTimeMs,
      firstSeen,
      lastSeen,
      eventCount: evs.length,
      pageViews,
      stepViews,
      formSubmits,
      contactViewAt,
      formSubmitAt,
      formTimeMs,
      sessionStarts,
      resultAssigned,
      qualified,
      qualifiedSoFar,
      startedQuiz: answeredStepIds.size > 0,
      answeredQuestions: answeredStepIds.size,
      lastAnsweredStepId,
      lastAnsweredAt,
      completedQuiz,
      evaluatedQuestions,
      hasLead: !!lead,
      leadResult: lead ? (lead.result as string | null) : null,
      leadAt: lead ? String(lead.created_at) : null,
      visitDeploymentId,
      visitDeploymentLabel,
      visitEntrySurface,
      utm,
      attribution,
      timeline,
    });
  }

  rows.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  return rows;
}

/* -------------------------------------------------------------------------- */
/*  Agregadores para el dashboard de Analytics                                */
/* -------------------------------------------------------------------------- */

export type DailySessionBucket = {
  date: string;
  sessions: number;
  leads: number;
  qualified: number;
  /** Sesiones que han empezado el quiz (primera pregunta). */
  startedQuiz: number;
  /** Sesiones con quiz terminado (todas las preguntas). */
  completedQuiz: number;
};

/**
 * Agrupa por día (UTC) tomando `firstSeen` (fallback a `lastSeen`).
 * Rellena los días vacíos del rango `[fromIso, toIso]` para que el line chart sea continuo.
 */
export function groupSessionsByDay(
  sessions: SessionDetail[],
  fromIso?: string | null,
  toIso?: string | null,
): DailySessionBucket[] {
  const map = new Map<string, DailySessionBucket>();
  for (const s of sessions) {
    const ts = s.firstSeen || s.lastSeen;
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (!Number.isFinite(t)) continue;
    const date = new Date(ts).toISOString().slice(0, 10);
    let b = map.get(date);
    if (!b) {
      b = { date, sessions: 0, leads: 0, qualified: 0, startedQuiz: 0, completedQuiz: 0 };
      map.set(date, b);
    }
    b.sessions += 1;
    if (s.hasLead) b.leads += 1;
    if (s.qualified === true) b.qualified += 1;
    if (s.startedQuiz) b.startedQuiz += 1;
    if (s.completedQuiz) b.completedQuiz += 1;
  }

  if (fromIso && toIso) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isFinite(from.getTime()) && Number.isFinite(to.getTime()) && to.getTime() >= from.getTime()) {
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      while (cursor.getTime() <= end.getTime()) {
        const k = cursor.toISOString().slice(0, 10);
        if (!map.has(k)) map.set(k, { date: k, sessions: 0, leads: 0, qualified: 0, startedQuiz: 0, completedQuiz: 0 });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export type CountryBucket = {
  countryCode: string;
  sessions: number;
  leads: number;
  share: number;
};

export function groupSessionsByCountry(sessions: SessionDetail[], topN = 10): CountryBucket[] {
  const map = new Map<string, { sessions: number; leads: number }>();
  for (const s of sessions) {
    const code = (s.geo?.country || "").trim() || "—";
    let b = map.get(code);
    if (!b) {
      b = { sessions: 0, leads: 0 };
      map.set(code, b);
    }
    b.sessions += 1;
    if (s.hasLead) b.leads += 1;
  }
  const total = sessions.length || 1;
  const out: CountryBucket[] = Array.from(map.entries()).map(([countryCode, v]) => ({
    countryCode,
    sessions: v.sessions,
    leads: v.leads,
    share: v.sessions / total,
  }));
  out.sort((a, b) => b.sessions - a.sessions);
  return out.slice(0, topN);
}

export type SourceKey = "facebook" | "google" | "direct" | "other";

export type SourceBucket = {
  source: SourceKey;
  label: string;
  sessions: number;
  leads: number;
  share: number;
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  facebook: "Meta",
  google: "Google",
  direct: "Directo",
  other: "Otro",
};

export function groupSessionsBySource(sessions: SessionDetail[]): SourceBucket[] {
  const keys: SourceKey[] = ["facebook", "google", "direct", "other"];
  const counts: Record<SourceKey, { sessions: number; leads: number }> = {
    facebook: { sessions: 0, leads: 0 },
    google: { sessions: 0, leads: 0 },
    direct: { sessions: 0, leads: 0 },
    other: { sessions: 0, leads: 0 },
  };
  for (const s of sessions) {
    const k = classifySessionSource(s);
    counts[k].sessions += 1;
    if (s.hasLead) counts[k].leads += 1;
  }
  const total = sessions.length || 1;
  return keys.map((k) => ({
    source: k,
    label: SOURCE_LABELS[k],
    sessions: counts[k].sessions,
    leads: counts[k].leads,
    share: counts[k].sessions / total,
  }));
}

export type FunnelBucket = {
  funnelId: string;
  funnelName: string;
  sessions: number;
  startedQuiz: number;
  completedQuiz: number;
  leads: number;
  qualified: number;
  /** Cualificados / sesiones evaluadas (con `qualification_evaluated`). */
  qualificationRate: number;
};

export function groupSessionsByFunnel(
  sessions: SessionDetail[],
  funnelNameById: Map<string, string>,
): FunnelBucket[] {
  const map = new Map<string, FunnelBucket & { evaluated: number }>();
  for (const s of sessions) {
    const funnelId = s.funnelId || "—";
    let b = map.get(funnelId);
    if (!b) {
      b = {
        funnelId,
        funnelName: funnelNameById.get(funnelId) || funnelId.slice(0, 8) || "—",
        sessions: 0,
        startedQuiz: 0,
        completedQuiz: 0,
        leads: 0,
        qualified: 0,
        qualificationRate: 0,
        evaluated: 0,
      };
      map.set(funnelId, b);
    }
    b.sessions += 1;
    if (s.startedQuiz) b.startedQuiz += 1;
    if (s.completedQuiz) b.completedQuiz += 1;
    if (s.hasLead) b.leads += 1;
    if (s.qualified !== null) b.evaluated += 1;
    if (s.qualified === true) b.qualified += 1;
  }
  return Array.from(map.values())
    .map(({ evaluated, ...b }) => ({
      ...b,
      qualificationRate: evaluated > 0 ? b.qualified / evaluated : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export type UtmBucket = {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  leads: number;
  qualified: number;
  qualificationRate: number;
};

function utmKeyForSession(s: SessionDetail): { source: string; medium: string; campaign: string } {
  const source = (s.attribution?.resolvedSource || s.utm.source || "").toLowerCase() || sessionSourceShortLabel(s).toLowerCase() || "—";
  const medium = (s.attribution?.resolvedMedium || s.utm.medium || "").toLowerCase() || "—";
  const campaign = (s.utm.campaign || s.campaignName || "").toLowerCase() || "—";
  return { source, medium, campaign };
}

export function groupSessionsByUtm(sessions: SessionDetail[]): UtmBucket[] {
  const map = new Map<string, UtmBucket & { evaluated: number }>();
  for (const s of sessions) {
    const { source, medium, campaign } = utmKeyForSession(s);
    const key = `${source}||${medium}||${campaign}`;
    let b = map.get(key);
    if (!b) {
      b = { source, medium, campaign, sessions: 0, leads: 0, qualified: 0, qualificationRate: 0, evaluated: 0 };
      map.set(key, b);
    }
    b.sessions += 1;
    if (s.hasLead) b.leads += 1;
    if (s.qualified !== null) b.evaluated += 1;
    if (s.qualified === true) b.qualified += 1;
  }
  return Array.from(map.values())
    .map(({ evaluated, ...b }) => ({
      ...b,
      qualificationRate: evaluated > 0 ? b.qualified / evaluated : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export type DeploymentVersionBucket = {
  deploymentLabel: string;
  deploymentId: string | null;
  sessions: number;
  startedQuiz: number;
  completedQuiz: number;
  qualified: number;
  formSubmitted: number;
  /** startedQuiz / sessions */
  landingConversionRate: number;
  /** formSubmitted / qualified (solo cualificados ven form) */
  formConversionRate: number;
  /** qualified / (qualified + disqualified) */
  qualificationRate: number;
};

/**
 * Agrupa sesiones por versión de deployment (visitDeploymentLabel).
 * Útil para comparar rendimiento de diferentes versiones de landing publicadas.
 */
export function groupSessionsByDeploymentVersion(sessions: SessionDetail[]): DeploymentVersionBucket[] {
  const map = new Map<string, DeploymentVersionBucket & { disqualified: number }>();

  for (const s of sessions) {
    const label = s.visitDeploymentLabel || "(sin versión)";
    let b = map.get(label);
    if (!b) {
      b = {
        deploymentLabel: label,
        deploymentId: s.visitDeploymentId,
        sessions: 0,
        startedQuiz: 0,
        completedQuiz: 0,
        qualified: 0,
        formSubmitted: 0,
        landingConversionRate: 0,
        formConversionRate: 0,
        qualificationRate: 0,
        disqualified: 0,
      };
      map.set(label, b);
    }
    b.sessions += 1;
    if (s.startedQuiz) b.startedQuiz += 1;
    if (s.completedQuiz) b.completedQuiz += 1;
    if (s.qualified === true) {
      b.qualified += 1;
      if (s.hasLead) b.formSubmitted += 1;
    }
    if (s.qualified === false) b.disqualified += 1;
  }

  return Array.from(map.values())
    .map(({ disqualified, ...b }) => {
      const evaluated = b.qualified + disqualified;
      return {
        ...b,
        landingConversionRate: b.sessions > 0 ? b.startedQuiz / b.sessions : 0,
        formConversionRate: b.qualified > 0 ? b.formSubmitted / b.qualified : 0,
        qualificationRate: evaluated > 0 ? b.qualified / evaluated : 0,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

export type FunnelStageKey =
  | "sessions"
  | "startedQuiz"
  | "completedQuiz"
  | "qualified"
  | "disqualified"
  | "formSubmitted";

export type FunnelStage = {
  key: FunnelStageKey;
  label: string;
  count: number;
  /** Proporción sobre la primera etapa (sessions). */
  shareOfTop: number;
  /** Proporción sobre la etapa anterior (continuación). */
  shareOfPrev: number;
  /** Métrica de conversión destacada (p. ej. "% Conv. Landing"). */
  conversionLabel?: string;
  conversionRate?: number;
};

/**
 * Embudo de conversión según el flujo:
 * 1. Sesiones (landing views)
 * 2. Quiz Empezado → % Conversión Landing
 * 3. Quiz Terminado (evaluados) → se divide en:
 *    - Cualificados
 *    - Descualificados
 * 4. Form enviado (solo cualificados ven el form) → % Conversión Form
 */
export function computeFunnelStages(sessions: SessionDetail[]): FunnelStage[] {
  const totalSessions = sessions.length;
  const startedQuiz = sessions.filter((s) => s.startedQuiz).length;
  const completedQuiz = sessions.filter((s) => s.completedQuiz).length;
  const qualified = sessions.filter((s) => s.qualified === true).length;
  const disqualified = sessions.filter((s) => s.qualified === false).length;
  const formSubmittedByQualified = sessions.filter((s) => s.qualified === true && s.hasLead).length;

  const landingConversion = totalSessions > 0 ? startedQuiz / totalSessions : 0;
  const formConversion = qualified > 0 ? formSubmittedByQualified / qualified : 0;

  const raw: Array<{
    key: FunnelStageKey;
    label: string;
    count: number;
    conversionLabel?: string;
    conversionRate?: number;
  }> = [
    { key: "sessions", label: "Sesiones (Landing)", count: totalSessions },
    {
      key: "startedQuiz",
      label: "Quiz Empezado",
      count: startedQuiz,
      conversionLabel: "Conv. Landing",
      conversionRate: landingConversion,
    },
    { key: "completedQuiz", label: "Quiz Terminado", count: completedQuiz },
    { key: "qualified", label: "Cualificados", count: qualified },
    { key: "disqualified", label: "Descualificados", count: disqualified },
    {
      key: "formSubmitted",
      label: "Form Enviado",
      count: formSubmittedByQualified,
      conversionLabel: "Conv. Form",
      conversionRate: formConversion,
    },
  ];

  const top = totalSessions || 1;
  return raw.map((s, idx) => {
    const prev = idx === 0 ? top : raw[idx - 1].count;
    return {
      ...s,
      shareOfTop: totalSessions > 0 ? s.count / top : 0,
      shareOfPrev: idx === 0 ? 1 : prev > 0 ? s.count / prev : 0,
    };
  });
}

export type AnalyticsSummary = {
  sessions: number;
  startedQuiz: number;
  completedQuiz: number;
  qualified: number;
  disqualified: number;
  /** Leads de cualificados (solo ellos ven el form). */
  formSubmittedByQualified: number;
  /** Total de leads (incluyendo descualificados si los hubiera). */
  totalLeads: number;
  /** startedQuiz / sessions — % conversión de la landing. */
  landingConversionRate: number;
  /** formSubmittedByQualified / qualified — % conversión del form. */
  formConversionRate: number;
  /** qualified / (qualified + disqualified) — % cualificación. */
  qualificationRate: number;
  /** completedQuiz / startedQuiz — % que terminan el quiz. */
  quizCompletionRate: number;
  /** Leads (form cualificado) / sesiones — conversión global del embudo. */
  overallFunnelConversionRate: number;
  countries: number;
};

export function computeAnalyticsSummary(sessions: SessionDetail[]): AnalyticsSummary {
  let startedQuiz = 0;
  let completedQuiz = 0;
  let qualified = 0;
  let disqualified = 0;
  let formSubmittedByQualified = 0;
  let totalLeads = 0;
  const countrySet = new Set<string>();

  for (const s of sessions) {
    if (s.startedQuiz) startedQuiz += 1;
    if (s.completedQuiz) completedQuiz += 1;
    if (s.qualified === true) qualified += 1;
    if (s.qualified === false) disqualified += 1;
    if (s.hasLead) {
      totalLeads += 1;
      if (s.qualified === true) formSubmittedByQualified += 1;
    }
    const c = (s.geo?.country || "").trim();
    if (c) countrySet.add(c);
  }

  const totalSessions = sessions.length;
  const evaluated = qualified + disqualified;

  return {
    sessions: totalSessions,
    startedQuiz,
    completedQuiz,
    qualified,
    disqualified,
    formSubmittedByQualified,
    totalLeads,
    landingConversionRate: totalSessions > 0 ? startedQuiz / totalSessions : 0,
    formConversionRate: qualified > 0 ? formSubmittedByQualified / qualified : 0,
    qualificationRate: evaluated > 0 ? qualified / evaluated : 0,
    quizCompletionRate: startedQuiz > 0 ? completedQuiz / startedQuiz : 0,
    overallFunnelConversionRate:
      totalSessions > 0 ? formSubmittedByQualified / totalSessions : 0,
    countries: countrySet.size,
  };
}

// ---- Revenue Analytics ----

export type LeadDealRow = {
  id: string;
  lead_id: string | null;
  funnel_id: string;
  workspace_id: string;
  campaign_id: string | null;
  branch_id: string | null;
  deployment_id: string | null;
  external_provider: string;
  external_deal_id: string;
  external_stage_name: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RevenueSummary = {
  totalRevenue: number;
  revenueCurrency: string;
  wonDeals: number;
  lostDeals: number;
  openDeals: number;
  bookedAppointments: number;
  showAppointments: number;
  noShowAppointments: number;
  /** booked → show conversion */
  showRate: number;
  /** leads → won conversion */
  leadToWonRate: number;
  /** booked → won conversion */
  bookedToWonRate: number;
  /** Revenue per lead (totalRevenue / totalLeads) */
  revenuePerLead: number;
  /** Revenue per session */
  revenuePerSession: number;
  /** Average deal size for won deals */
  averageDealSize: number;
};

export function computeRevenueSummary(
  deals: LeadDealRow[],
  totalLeads: number,
  totalSessions: number
): RevenueSummary {
  let totalRevenue = 0;
  let wonDeals = 0;
  let lostDeals = 0;
  let openDeals = 0;
  let bookedAppointments = 0;
  let showAppointments = 0;
  let noShowAppointments = 0;
  let revenueCurrency = "EUR";

  for (const deal of deals) {
    switch (deal.status) {
      case "won":
        wonDeals += 1;
        if (deal.amount && deal.amount > 0) {
          totalRevenue += deal.amount;
          if (deal.currency) revenueCurrency = deal.currency;
        }
        break;
      case "lost":
        lostDeals += 1;
        break;
      case "open":
        openDeals += 1;
        break;
      case "booked":
        bookedAppointments += 1;
        break;
      case "show":
        showAppointments += 1;
        break;
      case "no_show":
        noShowAppointments += 1;
        break;
    }
  }

  const totalBooked = bookedAppointments + showAppointments + noShowAppointments;

  return {
    totalRevenue,
    revenueCurrency,
    wonDeals,
    lostDeals,
    openDeals,
    bookedAppointments,
    showAppointments,
    noShowAppointments,
    showRate: totalBooked > 0 ? showAppointments / totalBooked : 0,
    leadToWonRate: totalLeads > 0 ? wonDeals / totalLeads : 0,
    bookedToWonRate: totalBooked > 0 ? wonDeals / totalBooked : 0,
    revenuePerLead: totalLeads > 0 ? totalRevenue / totalLeads : 0,
    revenuePerSession: totalSessions > 0 ? totalRevenue / totalSessions : 0,
    averageDealSize: wonDeals > 0 ? totalRevenue / wonDeals : 0,
  };
}

export type RevenueByAttribution = {
  key: string;
  label: string;
  revenue: number;
  deals: number;
  leads: number;
  conversionRate: number;
};

export function computeRevenueByBranch(
  deals: LeadDealRow[],
  branches: { id: string; name: string; slug: string }[]
): RevenueByAttribution[] {
  const byBranch = new Map<string, { revenue: number; deals: number; leadIds: Set<string> }>();

  for (const deal of deals) {
    const branchId = deal.branch_id || "unknown";
    if (!byBranch.has(branchId)) {
      byBranch.set(branchId, { revenue: 0, deals: 0, leadIds: new Set() });
    }
    const entry = byBranch.get(branchId)!;
    if (deal.status === "won") {
      entry.deals += 1;
      entry.revenue += deal.amount || 0;
    }
    if (deal.lead_id) {
      entry.leadIds.add(deal.lead_id);
    }
  }

  return Array.from(byBranch.entries()).map(([branchId, data]) => {
    const branch = branches.find((b) => b.id === branchId);
    return {
      key: branchId,
      label: branch?.name || branch?.slug || "Desconocido",
      revenue: data.revenue,
      deals: data.deals,
      leads: data.leadIds.size,
      conversionRate: data.leadIds.size > 0 ? data.deals / data.leadIds.size : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function computeRevenueBySource(deals: LeadDealRow[]): RevenueByAttribution[] {
  const bySource = new Map<string, { revenue: number; deals: number; leadIds: Set<string> }>();

  for (const deal of deals) {
    const source = "direct";
    if (!bySource.has(source)) {
      bySource.set(source, { revenue: 0, deals: 0, leadIds: new Set() });
    }
    const entry = bySource.get(source)!;
    if (deal.status === "won") {
      entry.deals += 1;
      entry.revenue += deal.amount || 0;
    }
    if (deal.lead_id) {
      entry.leadIds.add(deal.lead_id);
    }
  }

  return Array.from(bySource.entries()).map(([source, data]) => ({
    key: source,
    label: source,
    revenue: data.revenue,
    deals: data.deals,
    leads: data.leadIds.size,
    conversionRate: data.leadIds.size > 0 ? data.deals / data.leadIds.size : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

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
      utm,
      attribution,
      timeline,
    });
  }

  rows.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  return rows;
}

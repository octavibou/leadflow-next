import { supabase } from "@/integrations/supabase/client";

const FUNNEL_SESSION_STORAGE_KEY = "leadflow_funnel_session_id";

/** First-touch atribución por funnel + sesión interna (no cambia URLs públicas). */
const FIRST_TOUCH_PREFIX = "leadflow_ft_v1_";

export function getOrCreateFunnelSessionId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existing = window.localStorage.getItem(FUNNEL_SESSION_STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(FUNNEL_SESSION_STORAGE_KEY, created);
  return created;
}

/** UTMs estándar + ids de clic + landing/referrer + fuente/medio derivados (first-touch). */
export type FirstTouchPayload = Record<string, string>;

export function extractUtms(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    const v = params.get(k);
    if (v) utms[k] = v;
  });
  return utms;
}

/**
 * Captura instantánea de atribución (ejecutar en el primer paint del funnel).
 * Prioridad fuente/medio: UTMs → click ids → referrer → direct.
 */
export function captureFirstTouchSnapshot(): FirstTouchPayload {
  if (typeof window === "undefined") return {};

  const utms = extractUtms();
  const params = new URLSearchParams(window.location.search);
  const clickKeys = ["fbclid", "gclid", "ttclid", "msclkid"] as const;
  const clickIds: Record<string, string> = {};
  clickKeys.forEach((k) => {
    const v = params.get(k);
    if (v) clickIds[k] = v;
  });

  let attribution_source = "";
  let attribution_medium = "";

  if (utms.utm_source) {
    attribution_source = utms.utm_source;
    attribution_medium = utms.utm_medium || "";
  } else if (clickIds.fbclid) {
    attribution_source = "facebook";
    attribution_medium = "paid_social";
  } else if (clickIds.gclid) {
    attribution_source = "google";
    attribution_medium = "cpc";
  } else if (clickIds.ttclid) {
    attribution_source = "tiktok";
    attribution_medium = "paid_social";
  } else if (clickIds.msclkid) {
    attribution_source = "bing";
    attribution_medium = "cpc";
  } else {
    const ref = document.referrer?.trim() || "";
    try {
      if (ref) {
        const h = new URL(ref).hostname.replace(/^www\./i, "");
        attribution_source = h;
        attribution_medium = "referral";
      } else {
        attribution_source = "direct";
        attribution_medium = "none";
      }
    } catch {
      attribution_source = "direct";
      attribution_medium = "none";
    }
  }

  let referrer_host = "";
  try {
    if (document.referrer) {
      referrer_host = new URL(document.referrer).hostname.replace(/^www\./i, "");
    }
  } catch {
    referrer_host = "";
  }

  return {
    ...utms,
    ...clickIds,
    landing_url: window.location.href.split("#")[0],
    referrer: document.referrer || "",
    referrer_host,
    attribution_source,
    attribution_medium,
    captured_at: new Date().toISOString(),
  };
}

/**
 * First-touch persistente por funnel + session_id interno.
 */
export function getOrCreateFirstTouchForSession(funnelId: string, sessionId: string): FirstTouchPayload {
  if (typeof window === "undefined") return {};
  const key = `${FIRST_TOUCH_PREFIX}${funnelId}_${sessionId}`;
  const existing = window.localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as FirstTouchPayload;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* replace */
    }
  }
  const snap = captureFirstTouchSnapshot();
  window.localStorage.setItem(key, JSON.stringify(snap));
  return snap;
}

// ---- Internal event tracking ----
export function trackEvent(
  funnelId: string,
  campaignId: string | null,
  eventType: string,
  metadata: Record<string, any> = {}
) {
  if (typeof window !== "undefined") {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        type: "event",
        funnelId,
        campaignId,
        eventType,
        metadata,
      }),
    }).catch(() => {});
    return;
  }

  supabase
    .from("events")
    .insert({
      funnel_id: funnelId,
      campaign_id: campaignId,
      event_type: eventType,
      metadata: metadata as any,
    })
    .then(() => {});
}

// ---- Lead saving ----
export async function saveLead(
  funnelId: string,
  campaignId: string | null,
  answers: Record<string, string>,
  result: string | null,
  metadata: Record<string, any> = {}
) {
  const { error } = await supabase
    .from("leads")
    .insert({
      funnel_id: funnelId,
      campaign_id: campaignId,
      answers: answers as any,
      result,
      metadata: metadata as any,
    });

  if (error) {
    console.error("[v0] Error saving lead:", error);
    return;
  }

  if (typeof window !== "undefined") {
    void fetch("/api/billing/process-lead-usage", {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }
}

// ---- External tracking scripts ----
export function injectMetaPixel(pixelId: string) {
  if (!pixelId) return;
  const w = window as any;
  if (w.fbq) return;

  // Bootstrap fbq queue before the SDK loads
  const n: any = (w.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  // Load the SDK via a real script element (not innerHTML)
  const scriptEl = document.createElement("script");
  scriptEl.id = "fb-pixel-script";
  scriptEl.async = true;
  scriptEl.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(scriptEl);

  w.fbq("init", pixelId);
  w.fbq("track", "PageView");
}

export function injectGoogleTag(tagId: string) {
  if (!tagId || document.getElementById("gtag-script")) return;
  const gtagScript = document.createElement("script");
  gtagScript.id = "gtag-script";
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${tagId}`;
  document.head.appendChild(gtagScript);

  const inlineScript = document.createElement("script");
  inlineScript.innerHTML = `
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());
    gtag('config','${tagId}');
  `;
  document.head.appendChild(inlineScript);
}

// ---- Fire client-side external events ----
export function fireExternalEvent(
  type: "page_view" | "view_content" | "lead" | "conversion",
  params: Record<string, any> = {}
) {
  const w = window as any;
  switch (type) {
    case "page_view":
      if (w.fbq) w.fbq("track", "PageView", params);
      if (w.gtag) w.gtag("event", "page_view", params);
      break;
    case "view_content":
      if (w.fbq) w.fbq("track", "ViewContent", params);
      if (w.gtag) w.gtag("event", "view_item", params);
      break;
    case "lead":
      if (w.fbq) w.fbq("track", "Lead", params);
      if (w.gtag) w.gtag("event", "generate_lead", params);
      break;
    case "conversion":
      if (w.fbq) w.fbq("track", "CompleteRegistration", params);
      if (w.gtag) w.gtag("event", "conversion", params);
      break;
  }
}

export type FireMetaCapiOptions = {
  /** Para fallback de `_fbc` en servidor si falta la cookie. */
  fbclid?: string;
  /** Se envía como `external_id` (hasheado en Edge). */
  sessionId?: string;
};

// ---- Meta Conversions API (server-side) ----
export function fireMetaCapi(
  funnelId: string,
  eventName: string,
  sourceUrl: string,
  userData: Record<string, unknown> = {},
  customData: Record<string, unknown> = {},
  capiOptions?: FireMetaCapiOptions,
) {
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const eventId = crypto.randomUUID();

  const mergedUserData: Record<string, unknown> = {
    client_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    ...(capiOptions?.sessionId ? { external_id: capiOptions.sessionId } : {}),
    ...userData,
  };

  // Also fire pixel with matching event_id for deduplication
  const w = window as any;
  if (w.fbq) {
    w.fbq("track", eventName, customData, { eventID: eventId });
  }

  fetch(`https://${projectId}.supabase.co/functions/v1/meta-capi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      funnelId,
      metaCookies: getMetaCookies(),
      fbclid: capiOptions?.fbclid,
      events: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: sourceUrl,
          action_source: "website",
          event_id: eventId,
          user_data: mergedUserData,
          custom_data: Object.keys(customData).length > 0 ? customData : undefined,
        },
      ],
    }),
  }).catch(() => {});
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const raw = document.cookie || "";
  if (!raw) return undefined;
  const parts = raw.split("; ");
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    const k = p.slice(0, eq);
    if (k !== name) continue;
    const v = p.slice(eq + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return undefined;
}

export function getMetaCookies(): { fbp?: string; fbc?: string } {
  const fbp = getCookieValue("_fbp");
  const fbc = getCookieValue("_fbc");
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}

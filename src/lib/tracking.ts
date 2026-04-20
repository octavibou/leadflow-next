import { supabase } from "@/integrations/supabase/client";

// ---- Internal event tracking ----
export function trackEvent(
  funnelId: string,
  campaignId: string | null,
  eventType: string,
  metadata: Record<string, any> = {}
) {
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

// ---- Meta Conversions API (server-side) ----
export function fireMetaCapi(
  pixelId: string,
  accessToken: string,
  eventName: string,
  sourceUrl: string,
  userData: Record<string, unknown> = {},
  customData: Record<string, unknown> = {},
  testEventCode?: string
) {
  const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const eventId = crypto.randomUUID();

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
      pixelId,
      accessToken,
      testEventCode: testEventCode || undefined,
      events: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: sourceUrl,
          action_source: "website",
          event_id: eventId,
          user_data: {
            client_ip_address: "0.0.0.0",
            client_user_agent: navigator.userAgent,
            ...userData,
          },
          custom_data: Object.keys(customData).length > 0 ? customData : undefined,
        },
      ],
    }),
  }).catch(() => {});
}

// ---- Extract UTMs from URL ----
export function extractUtms(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    const v = params.get(k);
    if (v) utms[k] = v;
  });
  return utms;
}

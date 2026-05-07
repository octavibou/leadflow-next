const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

interface CapiEvent {
  event_name: string;
  event_time: number;
  event_source_url: string;
  action_source: string;
  user_data: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
  event_id?: string;
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip")?.trim();
  return xri || null;
}

function isHexSha256(s: string): boolean {
  return /^[a-f0-9]{64}$/.test(s);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizePhone(phone: string): string {
  // Keep only digits. Caller must ensure country code is included upstream.
  return phone.replace(/[^\d]/g, "");
}

type FunnelSettingsRow = {
  saved_at: string | null;
  updated_at: string;
  settings: {
    metaPixelId?: string;
    metaTestEventCode?: string;
    customDomain?: string;
  } | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const {
      funnelId,
      testEventCode,
      metaCookies,
      events,
    }: {
      funnelId: string;
      testEventCode?: string;
      metaCookies?: { fbp?: string; fbc?: string };
      events: CapiEvent[];
    } = body;

    if (!funnelId || !events?.length) {
      console.error("meta-capi: missing required fields", { funnelId: !!funnelId, eventsLen: events?.length });
      return new Response(
        JSON.stringify({ error: "Missing funnelId or events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: funnelRow, error: funnelErr } = await supabase
      .from("funnels")
      .select("saved_at, updated_at, settings")
      .eq("id", funnelId)
      .single<FunnelSettingsRow>();

    const isPublished = Boolean(funnelRow?.saved_at) && funnelRow?.saved_at !== funnelRow?.updated_at;
    if (funnelErr || !isPublished || !funnelRow?.settings?.metaPixelId) {
      console.error("meta-capi: funnel not found or missing metaPixelId", { funnelId, funnelErr });
      return new Response(
        JSON.stringify({ error: "Funnel not found or Meta Pixel not configured" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: secretRow, error: secretErr } = await supabase
      .from("funnel_secrets")
      .select("meta_access_token")
      .eq("funnel_id", funnelId)
      .maybeSingle<{ meta_access_token: string | null }>();

    const pixelId = funnelRow.settings.metaPixelId;
    const accessToken = secretRow?.meta_access_token || "";
    const resolvedTestCode = testEventCode || funnelRow.settings.metaTestEventCode || undefined;

    if (!accessToken) {
      console.error("meta-capi: missing meta access token", { funnelId, secretErr });
      return new Response(
        JSON.stringify({ error: "Meta access token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = getClientIp(req);
    const reqOrigin = req.headers.get("origin")?.trim() || null;
    const allowedDomain = (funnelRow.settings.customDomain ?? "").trim().toLowerCase();

    // Basic request validation to reduce abuse:
    if (events.length > 10) {
      return new Response(JSON.stringify({ error: "Too many events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich + harden events before sending to Meta
    const enrichedEvents: CapiEvent[] = await Promise.all(
      events.map(async (e) => {
        const ud: Record<string, unknown> = { ...(e.user_data || {}) };

        // Gap 1: resolve IP server-side (null if unknown)
        ud.client_ip_address = clientIp ?? null;

        // Gap 2: fbp/fbc from browser cookies (if provided)
        if (metaCookies?.fbp) ud.fbp = metaCookies.fbp;
        if (metaCookies?.fbc) ud.fbc = metaCookies.fbc;

        // Gap 3: normalize + hash PII (em/ph) if present and not already hashed
        if (typeof ud.em === "string") {
          const em = ud.em.trim();
          if (em && !isHexSha256(em)) {
            ud.em = await sha256Hex(normalizeEmail(em));
          } else if (em) {
            ud.em = em.toLowerCase();
          }
        }
        if (typeof ud.ph === "string") {
          const ph = ud.ph.trim();
          if (ph && !isHexSha256(ph)) {
            const norm = normalizePhone(ph);
            if (norm) ud.ph = await sha256Hex(norm);
          } else if (ph) {
            ud.ph = ph.toLowerCase();
          }
        }

        // Validate event_source_url against request origin / custom domain (best-effort).
        try {
          const u = new URL(e.event_source_url);
          if (reqOrigin) {
            const o = new URL(reqOrigin);
            if (u.origin !== o.origin) {
              throw new Error("Origin mismatch");
            }
          }
          if (allowedDomain) {
            const h = u.hostname.toLowerCase();
            if (h !== allowedDomain && !h.endsWith(`.${allowedDomain}`)) {
              throw new Error("Domain not allowed");
            }
          }
        } catch {
          // If URL is invalid or not allowed, drop the event.
          return null as unknown as CapiEvent;
        }

        return { ...e, user_data: ud };
      })
    );

    const filteredEvents = enrichedEvents.filter(Boolean);
    if (filteredEvents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`meta-capi: sending ${filteredEvents.length} event(s) to pixel ${pixelId}`, {
      eventNames: filteredEvents.map(e => e.event_name),
      testEventCode: resolvedTestCode || "none",
    });

    const payload: Record<string, unknown> = {
      data: filteredEvents,
      access_token: accessToken,
    };
    if (resolvedTestCode) {
      payload.test_event_code = resolvedTestCode;
    }

    const response = await fetch(`${META_GRAPH_URL}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("meta-capi: Meta response", { status: response.status, ok: response.ok, result });

    return new Response(JSON.stringify(result), {
      status: response.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-capi error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

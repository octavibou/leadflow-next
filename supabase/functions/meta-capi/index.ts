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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      pixelId,
      accessToken,
      testEventCode,
      events,
    }: {
      pixelId: string;
      accessToken: string;
      testEventCode?: string;
      events: CapiEvent[];
    } = body;

    if (!pixelId || !accessToken || !events?.length) {
      console.error("meta-capi: missing required fields", { pixelId: !!pixelId, accessToken: !!accessToken, eventsLen: events?.length });
      return new Response(
        JSON.stringify({ error: "Missing pixelId, accessToken, or events" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`meta-capi: sending ${events.length} event(s) to pixel ${pixelId}`, {
      eventNames: events.map(e => e.event_name),
      testEventCode: testEventCode || "none",
    });

    const payload: Record<string, unknown> = {
      data: events,
      access_token: accessToken,
    };
    if (testEventCode) {
      payload.test_event_code = testEventCode;
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

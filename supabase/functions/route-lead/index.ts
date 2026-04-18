import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RouteClient {
  id: string;
  name: string;
  webhookUrl: string;
  priority: number;
  qualifyingAnswers: Record<string, Record<string, string[]>>;
}

interface RouteConfig {
  distributionStrategy: "all" | "round_robin" | "least_recent" | "priority";
  clients: RouteClient[];
  /** Round-robin counter persisted in config */
  rrIndex?: number;
  /** Map clientId → last-sent ISO timestamp */
  lastSent?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      funnelId,
      workspaceId,
      answers,        // Record<stepId, optionValue>
      answerOptionIds, // Record<stepId, optionId>  — option IDs for matching
      payload,        // The full webhook payload (same as GHL webhook)
    } = await req.json();

    if (!funnelId || !workspaceId || !payload) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch route config for workspace
    const { data: configRow, error: configErr } = await supabase
      .from("route_configs")
      .select("id, config")
      .eq("workspace_id", workspaceId)
      .single();

    if (configErr || !configRow) {
      // No routing configured — nothing to do
      return new Response(JSON.stringify({ routed: false, reason: "no_config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configRow.config as RouteConfig;
    if (!config.clients || config.clients.length === 0) {
      return new Response(JSON.stringify({ routed: false, reason: "no_clients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match clients: a client matches if ALL their qualifying answers for this funnel
    // have at least one option that the lead selected
    const matchingClients = config.clients.filter((client) => {
      const funnelAnswers = client.qualifyingAnswers[funnelId];
      if (!funnelAnswers || Object.keys(funnelAnswers).length === 0) return false;

      // For each question the client cares about, check if lead's answer option is in the list
      return Object.entries(funnelAnswers).every(([questionId, requiredOptionIds]) => {
        if (requiredOptionIds.length === 0) return true; // No constraint on this question
        const leadOptionId = answerOptionIds?.[questionId];
        return leadOptionId && requiredOptionIds.includes(leadOptionId);
      });
    });

    if (matchingClients.length === 0) {
      return new Response(JSON.stringify({ routed: false, reason: "no_match", matchedCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply distribution strategy
    let targets: RouteClient[] = [];

    switch (config.distributionStrategy) {
      case "all":
        targets = matchingClients;
        break;

      case "priority":
        // Pick the one with lowest priority number
        targets = [matchingClients.sort((a, b) => a.priority - b.priority)[0]];
        break;

      case "round_robin": {
        const idx = (config.rrIndex || 0) % matchingClients.length;
        targets = [matchingClients[idx]];
        // Update counter
        await supabase
          .from("route_configs")
          .update({
            config: { ...config, rrIndex: (config.rrIndex || 0) + 1 },
          })
          .eq("id", configRow.id);
        break;
      }

      case "least_recent": {
        const lastSent = config.lastSent || {};
        targets = [
          matchingClients.sort((a, b) => {
            const aTime = lastSent[a.id] ? new Date(lastSent[a.id]).getTime() : 0;
            const bTime = lastSent[b.id] ? new Date(lastSent[b.id]).getTime() : 0;
            return aTime - bTime;
          })[0],
        ];
        break;
      }
    }

    // Send webhooks to all targets
    const now = new Date().toISOString();
    const results = await Promise.allSettled(
      targets
        .filter((t) => t.webhookUrl)
        .map((t) =>
          fetch(t.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then((r) => ({ clientId: t.id, clientName: t.name, status: r.status }))
        )
    );

    // Update lastSent timestamps
    const newLastSent = { ...(config.lastSent || {}) };
    for (const t of targets) {
      newLastSent[t.id] = now;
    }
    await supabase
      .from("route_configs")
      .update({ config: { ...config, lastSent: newLastSent, rrIndex: config.rrIndex } })
      .eq("id", configRow.id);

    const sent = results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: String((r as PromiseRejectedResult).reason) }
    );

    return new Response(
      JSON.stringify({ routed: true, matchedCount: matchingClients.length, sentTo: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

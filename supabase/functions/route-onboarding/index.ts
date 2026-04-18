import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // GET: Fetch invitation data + funnels for onboarding page
    if (req.method === "GET" && token) {
      const { data: invitation, error } = await supabase
        .from("route_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !invitation) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get funnels for this workspace (only questions with qualifying options)
      const { data: funnels } = await supabase
        .from("funnels")
        .select("id, name, steps")
        .eq("workspace_id", invitation.workspace_id);

      // Get existing client answers from route_configs
      const { data: configRow } = await supabase
        .from("route_configs")
        .select("config")
        .eq("workspace_id", invitation.workspace_id)
        .single();

      const existingClient = configRow?.config?.clients?.find(
        (c: any) => c.id === invitation.client_id
      );

      return new Response(JSON.stringify({
        invitation,
        funnels: funnels || [],
        existingAnswers: existingClient?.qualifyingAnswers || {},
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Save client's qualifying answer selections
    if (req.method === "POST") {
      const { token: postToken, qualifyingAnswers, clientName, clientWebhookUrl } = await req.json();

      if (!postToken) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invitation, error: invErr } = await supabase
        .from("route_invitations")
        .select("*")
        .eq("token", postToken)
        .single();

      if (invErr || !invitation) {
        return new Response(JSON.stringify({ error: "Invitation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current route config
      const { data: configRow } = await supabase
        .from("route_configs")
        .select("id, config")
        .eq("workspace_id", invitation.workspace_id)
        .single();

      if (!configRow) {
        return new Response(JSON.stringify({ error: "No route config found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = configRow.config as any;
      const clients = config.clients || [];
      const clientIndex = clients.findIndex((c: any) => c.id === invitation.client_id);

      if (clientIndex >= 0) {
        // Update existing client
        clients[clientIndex].qualifyingAnswers = qualifyingAnswers || {};
        if (clientName) clients[clientIndex].name = clientName;
        if (clientWebhookUrl) clients[clientIndex].webhookUrl = clientWebhookUrl;
      } else {
        // Add new client
        clients.push({
          id: invitation.client_id,
          name: clientName || invitation.client_name,
          webhookUrl: clientWebhookUrl || invitation.client_webhook_url,
          priority: clients.length + 1,
          qualifyingAnswers: qualifyingAnswers || {},
        });
      }

      // Save updated config
      await supabase
        .from("route_configs")
        .update({ config: { ...config, clients } })
        .eq("id", configRow.id);

      // Mark invitation as completed
      await supabase
        .from("route_invitations")
        .update({ status: "completed" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

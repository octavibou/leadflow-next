import { createClient } from "@supabase/supabase-js";
import type { GhlOAuthConfig, GhlTokenResponse } from "./types";
import { GHL_OAUTH_BASE_URL } from "./types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export interface GhlTokenResult {
  accessToken: string;
  locationId: string;
  needsReconnect: boolean;
  error?: string;
}

async function refreshTokens(refreshToken: string): Promise<GhlTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GHL OAuth configuration");
  }

  const response = await fetch(`${GHL_OAUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[GHL Token Refresh] Failed:", errorText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export async function getValidGhlToken(
  workspaceId: string
): Promise<GhlTokenResult> {
  const { data: integration, error: fetchError } = await supabaseAdmin
    .from("workspace_integrations")
    .select("id, config, enabled")
    .eq("workspace_id", workspaceId)
    .eq("provider", "ghl")
    .single();

  if (fetchError || !integration) {
    return {
      accessToken: "",
      locationId: "",
      needsReconnect: true,
      error: "Integration not found",
    };
  }

  if (!integration.enabled) {
    return {
      accessToken: "",
      locationId: "",
      needsReconnect: false,
      error: "Integration disabled",
    };
  }

  const config = integration.config as GhlOAuthConfig | null;
  if (!config?.access_token || !config?.refresh_token) {
    return {
      accessToken: "",
      locationId: "",
      needsReconnect: true,
      error: "Missing OAuth tokens",
    };
  }

  const expiresAt = new Date(config.expires_at).getTime();
  const now = Date.now();

  if (now < expiresAt - REFRESH_THRESHOLD_MS) {
    return {
      accessToken: config.access_token,
      locationId: config.location_id,
      needsReconnect: false,
    };
  }

  try {
    const tokens = await refreshTokens(config.refresh_token);

    const newExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const updatedConfig: GhlOAuthConfig = {
      ...config,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: newExpiresAt,
    };

    await supabaseAdmin
      .from("workspace_integrations")
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: workspaceId,
      event_type: "token_refreshed",
      payload: {
        location_id: config.location_id,
        refreshed_at: new Date().toISOString(),
      },
      status: "ok",
    });

    return {
      accessToken: tokens.access_token,
      locationId: config.location_id,
      needsReconnect: false,
    };
  } catch (err) {
    console.error("[GHL Token Refresh]", err);

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: workspaceId,
      event_type: "token_refreshed",
      payload: {
        location_id: config.location_id,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      status: "error",
      error_message: err instanceof Error ? err.message : "Token refresh failed",
    });

    return {
      accessToken: "",
      locationId: config.location_id,
      needsReconnect: true,
      error: err instanceof Error ? err.message : "Token refresh failed",
    };
  }
}

export async function checkGhlConnectionStatus(
  workspaceId: string
): Promise<{
  connected: boolean;
  expired: boolean;
  locationId: string | null;
  locationName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
}> {
  const { data: integration } = await supabaseAdmin
    .from("workspace_integrations")
    .select("config, enabled")
    .eq("workspace_id", workspaceId)
    .eq("provider", "ghl")
    .single();

  if (!integration?.enabled) {
    return {
      connected: false,
      expired: false,
      locationId: null,
      locationName: null,
      connectedAt: null,
      lastSyncAt: null,
    };
  }

  const config = integration.config as GhlOAuthConfig | null;
  if (!config?.access_token) {
    return {
      connected: false,
      expired: false,
      locationId: null,
      locationName: null,
      connectedAt: null,
      lastSyncAt: null,
    };
  }

  const expiresAt = new Date(config.expires_at).getTime();
  const isExpired = Date.now() > expiresAt;

  return {
    connected: true,
    expired: isExpired,
    locationId: config.location_id,
    locationName: config.location_name || null,
    connectedAt: config.connected_at,
    lastSyncAt: config.last_sync_at || null,
  };
}

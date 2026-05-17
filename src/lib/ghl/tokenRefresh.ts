import { createClient } from "@supabase/supabase-js";
import type { GhlOAuthConfig } from "./types";
import { refreshGhlAccessToken } from "./oauth";
import { isCorruptedGhlConfig, isGhlOAuthConfig, patchGhlOAuthConfig } from "./integrationConfig";

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

  const config = integration.config;
  if (isCorruptedGhlConfig(config)) {
    return {
      accessToken: "",
      locationId: "",
      needsReconnect: true,
      error: "OAuth config corrupted. Please reconnect GoHighLevel.",
    };
  }

  if (!isGhlOAuthConfig(config)) {
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
    const tokens = await refreshGhlAccessToken(config.refresh_token);

    const newExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    await patchGhlOAuthConfig(workspaceId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: newExpiresAt,
      location_id: tokens.locationId || config.location_id,
      company_id: tokens.companyId ?? config.company_id,
      user_type: tokens.userType ?? config.user_type,
    });

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
  needsReconnect: boolean;
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
      needsReconnect: false,
      locationId: null,
      locationName: null,
      connectedAt: null,
      lastSyncAt: null,
    };
  }

  const config = integration.config;
  if (isCorruptedGhlConfig(config) || !isGhlOAuthConfig(config)) {
    return {
      connected: false,
      expired: false,
      needsReconnect: isCorruptedGhlConfig(config),
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
    needsReconnect: isExpired,
    locationId: config.location_id,
    locationName: config.location_name || null,
    connectedAt: config.connected_at,
    lastSyncAt: config.last_sync_at || null,
  };
}

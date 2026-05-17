import { NextResponse } from "next/server";
import type { GhlOAuthConfig } from "@/lib/ghl/types";
import { exchangeGhlAuthorizationCode, getAppBaseUrl } from "@/lib/ghl/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/integrations/supabase/types";

interface StatePayload {
  workspace_id: string;
  user_id: string;
  ts: number;
}

function parseState(state: string): StatePayload | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    return JSON.parse(decoded) as StatePayload;
  } catch {
    return null;
  }
}

async function fetchLocationInfo(accessToken: string, locationId: string) {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.location?.name || null;
    }
    console.error("[GHL Callback] Location fetch failed:", response.status, await response.text());
  } catch (err) {
    console.error("[GHL Callback] Failed to fetch location info:", err);
  }
  return null;
}

async function saveWorkspaceIntegration(
  workspaceId: string,
  oauthConfig: GhlOAuthConfig
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();

  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (wsError) {
    console.error("[GHL Callback] Workspace lookup error:", wsError);
    return { ok: false, error: wsError.message };
  }
  if (!workspace) {
    console.error("[GHL Callback] Workspace not found:", workspaceId);
    return { ok: false, error: "workspace_not_found" };
  }

  const row = {
    workspace_id: workspaceId,
    provider: "ghl",
    config: JSON.parse(JSON.stringify(oauthConfig)) as Json,
    enabled: true,
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error: upsertError } = await admin
    .from("workspace_integrations")
    .upsert(row, { onConflict: "workspace_id,provider" })
    .select("id")
    .single();

  if (upsertError) {
    console.error("[GHL Callback] Upsert error:", upsertError);
    return { ok: false, error: upsertError.message };
  }

  if (!upserted?.id) {
    console.error("[GHL Callback] Upsert returned no row");
    return { ok: false, error: "upsert_no_row" };
  }

  console.log("[GHL Callback] Saved integration id:", upserted.id);
  return { ok: true, id: upserted.id };
}

export async function GET(req: Request) {
  console.log("[GHL Callback] ========== STEP 1: Received callback ==========");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appBaseUrl = getAppBaseUrl(req);

  console.log("[GHL Callback] URL params:", {
    hasCode: !!code,
    hasState: !!state,
    error,
    appBaseUrl,
    hasGhlRedirectUri: !!process.env.GHL_REDIRECT_URI,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (error) {
    console.error("[GHL Callback] FAIL: OAuth error from GHL:", error);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    console.error("[GHL Callback] FAIL: Missing params");
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=missing_params`
    );
  }

  console.log("[GHL Callback] ========== STEP 2: Received code ==========");

  const statePayload = parseState(state);
  if (!statePayload?.workspace_id) {
    console.error("[GHL Callback] FAIL: Invalid state");
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=invalid_state`
    );
  }

  const stateAge = Date.now() - statePayload.ts;
  if (stateAge > 10 * 60 * 1000) {
    console.error("[GHL Callback] FAIL: State expired");
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=state_expired`
    );
  }

  try {
    console.log("[GHL Callback] ========== STEP 3: Token exchange ==========");
    const tokens = await exchangeGhlAuthorizationCode(code);
    console.log("[GHL Callback] Token exchange success, locationId:", tokens.locationId);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    console.log("[GHL Callback] ========== STEP 4: Location ID received ==========");
    const locationName = await fetchLocationInfo(tokens.access_token, tokens.locationId);

    const oauthConfig: GhlOAuthConfig = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      location_id: tokens.locationId,
      location_name: locationName || undefined,
      company_id: tokens.companyId,
      connected_at: new Date().toISOString(),
      user_type: tokens.userType,
    };

    console.log("[GHL Callback] ========== STEP 5: Supabase insert ==========");
    const saved = await saveWorkspaceIntegration(statePayload.workspace_id, oauthConfig);

    if (saved.ok === false) {
      console.error("[GHL Callback] FAIL: save failed:", saved.error);
      return NextResponse.redirect(
        `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(saved.error)}`
      );
    }

    console.log("[GHL Callback] ========== STEP 5: Supabase insert SUCCESS ==========");

    const admin = createSupabaseAdminClient();
    const { error: syncEventError } = await admin.from("ghl_sync_events").insert({
      workspace_id: statePayload.workspace_id,
      event_type: "connected",
      payload: {
        location_id: tokens.locationId,
        location_name: locationName,
        user_type: tokens.userType,
        connected_by: statePayload.user_id,
        integration_id: saved.id,
      } as Json,
      status: "ok",
    });

    if (syncEventError) {
      console.error("[GHL Callback] Warning: sync event failed:", syncEventError);
    }

    console.log("[GHL Callback] ========== STEP 6: Redirect SUCCESS ==========");
    return NextResponse.redirect(`${appBaseUrl}/dashboard?ghl=connected`);
  } catch (err) {
    console.error("[GHL Callback] ========== CAUGHT ERROR ==========", err);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(
        err instanceof Error ? err.message : "unknown_error"
      )}`
    );
  }
}

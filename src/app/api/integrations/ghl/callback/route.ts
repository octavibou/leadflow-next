import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { GhlOAuthConfig, GhlTokenResponse } from "@/lib/ghl/types";
import { GHL_OAUTH_BASE_URL } from "@/lib/ghl/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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

async function exchangeCodeForTokens(code: string): Promise<GhlTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GHL OAuth configuration");
  }

  const response = await fetch(`${GHL_OAUTH_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[GHL Callback] Token exchange failed:", errorText);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
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
  } catch (err) {
    console.error("[GHL Callback] Failed to fetch location info:", err);
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadflow.ai";

  if (error) {
    console.error("[GHL Callback] OAuth error:", error);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=missing_params`
    );
  }

  const statePayload = parseState(state);
  if (!statePayload) {
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=invalid_state`
    );
  }

  const stateAge = Date.now() - statePayload.ts;
  if (stateAge > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=state_expired`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const locationName = await fetchLocationInfo(
      tokens.access_token,
      tokens.locationId
    );

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

    const { error: upsertError } = await supabaseAdmin
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: statePayload.workspace_id,
          provider: "ghl",
          config: oauthConfig,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,provider" }
      );

    if (upsertError) {
      console.error("[GHL Callback] Failed to save integration:", upsertError);
      return NextResponse.redirect(
        `${appBaseUrl}/dashboard?ghl=error&message=save_failed`
      );
    }

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: statePayload.workspace_id,
      event_type: "connected",
      payload: {
        location_id: tokens.locationId,
        location_name: locationName,
        user_type: tokens.userType,
        connected_by: statePayload.user_id,
      },
      status: "ok",
    });

    return NextResponse.redirect(`${appBaseUrl}/dashboard?ghl=connected`);
  } catch (err) {
    console.error("[GHL Callback]", err);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(
        err instanceof Error ? err.message : "unknown_error"
      )}`
    );
  }
}

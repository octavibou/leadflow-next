import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { GhlOAuthConfig, GhlTokenResponse } from "@/lib/ghl/types";
import { GHL_OAUTH_BASE_URL } from "@/lib/ghl/types";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("[GHL Callback] Supabase config check:", {
    hasUrl: !!url,
    urlPrefix: url?.substring(0, 30),
    hasServiceKey: !!key,
    keyLength: key?.length,
  });
  
  if (!url || !key) {
    throw new Error("Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  
  _supabaseAdmin = createClient(url, key, { 
    auth: { persistSession: false, autoRefreshToken: false } 
  });
  
  return _supabaseAdmin;
}

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
  console.log("[GHL Callback] ========== STEP 1: Received callback ==========");
  
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  console.log("[GHL Callback] URL params:", { 
    hasCode: !!code, 
    codeLength: code?.length,
    hasState: !!state,
    stateLength: state?.length,
    error 
  });

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.leadflow.ai";
  console.log("[GHL Callback] appBaseUrl:", appBaseUrl);

  if (error) {
    console.error("[GHL Callback] FAIL: OAuth error from GHL:", error);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    console.error("[GHL Callback] FAIL: Missing params - code:", !!code, "state:", !!state);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=missing_params`
    );
  }

  console.log("[GHL Callback] ========== STEP 2: Received code ==========");

  const statePayload = parseState(state);
  console.log("[GHL Callback] Parsed state payload:", statePayload);
  
  if (!statePayload) {
    console.error("[GHL Callback] FAIL: Could not parse state. Raw state:", state);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=invalid_state`
    );
  }

  const stateAge = Date.now() - statePayload.ts;
  console.log("[GHL Callback] State age (ms):", stateAge, "Max allowed:", 10 * 60 * 1000);
  
  if (stateAge > 10 * 60 * 1000) {
    console.error("[GHL Callback] FAIL: State expired. Age:", stateAge);
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=state_expired`
    );
  }

  try {
    console.log("[GHL Callback] ========== STEP 3: Exchanging code for tokens ==========");
    const tokens = await exchangeCodeForTokens(code);
    console.log("[GHL Callback] Token exchange SUCCESS. Response keys:", Object.keys(tokens));
    console.log("[GHL Callback] Token data:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      locationId: tokens.locationId,
      companyId: tokens.companyId,
      userType: tokens.userType,
    });
    
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    console.log("[GHL Callback] ========== STEP 4: Location ID received ==========");
    console.log("[GHL Callback] Location ID:", tokens.locationId);

    const locationName = await fetchLocationInfo(
      tokens.access_token,
      tokens.locationId
    );
    console.log("[GHL Callback] Location name fetched:", locationName);

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

    console.log("[GHL Callback] ========== STEP 5: Inserting into workspace_integrations ==========");
    console.log("[GHL Callback] Upsert data:", {
      workspace_id: statePayload.workspace_id,
      provider: "ghl",
      enabled: true,
      configKeys: Object.keys(oauthConfig),
    });

    const { error: upsertError, data: upsertData } = await getSupabaseAdmin()
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
      )
      .select();

    console.log("[GHL Callback] Upsert result - error:", upsertError, "data:", upsertData);

    if (upsertError) {
      console.error("[GHL Callback] FAIL: Supabase upsert error:", JSON.stringify(upsertError, null, 2));
      return NextResponse.redirect(
        `${appBaseUrl}/dashboard?ghl=error&message=save_failed`
      );
    }

    console.log("[GHL Callback] ========== STEP 5: Supabase insert SUCCESS ==========");

    console.log("[GHL Callback] Inserting sync event...");
    const { error: syncEventError } = await getSupabaseAdmin().from("ghl_sync_events").insert({
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
    
    if (syncEventError) {
      console.error("[GHL Callback] Warning: sync event insert failed:", syncEventError);
    } else {
      console.log("[GHL Callback] Sync event inserted successfully");
    }

    console.log("[GHL Callback] ========== STEP 6: Redirect SUCCESS ==========");
    return NextResponse.redirect(`${appBaseUrl}/dashboard?ghl=connected`);
  } catch (err) {
    console.error("[GHL Callback] ========== CAUGHT ERROR ==========");
    console.error("[GHL Callback] Error type:", err?.constructor?.name);
    console.error("[GHL Callback] Error message:", err instanceof Error ? err.message : String(err));
    console.error("[GHL Callback] Error stack:", err instanceof Error ? err.stack : "no stack");
    return NextResponse.redirect(
      `${appBaseUrl}/dashboard?ghl=error&message=${encodeURIComponent(
        err instanceof Error ? err.message : "unknown_error"
      )}`
    );
  }
}

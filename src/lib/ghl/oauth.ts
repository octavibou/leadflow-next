import type { GhlTokenResponse } from "@/lib/ghl/types";
import { GHL_OAUTH_TOKEN_URL } from "@/lib/ghl/types";

export function getAppBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "https://os.leadflow.es";
}

/** GHL may return camelCase or snake_case depending on endpoint/version. */
export function normalizeGhlTokenResponse(raw: Record<string, unknown>): GhlTokenResponse {
  const locationId = raw.locationId ?? raw.location_id;
  const companyId = raw.companyId ?? raw.company_id;
  const userType = raw.userType ?? raw.user_type;

  if (!raw.access_token || typeof raw.access_token !== "string") {
    throw new Error("Token response missing access_token");
  }
  if (!raw.refresh_token || typeof raw.refresh_token !== "string") {
    throw new Error("Token response missing refresh_token");
  }
  const resolvedUserType =
    userType === "Location" || userType === "Company" ? userType : "Location";

  if (resolvedUserType === "Location" && (!locationId || typeof locationId !== "string")) {
    throw new Error("Token response missing locationId");
  }

  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_in: Number(raw.expires_in ?? 86400),
    token_type: String(raw.token_type ?? "Bearer"),
    scope: String(raw.scope ?? ""),
    locationId: typeof locationId === "string" ? locationId : "",
    companyId: typeof companyId === "string" ? companyId : undefined,
    userId: typeof raw.userId === "string" ? raw.userId : typeof raw.user_id === "string" ? raw.user_id : undefined,
    userType: resolvedUserType,
  };
}

export async function exchangeGhlAuthorizationCode(code: string): Promise<GhlTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GHL OAuth configuration");
  }

  const response = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      user_type: "Location",
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error("[GHL OAuth] Authorization code exchange failed:", response.status, rawText);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const raw = JSON.parse(rawText) as Record<string, unknown>;
  return normalizeGhlTokenResponse(raw);
}

export async function refreshGhlAccessToken(refreshToken: string): Promise<GhlTokenResponse> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error("Missing GHL OAuth configuration");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    user_type: "Location",
  });
  if (redirectUri) {
    body.set("redirect_uri", redirectUri);
  }

  const response = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const rawText = await response.text();
  if (!response.ok) {
    console.error("[GHL OAuth] Token refresh failed:", response.status, rawText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const raw = JSON.parse(rawText) as Record<string, unknown>;
  return normalizeGhlTokenResponse(raw);
}

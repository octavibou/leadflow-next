import type { GhlTokenResponse } from "@/lib/ghl/types";

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
  if (!locationId || typeof locationId !== "string") {
    throw new Error("Token response missing locationId");
  }

  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_in: Number(raw.expires_in ?? 86400),
    token_type: String(raw.token_type ?? "Bearer"),
    scope: String(raw.scope ?? ""),
    locationId,
    companyId: typeof companyId === "string" ? companyId : undefined,
    userId: typeof raw.userId === "string" ? raw.userId : typeof raw.user_id === "string" ? raw.user_id : undefined,
    userType:
      userType === "Location" || userType === "Company"
        ? userType
        : "Location",
  };
}

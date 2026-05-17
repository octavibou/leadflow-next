import { NextResponse } from "next/server";
import { getSupabaseUserIdFromRoute, createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { GHL_OAUTH_BASE_URL, GHL_SCOPES } from "@/lib/ghl/types";

function getAppBaseUrl(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "https://os.leadflow.es";
}

function redirectWithError(req: Request, message: string, status = 302) {
  const url = new URL("/dashboard", getAppBaseUrl(req));
  url.searchParams.set("ghl", "error");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url.toString(), { status });
}

async function resolveWorkspaceId(
  supabase: Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>>,
  userId: string,
  workspaceIdParam: string | null,
  funnelIdParam: string | null
): Promise<{ workspaceId: string | null; error?: string }> {
  if (workspaceIdParam) {
    return { workspaceId: workspaceIdParam };
  }

  if (funnelIdParam) {
    const { data: funnel } = await supabase
      .from("funnels")
      .select("workspace_id")
      .eq("id", funnelIdParam)
      .single();

    if (funnel?.workspace_id) {
      return { workspaceId: funnel.workspace_id };
    }
    return { workspaceId: null, error: "funnel_has_no_workspace" };
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .in("role", ["owner", "admin"]);

  const adminWorkspaces = memberships ?? [];
  if (adminWorkspaces.length === 1) {
    return { workspaceId: adminWorkspaces[0].workspace_id };
  }
  if (adminWorkspaces.length === 0) {
    return { workspaceId: null, error: "no_admin_workspace" };
  }
  return { workspaceId: null, error: "workspace_id_required" };
}

export async function GET(req: Request) {
  try {
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return redirectWithError(req, "unauthorized", 302);
    }

    const { searchParams } = new URL(req.url);
    const workspaceIdParam = searchParams.get("workspace_id");
    const funnelIdParam = searchParams.get("funnel_id");

    const supabase = await createSupabaseRouteHandlerClient();
    const resolved = await resolveWorkspaceId(
      supabase,
      userId,
      workspaceIdParam,
      funnelIdParam
    );

    if (!resolved.workspaceId) {
      const message = resolved.error ?? "workspace_id_required";
      return redirectWithError(req, message);
    }

    const workspaceId = resolved.workspaceId;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return redirectWithError(req, "forbidden");
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const redirectUri = process.env.GHL_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[GHL Connect] Missing GHL_CLIENT_ID or GHL_REDIRECT_URI");
      return redirectWithError(req, "ghl_not_configured");
    }

    const state = Buffer.from(
      JSON.stringify({
        workspace_id: workspaceId,
        user_id: userId,
        ts: Date.now(),
      })
    ).toString("base64url");

    const authUrl = new URL(`${GHL_OAUTH_BASE_URL}/oauth/chooselocation`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", GHL_SCOPES);
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    console.error("[GHL Connect]", err);
    return redirectWithError(
      req,
      err instanceof Error ? err.message : "internal_error"
    );
  }
}

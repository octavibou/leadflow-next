import { NextResponse } from "next/server";
import { getSupabaseUserIdFromRoute, createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { GHL_OAUTH_BASE_URL, GHL_SCOPES } from "@/lib/ghl/types";

export async function GET(req: Request) {
  try {
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You must be an admin or owner of this workspace" },
        { status: 403 }
      );
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const redirectUri = process.env.GHL_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[GHL Connect] Missing GHL_CLIENT_ID or GHL_REDIRECT_URI");
      return NextResponse.json(
        { error: "GHL integration not configured" },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

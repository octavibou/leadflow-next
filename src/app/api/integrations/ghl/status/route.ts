import { NextResponse } from "next/server";
import { getSupabaseUserIdFromRoute, createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { checkGhlConnectionStatus } from "@/lib/ghl/tokenRefresh";

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

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    const status = await checkGhlConnectionStatus(workspaceId);

    return NextResponse.json(status);
  } catch (err) {
    console.error("[GHL Status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

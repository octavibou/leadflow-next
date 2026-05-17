import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUserIdFromRoute, createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: Request) {
  try {
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId = body.workspace_id;

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
        { error: "You must be an admin or owner to disconnect" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("workspace_integrations")
      .update({
        config: null,
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("provider", "ghl");

    if (updateError) {
      console.error("[GHL Disconnect] Failed to update:", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("ghl_sync_events").insert({
      workspace_id: workspaceId,
      event_type: "disconnected",
      payload: {
        disconnected_by: userId,
        disconnected_at: new Date().toISOString(),
      },
      status: "ok",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GHL Disconnect]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUserIdFromRoute, createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { extractFunnelSchema } from "@/lib/ghl/schemaExtractor";
import { computeDiff, getDiffSummary, hasPendingChanges } from "@/lib/ghl/diffEngine";
import { executePushSync, getExistingMappings } from "@/lib/ghl/pushSync";
import { checkGhlConnectionStatus } from "@/lib/ghl/tokenRefresh";
import type { Funnel } from "@/types/funnel";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { funnelId } = await params;

    const supabase = await createSupabaseRouteHandlerClient();
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("id, workspace_id, steps, settings, name")
      .eq("id", funnelId)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    if (!funnel.workspace_id) {
      return NextResponse.json(
        { error: "Funnel must belong to a workspace for GHL sync" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", funnel.workspace_id)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this workspace" },
        { status: 403 }
      );
    }

    const connectionStatus = await checkGhlConnectionStatus(funnel.workspace_id);

    if (!connectionStatus.connected) {
      return NextResponse.json({
        connected: false,
        connectionStatus: "disconnected",
        locationId: null,
        locationName: null,
        lastSyncAt: null,
        pendingChanges: [],
        diffSummary: "Not connected",
        hasPendingChanges: false,
        mappings: [],
      });
    }

    const schema = extractFunnelSchema(funnel as unknown as Funnel);
    const existingMappings = await getExistingMappings(
      funnel.workspace_id,
      funnelId
    );
    const diffs = computeDiff(schema, existingMappings);

    return NextResponse.json({
      connected: true,
      connectionStatus: connectionStatus.expired ? "expired" : "connected",
      locationId: connectionStatus.locationId,
      locationName: connectionStatus.locationName,
      lastSyncAt: connectionStatus.lastSyncAt,
      connectedAt: connectionStatus.connectedAt,
      pendingChanges: diffs,
      diffSummary: getDiffSummary(diffs),
      hasPendingChanges: hasPendingChanges(diffs),
      mappings: existingMappings,
      schema,
    });
  } catch (err) {
    console.error("[GHL Sync GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { funnelId } = await params;

    const supabase = await createSupabaseRouteHandlerClient();
    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("id, workspace_id, steps, settings, name")
      .eq("id", funnelId)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }

    if (!funnel.workspace_id) {
      return NextResponse.json(
        { error: "Funnel must belong to a workspace for GHL sync" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", funnel.workspace_id)
      .eq("user_id", userId)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You must be an admin or owner to push sync changes" },
        { status: 403 }
      );
    }

    const connectionStatus = await checkGhlConnectionStatus(funnel.workspace_id);

    if (!connectionStatus.connected) {
      return NextResponse.json(
        { error: "GHL not connected. Please connect first." },
        { status: 400 }
      );
    }

    if (connectionStatus.expired) {
      return NextResponse.json(
        { error: "GHL connection expired. Please reconnect." },
        { status: 400 }
      );
    }

    const schema = extractFunnelSchema(funnel as unknown as Funnel);
    const existingMappings = await getExistingMappings(
      funnel.workspace_id,
      funnelId
    );
    const diffs = computeDiff(schema, existingMappings);

    if (!hasPendingChanges(diffs)) {
      return NextResponse.json({
        success: true,
        message: "No changes to sync",
        created: 0,
        updated: 0,
        orphaned: 0,
        errors: [],
      });
    }

    const result = await executePushSync(funnel.workspace_id, funnelId, diffs);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Sync completed successfully"
        : "Sync completed with errors",
      created: result.created,
      updated: result.updated,
      orphaned: result.orphaned,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[GHL Sync POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

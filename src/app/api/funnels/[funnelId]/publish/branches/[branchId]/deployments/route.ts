import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ funnelId: string; branchId: string }> }) {
  try {
    const { funnelId, branchId } = await ctx.params;
    if (!uuidRe.test(funnelId) || !uuidRe.test(branchId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitRaw = new URL(req.url).searchParams.get("limit");
    const limit = Math.min(50, Math.max(1, Number(limitRaw) || 20));

    const supabase = await createSupabaseRouteHandlerClient();

    const { data: branch, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id")
      .eq("id", branchId)
      .eq("funnel_id", funnelId)
      .maybeSingle();

    if (bErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const { data: deployments, error: dErr } = await supabase
      .from("funnel_deployments")
      .select("id, version, created_at, status, created_by")
      .eq("branch_id", branchId)
      .order("version", { ascending: false })
      .limit(limit);

    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }

    const { data: ptr } = await supabase
      .from("funnel_branch_pointers")
      .select("active_deployment_id")
      .eq("branch_id", branchId)
      .maybeSingle();

    return NextResponse.json({
      activeDeploymentId: ptr?.active_deployment_id ?? null,
      deployments: deployments ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

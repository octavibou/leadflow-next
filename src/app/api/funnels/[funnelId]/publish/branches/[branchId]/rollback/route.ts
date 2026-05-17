import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const bodySchema = z.object({
  toDeploymentId: z.string().uuid(),
});

export async function POST(req: Request, ctx: { params: Promise<{ funnelId: string; branchId: string }> }) {
  try {
    const { funnelId, branchId } = await ctx.params;
    if (!uuidRe.test(funnelId) || !uuidRe.test(branchId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createSupabaseRouteHandlerClient();

    const { data: branch, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id, funnel_id")
      .eq("id", branchId)
      .eq("funnel_id", funnelId)
      .maybeSingle();

    if (bErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const { data: target, error: tErr } = await supabase
      .from("funnel_deployments")
      .select("id, branch_id, version")
      .eq("id", parsed.data.toDeploymentId)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (tErr || !target) {
      return NextResponse.json({ error: "Deployment not found on this branch" }, { status: 404 });
    }

    const { data: prevPtr } = await supabase
      .from("funnel_branch_pointers")
      .select("active_deployment_id")
      .eq("branch_id", branchId)
      .maybeSingle();

    const fromId = prevPtr?.active_deployment_id ?? null;

    const { error: ptrErr } = await supabase
      .from("funnel_branch_pointers")
      .update({ active_deployment_id: target.id })
      .eq("branch_id", branchId);

    if (ptrErr) {
      return NextResponse.json({ error: ptrErr.message }, { status: 400 });
    }

    await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: branchId,
      deployment_id: target.id,
      event_type: "deployment.rollback",
      payload: {
        version: target.version,
        from_deployment_id: fromId,
        to_deployment_id: target.id,
      },
      actor_id: userId,
    });

    return NextResponse.json({ ok: true, activeDeploymentId: target.id, version: target.version });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

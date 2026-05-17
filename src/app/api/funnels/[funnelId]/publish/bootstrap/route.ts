import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";
import { ensureDefaultPublishBranchesForFunnel } from "@/lib/publish/ensureDefaultPublishBranches";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Crea ramas `main` + `direct` y deployments iniciales si faltan. */
export async function POST(_req: Request, ctx: { params: Promise<{ funnelId: string }> }) {
  try {
    const { funnelId } = await ctx.params;
    if (!uuidRe.test(funnelId)) {
      return NextResponse.json({ error: "Invalid funnel id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const result = await ensureDefaultPublishBranchesForFunnel(supabase, funnelId, userId);

    return NextResponse.json({
      branchId: result.mainBranchId,
      created: result.createdMain || result.createdDirect,
      mainBranchId: result.mainBranchId,
      directBranchId: result.directBranchId,
      createdMain: result.createdMain,
      createdDirect: result.createdDirect,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

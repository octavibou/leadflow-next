import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ funnelId: string }> }) {
  try {
    const { funnelId } = await ctx.params;
    if (!uuidRe.test(funnelId)) {
      return NextResponse.json({ error: "Invalid funnel id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 40));
    const branchId = url.searchParams.get("branchId");
    const eventType = url.searchParams.get("type");

    const supabase = await createSupabaseRouteHandlerClient();

    let q = supabase
      .from("funnel_activity_events")
      .select("id, funnel_id, branch_id, deployment_id, event_type, payload, actor_id, created_at")
      .eq("funnel_id", funnelId);

    if (branchId && uuidRe.test(branchId)) {
      q = q.eq("branch_id", branchId);
    }
    if (eventType?.trim()) {
      q = q.eq("event_type", eventType.trim());
    }

    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

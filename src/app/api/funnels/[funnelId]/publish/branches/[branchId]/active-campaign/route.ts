import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDeploymentSourceCampaignId } from "@/lib/publish/publishResolve";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ funnelId: string; branchId: string }> },
) {
  try {
    const { funnelId, branchId } = await ctx.params;
    if (!uuidRe.test(funnelId)) {
      return NextResponse.json({ error: "Invalid funnel id" }, { status: 400 });
    }
    const slug = String(branchId || "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Invalid branch slug" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: funnelRow, error: fErr } = await supabaseAdmin
      .from("funnels")
      .select("id, saved_at, updated_at")
      .eq("id", funnelId)
      .maybeSingle();
    if (fErr || !funnelRow) {
      return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
    }
    const isPublished = Boolean(funnelRow.saved_at && funnelRow.saved_at !== funnelRow.updated_at);
    if (!isPublished) {
      return NextResponse.json({ error: "Funnel not published" }, { status: 404 });
    }

    const { data: branch } = await supabaseAdmin
      .from("funnel_branches")
      .select("id")
      .eq("funnel_id", funnelId)
      .eq("slug", slug)
      .maybeSingle();
    if (!branch?.id) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const { data: ptr } = await supabaseAdmin
      .from("funnel_branch_pointers")
      .select("active_deployment_id")
      .eq("branch_id", branch.id)
      .maybeSingle();
    const activeDeploymentId = ptr?.active_deployment_id ?? null;
    if (!activeDeploymentId) {
      return NextResponse.json({ campaign: null });
    }

    const { data: dep } = await supabaseAdmin
      .from("funnel_deployments")
      .select("landing_snapshot")
      .eq("id", activeDeploymentId)
      .maybeSingle();
    const sourceCampaignId = getDeploymentSourceCampaignId(dep?.landing_snapshot);
    if (!sourceCampaignId) {
      return NextResponse.json({ campaign: null });
    }

    const { data: campaign } = await supabaseAdmin
      .from("campaigns")
      .select("id, settings, steps")
      .eq("funnel_id", funnelId)
      .eq("id", sourceCampaignId)
      .maybeSingle();
    if (!campaign) {
      return NextResponse.json({ campaign: null });
    }

    return NextResponse.json({ campaign });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

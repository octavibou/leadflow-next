import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const rateBucket = new Map<string, number>();
const RATE_GAP_MS = 1500;

function rateOk(key: string): boolean {
  const now = Date.now();
  const prev = rateBucket.get(key) ?? 0;
  if (now - prev < RATE_GAP_MS) return false;
  rateBucket.set(key, now);
  if (rateBucket.size > 8000) {
    const cutoff = now - 120_000;
    for (const [k, t] of rateBucket) {
      if (t < cutoff) rateBucket.delete(k);
    }
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url?.trim() || !serviceRole?.trim()) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as {
      funnelId?: string;
      campaignId?: string | null;
      currentStepId?: string;
    } | null;

    const funnelId = String(body?.funnelId || "").trim();
    if (!funnelId) {
      return NextResponse.json({ ok: false, error: "Missing funnelId" }, { status: 400 });
    }

    const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateOk(`${fwd}|${funnelId}`)) {
      return NextResponse.json({ ok: false, error: "Rate limit" }, { status: 429 });
    }

    const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: funnelRow, error: funnelErr } = await supabase
      .from("funnels")
      .select("id, saved_at, updated_at")
      .eq("id", funnelId)
      .maybeSingle();

    if (funnelErr || !funnelRow) {
      return NextResponse.json({ ok: false, error: "Funnel not found" }, { status: 404 });
    }

    const published =
      Boolean(funnelRow.saved_at) && new Date(funnelRow.saved_at).getTime() !== new Date(funnelRow.updated_at).getTime();
    if (!published) {
      return NextResponse.json({ ok: false, error: "Not published" }, { status: 403 });
    }

    const campaignId = body?.campaignId ? String(body.campaignId).trim() : null;
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    let formQuery = supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("funnel_id", funnelId)
      .eq("event_type", "form_submit")
      .gte("created_at", weekAgo);
    if (campaignId) formQuery = formQuery.eq("campaign_id", campaignId);
    else formQuery = formQuery.is("campaign_id", null);

    const { count: completedWeek, error: cErr } = await formQuery;
    if (cErr) {
      return NextResponse.json({ ok: false, error: cErr.message }, { status: 500 });
    }

    let stepQuery = supabase
      .from("events")
      .select("metadata")
      .eq("funnel_id", funnelId)
      .eq("event_type", "step_view")
      .gte("created_at", twoMinAgo)
      .limit(500);
    if (campaignId) stepQuery = stepQuery.eq("campaign_id", campaignId);
    else stepQuery = stepQuery.is("campaign_id", null);

    const { data: stepRows, error: sErr } = await stepQuery;
    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });
    }

    const sessions = new Set<string>();
    for (const row of stepRows || []) {
      const sid = (row.metadata as { session_id?: string } | null)?.session_id;
      if (sid && typeof sid === "string") sessions.add(sid);
    }
    const activeNow = sessions.size;

    let stepActivityCount: number | undefined;
    const currentStepId = String(body?.currentStepId || "").trim();
    if (currentStepId) {
      let actQuery = supabase
        .from("events")
        .select("metadata")
        .eq("funnel_id", funnelId)
        .eq("event_type", "step_view")
        .gte("created_at", hourAgo)
        .limit(800);
      if (campaignId) actQuery = actQuery.eq("campaign_id", campaignId);
      else actQuery = actQuery.is("campaign_id", null);
      const { data: actRows } = await actQuery;
      const stepSessions = new Set<string>();
      for (const row of actRows || []) {
        const m = row.metadata as { session_id?: string; step_id?: string } | null;
        if (m?.step_id === currentStepId && m.session_id) stepSessions.add(m.session_id);
      }
      stepActivityCount = stepSessions.size;
    }

    return NextResponse.json({
      ok: true,
      stats: {
        completedWeek: completedWeek ?? 0,
        activeNow: Math.max(activeNow, 0),
        stepActivityCount,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

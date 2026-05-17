import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";
import { isReservedFunnelBranchSlug } from "@/lib/publish/publishBranchConstants";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createBranchSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "slug: solo letras, números y guiones"),
});

export async function GET(_req: Request, ctx: { params: Promise<{ funnelId: string }> }) {
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

    const { data: branches, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id, funnel_id, name, slug, is_main, created_at")
      .eq("funnel_id", funnelId)
      .order("is_main", { ascending: false })
      .order("created_at", { ascending: true });

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const branchIds = (branches ?? []).map((b) => b.id);
    let pointers: { branch_id: string; active_deployment_id: string | null }[] = [];
    if (branchIds.length > 0) {
      const { data: ptrs, error: pErr } = await supabase
        .from("funnel_branch_pointers")
        .select("branch_id, active_deployment_id")
        .in("branch_id", branchIds);
      if (pErr) {
        return NextResponse.json({ error: pErr.message }, { status: 500 });
      }
      pointers = ptrs ?? [];
    }

    const activeIds = pointers.map((p) => p.active_deployment_id).filter(Boolean) as string[];
    let deployments: Record<string, { id: string; version: number; created_at: string; status: string }> = {};
    if (activeIds.length > 0) {
      const { data: deps, error: dErr } = await supabase
        .from("funnel_deployments")
        .select("id, branch_id, version, created_at, status")
        .in("id", activeIds);
      if (dErr) {
        return NextResponse.json({ error: dErr.message }, { status: 500 });
      }
      for (const d of deps ?? []) {
        deployments[d.id] = { id: d.id, version: d.version, created_at: d.created_at, status: d.status };
      }
    }

    const pointerByBranch = Object.fromEntries(pointers.map((p) => [p.branch_id, p]));

    return NextResponse.json({
      branches: (branches ?? []).map((b) => {
        const ptr = pointerByBranch[b.id];
        const aid = ptr?.active_deployment_id ?? null;
        const active = aid ? deployments[aid] ?? null : null;
        return { ...b, activeDeployment: active };
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ funnelId: string }> }) {
  try {
    const { funnelId } = await ctx.params;
    if (!uuidRe.test(funnelId)) {
      return NextResponse.json({ error: "Invalid funnel id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = createBranchSchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    }
    const slug = body.data.slug.toLowerCase();
    if (isReservedFunnelBranchSlug(slug)) {
      return NextResponse.json({ error: `Reserved slug: ${slug}` }, { status: 400 });
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { data, error } = await supabase
      .from("funnel_branches")
      .insert({
        funnel_id: funnelId,
        name: body.data.name.trim(),
        slug,
        is_main: false,
      })
      .select("id, funnel_id, name, slug, is_main, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: data.id,
      event_type: "branch.created",
      payload: { name: data.name, slug: data.slug },
      actor_id: userId,
    });

    return NextResponse.json({ branch: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

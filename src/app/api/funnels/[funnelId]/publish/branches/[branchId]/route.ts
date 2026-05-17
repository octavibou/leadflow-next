import { NextResponse } from "next/server";
import { z } from "zod";
import { isDirectDefaultBranchSlug, isReservedFunnelBranchSlug } from "@/lib/publish/publishBranchConstants";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones")
    .optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ funnelId: string; branchId: string }> }) {
  try {
    const { funnelId, branchId } = await ctx.params;
    if (!uuidRe.test(funnelId) || !uuidRe.test(branchId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, slug } = parsed.data;
    if (!name && !slug) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const supabase = await createSupabaseRouteHandlerClient();

    const { data: branch, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id, funnel_id, is_main, slug")
      .eq("id", branchId)
      .eq("funnel_id", funnelId)
      .maybeSingle();

    if (bErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    if (branch.is_main || isDirectDefaultBranchSlug(String(branch.slug ?? ""))) {
      return NextResponse.json({ error: "Cannot edit protected branch" }, { status: 400 });
    }

    if (slug && isReservedFunnelBranchSlug(slug)) {
      return NextResponse.json({ error: `Slug "${slug}" is reserved` }, { status: 400 });
    }

    if (slug && slug !== branch.slug) {
      const { data: existing } = await supabase
        .from("funnel_branches")
        .select("id")
        .eq("funnel_id", funnelId)
        .eq("slug", slug)
        .neq("id", branchId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: `Slug "${slug}" already in use` }, { status: 400 });
      }
    }

    const updates: Record<string, string> = {};
    if (name) updates.name = name;
    if (slug) updates.slug = slug;

    const { data: updated, error: uErr } = await supabase
      .from("funnel_branches")
      .update(updates)
      .eq("id", branchId)
      .select("id, funnel_id, name, slug, is_main, created_at")
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 400 });
    }

    return NextResponse.json({ branch: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ funnelId: string; branchId: string }> }) {
  try {
    const { funnelId, branchId } = await ctx.params;
    if (!uuidRe.test(funnelId) || !uuidRe.test(branchId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const userId = await getSupabaseUserIdFromRoute();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { data: branch, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id, funnel_id, is_main, name, slug")
      .eq("id", branchId)
      .eq("funnel_id", funnelId)
      .maybeSingle();

    if (bErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    if (branch.is_main || isDirectDefaultBranchSlug(String(branch.slug ?? ""))) {
      return NextResponse.json({ error: "Cannot delete protected branch" }, { status: 400 });
    }

    const { error: dErr } = await supabase.from("funnel_branches").delete().eq("id", branchId);
    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 400 });
    }

    const { error: actErr } = await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: null,
      event_type: "branch.deleted",
      payload: { branch_id: branchId, name: branch.name, slug: branch.slug },
      actor_id: userId,
    });
    if (actErr) {
      // La rama ya se elimino; el fallo del log no debe devolver error al cliente.
      console.error("funnel_activity_events branch.deleted:", actErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

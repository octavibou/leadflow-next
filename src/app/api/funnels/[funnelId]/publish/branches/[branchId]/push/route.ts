import { NextResponse } from "next/server";
import { z } from "zod";
import { pickLandingSettingsPatch } from "@/lib/publish/publishResolve";
import { createSupabaseRouteHandlerClient, getSupabaseUserIdFromRoute } from "@/lib/supabase/route-handler";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const pushBodySchema = z.object({
  landing_snapshot: z.object({
    snapshot_version: z.literal(1),
    introStep: z.unknown().nullable(),
    useLanding: z.boolean().optional(),
  }),
  settings_patch: z.record(z.unknown()).optional(),
  /** "default" o id de campana origen del push. Se guarda en payload del activity event. */
  variant_id: z.string().optional(),
  /** Steps completos de la variante (campana) para embeber en el snapshot. */
  variant_steps: z.array(z.unknown()).optional(),
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

    const parsed = pushBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const settings_patch = pickLandingSettingsPatch(parsed.data.settings_patch ?? {});

    const supabase = await createSupabaseRouteHandlerClient();

    const { data: branch, error: bErr } = await supabase
      .from("funnel_branches")
      .select("id, funnel_id, slug")
      .eq("id", branchId)
      .eq("funnel_id", funnelId)
      .maybeSingle();

    if (bErr || !branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    let landing_snapshot: Record<string, unknown> = {
      ...(parsed.data.landing_snapshot as Record<string, unknown>),
    };
    const vid = (parsed.data.variant_id ?? "").trim();
    if (vid && vid !== "default" && vid !== "no-landing" && uuidRe.test(vid)) {
      landing_snapshot.source_variant_id = vid;

      // Fuente de verdad: intentar resolver los steps de la campaña desde DB por `variant_id`.
      // Si falla (RLS / fila no encontrada), fallback al payload enviado por el cliente.
      let resolvedVariantSteps: unknown[] | null = null;
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("steps")
        .eq("id", vid)
        .eq("funnel_id", funnelId)
        .maybeSingle();
      if (Array.isArray(campaign?.steps) && campaign.steps.length > 0) {
        resolvedVariantSteps = campaign.steps;
      } else if (Array.isArray(parsed.data.variant_steps) && parsed.data.variant_steps.length > 0) {
        resolvedVariantSteps = parsed.data.variant_steps;
      }

      if (resolvedVariantSteps) {
        landing_snapshot.source_variant_steps = resolvedVariantSteps;
      } else {
        delete landing_snapshot.source_variant_steps;
      }
    } else {
      delete landing_snapshot.source_variant_id;
      delete landing_snapshot.source_variant_steps;
    }

    const { data: maxRow } = await supabase
      .from("funnel_deployments")
      .select("version")
      .eq("branch_id", branchId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (maxRow?.version ?? 0) + 1;

    const { data: dep, error: insErr } = await supabase
      .from("funnel_deployments")
      .insert({
        branch_id: branchId,
        version: nextVersion,
        landing_snapshot: landing_snapshot as unknown as Record<string, unknown>,
        settings_patch: settings_patch as unknown as Record<string, unknown>,
        created_by: userId,
        status: "ready",
      })
      .select("id, branch_id, version, created_at, status")
      .single();

    if (insErr || !dep) {
      return NextResponse.json({ error: insErr?.message ?? "Insert failed" }, { status: 400 });
    }

    const { data: prevPtr } = await supabase
      .from("funnel_branch_pointers")
      .select("active_deployment_id")
      .eq("branch_id", branchId)
      .maybeSingle();

    const fromId = prevPtr?.active_deployment_id ?? null;

    const { error: ptrErr } = await supabase
      .from("funnel_branch_pointers")
      .update({ active_deployment_id: dep.id })
      .eq("branch_id", branchId);

    if (ptrErr) {
      return NextResponse.json({ error: ptrErr.message }, { status: 400 });
    }

    await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: branchId,
      deployment_id: dep.id,
      event_type: "deployment.pushed",
      payload: {
        version: dep.version,
        from_deployment_id: fromId,
        to_deployment_id: dep.id,
        variant_id: parsed.data.variant_id ?? null,
      },
      actor_id: userId,
    });

    return NextResponse.json({ deployment: dep });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Funnel, FunnelStep, FunnelType } from "@/types/funnel";
import { FUNNEL_BRANCH_SLUG_DIRECT, FUNNEL_BRANCH_SLUG_MAIN } from "@/lib/publish/publishBranchConstants";
import {
  extractDirectDefaultLandingSnapshotFromFunnel,
  extractLandingSnapshotFromFunnel,
} from "@/lib/publish/publishResolve";

export type EnsureDefaultBranchesResult = {
  mainBranchId: string;
  directBranchId: string;
  createdMain: boolean;
  createdDirect: boolean;
};

function minimalFunnelFromRow(row: { id: string; steps: unknown; settings: unknown }): Funnel {
  const steps = (Array.isArray(row.steps) ? row.steps : []) as FunnelStep[];
  const settings = (row.settings && typeof row.settings === "object" ? row.settings : {}) as Funnel["settings"];
  return {
    id: row.id,
    user_id: "",
    name: "",
    slug: "",
    type: "blank" as FunnelType,
    settings,
    steps,
    created_at: "",
    updated_at: "",
    saved_at: "",
    workspace_id: undefined,
  };
}

async function ensureActiveDeploymentForBranch(
  supabase: SupabaseClient,
  funnelId: string,
  branchId: string,
  funnel: Funnel,
  isDirect: boolean,
  actorUserId: string,
): Promise<void> {
  const { data: ptr, error: pErr } = await supabase
    .from("funnel_branch_pointers")
    .select("active_deployment_id")
    .eq("branch_id", branchId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (ptr?.active_deployment_id) return;

  const { data: latest } = await supabase
    .from("funnel_deployments")
    .select("id")
    .eq("branch_id", branchId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id) {
    const { error: uErr } = await supabase
      .from("funnel_branch_pointers")
      .update({ active_deployment_id: latest.id })
      .eq("branch_id", branchId);
    if (uErr) throw new Error(uErr.message);
    return;
  }

  const snapshot = isDirect
    ? extractDirectDefaultLandingSnapshotFromFunnel(funnel)
    : extractLandingSnapshotFromFunnel(funnel);

  const { data: dep, error: insErr } = await supabase
    .from("funnel_deployments")
    .insert({
      branch_id: branchId,
      version: 1,
      landing_snapshot: snapshot as unknown as Record<string, unknown>,
      settings_patch: {} as Record<string, unknown>,
      created_by: actorUserId,
      status: "ready",
    })
    .select("id")
    .single();

  if (insErr || !dep) {
    throw new Error(insErr?.message ?? "deployment insert failed");
  }

  const { error: ptrErr } = await supabase
    .from("funnel_branch_pointers")
    .update({ active_deployment_id: dep.id })
    .eq("branch_id", branchId);
  if (ptrErr) throw new Error(ptrErr.message);

  await supabase.from("funnel_activity_events").insert({
    funnel_id: funnelId,
    branch_id: branchId,
    deployment_id: dep.id,
    event_type: "deployment.pushed",
    payload: { version: 1, bootstrap: true, direct: isDirect },
    actor_id: actorUserId,
  });
}

/**
 * Garantiza rama `main`, rama `direct` y un deployment activo por rama cuando faltan.
 * Idempotente: no duplica ramas ni punteros ya rellenados.
 */
export async function ensureDefaultPublishBranchesForFunnel(
  supabase: SupabaseClient,
  funnelId: string,
  actorUserId: string,
): Promise<EnsureDefaultBranchesResult> {
  const { data: funnelRow, error: fErr } = await supabase
    .from("funnels")
    .select("id, steps, settings")
    .eq("id", funnelId)
    .single();

  if (fErr || !funnelRow) {
    throw new Error(fErr?.message ?? "Funnel not found");
  }

  const funnel = minimalFunnelFromRow(funnelRow);
  let createdMain = false;
  let createdDirect = false;

  let { data: mainRow, error: mErr } = await supabase
    .from("funnel_branches")
    .select("id")
    .eq("funnel_id", funnelId)
    .eq("is_main", true)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);

  if (!mainRow?.id) {
    const { data: ins, error } = await supabase
      .from("funnel_branches")
      .insert({
        funnel_id: funnelId,
        name: FUNNEL_BRANCH_SLUG_MAIN,
        slug: FUNNEL_BRANCH_SLUG_MAIN,
        is_main: true,
      })
      .select("id")
      .single();
    if (error || !ins) throw new Error(error?.message ?? "main branch insert failed");
    mainRow = ins;
    createdMain = true;
    await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: ins.id,
      event_type: "branch.created",
      payload: { name: FUNNEL_BRANCH_SLUG_MAIN, slug: FUNNEL_BRANCH_SLUG_MAIN, bootstrap: true },
      actor_id: actorUserId,
    });
  }

  const mainBranchId = mainRow!.id;

  let { data: directRow, error: dErr } = await supabase
    .from("funnel_branches")
    .select("id")
    .eq("funnel_id", funnelId)
    .eq("slug", FUNNEL_BRANCH_SLUG_DIRECT)
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);

  if (!directRow?.id) {
    const { data: ins, error } = await supabase
      .from("funnel_branches")
      .insert({
        funnel_id: funnelId,
        name: "Solo funnel",
        slug: FUNNEL_BRANCH_SLUG_DIRECT,
        is_main: false,
      })
      .select("id")
      .single();
    if (error || !ins) throw new Error(error?.message ?? "direct branch insert failed");
    directRow = ins;
    createdDirect = true;
    await supabase.from("funnel_activity_events").insert({
      funnel_id: funnelId,
      branch_id: ins.id,
      event_type: "branch.created",
      payload: { name: "Solo funnel", slug: FUNNEL_BRANCH_SLUG_DIRECT, bootstrap: true },
      actor_id: actorUserId,
    });
  }

  const directBranchId = directRow!.id;

  await ensureActiveDeploymentForBranch(supabase, funnelId, mainBranchId, funnel, false, actorUserId);
  await ensureActiveDeploymentForBranch(supabase, funnelId, directBranchId, funnel, true, actorUserId);

  return { mainBranchId, directBranchId, createdMain, createdDirect };
}

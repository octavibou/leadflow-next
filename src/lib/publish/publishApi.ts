import {
  extractDirectDefaultLandingSnapshotFromFunnel,
  extractLandingSnapshotFromFunnel,
  pickLandingSettingsPatch,
} from "@/lib/publish/publishResolve";
import type { Funnel, FunnelStep } from "@/types/funnel";

const jsonHeaders = { "Content-Type": "application/json" };

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: unknown };
  if (!res.ok) {
    const err = body && typeof body === "object" && "error" in body ? body.error : res.statusText;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  return body as T;
}

export type PublishBootstrapResult = {
  branchId: string;
  created: boolean;
  mainBranchId: string;
  directBranchId: string;
  createdMain: boolean;
  createdDirect: boolean;
};

export async function publishBootstrapMain(funnelId: string): Promise<PublishBootstrapResult> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/bootstrap`, {
    method: "POST",
    credentials: "include",
  });
  return parseJson(res);
}

export type PublishBranchRow = {
  id: string;
  funnel_id: string;
  name: string;
  slug: string;
  is_main: boolean;
  created_at: string;
  activeDeployment?: { id: string; version: number; created_at: string; status: string } | null;
};

export async function fetchPublishBranches(funnelId: string): Promise<PublishBranchRow[]> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches`, { credentials: "include" });
  const data = await parseJson<{ branches: PublishBranchRow[] }>(res);
  return data.branches ?? [];
}

export async function createPublishBranch(
  funnelId: string,
  body: { name: string; slug: string },
): Promise<PublishBranchRow> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ branch: PublishBranchRow }>(res);
  return data.branch;
}

export async function deletePublishBranch(funnelId: string, branchId: string): Promise<void> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches/${branchId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await parseJson<{ ok: boolean }>(res);
}

export async function updatePublishBranch(
  funnelId: string,
  branchId: string,
  updates: { name?: string; slug?: string },
): Promise<PublishBranchRow> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches/${branchId}`, {
    method: "PATCH",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(updates),
  });
  const data = await parseJson<{ branch: PublishBranchRow }>(res);
  return data.branch;
}

export async function pushLandingToBranch(
  funnelId: string,
  branchId: string,
  funnel: Funnel,
  settingsPatch?: Partial<Record<string, unknown>>,
  branchSlug?: string | null,
  /** Identificador de la variante origen ("default", "no-landing" o `campaign.id`) para registrarla en el activity. */
  variantId?: string | null,
  /** Forzar snapshot sin landing (quiz directo) independientemente del slug. */
  noLanding?: boolean,
  /** Steps de la variante (campaña) a embeber en el snapshot, para deployments autocontenidos. */
  variantSteps?: FunnelStep[] | null,
): Promise<{ id: string; version: number; created_at: string; status: string }> {
  const useDirectSnapshot = Boolean(noLanding);
  const landing_snapshot = useDirectSnapshot
    ? extractDirectDefaultLandingSnapshotFromFunnel(funnel)
    : extractLandingSnapshotFromFunnel(funnel);
  const patch = settingsPatch ? pickLandingSettingsPatch(settingsPatch) : {};
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches/${branchId}/push`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({
      landing_snapshot,
      settings_patch: Object.keys(patch).length ? patch : undefined,
      variant_id: variantId ?? undefined,
      variant_steps: variantSteps ?? undefined,
    }),
  });
  const data = await parseJson<{ deployment: { id: string; version: number; created_at: string; status: string } }>(
    res,
  );
  return data.deployment;
}

export async function rollbackBranchDeployment(
  funnelId: string,
  branchId: string,
  toDeploymentId: string,
): Promise<void> {
  const res = await fetch(`/api/funnels/${funnelId}/publish/branches/${branchId}/rollback`, {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify({ toDeploymentId }),
  });
  await parseJson(res);
}

export type PublishDeploymentListItem = {
  id: string;
  version: number;
  created_at: string;
  status: string;
  created_by: string | null;
};

export async function fetchBranchDeployments(
  funnelId: string,
  branchId: string,
  limit = 20,
): Promise<{ activeDeploymentId: string | null; deployments: PublishDeploymentListItem[] }> {
  const res = await fetch(
    `/api/funnels/${funnelId}/publish/branches/${branchId}/deployments?limit=${limit}`,
    { credentials: "include" },
  );
  return parseJson(res);
}

export type PublishActivityEvent = {
  id: string;
  funnel_id: string;
  branch_id: string | null;
  deployment_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
};

export async function fetchPublishActivity(
  funnelId: string,
  opts?: { limit?: number; branchId?: string; type?: string },
): Promise<PublishActivityEvent[]> {
  const qs = new URLSearchParams();
  if (opts?.limit) qs.set("limit", String(opts.limit));
  if (opts?.branchId) qs.set("branchId", opts.branchId);
  if (opts?.type) qs.set("type", opts.type);
  const path = `/api/funnels/${funnelId}/publish/activity${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(path, { credentials: "include" });
  const data = await parseJson<{ events: PublishActivityEvent[] }>(res);
  return data.events ?? [];
}

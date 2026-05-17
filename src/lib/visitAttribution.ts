const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseOptionalUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return UUID_V4.test(s) ? s : null;
}

/** Claves de atribución por versión/rama coherentes para `events.metadata` / `leads.metadata`. */
export function normalizeVisitMetadataForStorage(metadata: Record<string, unknown>): Record<string, unknown> {
  const m = { ...metadata };
  const dv = m.deployment_version;
  if (typeof dv === "string" && /^\d+$/.test(dv)) {
    m.deployment_version = Number(dv);
  }
  if (m.entry_surface !== "landing" && m.entry_surface !== "quiz_only") {
    delete m.entry_surface;
  }
  return m;
}

export function extractBranchDeploymentColumns(metadata: Record<string, unknown>): {
  branch_id: string | null;
  deployment_id: string | null;
} {
  return {
    branch_id: parseOptionalUuid(metadata.branch_id),
    deployment_id: parseOptionalUuid(metadata.deployment_id),
  };
}

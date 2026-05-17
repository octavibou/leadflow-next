import type { LeadflowField, GhlFieldMapping, FieldDiff } from "./types";

export function computeDiff(
  currentSchema: LeadflowField[],
  existingMappings: GhlFieldMapping[]
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  const mappingBySlug = new Map<string, GhlFieldMapping>();
  for (const mapping of existingMappings) {
    mappingBySlug.set(mapping.leadflow_field_slug, mapping);
  }

  const currentSlugs = new Set<string>();
  for (const field of currentSchema) {
    currentSlugs.add(field.slug);
  }

  for (const field of currentSchema) {
    const existingMapping = mappingBySlug.get(field.slug);

    if (!existingMapping) {
      diffs.push({
        type: "added",
        field,
      });
      continue;
    }

    if (existingMapping.leadflow_field_label !== field.label) {
      diffs.push({
        type: "renamed",
        field,
        previousLabel: existingMapping.leadflow_field_label,
        mapping: existingMapping,
      });
      continue;
    }

    if (existingMapping.leadflow_field_type !== field.type) {
      diffs.push({
        type: "type_changed",
        field,
        previousType: existingMapping.leadflow_field_type,
        mapping: existingMapping,
      });
    }
  }

  for (const mapping of existingMappings) {
    if (!currentSlugs.has(mapping.leadflow_field_slug)) {
      diffs.push({
        type: "removed",
        field: {
          slug: mapping.leadflow_field_slug,
          label: mapping.leadflow_field_label,
          type: mapping.leadflow_field_type as LeadflowField["type"],
          category: "question",
        },
        mapping,
      });
    }
  }

  return diffs;
}

export function categorizeDiffs(diffs: FieldDiff[]): {
  added: FieldDiff[];
  renamed: FieldDiff[];
  removed: FieldDiff[];
  typeChanged: FieldDiff[];
} {
  return {
    added: diffs.filter((d) => d.type === "added"),
    renamed: diffs.filter((d) => d.type === "renamed"),
    removed: diffs.filter((d) => d.type === "removed"),
    typeChanged: diffs.filter((d) => d.type === "type_changed"),
  };
}

export function getDiffSummary(diffs: FieldDiff[]): string {
  const { added, renamed, removed, typeChanged } = categorizeDiffs(diffs);
  
  const parts: string[] = [];
  
  if (added.length > 0) {
    parts.push(`+${added.length} nuevo${added.length > 1 ? "s" : ""}`);
  }
  if (renamed.length > 0) {
    parts.push(`~${renamed.length} renombrado${renamed.length > 1 ? "s" : ""}`);
  }
  if (removed.length > 0) {
    parts.push(`-${removed.length} eliminado${removed.length > 1 ? "s" : ""}`);
  }
  if (typeChanged.length > 0) {
    parts.push(`${typeChanged.length} tipo cambiado`);
  }

  return parts.length > 0 ? parts.join(", ") : "Sin cambios";
}

export function hasPendingChanges(diffs: FieldDiff[]): boolean {
  return diffs.length > 0;
}

export function getPendingChangeCount(diffs: FieldDiff[]): number {
  return diffs.length;
}

export interface SyncPlan {
  toCreate: FieldDiff[];
  toUpdate: FieldDiff[];
  toOrphan: FieldDiff[];
}

export function buildSyncPlan(diffs: FieldDiff[]): SyncPlan {
  const { added, renamed, removed, typeChanged } = categorizeDiffs(diffs);

  return {
    toCreate: added,
    toUpdate: [...renamed, ...typeChanged],
    toOrphan: removed,
  };
}

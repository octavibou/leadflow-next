import { createClient } from "@supabase/supabase-js";
import type { LeadflowField, GhlFieldMapping, FieldDiff, GhlCustomField } from "./types";
import { GHL_API_BASE_URL } from "./types";
import { getValidGhlToken } from "./tokenRefresh";
import { buildSyncPlan } from "./diffEngine";
import { isGhlNativeContactField, isGhlStandardFieldConflictError } from "./nativeFields";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function mapLeadflowTypeToGhlType(type: LeadflowField["type"]): string {
  switch (type) {
    case "text":
      return "TEXT";
    case "email":
      return "TEXT";
    case "phone":
      return "PHONE";
    case "number":
      return "NUMERICAL";
    case "boolean":
      return "CHECKBOX";
    case "single_select":
      return "SINGLE_OPTIONS";
    case "multi_select":
      return "MULTIPLE_OPTIONS";
    default:
      return "TEXT";
  }
}

async function createGhlCustomField(
  accessToken: string,
  locationId: string,
  field: LeadflowField
): Promise<GhlCustomField> {
  const body: Record<string, unknown> = {
    name: field.label,
    dataType: mapLeadflowTypeToGhlType(field.type),
    model: "contact",
  };

  if (field.options && field.options.length > 0) {
    body.options = field.options.map((opt) => ({
      name: opt,
      value: opt,
    }));
  }

  const response = await fetch(
    `${GHL_API_BASE_URL}/locations/${locationId}/customFields`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create custom field: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.customField;
}

async function updateGhlCustomField(
  accessToken: string,
  locationId: string,
  fieldId: string,
  field: LeadflowField
): Promise<GhlCustomField> {
  const body: Record<string, unknown> = {
    name: field.label,
  };

  if (field.options && field.options.length > 0) {
    body.options = field.options.map((opt) => ({
      name: opt,
      value: opt,
    }));
  }

  const response = await fetch(
    `${GHL_API_BASE_URL}/locations/${locationId}/customFields/${fieldId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update custom field: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.customField;
}

export interface PushSyncResult {
  success: boolean;
  created: number;
  updated: number;
  orphaned: number;
  errors: string[];
}

export async function ensureNativeContactFieldMappings(
  workspaceId: string,
  funnelId: string,
  fields: LeadflowField[]
): Promise<number> {
  let ensured = 0;
  const now = new Date().toISOString();

  for (const field of fields) {
    if (!isGhlNativeContactField(field)) continue;

    const { error } = await supabaseAdmin.from("ghl_field_mappings").upsert(
      {
        workspace_id: workspaceId,
        funnel_id: funnelId,
        leadflow_field_slug: field.slug,
        leadflow_field_label: field.label,
        leadflow_field_type: field.type,
        ghl_field_id: null,
        ghl_field_name: `native:${field.slug}`,
        created_in_ghl: false,
        sync_status: "synced",
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: "funnel_id,leadflow_field_slug" }
    );

    if (!error) ensured++;
  }

  return ensured;
}

export async function executePushSync(
  workspaceId: string,
  funnelId: string,
  diffs: FieldDiff[],
  schema?: LeadflowField[]
): Promise<PushSyncResult> {
  const result: PushSyncResult = {
    success: true,
    created: 0,
    updated: 0,
    orphaned: 0,
    errors: [],
  };

  const tokenResult = await getValidGhlToken(workspaceId);
  if (tokenResult.needsReconnect || !tokenResult.accessToken) {
    return {
      ...result,
      success: false,
      errors: [tokenResult.error || "GHL connection expired. Please reconnect."],
    };
  }

  const { accessToken, locationId } = tokenResult;

  if (schema?.length) {
    await ensureNativeContactFieldMappings(workspaceId, funnelId, schema);
  }

  const plan = buildSyncPlan(diffs);

  for (const diff of plan.toCreate) {
    if (isGhlNativeContactField(diff.field)) {
      continue;
    }

    try {
      const ghlField = await createGhlCustomField(
        accessToken,
        locationId,
        diff.field
      );

      await supabaseAdmin.from("ghl_field_mappings").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        leadflow_field_slug: diff.field.slug,
        leadflow_field_label: diff.field.label,
        leadflow_field_type: diff.field.type,
        ghl_field_id: ghlField.id,
        ghl_field_name: ghlField.name,
        created_in_ghl: true,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
      });

      await supabaseAdmin.from("ghl_sync_events").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        event_type: "field_created",
        payload: {
          field_slug: diff.field.slug,
          field_label: diff.field.label,
          ghl_field_id: ghlField.id,
        },
        status: "ok",
      });

      result.created++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      if (isGhlStandardFieldConflictError(errorMsg)) {
        await ensureNativeContactFieldMappings(workspaceId, funnelId, [diff.field]);
        continue;
      }

      result.errors.push(`Failed to create field "${diff.field.label}": ${errorMsg}`);

      await supabaseAdmin.from("ghl_sync_events").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        event_type: "field_created",
        payload: {
          field_slug: diff.field.slug,
          field_label: diff.field.label,
          error: errorMsg,
        },
        status: "error",
        error_message: errorMsg,
      });
    }
  }

  for (const diff of plan.toUpdate) {
    if (isGhlNativeContactField(diff.field)) {
      continue;
    }
    if (!diff.mapping?.ghl_field_id) {
      result.errors.push(`Cannot update field "${diff.field.label}": no GHL field ID`);
      continue;
    }

    try {
      const ghlField = await updateGhlCustomField(
        accessToken,
        locationId,
        diff.mapping.ghl_field_id,
        diff.field
      );

      await supabaseAdmin
        .from("ghl_field_mappings")
        .update({
          leadflow_field_label: diff.field.label,
          leadflow_field_type: diff.field.type,
          ghl_field_name: ghlField.name,
          sync_status: "synced",
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", diff.mapping.id);

      await supabaseAdmin.from("ghl_sync_events").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        event_type: "field_updated",
        payload: {
          field_slug: diff.field.slug,
          field_label: diff.field.label,
          previous_label: diff.previousLabel,
          ghl_field_id: diff.mapping.ghl_field_id,
        },
        status: "ok",
      });

      result.updated++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Failed to update field "${diff.field.label}": ${errorMsg}`);

      await supabaseAdmin.from("ghl_sync_events").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        event_type: "field_updated",
        payload: {
          field_slug: diff.field.slug,
          field_label: diff.field.label,
          error: errorMsg,
        },
        status: "error",
        error_message: errorMsg,
      });
    }
  }

  for (const diff of plan.toOrphan) {
    if (!diff.mapping) continue;

    try {
      await supabaseAdmin
        .from("ghl_field_mappings")
        .update({
          sync_status: "orphaned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", diff.mapping.id);

      await supabaseAdmin.from("ghl_sync_events").insert({
        workspace_id: workspaceId,
        funnel_id: funnelId,
        event_type: "field_removed",
        payload: {
          field_slug: diff.field.slug,
          field_label: diff.field.label,
          ghl_field_id: diff.mapping.ghl_field_id,
          action: "orphaned",
        },
        status: "ok",
      });

      result.orphaned++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`Failed to orphan field "${diff.field.label}": ${errorMsg}`);
    }
  }

  await supabaseAdmin.from("ghl_sync_events").insert({
    workspace_id: workspaceId,
    funnel_id: funnelId,
    event_type: "push_sync",
    payload: {
      created: result.created,
      updated: result.updated,
      orphaned: result.orphaned,
      errors: result.errors,
    },
    status: result.errors.length > 0 ? "error" : "ok",
    error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
  });

  await supabaseAdmin
    .from("workspace_integrations")
    .update({
      config: supabaseAdmin.rpc("jsonb_set_nested", {
        target: "config",
        path: ["last_sync_at"],
        value: JSON.stringify(new Date().toISOString()),
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "ghl");

  result.success = result.errors.length === 0;
  return result;
}

export async function getExistingMappings(
  workspaceId: string,
  funnelId: string
): Promise<GhlFieldMapping[]> {
  const { data, error } = await supabaseAdmin
    .from("ghl_field_mappings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("funnel_id", funnelId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GHL Push Sync] Failed to get mappings:", error);
    return [];
  }

  return data as GhlFieldMapping[];
}

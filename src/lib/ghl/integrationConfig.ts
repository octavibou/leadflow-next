import type { GhlOAuthConfig } from "./types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/integrations/supabase/types";

export function isGhlOAuthConfig(config: unknown): config is GhlOAuthConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.access_token === "string" &&
    typeof c.refresh_token === "string" &&
    typeof c.expires_at === "string"
  );
}

/** Config was overwritten (e.g. by a bad push_sync update). User must reconnect. */
export function isCorruptedGhlConfig(config: unknown): boolean {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  return (
    ("url" in c || "method" in c || "headers" in c) &&
    !("access_token" in c)
  );
}

export async function patchGhlOAuthConfig(
  workspaceId: string,
  patch: Partial<GhlOAuthConfig>
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("provider", "ghl")
    .maybeSingle();

  if (error || !data) return false;

  if (!isGhlOAuthConfig(data.config)) {
    console.error("[GHL] Cannot patch config: missing or corrupted OAuth tokens");
    return false;
  }

  const oauth: GhlOAuthConfig = data.config;
  const merged: GhlOAuthConfig = { ...oauth, ...patch };

  const { error: updateError } = await admin
    .from("workspace_integrations")
    .update({
      config: JSON.parse(JSON.stringify(merged)) as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "ghl");

  return !updateError;
}

export async function setGhlLastSyncAt(workspaceId: string): Promise<void> {
  await patchGhlOAuthConfig(workspaceId, {
    last_sync_at: new Date().toISOString(),
  });
}

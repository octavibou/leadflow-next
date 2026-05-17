import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GhlIntegrationConfig = {
  stage_map?: Record<string, string>;
};

export type GhlIntegration = {
  id: string;
  workspace_id: string;
  provider: string;
  inbound_secret: string | null;
  enabled: boolean;
  config: GhlIntegrationConfig;
  created_at: string;
  updated_at: string;
};

export function useGhlIntegration(workspaceId: string | null) {
  const [integration, setIntegration] = useState<GhlIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegration = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("workspace_integrations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("provider", "ghl")
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setIntegration(null);
    } else {
      setIntegration(data as GhlIntegration | null);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const generateSecret = useCallback(async () => {
    if (!workspaceId) return null;
    setError(null);

    const secret = crypto.randomUUID();

    const { error: upsertError } = await supabase
      .from("workspace_integrations")
      .upsert(
        {
          workspace_id: workspaceId,
          provider: "ghl",
          inbound_secret: secret,
          enabled: true,
          config: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,provider" }
      );

    if (upsertError) {
      setError(upsertError.message);
      return null;
    }

    await fetchIntegration();
    return secret;
  }, [workspaceId, fetchIntegration]);

  const toggleEnabled = useCallback(
    async (enabled: boolean) => {
      if (!workspaceId || !integration) return;
      setError(null);

      const { error: updateError } = await supabase
        .from("workspace_integrations")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", integration.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await fetchIntegration();
    },
    [workspaceId, integration, fetchIntegration]
  );

  const regenerateSecret = useCallback(async () => {
    if (!workspaceId || !integration) return null;
    setError(null);

    const newSecret = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from("workspace_integrations")
      .update({
        inbound_secret: newSecret,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      setError(updateError.message);
      return null;
    }

    await fetchIntegration();
    return newSecret;
  }, [workspaceId, integration, fetchIntegration]);

  return {
    integration,
    loading,
    error,
    generateSecret,
    regenerateSecret,
    toggleEnabled,
    refetch: fetchIntegration,
  };
}

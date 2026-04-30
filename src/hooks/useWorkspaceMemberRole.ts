import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceRole } from "@/store/workspaceStore";

/** Rol del usuario actual en un workspace (`null` mientras carga o sin fila). */
export function useWorkspaceMemberRole(workspaceId: string | null | undefined): {
  role: WorkspaceRole | null;
  loading: boolean;
} {
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [loading, setLoading] = useState(Boolean(workspaceId));

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!workspaceId) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", uid)
        .maybeSingle();
      if (!cancelled) {
        setRole((data?.role as WorkspaceRole | undefined) ?? null);
        setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return { role, loading };
}

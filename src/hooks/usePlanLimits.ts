import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

export interface PlanLimits {
  funnels: number;
  workspaces: number;
  seats: number;
  leads: number;            // included leads per cycle (informational, NOT a hard block)
}

export interface PlanUsage {
  funnels: number;
  workspaces: number;
  leadsThisPeriod: number;  // counter from subscriptions.leads_used_current_period
  leadsThisMonth: number;   // alias kept for backward compatibility
}

export interface UsePlanLimitsResult {
  limits: PlanLimits;
  usage: PlanUsage;
  planName: string;
  loading: boolean;
  canCreateFunnel: boolean;
  canInviteMember: boolean;
  canCreateWorkspace: boolean;
  canGenerateLead: boolean;  // always true: leads now overage-billed, never blocked
  leadOveragePrice: number;
  overageAmount: number;     // EUR accumulated this cycle
  refresh: () => void;
}

const DEFAULT_LIMITS: PlanLimits = { funnels: 2, workspaces: 1, seats: 1, leads: 200 };

const OVERAGE_BY_PLAN: Record<string, number> = {
  starter: 0.50,
  grow: 0.35,
  scale: 0.20,
  // legacy fallback
  start: 0.50,
  expand: 0.20,
};

export function usePlanLimits(): UsePlanLimitsResult {
  const { user } = useAuthReady();
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [planName, setPlanName] = useState("starter");
  const [usage, setUsage] = useState<PlanUsage>({ funnels: 0, workspaces: 0, leadsThisPeriod: 0, leadsThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_name, plan_limits, leads_used_current_period")
        .eq("user_id", user.id)
        .maybeSingle();

      const rawLimits = (sub?.plan_limits as { funnels?: number; workspaces?: number; seats?: number; leads?: number } | null) ?? null;
      const planLimits: PlanLimits = {
        funnels: rawLimits?.funnels ?? DEFAULT_LIMITS.funnels,
        workspaces: rawLimits?.workspaces ?? DEFAULT_LIMITS.workspaces,
        seats: rawLimits?.seats ?? DEFAULT_LIMITS.seats,
        leads: rawLimits?.leads ?? DEFAULT_LIMITS.leads,
      };
      setLimits(planLimits);
      setPlanName(sub?.plan_name ?? "starter");

      const { count: funnelCount } = await supabase
        .from("funnels")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: workspaceCount } = await supabase
        .from("workspaces")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);

      const leadsThisPeriod = sub?.leads_used_current_period ?? 0;

      setUsage({
        funnels: funnelCount ?? 0,
        workspaces: workspaceCount ?? 0,
        leadsThisPeriod,
        leadsThisMonth: leadsThisPeriod,
      });
      setLoading(false);
    };

    load();
  }, [user, refreshKey]);

  const overagePrice = OVERAGE_BY_PLAN[planName] ?? 0.50;
  const extraLeads = Math.max(0, usage.leadsThisPeriod - limits.leads);
  const overageAmount = Math.round(extraLeads * overagePrice * 100) / 100;

  return {
    limits,
    usage,
    planName,
    loading,
    canCreateFunnel: usage.funnels < limits.funnels,
    canInviteMember: true,
    canCreateWorkspace: usage.workspaces < limits.workspaces,
    canGenerateLead: true,
    leadOveragePrice: overagePrice,
    overageAmount,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}

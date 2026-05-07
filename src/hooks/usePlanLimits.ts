import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

import { useWorkspaceStore } from "@/store/workspaceStore";

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
  /** Optimista mientras llega el RPC de asientos; tras error del RPC permite intentar (RLS sigue vigente). */
  canInviteMember: boolean;
  inviteBlockedBySeats: boolean;
  seatsInviteChecking: boolean;
  canCreateWorkspace: boolean;
  canGenerateLead: boolean;  // always true: leads now overage-billed, never blocked
  leadOveragePrice: number;
  overageAmount: number;     // EUR accumulated this cycle
  refresh: () => void;
}

const DEFAULT_LIMITS: PlanLimits = { funnels: 2, workspaces: 1, seats: 1, leads: 200 };

const WORKSPACE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OVERAGE_BY_PLAN: Record<string, number> = {
  starter: 0.50,
  grow: 0.35,
  scale: 0.20,
  // legacy fallback
  start: 0.50,
  expand: 0.20,
};

type PlanLimitsSnapshot = {
  limits: PlanLimits;
  planName: string;
  usage: PlanUsage;
};

const planLimitsCache = new Map<string, PlanLimitsSnapshot>();
const inFlightLoads = new Map<string, Promise<PlanLimitsSnapshot>>();

async function fetchPlanLimitsSnapshot(userId: string): Promise<PlanLimitsSnapshot> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_name, plan_limits, leads_used_current_period")
    .eq("user_id", userId)
    .maybeSingle();

  const rawLimits = (sub?.plan_limits as { funnels?: number; workspaces?: number; seats?: number; leads?: number } | null) ?? null;
  const limits: PlanLimits = {
    funnels: rawLimits?.funnels ?? DEFAULT_LIMITS.funnels,
    workspaces: rawLimits?.workspaces ?? DEFAULT_LIMITS.workspaces,
    seats: rawLimits?.seats ?? DEFAULT_LIMITS.seats,
    leads: rawLimits?.leads ?? DEFAULT_LIMITS.leads,
  };

  const { count: funnelCount } = await supabase
    .from("funnels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: workspaceCount } = await supabase
    .from("workspaces")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  const leadsThisPeriod = sub?.leads_used_current_period ?? 0;
  const usage: PlanUsage = {
    funnels: funnelCount ?? 0,
    workspaces: workspaceCount ?? 0,
    leadsThisPeriod,
    leadsThisMonth: leadsThisPeriod,
  };

  return {
    limits,
    planName: sub?.plan_name ?? "starter",
    usage,
  };
}

export function usePlanLimits(): UsePlanLimitsResult {
  const { user } = useAuthReady();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const workspacesLoaded = useWorkspaceStore((s) => s.loaded);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [planName, setPlanName] = useState("starter");
  const [usage, setUsage] = useState<PlanUsage>({ funnels: 0, workspaces: 0, leadsThisPeriod: 0, leadsThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seatInvite, setSeatInvite] = useState<{
    loading: boolean;
    allowed: boolean;
    rpcFailed: boolean;
  }>({ loading: true, allowed: true, rpcFailed: false });

  useEffect(() => {
    if (!currentWorkspaceId) {
      setSeatInvite({ loading: false, allowed: true, rpcFailed: false });
      return;
    }

    if (!WORKSPACE_UUID_RE.test(currentWorkspaceId)) {
      console.warn("[usePlanLimits] currentWorkspaceId no es un UUID válido", currentWorkspaceId);
      setSeatInvite({ loading: false, allowed: true, rpcFailed: true });
      return;
    }

    if (!workspacesLoaded) {
      setSeatInvite({ loading: true, allowed: true, rpcFailed: false });
      return;
    }

    if (!workspaces.some((w) => w.id === currentWorkspaceId)) {
      setSeatInvite({ loading: false, allowed: true, rpcFailed: false });
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSeatInvite({ loading: true, allowed: true, rpcFailed: false });
      try {
        const { data: snap, error } = await supabase.rpc("workspace_seat_usage_snapshot", {
          _workspace_id: currentWorkspaceId,
        });
        if (cancelled) return;
        if (error) {
          console.warn("[usePlanLimits] workspace_seat_usage_snapshot", error);
          setSeatInvite({ loading: false, allowed: true, rpcFailed: true });
          return;
        }
        const row = snap as { used?: number; seat_limit?: number } | null;
        const used = typeof row?.used === "number" ? row.used : 0;
        const seatLimit = typeof row?.seat_limit === "number" ? row.seat_limit : DEFAULT_LIMITS.seats;
        setSeatInvite({
          loading: false,
          allowed: used < seatLimit,
          rpcFailed: false,
        });
      } catch (e) {
        console.warn("[usePlanLimits] workspace_seat_usage_snapshot threw", e);
        if (!cancelled) setSeatInvite({ loading: false, allowed: true, rpcFailed: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, refreshKey, workspacesLoaded, workspaces]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const cacheKey = user.id;

      if (refreshKey === 0) {
        const cached = planLimitsCache.get(cacheKey);
        if (cached) {
          setLimits(cached.limits);
          setPlanName(cached.planName);
          setUsage(cached.usage);
          setLoading(false);
          return;
        }
      }

      let request = inFlightLoads.get(cacheKey);
      if (!request) {
        request = fetchPlanLimitsSnapshot(cacheKey);
        inFlightLoads.set(cacheKey, request);
      }

      try {
        const snapshot = await request;
        planLimitsCache.set(cacheKey, snapshot);
        setLimits(snapshot.limits);
        setPlanName(snapshot.planName);
        setUsage(snapshot.usage);
      } finally {
        inFlightLoads.delete(cacheKey);
        setLoading(false);
      }
    };

    load();
  }, [user, refreshKey]);

  const overagePrice = OVERAGE_BY_PLAN[planName] ?? 0.50;
  const extraLeads = Math.max(0, usage.leadsThisPeriod - limits.leads);
  const overageAmount = Math.round(extraLeads * overagePrice * 100) / 100;

  const seatsInviteChecking = seatInvite.loading;
  const inviteBlockedBySeats = !seatInvite.loading && !seatInvite.allowed && !seatInvite.rpcFailed;
  const canInviteMember = seatInvite.loading || seatInvite.allowed;

  return {
    limits,
    usage,
    planName,
    loading,
    canCreateFunnel: usage.funnels < limits.funnels,
    canInviteMember,
    inviteBlockedBySeats,
    seatsInviteChecking,
    canCreateWorkspace: usage.workspaces < limits.workspaces,
    canGenerateLead: true,
    leadOveragePrice: overagePrice,
    overageAmount,
    refresh: () => {
      if (user?.id) planLimitsCache.delete(user.id);
      setRefreshKey((k) => k + 1);
    },
  };
}

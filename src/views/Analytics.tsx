"use client";

import { useEffect } from "react";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";

export default function Analytics() {
  const { funnels, fetchFunnels } = useFunnelStore();
  const { currentWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    fetchFunnels(currentWorkspaceId || undefined);
  }, [fetchFunnels, currentWorkspaceId]);

  return (
    <AnalyticsPanel
      key={currentWorkspaceId ?? "no-workspace"}
      funnels={funnels}
      mode={{ kind: "workspace" }}
    />
  );
}

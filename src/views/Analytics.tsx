"use client";

import { useEffect } from "react";
import { useFunnelStore } from "@/store/funnelStore";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";

export default function Analytics() {
  const { funnels, fetchFunnels } = useFunnelStore();

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  return <AnalyticsPanel funnels={funnels} mode={{ kind: "workspace" }} />;
}

"use client";

import type { Funnel } from "@/types/funnel";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";

export function FunnelMetricsTab({ funnel }: { funnel: Funnel }) {
  return <AnalyticsPanel funnels={[funnel]} mode={{ kind: "funnel", funnelId: funnel.id }} />;
}

"use client";

import { useMemo } from "react";
import type { SessionDetail } from "@/lib/sessionAnalytics";
import {
  computeFunnelStages,
  groupSessionsByCountry,
  groupSessionsByDay,
  groupSessionsBySource,
} from "@/lib/sessionAnalytics";
import { AnalyticsTimeSeriesChart } from "@/components/analytics/AnalyticsTimeSeriesChart";
import { AnalyticsDropoffBars } from "@/components/analytics/AnalyticsDropoffBars";
import { AnalyticsCountryTable } from "@/components/analytics/AnalyticsCountryTable";
import { AnalyticsSourceMixBars } from "@/components/analytics/AnalyticsSourceMixBars";
import { AnalyticsVersionsTable } from "@/components/analytics/AnalyticsVersionsTable";

export function AnalyticsGeneralTab({
  sessions,
  fromIso,
  toIso,
}: {
  sessions: SessionDetail[];
  fromIso: string | null;
  toIso: string | null;
}) {
  const daily = useMemo(
    () => groupSessionsByDay(sessions, fromIso, toIso),
    [sessions, fromIso, toIso],
  );
  const countries = useMemo(() => groupSessionsByCountry(sessions, 10), [sessions]);
  const sources = useMemo(() => groupSessionsBySource(sessions), [sessions]);
  const stages = useMemo(() => computeFunnelStages(sessions), [sessions]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <AnalyticsTimeSeriesChart data={daily} />
          <AnalyticsDropoffBars stages={stages} />
        </div>
        <div className="space-y-3">
          <AnalyticsCountryTable data={countries} />
          <AnalyticsSourceMixBars data={sources} />
        </div>
      </div>
      <AnalyticsVersionsTable sessions={sessions} />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  groupSessionsByDeploymentVersion,
  type SessionDetail,
} from "@/lib/sessionAnalytics";
import { getMetricHealth, type MetricType } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-ES");

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function ConversionCell({
  rate,
  metricType,
  showBadge = false,
}: {
  rate: number;
  metricType: MetricType;
  showBadge?: boolean;
}) {
  const health = getMetricHealth(metricType, rate * 100);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular-nums font-medium text-[11px] text-muted-foreground">
        {formatPct(rate)}
      </span>
      {showBadge && <HealthBadge health={health} size="sm" variant="minimal" />}
    </span>
  );
}

export function AnalyticsVersionsTable({ sessions }: { sessions: SessionDetail[] }) {
  const rows = useMemo(
    () => groupSessionsByDeploymentVersion(sessions),
    [sessions],
  );

  const hasMultipleVersions = rows.length > 1;

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Comparativa de versiones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground">
            Sin datos de versiones en este rango. Las versiones se registran cuando publicas el funnel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Comparativa de versiones</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Rendimiento por versión de landing publicada.
          {hasMultipleVersions && " Compara las métricas clave entre versiones."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[640px]">
            <table className="w-full text-[11px]">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pl-3 pr-2 text-left font-medium">Versión</th>
                  <th className="px-2 py-2 text-right font-medium">Visitas</th>
                  <th className="px-2 py-2 text-right font-medium">Quiz Emp.</th>
                  <th className="px-2 py-2 text-right font-medium">
                    Quiz Start
                  </th>
                  <th className="px-2 py-2 text-right font-medium">Cualif.</th>
                  <th className="px-2 py-2 text-right font-medium">Leads</th>
                  <th className="px-2 py-2 pr-3 text-right font-medium">
                    Lead Conv.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row, idx) => {
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={row.deploymentLabel}
                      className={cn(
                        "hover:bg-muted/30",
                        isTop && hasMultipleVersions && "bg-primary/[0.02]",
                      )}
                    >
                      <td className="py-2 pl-3 pr-2 align-middle">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium truncate max-w-[180px]" title={row.deploymentLabel}>
                            {row.deploymentLabel}
                          </span>
                          {isTop && hasMultipleVersions && (
                            <Badge variant="secondary" className="text-[9px]">
                              Top
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {numberFormatter.format(row.sessions)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {numberFormatter.format(row.startedQuiz)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <ConversionCell
                          rate={row.landingConversionRate}
                          metricType="quizStartRate"
                          showBadge={isTop && hasMultipleVersions}
                        />
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {numberFormatter.format(row.qualified)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {numberFormatter.format(row.formSubmitted)}
                      </td>
                      <td className="px-2 py-2 pr-3 text-right">
                        <ConversionCell
                          rate={row.formConversionRate}
                          metricType="leadConversionRate"
                          showBadge={isTop && hasMultipleVersions}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

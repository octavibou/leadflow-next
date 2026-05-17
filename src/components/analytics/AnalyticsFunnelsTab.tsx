"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupSessionsByFunnel, type SessionDetail } from "@/lib/sessionAnalytics";
import { getMetricHealth } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";

const numberFormatter = new Intl.NumberFormat("es-ES");

export function AnalyticsFunnelsTab({
  sessions,
  funnelNameById,
}: {
  sessions: SessionDetail[];
  funnelNameById: Map<string, string>;
}) {
  const rows = useMemo(
    () => groupSessionsByFunnel(sessions, funnelNameById),
    [sessions, funnelNameById],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Rendimiento por funnel</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Vista por funnel con drop-off (Iniciaron → Acabaron) y % de cualificación sobre evaluados.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Sin datos en este rango.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <div className="max-h-[520px] min-w-[720px] overflow-y-auto [scrollbar-gutter:stable]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm">
                  <tr className="text-[11px] font-medium text-muted-foreground">
                    <th className="py-2 pl-3 pr-2 text-left font-medium">Funnel</th>
                    <th className="px-2 py-2 text-right font-medium">Visitas</th>
                    <th className="px-2 py-2 text-right font-medium">Iniciaron</th>
                    <th className="px-2 py-2 text-right font-medium">Acabaron</th>
                    <th className="px-2 py-2 text-right font-medium">% finaliza</th>
                    <th className="px-2 py-2 text-right font-medium">Leads</th>
                    <th className="px-2 py-2 text-right font-medium">Cualificados</th>
                    <th className="px-2 py-2 pr-3 text-right font-medium">% cualif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row) => {
                    const completionRate = row.startedQuiz > 0 ? row.completedQuiz / row.startedQuiz : 0;
                    const completionHealth = getMetricHealth("quizCompletionRate", completionRate * 100);
                    const qualHealth = getMetricHealth("qualificationRate", row.qualificationRate * 100);

                    return (
                      <tr key={row.funnelId} className="hover:bg-muted/30">
                        <td className="py-2 pl-3 pr-2 align-middle font-medium truncate" title={row.funnelName}>
                          {row.funnelName}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {numberFormatter.format(row.sessions)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {numberFormatter.format(row.startedQuiz)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {numberFormatter.format(row.completedQuiz)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="tabular-nums font-medium text-[11px] text-muted-foreground">
                              {(completionRate * 100).toFixed(1)}%
                            </span>
                            <HealthBadge health={completionHealth} size="sm" dotOnly variant="minimal" />
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {numberFormatter.format(row.leads)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {numberFormatter.format(row.qualified)}
                        </td>
                        <td className="px-2 py-2 pr-3 text-right">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="tabular-nums font-medium text-[11px] text-muted-foreground">
                              {(row.qualificationRate * 100).toFixed(1)}%
                            </span>
                            <HealthBadge health={qualHealth} size="sm" dotOnly variant="minimal" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

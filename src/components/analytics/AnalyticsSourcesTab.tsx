"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { groupSessionsByUtm, type SessionDetail } from "@/lib/sessionAnalytics";
import { getMetricHealth } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";

const numberFormatter = new Intl.NumberFormat("es-ES");

export function AnalyticsSourcesTab({ sessions }: { sessions: SessionDetail[] }) {
  const rows = useMemo(() => groupSessionsByUtm(sessions), [sessions]);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Fuentes detalladas</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Combinación única de UTM source / medium / campaña (desde la atribución de la primera visita).
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
                    <th className="py-2 pl-3 pr-2 text-left font-medium">Source</th>
                    <th className="px-2 py-2 text-left font-medium">Medium</th>
                    <th className="px-2 py-2 text-left font-medium">Campaña</th>
                    <th className="px-2 py-2 text-right font-medium">Visitas</th>
                    <th className="px-2 py-2 text-right font-medium">Leads</th>
                    <th className="px-2 py-2 text-right font-medium">Cualificados</th>
                    <th className="px-2 py-2 pr-3 text-right font-medium">% cualif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row, idx) => {
                    const qualHealth = getMetricHealth("qualificationRate", row.qualificationRate * 100);
                    return (
                      <tr key={`${row.source}-${row.medium}-${row.campaign}-${idx}`} className="hover:bg-muted/30">
                        <td className="py-2 pl-3 pr-2 align-middle">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {row.source}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 align-middle text-muted-foreground">{row.medium}</td>
                        <td className="px-2 py-2 align-middle truncate" title={row.campaign}>
                          {row.campaign}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{numberFormatter.format(row.sessions)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{numberFormatter.format(row.leads)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{numberFormatter.format(row.qualified)}</td>
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

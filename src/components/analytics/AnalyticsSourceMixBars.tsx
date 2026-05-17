"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceBucket } from "@/lib/sessionAnalytics";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-ES");

const SOURCE_COLOR: Record<SourceBucket["source"], string> = {
  facebook: "bg-blue-500",
  google: "bg-amber-500",
  direct: "bg-violet-500",
  other: "bg-slate-400",
};

export function AnalyticsSourceMixBars({ data }: { data: SourceBucket[] }) {
  const totalSessions = data.reduce((a, b) => a + b.sessions, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Tráfico por fuente</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {totalSessions === 0 ? (
          <p className="text-[11px] text-muted-foreground">Sin datos en este rango.</p>
        ) : (
          <ol className="space-y-2">
            {data.map((row) => {
              const widthPct = Math.max(row.sessions === 0 ? 0 : 2, row.share * 100);
              return (
                <li key={row.source} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <span className={cn("inline-block h-2 w-2 rounded-[2px]", SOURCE_COLOR[row.source])} />
                      {row.label}
                    </span>
                    <span className="flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-foreground">{numberFormatter.format(row.sessions)}</span>
                      <span className="text-muted-foreground">{(row.share * 100).toFixed(1)}%</span>
                      {row.leads > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          ({numberFormatter.format(row.leads)} leads)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-[width]", SOURCE_COLOR[row.source])}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

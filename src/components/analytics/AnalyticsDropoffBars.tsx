"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelStage } from "@/lib/sessionAnalytics";
import { getMetricHealth, type MetricType } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";
import { cn } from "@/lib/utils";

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  if (n === 0) return "0%";
  if (n < 0.001) return "<0.1%";
  return `${(n * 100).toFixed(1)}%`;
}

const numberFormatter = new Intl.NumberFormat("es-ES");

const STAGE_COLORS: Record<string, string> = {
  sessions: "bg-slate-400",
  startedQuiz: "bg-slate-500",
  completedQuiz: "bg-slate-600",
  qualified: "bg-slate-700",
  disqualified: "bg-muted-foreground/35",
  formSubmitted: "bg-slate-800",
};

const STAGE_TO_METRIC: Record<string, MetricType> = {
  startedQuiz: "quizStartRate",
  completedQuiz: "quizCompletionRate",
  qualified: "qualificationRate",
  formSubmitted: "leadConversionRate",
};

export function AnalyticsDropoffBars({ stages }: { stages: FunnelStage[] }) {
  const total = stages.length > 0 ? stages[0].count : 0;

  const mainStages = stages.filter((s) => s.key !== "disqualified");
  const disqualifiedStage = stages.find((s) => s.key === "disqualified");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Embudo de conversión</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          De {numberFormatter.format(total)} visitas en este rango.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {mainStages.map((stage, idx) => {
            const widthPct = Math.max(2, stage.shareOfTop * 100);
            const hasConversion = !!stage.conversionLabel && stage.conversionRate !== undefined;
            
            const metricType = STAGE_TO_METRIC[stage.key];
            const health = hasConversion && metricType
              ? getMetricHealth(metricType, stage.conversionRate! * 100)
              : null;

            const fallbackBarClass = STAGE_COLORS[stage.key] || "bg-foreground/20";

            return (
              <li key={stage.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="font-medium text-foreground">{stage.label}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="text-foreground font-semibold">
                      {numberFormatter.format(stage.count)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPct(stage.shareOfTop)}
                    </span>
                    {hasConversion && health && (
                      <span className="flex items-center gap-1.5 ml-1">
                        <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                          {formatPct(stage.conversionRate!)}
                        </span>
                        <HealthBadge health={health} size="sm" variant="minimal" />
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-[width]", fallbackBarClass)}
                    style={{
                      width: `${widthPct}%`,
                    }}
                  />
                </div>
                {idx > 0 && stage.shareOfPrev < 1 && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatPct(stage.shareOfPrev)} del paso anterior
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {disqualifiedStage && disqualifiedStage.count > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-medium text-muted-foreground">{disqualifiedStage.label}</span>
              <span className="flex items-baseline gap-2 tabular-nums">
                <span className="text-muted-foreground font-medium">
                  {numberFormatter.format(disqualifiedStage.count)}
                </span>
                <span className="text-muted-foreground/70">
                  {formatPct(disqualifiedStage.shareOfTop)}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width]", STAGE_COLORS.disqualified)}
                style={{ width: `${Math.max(2, disqualifiedStage.shareOfTop * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

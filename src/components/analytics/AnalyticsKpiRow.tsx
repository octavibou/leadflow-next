"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendUp, TrendDown, CaretRight } from "@phosphor-icons/react";
import type { AnalyticsSummary } from "@/lib/sessionAnalytics";
import { getMetricHealth, type MetricType } from "@/lib/metricHealth";
import { HealthBadge } from "@/components/ui/health-badge";
import { AnalyticsHealthTooltipFooter } from "@/components/analytics/AnalyticsHealthTooltipFooter";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("es-ES");

/** Tarjetas de volumen (con borde) */
const METRIC_CELL =
  "flex h-[88px] flex-1 basis-0 min-w-[56px] !gap-1 flex-col items-center justify-center overflow-visible px-2 py-2 text-center";

/** Hueco de conversión: mismo tamaño que la métrica pero sin caja ni borde */
const CONV_CELL =
  "flex h-[88px] flex-1 basis-0 min-w-[56px] flex-col items-center justify-center gap-1 overflow-visible px-1 py-2 text-center";

type MetricStep = {
  id: string;
  label: string;
  value: number;
  previousValue: number | null;
};

type ConversionStep = {
  id: string;
  label: string;
  rate: number;
  previousRate: number | null;
  metricType: MetricType;
};

function buildFunnel(
  current: AnalyticsSummary,
  previous: AnalyticsSummary | null,
): { metrics: MetricStep[]; conversions: ConversionStep[] } {
  const metrics: MetricStep[] = [
    {
      id: "sessions",
      label: "Visitas",
      value: current.sessions,
      previousValue: previous?.sessions ?? null,
    },
    {
      id: "started_quiz",
      label: "Quiz Empezado",
      value: current.startedQuiz,
      previousValue: previous?.startedQuiz ?? null,
    },
    {
      id: "completed_quiz",
      label: "Quiz Terminado",
      value: current.completedQuiz,
      previousValue: previous?.completedQuiz ?? null,
    },
    {
      id: "qualified",
      label: "Cualificados",
      value: current.qualified,
      previousValue: previous?.qualified ?? null,
    },
    {
      id: "leads",
      label: "Leads",
      value: current.formSubmittedByQualified,
      previousValue: previous?.formSubmittedByQualified ?? null,
    },
  ];

  const conversions: ConversionStep[] = [
    {
      id: "conv_landing",
      label: "Quiz Start",
      rate: current.landingConversionRate,
      previousRate: previous?.landingConversionRate ?? null,
      metricType: "quizStartRate",
    },
    {
      id: "conv_quiz",
      label: "Completion",
      rate: current.quizCompletionRate,
      previousRate: previous?.quizCompletionRate ?? null,
      metricType: "quizCompletionRate",
    },
    {
      id: "conv_qual",
      label: "Qualification",
      rate: current.qualificationRate,
      previousRate: previous?.qualificationRate ?? null,
      metricType: "qualificationRate",
    },
    {
      id: "conv_form",
      label: "Lead Conv.",
      rate: current.formConversionRate,
      previousRate: previous?.formConversionRate ?? null,
      metricType: "leadConversionRate",
    },
  ];

  return { metrics, conversions };
}

function MetricDelta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  if (previous === 0 && current === 0) return null;

  const diff = current - previous;
  if (diff === 0) return null;

  const isPositive = diff > 0;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : null;
  const label = pct !== null ? `${isPositive ? "+" : ""}${pct.toFixed(0)}%` : `${isPositive ? "+" : ""}${diff}`;

  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium leading-none text-muted-foreground">
      {isPositive ? (
        <TrendUp weight="bold" className="h-2 w-2 opacity-60" />
      ) : (
        <TrendDown weight="bold" className="h-2 w-2 opacity-60" />
      )}
      {label}
    </span>
  );
}

function MetricCard({ metric }: { metric: MetricStep }) {
  return (
    <Card size="sm" className={cn(METRIC_CELL)}>
      <p className="line-clamp-2 text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
        {metric.label}
      </p>
      <div className="flex items-center justify-center gap-1 leading-none">
        <span className="text-xl font-semibold tabular-nums leading-none">
          {numberFormatter.format(metric.value)}
        </span>
      </div>
      <MetricDelta current={metric.value} previous={metric.previousValue} />
    </Card>
  );
}

const CONV_TOOLTIP_MAIN: Record<MetricType, string> = {
  quizStartRate: "Visitas que han empezado el quiz (primera pregunta) frente al total de visitas del periodo.",
  quizCompletionRate: "Quizzes terminados frente a los que empezaron el quiz en el periodo.",
  qualificationRate:
    "Cualificados frente a evaluados (cualificados + descualificados) entre quienes terminaron el quiz.",
  leadConversionRate: "Leads con formulario enviado frente a visitantes cualificados (solo ellos ven el formulario).",
  overallFunnelConversion: "Leads con formulario enviado frente al total de visitas del periodo.",
  ctr: "Clics en anuncio o enlace frente a impresiones.",
  cpa: "Coste por acción o conversión.",
  roas: "Ingresos atribuidos frente al gasto en anuncios.",
  appointmentRate: "Citas agendadas frente a oportunidades o leads.",
  closeRate: "Ventas cerradas frente a oportunidades.",
};

function ConversionConnector({ conversion }: { conversion: ConversionStep }) {
  const pct = conversion.rate * 100;
  const health = getMetricHealth(conversion.metricType, pct);
  const mainText = CONV_TOOLTIP_MAIN[conversion.metricType];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(CONV_CELL, "cursor-default")}>
          <CaretRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground/30" weight="bold" />
          <span className="text-[13px] font-medium tabular-nums leading-none text-foreground/90">
            {pct.toFixed(1)}%
          </span>
          <HealthBadge health={health} size="sm" variant="minimal" />
          <span className="max-w-[100%] text-[7px] leading-tight text-muted-foreground/50">
            {conversion.label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[300px] flex-col items-start gap-0 px-3 py-2.5 text-left text-[11px]"
      >
        <p className="text-background/95">{mainText}</p>
        <AnalyticsHealthTooltipFooter />
      </TooltipContent>
    </Tooltip>
  );
}

export function AnalyticsKpiRow({
  summary,
  previousSummary,
}: {
  summary: AnalyticsSummary;
  previousSummary: AnalyticsSummary | null;
}) {
  const { metrics, conversions } = buildFunnel(summary, previousSummary);

  const cells = metrics.flatMap((metric, idx) => {
    const row: ReactNode[] = [
      <MetricCard key={`m-${metric.id}`} metric={metric} />,
    ];
    if (idx < conversions.length) {
      row.push(<ConversionConnector key={`c-${conversions[idx].id}`} conversion={conversions[idx]} />);
    }
    return row;
  });

  return (
    <div className="-mx-1 overflow-x-auto overflow-y-visible px-1 pb-3 pt-1 [scrollbar-gutter:stable]">
      <div className="flex w-full min-w-0 items-stretch gap-1">{cells}</div>
    </div>
  );
}

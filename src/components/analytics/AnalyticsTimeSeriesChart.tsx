"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DailySessionBucket } from "@/lib/sessionAnalytics";

const STACK_ID = "totals";

/** Quiz empezado pero sin lead (entre brand-dark y brand-lime) */
const QUIZ_STARTED_NO_LEAD_MIX = "color-mix(in oklab, var(--brand-dark) 52%, var(--brand-lime))";

const CHART_CONFIG: ChartConfig = {
  leads: {
    label: "Leads",
    color: "var(--brand-lime)",
  },
  quizStartedNoLead: {
    label: "Quiz empezado",
    color: QUIZ_STARTED_NO_LEAD_MIX,
  },
  notStartedQuiz: {
    label: "Visitas",
    color: "var(--brand-dark)",
  },
};

type ChartRow = {
  date: string;
  /** Base del stack: leads. */
  leads: number;
  /** Medio: empezaron quiz y aún no son lead. */
  quizStartedNoLead: number;
  /** Cima: nunca empezaron el quiz. */
  notStartedQuiz: number;
};

/** Partición del día: leads + (empezó sin lead) + (no empezó) = visitas. */
function stackParts(d: DailySessionBucket): Pick<ChartRow, "leads" | "quizStartedNoLead" | "notStartedQuiz"> {
  const sessions = d.sessions;
  const started = Math.min(d.startedQuiz, sessions);
  const L = Math.min(d.leads, sessions);
  const leadsLayer = L;
  const quizStartedNoLead = Math.max(0, started - L);
  const notStartedQuiz = Math.max(0, sessions - leadsLayer - quizStartedNoLead);
  return { leads: leadsLayer, quizStartedNoLead, notStartedQuiz };
}

function formatTick(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return date;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function AnalyticsTimeSeriesChart({ data }: { data: DailySessionBucket[] }) {
  const chartData = useMemo<ChartRow[]>(
    () =>
      data.map((d) => ({
        date: d.date,
        ...stackParts(d),
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Visitas por día
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            Sin datos en este rango.
          </div>
        ) : (
          <>
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[260px] w-full">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barCategoryGap="32%"
                maxBarSize={48}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatTick}
                  minTickGap={28}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  width={36}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const d = new Date(`${value}T00:00:00`);
                        return Number.isFinite(d.getTime())
                          ? d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })
                          : String(value);
                      }}
                    />
                  }
                />
                {/* Abajo → arriba: leads · quiz empezado sin lead · sin empezar. Solo redondeo arriba. */}
                <Bar
                  dataKey="leads"
                  name="Leads"
                  stackId={STACK_ID}
                  fill="var(--brand-lime)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="quizStartedNoLead"
                  name="Quiz empezado"
                  stackId={STACK_ID}
                  fill={QUIZ_STARTED_NO_LEAD_MIX}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="notStartedQuiz"
                  name="Visitas"
                  stackId={STACK_ID}
                  fill="var(--brand-dark)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/40 pt-3">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 shrink-0 rounded-sm bg-[var(--brand-lime)] ring-1 ring-border/60" />
                <span className="text-[11px] text-muted-foreground">Leads (base)</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-sm ring-1 ring-border/60"
                  style={{ background: QUIZ_STARTED_NO_LEAD_MIX }}
                />
                <span className="text-[11px] text-muted-foreground">Quiz empezado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 shrink-0 rounded-sm bg-[var(--brand-dark)]" />
                <span className="text-[11px] text-muted-foreground">Visitas</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AiMomentumPluginConfig } from "@/types/funnelPlugins";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";

export function AiMomentumRuntime({
  ctx,
  config,
}: {
  ctx: FunnelPluginRuntimeContext;
  config: AiMomentumPluginConfig;
}) {
  const message = useMemo(() => {
    const qi = ctx.currentQuestionIndex;
    const rules = config.rules || [];
    let best: string | null = null;
    for (const r of rules) {
      if (qi < r.minQuestionIndex || qi > r.maxQuestionIndex) continue;
      if (r.matchVariableName && r.matchOptionValue) {
        const step = ctx.sortedSteps.find(
          (s) => s.type === "question" && s.question?.variableName === r.matchVariableName,
        );
        if (!step) continue;
        if (ctx.answers[step.id] !== r.matchOptionValue) continue;
      }
      best = r.message;
    }
    return best || rules[0]?.message || "Analizando respuestas…";
  }, [config.rules, ctx.answers, ctx.currentQuestionIndex, ctx.sortedSteps]);

  const pct = useMemo(() => {
    const min = config.analysisMinPercent ?? 12;
    const max = config.analysisMaxPercent ?? 88;
    if (ctx.totalQuestions <= 0) return min;
    const t = (ctx.currentQuestionIndex + 1) / ctx.totalQuestions;
    return Math.round(min + (max - min) * Math.min(1, Math.max(0, t)));
  }, [
    config.analysisMaxPercent,
    config.analysisMinPercent,
    ctx.currentQuestionIndex,
    ctx.totalQuestions,
  ]);

  if (ctx.currentStep.type !== "question") return null;

  return (
    <div className="mb-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 md:p-4">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <span>{config.barLabel}</span>
        <span className="tabular-nums text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: ctx.primaryColor }}
        />
      </div>
      <p className="text-xs leading-relaxed text-gray-700 md:text-sm">{message}</p>
    </div>
  );
}

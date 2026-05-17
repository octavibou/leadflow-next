"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { QualificationScorePluginConfig } from "@/types/funnelPlugins";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function QualificationScoreRuntime({
  ctx,
  config,
}: {
  ctx: FunnelPluginRuntimeContext;
  config: QualificationScorePluginConfig;
}) {
  const { percentile, band } = useMemo(() => {
    const minS = config.pseudoMinTotalScore ?? 0;
    const maxS = Math.max(minS + 1, config.pseudoMaxTotalScore ?? 20);
    const minP = config.pseudoMinPercent ?? 55;
    const maxP = config.pseudoMaxPercent ?? 94;
    const t = clamp((ctx.totalScore - minS) / (maxS - minS), 0, 1);
    const p = Math.round(minP + (maxP - minP) * t);
    const band =
      p >= 85 ? "HIGH" : p >= 68 ? "MEDIUM" : "BUILDING";
    return { percentile: p, band };
  }, [
    config.pseudoMaxPercent,
    config.pseudoMaxTotalScore,
    config.pseudoMinPercent,
    config.pseudoMinTotalScore,
    ctx.totalScore,
  ]);

  if (ctx.currentStep.type !== "question") return null;

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2",
        "text-[11px] md:text-xs",
      )}
    >
      <span className="font-mono font-semibold uppercase tracking-wide text-gray-500">
        {config.engineLabel}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-gray-900">Top {100 - percentile}%</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
            band === "HIGH" && "bg-emerald-100 text-emerald-800",
            band === "MEDIUM" && "bg-amber-100 text-amber-900",
            band === "BUILDING" && "bg-gray-100 text-gray-700",
          )}
        >
          LQS {band}
        </span>
      </div>
    </div>
  );
}

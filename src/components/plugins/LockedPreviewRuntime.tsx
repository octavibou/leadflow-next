"use client";

import { useMemo } from "react";
import { computeResults, interpolate } from "@/lib/resultsEngine";
import type { LockedPreviewPluginConfig } from "@/types/funnelPlugins";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";

export function LockedPreviewRuntime({
  ctx,
  config,
}: {
  ctx: FunnelPluginRuntimeContext;
  config: LockedPreviewPluginConfig;
}) {
  const resultsStep = useMemo(
    () => ctx.sortedSteps.find((s) => s.type === "results" && s.resultsConfig?.formulas?.length),
    [ctx.sortedSteps],
  );

  const formulaCtx = useMemo(() => {
    if (!resultsStep?.resultsConfig?.formulas?.length) return {};
    return computeResults(resultsStep.resultsConfig.formulas, ctx.answers, ctx.sortedSteps);
  }, [ctx.answers, ctx.sortedSteps, resultsStep]);

  const unlockedItems = useMemo(() => {
    const names = config.unlockedFormulaNames || [];
    return names
      .map((name) => {
        const f = resultsStep?.resultsConfig?.formulas?.find((x) => x.name === name);
        if (!f) return null;
        const v = formulaCtx[name];
        if (v === undefined) return null;
        return { name, label: f.name, value: interpolate(`{{${name}}}`, formulaCtx) };
      })
      .filter(Boolean) as { name: string; label: string; value: string }[];
  }, [config.unlockedFormulaNames, formulaCtx, resultsStep]);

  const lockedItems = useMemo(() => {
    return (config.lockedFormulaKeys || []).map((key) => ({
      key,
      label: config.lockedLabels[key] || key,
    }));
  }, [config.lockedFormulaKeys, config.lockedLabels]);

  const snippet = useMemo(() => {
    const vals = Object.values(formulaCtx);
    const firstNum = vals.find((v): v is number => typeof v === "number" && Number.isFinite(v));
    const hint = unlockedItems[0]?.value ?? (firstNum !== undefined ? String(Math.round(firstNum)) : "…");
    const tpl = config.snippetTemplate || "";
    return tpl.replace(/\{\{hint\}\}/g, hint).replace(/\{\{(\w+)\}\}/g, (_, n) => {
      const v = formulaCtx[n];
      if (v === undefined) return `{{${n}}}`;
      return interpolate(`{{${n}}}`, formulaCtx);
    });
  }, [config.snippetTemplate, formulaCtx, unlockedItems]);

  if (!resultsStep?.resultsConfig?.formulas?.length && !snippet.trim()) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/80 p-4 shadow-sm md:p-5">
      <h3 className="text-center text-base font-extrabold text-gray-900 md:text-lg">{config.headline}</h3>
      <p className="mt-1 text-center text-xs text-gray-600 md:text-sm">{config.subheadline}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {unlockedItems.map((row) => (
          <li key={row.name} className="flex items-start gap-2 text-gray-800">
            <span aria-hidden>✅</span>
            <span>
              <span className="font-semibold">{row.label}:</span> {row.value}
            </span>
          </li>
        ))}
        {lockedItems.map((row) => (
          <li key={row.key} className="flex items-start gap-2 text-gray-500">
            <span aria-hidden>🔒</span>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>
      {snippet.trim() ? (
        <p className="mt-4 rounded-lg bg-gray-900/5 px-3 py-2 text-center text-xs leading-relaxed text-gray-800 md:text-sm">
          {snippet}
        </p>
      ) : null}
      <p className="mt-3 text-center text-[11px] text-gray-500 md:text-xs">{config.unlockCtaHint}</p>
    </div>
  );
}

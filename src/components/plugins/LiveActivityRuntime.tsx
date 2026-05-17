"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isLeadflowPreviewMode } from "@/lib/tracking";
import type { LiveActivityPluginConfig } from "@/types/funnelPlugins";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";

export type FunnelPluginStatsPayload = {
  completedWeek: number;
  activeNow: number;
  stepActivityCount?: number;
};

const DEMO_STATS: FunnelPluginStatsPayload = {
  completedWeek: 128,
  activeNow: 4,
  stepActivityCount: 12,
};

function pickTemplate(templates: string[], ix: number): string {
  if (!templates.length) return "";
  return templates[ix % templates.length];
}

function resolveVertical(segmentKey: string | undefined, cfg: LiveActivityPluginConfig): string {
  if (segmentKey && segmentKey !== "default") return segmentKey.replace(/-/g, " ");
  return "Tu sector";
}

export function LiveActivityRuntime({
  ctx,
  config,
}: {
  ctx: FunnelPluginRuntimeContext;
  config: LiveActivityPluginConfig;
}) {
  const [stats, setStats] = useState<FunnelPluginStatsPayload | null>(ctx.isPreview ? DEMO_STATS : null);
  const [line, setLine] = useState<string>("");
  const ixRef = useRef(0);

  const segmentKey = useMemo(() => {
    const vn = config.segmentVariableName?.trim();
    if (!vn) return "default";
    const step = ctx.sortedSteps.find((s) => s.type === "question" && s.question?.variableName === vn);
    if (!step?.question) return "default";
    const v = ctx.answers[step.id];
    if (!v) return "default";
    return v;
  }, [config.segmentVariableName, ctx.answers, ctx.sortedSteps]);

  const templates = useMemo(() => {
    const bySeg = config.templatesBySegment?.[segmentKey] || config.templatesBySegment?.default;
    if (bySeg?.length) return [...config.templatesDefault, ...bySeg];
    return config.templatesDefault;
  }, [config.templatesBySegment, config.templatesDefault, segmentKey]);

  const fetchStats = useCallback(async () => {
    if (ctx.isPreview || isLeadflowPreviewMode()) {
      setStats(DEMO_STATS);
      return;
    }
    try {
      const res = await fetch("/api/funnel-plugin-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnelId: ctx.funnel.id,
          campaignId: ctx.campaignId,
          currentStepId: ctx.currentStep.id,
        }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; stats?: FunnelPluginStatsPayload };
      if (j?.ok && j.stats) setStats(j.stats);
    } catch {
      /* ignore */
    }
  }, [ctx.campaignId, ctx.currentStep.id, ctx.funnel.id, ctx.isPreview]);

  useEffect(() => {
    void fetchStats();
    const ms = Math.max(20_000, config.pollIntervalMs || 45_000);
    const t = setInterval(() => void fetchStats(), ms);
    return () => clearInterval(t);
  }, [config.pollIntervalMs, fetchStats]);

  useEffect(() => {
    if (!stats || !templates.length) return;
    const vertical = resolveVertical(segmentKey, config);
    const synth = config.useSyntheticNames ? "Un usuario" : "Alguien";
    const tpl = pickTemplate(templates, ixRef.current);
    ixRef.current++;
    const text = tpl
      .replace(/\{count\}/g, String(Math.max(1, stats.completedWeek)))
      .replace(/\{activeNow\}/g, String(Math.max(1, stats.activeNow)))
      .replace(/\{completedWeek\}/g, String(Math.max(1, stats.completedWeek)))
      .replace(/\{vertical\}/g, vertical)
      .replace(/\{name\}/g, synth);
    let extra = "";
    if (config.showStepActivity && stats.stepActivityCount != null && ctx.currentStep.type === "question") {
      extra = ` · ${stats.stepActivityCount} personas en este paso (última hora)`;
    }
    const finalLine = text || "Actividad en tiempo real en este funnel.";
    setLine(finalLine + extra);
  }, [config, ctx.currentStep.type, segmentKey, stats, templates]);

  if (!line) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 text-xs text-gray-700 shadow-sm backdrop-blur-sm",
        "md:text-sm",
      )}
      role="status"
    >
      <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500 align-middle mr-2" />
      <span className="leading-snug">{line}</span>
    </div>
  );
}

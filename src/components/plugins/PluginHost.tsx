"use client";

import { normalizeFunnelPlugins } from "@/types/funnelPlugins";
import { placementEnabled } from "@/lib/plugins/stepPlacement";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";
import { LiveActivityRuntime } from "@/components/plugins/LiveActivityRuntime";
import { AiMomentumRuntime } from "@/components/plugins/AiMomentumRuntime";
import { LockedPreviewRuntime } from "@/components/plugins/LockedPreviewRuntime";
import { QualificationScoreRuntime } from "@/components/plugins/QualificationScoreRuntime";
import { ExitRecoveryRuntime } from "@/components/plugins/ExitRecoveryRuntime";

export function PluginHost({
  ctx,
  sortedStepIndex,
  onExitRestore,
}: {
  ctx: FunnelPluginRuntimeContext;
  sortedStepIndex: number;
  onExitRestore?: (snap: { sortedStepIndex: number; answers: Record<string, string>; qualified: boolean }) => void;
}) {
  const plugins = normalizeFunnelPlugins(ctx.funnel.settings.plugins);
  const p = ctx.placement;
  if (!p) return null;

  const la = plugins.items.live_activity;
  const showLive =
    la?.enabled && placementEnabled(la.config.placements, p) ? <LiveActivityRuntime ctx={ctx} config={la.config} /> : null;

  const ai = plugins.items.ai_momentum;
  const showAi =
    ai?.enabled && placementEnabled(ai.config.placements, p) ? <AiMomentumRuntime ctx={ctx} config={ai.config} /> : null;

  const lq = plugins.items.qualification_score;
  const showQual =
    lq?.enabled && placementEnabled(lq.config.placements, p) ? (
      <QualificationScoreRuntime ctx={ctx} config={lq.config} />
    ) : null;

  const lp = plugins.items.locked_preview;
  const showLocked =
    lp?.enabled &&
    p === "contact" &&
    ctx.currentStep.type === "contact" ? (
      <LockedPreviewRuntime ctx={ctx} config={lp.config} />
    ) : null;

  const er = plugins.items.exit_recovery;
  const showExit =
    er?.enabled &&
    placementEnabled(er.config.placements, p) &&
    onExitRestore ? (
      <ExitRecoveryRuntime ctx={ctx} config={er.config} sortedStepIndex={sortedStepIndex} onRestore={onExitRestore} />
    ) : null;

  return (
    <>
      {showExit}
      {showLive ? <div className="mb-4">{showLive}</div> : null}
      {showQual}
      {showAi}
      {showLocked}
    </>
  );
}

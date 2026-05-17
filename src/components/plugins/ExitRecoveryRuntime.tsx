"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOrCreateFunnelSessionId, trackEvent, isLeadflowPreviewMode } from "@/lib/tracking";
import type { ExitRecoveryMessageRow, ExitRecoveryPluginConfig } from "@/types/funnelPlugins";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Snapshot = {
  v: 1;
  sortedStepIndex: number;
  answers: Record<string, string>;
  qualified: boolean;
  ts: number;
};

function storageKey(funnelId: string) {
  const sid = typeof window !== "undefined" ? getOrCreateFunnelSessionId() : "";
  return `leadflow_exit_recovery_${funnelId}_${sid}`;
}

function pickMessage(
  ctx: FunnelPluginRuntimeContext,
  rows: ExitRecoveryMessageRow[],
): ExitRecoveryMessageRow | undefined {
  const t = ctx.currentStep.type;
  if (t === "intro") return rows.find((m) => m.phase === "intro");
  if (t === "contact") return rows.find((m) => m.phase === "contact");
  if (t === "question") {
    const qi = ctx.currentQuestionIndex;
    return rows.find((m) => {
      if (m.phase !== "question") return false;
      if (m.minQuestionIndex !== undefined && qi < m.minQuestionIndex) return false;
      if (m.maxQuestionIndex !== undefined && qi > m.maxQuestionIndex) return false;
      return true;
    });
  }
  return undefined;
}

export function ExitRecoveryRuntime({
  ctx,
  config,
  sortedStepIndex,
  onRestore,
}: {
  ctx: FunnelPluginRuntimeContext;
  config: ExitRecoveryPluginConfig;
  sortedStepIndex: number;
  onRestore: (snap: { sortedStepIndex: number; answers: Record<string, string>; qualified: boolean }) => void;
}) {
  const [exitOpen, setExitOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const promptsRef = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeCheckedRef = useRef(false);
  const initialProgressRef = useRef({
    step: sortedStepIndex,
    answersLen: Object.keys(ctx.answers).length,
  });

  const msg = useMemo(() => pickMessage(ctx, config.messages), [config.messages, ctx]);

  const persist = useCallback(() => {
    if (ctx.isPreview || isLeadflowPreviewMode()) return;
    const key = storageKey(ctx.funnel.id);
    const snap: Snapshot = {
      v: 1,
      sortedStepIndex,
      answers: config.saveAnswersInStorage ? { ...ctx.answers } : {},
      qualified: ctx.qualified,
      ts: Date.now(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(snap));
    } catch {
      /* quota */
    }
  }, [config.saveAnswersInStorage, ctx.answers, ctx.funnel.id, ctx.isPreview, ctx.qualified, sortedStepIndex]);

  useEffect(() => {
    persist();
  }, [persist]);

  const tryOpenExit = useCallback(() => {
    if (ctx.isPreview || isLeadflowPreviewMode()) return;
    if (promptsRef.current >= (config.maxPromptsPerSession ?? 2)) return;
    if (!msg) return;
    promptsRef.current += 1;
    setExitOpen(true);
    trackEvent(ctx.funnel.id, ctx.campaignId, "plugin_impression", {
      plugin: "exit_recovery",
      kind: "prompt",
    });
  }, [ctx.campaignId, ctx.funnel.id, ctx.isPreview, config.maxPromptsPerSession, msg]);

  useEffect(() => {
    if (ctx.isPreview) return;
    const idleMs = Math.max(8000, config.idleMs || 28_000);
    const bump = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        tryOpenExit();
      }, idleMs);
    };
    bump();
    const ev = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => {
      ev.forEach((e) => window.removeEventListener(e, bump));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [config.idleMs, ctx.isPreview, tryOpenExit]);

  useEffect(() => {
    if (!config.onVisibilityHidden || ctx.isPreview) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") tryOpenExit();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [config.onVisibilityHidden, ctx.isPreview, tryOpenExit]);

  useEffect(() => {
    if (ctx.isPreview || isLeadflowPreviewMode() || resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey(ctx.funnel.id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Snapshot;
      if (!parsed || parsed.v !== 1) return;
      const age = Date.now() - (parsed.ts || 0);
      if (age > 72 * 3600000) return;
      const init = initialProgressRef.current;
      const snapAnswers = Object.keys(parsed.answers || {}).length;
      const ahead =
        parsed.sortedStepIndex > init.step ||
        snapAnswers > init.answersLen;
      if (ahead) setResumeOpen(true);
    } catch {
      /* ignore */
    }
  }, [ctx.funnel.id, ctx.isPreview]);

  const handleResume = () => {
    try {
      const raw = localStorage.getItem(storageKey(ctx.funnel.id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Snapshot;
      if (!parsed || parsed.v !== 1) return;
      onRestore({
        sortedStepIndex: parsed.sortedStepIndex,
        answers: parsed.answers || {},
        qualified: parsed.qualified,
      });
      trackEvent(ctx.funnel.id, ctx.campaignId, "plugin_cta", { plugin: "exit_recovery", kind: "resume" });
    } catch {
      /* ignore */
    }
    setResumeOpen(false);
  };

  return (
    <>
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{config.resumeTitle}</DialogTitle>
            <DialogDescription>{config.resumeBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                try {
                  localStorage.removeItem(storageKey(ctx.funnel.id));
                } catch {
                  /* ignore */
                }
                setResumeOpen(false);
              }}
            >
              Empezar de nuevo
            </Button>
            <Button onClick={handleResume}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{msg?.title || "¿Te vas?"}</DialogTitle>
            <DialogDescription>{msg?.body || "Puedes continuar cuando quieras."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setExitOpen(false);
                trackEvent(ctx.funnel.id, ctx.campaignId, "plugin_cta", { plugin: "exit_recovery", kind: "dismiss" });
              }}
            >
              Seguir aquí
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

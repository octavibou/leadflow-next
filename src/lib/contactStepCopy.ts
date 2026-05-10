import type { Language } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { FunnelStep } from "@/types/funnel";

function clampProgressPct(n: number): number {
  if (Number.isNaN(n)) return 92;
  return Math.min(99, Math.max(80, Math.round(n)));
}

/** Copy y opciones visuales resueltas para el paso de contacto (conversión). */
export function resolveContactStepCopy(step: FunnelStep, lang: Language) {
  const headline = step.contactHeadline?.trim() || t(lang, "contact.headline.final");
  const subheadline = step.contactSubheadline?.trim() || t(lang, "contact.subheadline.final");
  const showTrust = step.contactShowTrustBadge !== false;
  const trustLine = showTrust ? step.contactTrustLine?.trim() || t(lang, "contact.trust.default") : null;
  const showProgress = step.contactShowNearCompleteProgress !== false;
  const progressPercent = clampProgressPct(step.contactProgressPercent ?? 92);
  const badgeLabel = t(lang, "contact.badge.quizDone");
  const progressLabel = t(lang, "contact.progress.label");
  return {
    headline,
    subheadline,
    trustLine,
    showProgress,
    progressPercent,
    badgeLabel,
    progressLabel,
  };
}

export type ResolvedContactStepCopy = ReturnType<typeof resolveContactStepCopy>;

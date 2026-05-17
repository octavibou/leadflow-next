"use client";

import type { ResultsConfig } from "@/types/funnel";
import { interpolate, formatNumber } from "@/lib/resultsEngine";
import {
  conversionCalloutEmoji,
  conversionChecklistBulletEmoji,
  conversionHeaderEmoji,
  conversionPainBulletEmoji,
  conversionPainHeroEmoji,
  conversionPainWarningEmoji,
  conversionSolutionPlaceholderEmoji,
  metricCardFooterEmoji,
  metricCardMainEmoji,
  resultsLabelItemEmoji,
} from "@/lib/resultsEmojis";
import {
  ConversionCalloutEmoji,
  ConversionChecklistGlyph,
  ConversionFeatureEmoji,
  ConversionHeaderEmojiBadge,
  ConversionMetricFootEmoji,
  ConversionMetricLeadingEmoji,
  ConversionPainBulletGlyph,
  ConversionPainHeroEmoji,
  ConversionPainWarningGlyph,
  ConversionSolutionFallbackEmoji,
  ConversionTrustEmoji,
} from "@/components/funnel/conversionEmojiFrame";
import { cn } from "@/lib/utils";

export type FunnelResultsStepMode = "public" | "preview";

export interface FunnelResultsStepProps {
  resultsConfig: ResultsConfig;
  ctx: Record<string, number>;
  primary: string;
  qualified: boolean;
  isMobile: boolean;
  logoUrl?: string | null;
  mode: FunnelResultsStepMode;
  onCta?: () => void;
}

function hasResultsEngine(r: ResultsConfig): boolean {
  return (
    (r.formulas?.length ?? 0) > 0 ||
    Boolean(r.headline?.trim()) ||
    Boolean(r.headlineLead?.trim()) ||
    Boolean(r.headlineEmphasis?.trim())
  );
}

function LegacyQualificationView({
  r,
  qualified,
  primary,
  isMobile,
  onCta,
  mode,
}: {
  r: ResultsConfig;
  qualified: boolean;
  primary: string;
  isMobile: boolean;
  onCta?: () => void;
  mode: FunnelResultsStepMode;
}) {
  return (
    <div className="animate-fade-in">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{ background: `${primary}15` }}
      >
        {qualified ? "✅" : "ℹ️"}
      </div>
      <h1 className={cn("mb-3 font-bold", isMobile ? "text-xl" : "text-3xl")}>
        {qualified ? r.qualifiedHeadline : r.disqualifiedHeadline}
      </h1>
      <p className={cn("mb-6 text-gray-500", isMobile ? "text-sm" : "text-lg")}>
        {qualified ? r.qualifiedSubheadline : r.disqualifiedSubheadline}
      </p>
      <button
        type="button"
        onClick={mode === "public" ? onCta : undefined}
        className={cn(
          "rounded-xl px-8 py-4 font-semibold transition-opacity hover:opacity-90",
          isMobile ? "w-full text-sm" : "text-base",
          mode === "preview" && "cursor-default opacity-90",
        )}
        style={{ background: primary, color: "#fff" }}
      >
        {qualified ? r.qualifiedCta : r.disqualifiedCta}
      </button>
    </div>
  );
}

function MinimalEngineView({
  r,
  ctx,
  primary,
  isMobile,
  onCta,
  mode,
}: {
  r: ResultsConfig;
  ctx: Record<string, number>;
  primary: string;
  isMobile: boolean;
  onCta?: () => void;
  mode: FunnelResultsStepMode;
}) {
  const headline = r.headline || "Resultados";
  const metricCards = r.metricCards || [];
  const cta = r.ctaConfig || { action: "next_step", label: "Continuar", url: "" };

  return (
    <div className="animate-fade-in">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
        style={{ background: `${primary}15` }}
      >
        📊
      </div>
      <h1 className={cn("mb-4 font-bold", isMobile ? "text-xl" : "text-3xl")}>{interpolate(headline, ctx)}</h1>

      {metricCards.length > 0 && (
        <div className={cn("mb-6 grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          {metricCards.map((card) => (
            <div key={card.id} className="rounded-xl border-2 border-gray-100 p-4">
              <div className="mb-1 text-xs text-gray-400">{card.label}</div>
              <div className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")} style={{ color: primary }}>
                {card.valueSource && ctx[card.valueSource] !== undefined
                  ? formatNumber(ctx[card.valueSource])
                  : "—"}
                {card.suffix}
              </div>
              {card.description ? (
                <div className="mt-1 text-xs text-gray-400">{interpolate(card.description, ctx)}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={mode === "public" ? onCta : undefined}
        className={cn(
          "mt-4 rounded-xl px-8 py-4 font-semibold transition-opacity hover:opacity-90",
          isMobile ? "w-full text-sm" : "text-base",
          mode === "preview" && "cursor-default",
        )}
        style={{ background: primary, color: "#fff" }}
      >
        {cta.label || "Continuar"}
      </button>
    </div>
  );
}

function ConversionLayoutView({
  r,
  ctx,
  primary,
  isMobile,
  logoUrl,
  onCta,
  mode,
}: {
  r: ResultsConfig;
  ctx: Record<string, number>;
  primary: string;
  isMobile: boolean;
  logoUrl?: string | null;
  onCta?: () => void;
  mode: FunnelResultsStepMode;
}) {
  const metricCards = r.metricCards || [];
  const cta = r.ctaConfig || { action: "next_step", label: "Continuar", url: "" };
  const painBullets = r.painBullets || [];
  const features = r.solutionFeatures || [];
  const trust = r.trustSignals || [];
  const showSolutionVisual = r.solutionShowVisual !== false;

  const showSplitHeadline = Boolean(r.headlineLead?.trim() || r.headlineEmphasis?.trim());
  const singleHeadline = interpolate(r.headline || "Resultados", ctx);

  const cardAccentClass = (accent: string | undefined) => {
    switch (accent) {
      case "success":
        return {
          wrap: "border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white shadow-sm",
          iconBg: "bg-emerald-100 text-emerald-700",
          value: "text-emerald-700",
          foot: "border-emerald-100 bg-emerald-50/90 text-emerald-900",
        };
      case "neutral":
        return {
          wrap: "border-gray-100 bg-gray-50/40 shadow-sm",
          iconBg: "bg-gray-100 text-gray-700",
          value: "text-gray-800",
          foot: "border-gray-100 bg-gray-50 text-gray-800",
        };
      default:
        return {
          wrap: "border-primary/20 bg-gradient-to-b from-primary/10 to-white shadow-sm",
          iconBg: "bg-primary/15 text-brand-dark",
          value: "text-brand-dark",
          foot: "border-primary/20 bg-primary/10 text-brand-dark",
        };
    }
  };

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <div
          className={cn(
            "flex flex-col gap-4",
            !isMobile && "md:flex-row md:items-start md:justify-between md:gap-8",
          )}
        >
          <div className="min-w-0 flex-1 space-y-3">
            {logoUrl ? (
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-50 ring-2 ring-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- URLs externas dinámicas */}
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <ConversionHeaderEmojiBadge emoji={conversionHeaderEmoji(r)} />
            )}
            <h1 className={cn("font-bold leading-snug tracking-tight text-gray-900", isMobile ? "text-xl" : "text-2xl md:text-3xl")}>
              {showSplitHeadline ? (
                <>
                  {r.headlineLead ? <span>{interpolate(r.headlineLead, ctx)}</span> : null}
                  {r.headlineEmphasis ? (
                    <span style={{ color: primary }}>{interpolate(r.headlineEmphasis, ctx)}</span>
                  ) : null}
                </>
              ) : (
                singleHeadline
              )}
            </h1>
            {r.resultsSubheadline ? (
              <p className={cn("text-gray-500", isMobile ? "text-sm" : "text-base")}>
                {interpolate(r.resultsSubheadline, ctx)}
              </p>
            ) : null}
          </div>

          {r.calloutText ? (
            <aside
              className={cn(
                "shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 md:max-w-sm",
                "shadow-[0_2px_12px_color-mix(in_oklab,var(--brand-lime),transparent_88%)]",
              )}
            >
              <div className="flex gap-3">
                <ConversionCalloutEmoji emoji={conversionCalloutEmoji(r)} />
                <p className="text-sm font-medium leading-snug text-brand-dark">{interpolate(r.calloutText, ctx)}</p>
              </div>
            </aside>
          ) : null}
        </div>
      </header>

      {/* Métricas */}
      {metricCards.length > 0 ? (
        <section className={cn("grid gap-4", isMobile ? "grid-cols-1" : "md:grid-cols-2")}>
          {metricCards.map((card) => {
            const raw = card.accent ?? "primary";
            const effective =
              raw === "success" || raw === "neutral" || raw === "primary" ? raw : "primary";
            const styles = cardAccentClass(effective);

            const num =
              card.valueSource && ctx[card.valueSource] !== undefined ? formatNumber(ctx[card.valueSource]) : "—";

            return (
              <div key={card.id} className={cn("rounded-2xl border p-5 md:p-6", styles.wrap)}>
                <div className="mb-4 flex items-start gap-3">
                  <ConversionMetricLeadingEmoji
                    emoji={metricCardMainEmoji(card)}
                    circleClassName={cn("rounded-full", styles.iconBg)}
                  />
                  <div className="min-w-0 pt-0.5">
                    <div className={cn("font-semibold text-gray-800", isMobile ? "text-sm" : "text-base")}>{card.label}</div>
                  </div>
                </div>
                <div className={cn("mb-4 font-bold tracking-tight", isMobile ? "text-2xl" : "text-3xl", styles.value)}>
                  {num}
                  {card.suffix ? <span>{card.suffix}</span> : null}
                </div>
                {(card.checklist?.length ?? 0) > 0 ? (
                  <ul className="mb-4 space-y-2">
                    {card.checklist!.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5">
                          <ConversionChecklistGlyph emoji={conversionChecklistBulletEmoji(r)} />
                        </span>
                        <span>{interpolate(line, ctx)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {card.description ? (
                  <p className="mb-4 text-sm text-gray-500">{interpolate(card.description, ctx)}</p>
                ) : null}
                {card.footerHighlight ? (
                  <div className={cn("flex items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-snug", styles.foot)}>
                    <span className="shrink-0 pt-0.5 opacity-95">
                      <ConversionMetricFootEmoji emoji={metricCardFooterEmoji(card)} />
                    </span>
                    <span>{interpolate(card.footerHighlight, ctx)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {/* Coste de la inacción */}
      {r.painTitle || painBullets.length > 0 || r.painAsideTitle || r.painAsideBody ? (
        <section
          className={cn(
            "grid gap-6 rounded-2xl border border-red-100 bg-white p-5 shadow-sm md:p-8",
            !isMobile && "md:grid-cols-2 md:gap-10",
          )}
        >
          <div className="space-y-4">
            {r.painTitle ? (
              <h2 className="text-lg font-bold leading-snug text-red-700 md:text-xl">{interpolate(r.painTitle, ctx)}</h2>
            ) : null}
            <ConversionPainHeroEmoji emoji={conversionPainHeroEmoji(r)} />
            {painBullets.length > 0 ? (
              <ul className="space-y-3">
                {painBullets.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-800 md:text-base">
                    <span className="mt-0.5 text-red-500">
                      <ConversionPainBulletGlyph emoji={conversionPainBulletEmoji(r)} />
                    </span>
                    <span>{interpolate(line, ctx)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {r.painAsideTitle || r.painAsideBody ? (
            <div className="rounded-2xl border border-orange-100 bg-orange-50/90 p-5 shadow-inner">
              <div className="mb-2 flex items-center gap-2 text-red-600">
                <ConversionPainWarningGlyph emoji={conversionPainWarningEmoji(r)} />
                {r.painAsideTitle ? (
                  <span className="text-lg font-bold">{interpolate(r.painAsideTitle, ctx)}</span>
                ) : null}
              </div>
              {r.painAsideBody ? (
                <p className="text-sm leading-relaxed text-gray-800">{interpolate(r.painAsideBody, ctx)}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Solución */}
      {r.solutionTitle || r.solutionBody || features.length > 0 ? (
        <section className="rounded-2xl border border-gray-100 bg-slate-50/50 p-5 md:p-8">
          <div
            className={cn(
              "flex flex-col gap-8",
              showSolutionVisual && !isMobile && "md:flex-row md:items-center",
            )}
          >
            {showSolutionVisual ? (
              <div className="flex flex-1 justify-center md:justify-start">
                {r.solutionImageUrl ? (
                  <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.solutionImageUrl} alt="" className="h-full w-full object-contain p-2" />
                  </div>
                ) : (
                  <ConversionSolutionFallbackEmoji emoji={conversionSolutionPlaceholderEmoji(r)} />
                )}
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-4">
              {r.solutionTitle ? (
                <h2 className="text-xl font-bold text-gray-900 md:text-2xl">{interpolate(r.solutionTitle, ctx)}</h2>
              ) : null}
              {r.solutionBody ? (
                <p className="text-sm leading-relaxed text-gray-600 md:text-base">{interpolate(r.solutionBody, ctx)}</p>
              ) : null}
              {features.length > 0 ? (
                <div className="flex flex-wrap gap-4 pt-2">
                  {features.map((f) => (
                    <div key={f.id} className="flex min-w-[calc(50%-0.5rem)] flex-1 flex-col items-center gap-2 rounded-xl bg-white/80 px-3 py-3 text-center shadow-sm ring-1 ring-gray-100 md:min-w-[7.5rem]">
                      <ConversionFeatureEmoji emoji={resultsLabelItemEmoji(f)} />
                      <span className="text-xs font-medium text-gray-800">{interpolate(f.label, ctx)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA + confianza */}
      <footer className="space-y-6 pb-2">
        <button
          type="button"
          onClick={mode === "public" ? onCta : undefined}
          className={cn(
            "w-full rounded-2xl px-6 py-4 text-center text-base font-semibold text-white shadow-md transition-opacity hover:opacity-92",
            mode === "preview" && "cursor-default",
          )}
          style={{ background: primary }}
        >
          {cta.label || "Continuar"}
        </button>

        {trust.length > 0 ? (
          <div className={cn("grid gap-4 text-center", isMobile ? "grid-cols-1" : "md:grid-cols-3")}>
            {trust.map((t) => (
              <div key={t.id} className="flex flex-col items-center gap-2 text-xs text-gray-600 md:text-sm">
                <ConversionTrustEmoji emoji={resultsLabelItemEmoji(t)} />
                <span>{interpolate(t.label, ctx)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {(r.closingQuoteLead || r.closingQuoteAccent) && (
          <p className="text-center text-sm text-gray-700 md:text-base">
            {r.closingQuoteLead ? <span>{interpolate(r.closingQuoteLead, ctx)} </span> : null}
            {r.closingQuoteAccent ? (
              <span className="font-bold" style={{ color: primary }}>
                {interpolate(r.closingQuoteAccent, ctx)}
              </span>
            ) : null}
          </p>
        )}
      </footer>
    </div>
  );
}

export function FunnelResultsStep({
  resultsConfig,
  ctx,
  primary,
  qualified,
  isMobile,
  logoUrl,
  mode,
  onCta,
}: FunnelResultsStepProps) {
  const r = resultsConfig;

  if (!hasResultsEngine(r)) {
    return (
      <LegacyQualificationView
        r={r}
        qualified={qualified}
        primary={primary}
        isMobile={isMobile}
        onCta={onCta}
        mode={mode}
      />
    );
  }

  if (r.resultsPageLayout === "conversion") {
    return (
      <ConversionLayoutView
        r={r}
        ctx={ctx}
        primary={primary}
        isMobile={isMobile}
        logoUrl={logoUrl}
        onCta={onCta}
        mode={mode}
      />
    );
  }

  return (
    <MinimalEngineView r={r} ctx={ctx} primary={primary} isMobile={isMobile} onCta={onCta} mode={mode} />
  );
}

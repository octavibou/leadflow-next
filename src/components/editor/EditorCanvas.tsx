import type { FunnelStep, FunnelSettings } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { interpolate, formatNumber } from "@/lib/resultsEngine";
import { useLandingBuilderOptional } from "@/components/editor/landing/LandingBuilderContext";
import {
  isLandingHeroTemplateId,
  type LandingBuilderComponentId,
} from "@/components/editor/landing/landingBuilderTypes";
import { FunnelIntroScrollShell } from "@/components/funnel/FunnelIntroScrollShell";
import {
  introHeroMetrics,
  LandingIntroHeroColumn,
  landingIntroCtaButtonClasses,
  landingIntroCtaButtonStyle,
} from "@/components/funnel/LandingIntroHeroColumn";
import { FunnelBrandingFooter } from "@/components/funnel/FunnelBrandingFooter";
import { FunnelGoogleFont } from "@/components/funnel/FunnelGoogleFont";
import { LandingCanvasIntroLayout } from "@/components/funnel/LandingCanvasIntroLayout";
import { LandingIntroBodyBlocks } from "@/components/funnel/LandingIntroBodyBlocks";
import { LandingIntroBodyBlocksEditorRegion } from "@/components/editor/landing/LandingIntroBodyBlocksEditorRegion";
import { funnelContentFontFamily } from "@/lib/funnelTypography";

/** Transición unificada móvil ↔ escritorio: ancho del marco + paddings (contenido y pie) en paralelo. */
const viewModeTransitionClass =
  "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:!transition-none motion-reduce:!duration-0";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const ytMatch = u.hostname.includes("youtube.com") ? u.searchParams.get("v") : u.hostname === "youtu.be" ? u.pathname.slice(1) : null;
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch}`;
    const vimeoMatch = u.hostname.includes("vimeo.com") && u.pathname.match(/\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (u.hostname.includes("loom.com")) return `https://www.loom.com/embed/${u.pathname.split("/").pop()}`;
    if (u.hostname.includes("wistia.com") || u.hostname.includes("wi.st")) return `https://fast.wistia.net/embed/iframe/${u.pathname.split("/").pop()}`;
    return url;
  } catch {
    return null;
  }
}

function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) {
    return (
      <div className="bg-muted w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        URL de video no válida
      </div>
    );
  }
  return (
    <iframe
      src={embedUrl}
      className="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

/** En modo constructor de landing, zona clic que abre el panel lateral del bloque correspondiente. */
function LandingPickZone({
  blockId,
  enabled,
  className,
  children,
  matchActive,
}: {
  blockId: LandingBuilderComponentId;
  enabled: boolean;
  className?: string;
  children: React.ReactNode;
  matchActive?: (id: LandingBuilderComponentId | null) => boolean;
}) {
  const ctx = useLandingBuilderOptional();
  if (!enabled || !ctx) return <div className={className}>{children}</div>;
  const selected =
    (matchActive ? matchActive(ctx.activeComponent) : ctx.activeComponent === blockId) && ctx.sheetOpen;
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-xl outline-none transition-shadow",
        "cursor-pointer hover:ring-2 hover:ring-primary/35 focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-primary",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        ctx.openComponent(blockId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.openComponent(blockId);
        }
      }}
    >
      {children}
    </div>
  );
}

export function EditorCanvas({
  step,
  steps,
  settings,
  viewMode,
  landingConstructorPick,
}: {
  step: FunnelStep;
  steps: FunnelStep[];
  settings: FunnelSettings;
  viewMode: "desktop" | "mobile";
  /** Solo en la pestaña Landing → Constructor: la vista previa divide la intro en bloques clicables (Hero / Producto / CTA). */
  landingConstructorPick?: boolean;
}) {
  const primary = settings.primaryColor || "#1877F2";
  const isMobile = viewMode === "mobile";
  const questionFontSizeMobilePx = settings.questionFontSizeMobile ?? 16;
  const questionFontSizeDesktopPx = settings.questionFontSizeDesktop ?? 48;
  const questionOptionsSpacingMobilePx = settings.questionOptionsSpacingMobile ?? 24;
  const questionOptionsSpacingDesktopPx = settings.questionOptionsSpacingDesktop ?? 24;
  const questionTextAlign = settings.questionTextAlign ?? "center";
  const questionTextAlignClass =
    questionTextAlign === "left" ? "text-left" : questionTextAlign === "right" ? "text-right" : "text-center";

  const questionSteps = steps.filter((s) => s.type === "question");
  const totalQuestions = questionSteps.length;
  const currentQuestionIndex = questionSteps.findIndex((s) => s.id === step.id);
  const isQuestion = step.type === "question";
  const progress = totalQuestions > 1 && currentQuestionIndex >= 0 ? (currentQuestionIndex / (totalQuestions - 1)) * 100 : isQuestion ? 0 : 100;
  const introLayout = step.type === "intro";
  const landingChrome = useLandingBuilderOptional();

  const showSidebarPrimitiveOverlay =
    introLayout &&
    Boolean(landingConstructorPick) &&
    Boolean(landingChrome?.sidebarPrimitiveDragActive) &&
    Boolean(landingChrome?.bodyCanvasActionsConfigured);

  return (
    <div className="flex-1 overflow-hidden bg-[#f2f2f2]">
      <FunnelGoogleFont fontFamily={settings.fontFamily} />
      <div
        className={cn(
          "flex min-h-full w-full justify-center p-6 md:p-8 md:py-10",
          "items-stretch",
        )}
      >
        <div
          className={cn(
            "relative flex w-full flex-col bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06]",
            "rounded-2xl",
            "transition-[max-width]",
            viewModeTransitionClass,
            isMobile ? "max-w-[375px]" : "max-w-[900px]",
            "min-h-0",
            isMobile
              ? "h-[min(812px,calc(100dvh-8rem))] max-h-[min(812px,calc(100dvh-8rem))]"
              : "h-[min(900px,calc(100dvh-8rem))] max-h-[min(900px,calc(100dvh-8rem))]",
          )}
          style={{ fontFamily: funnelContentFontFamily(settings.fontFamily) }}
        >
          {introLayout ? (
            <FunnelIntroScrollShell
              className="min-h-0 flex-1"
              showEditorChrome={Boolean(landingConstructorPick)}
            >
              <StepContent
                step={step}
                primary={primary}
                isMobile={isMobile}
                landingConstructorPick={landingConstructorPick}
                logoUrl={settings.logoUrl}
                contentFontFamily={settings.fontFamily}
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                questionTextAlignClass={questionTextAlignClass}
              />
            </FunnelIntroScrollShell>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className={cn(
                  "mx-auto w-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden transition-[padding]",
                  "flex flex-col",
                  viewModeTransitionClass,
                  isMobile ? "px-5 py-6" : "px-10 py-8",
                )}
                style={{
                  ["--question-font-size" as any]: `${questionFontSizeMobilePx}px`,
                  ["--question-font-size-md" as any]: `${questionFontSizeDesktopPx}px`,
                  ["--question-options-spacing" as any]: `${questionOptionsSpacingMobilePx}px`,
                  ["--question-options-spacing-md" as any]: `${questionOptionsSpacingDesktopPx}px`,
                }}
              >
                <div className="flex-1">
                  <StepContent
                    step={step}
                    primary={primary}
                    isMobile={isMobile}
                    landingConstructorPick={landingConstructorPick}
                    logoUrl={settings.logoUrl}
                    contentFontFamily={settings.fontFamily}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={totalQuestions}
                    questionTextAlignClass={questionTextAlignClass}
                  />
                </div>
                {isQuestion && totalQuestions > 0 && (
                  <div
                    className={cn(
                      "w-full shrink-0 border-t border-gray-100 pt-4 mt-6 transition-[padding]",
                      viewModeTransitionClass,
                    )}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                      <span>Pregunta {currentQuestionIndex + 1} de {totalQuestions}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: primary }} />
                    </div>
                  </div>
                )}
                <FunnelBrandingFooter
                  className={cn(
                    "mt-auto pt-8 shrink-0 transition-[padding]",
                    viewModeTransitionClass,
                    isMobile ? "mx-auto w-full pb-2" : "mx-auto w-full pb-4",
                  )}
                />
              </div>
            </div>
          )}
          {showSidebarPrimitiveOverlay ? (
            <div
              className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center overflow-hidden rounded-2xl"
              aria-hidden
            >
              <div className="absolute inset-0 bg-background/45 backdrop-blur-[8px]" />
              <div className="relative z-[1] mx-5 max-w-[min(100%,22rem)] rounded-2xl border border-dashed border-muted-foreground/40 bg-background/95 px-5 py-6 text-center shadow-sm ring-1 ring-black/[0.05]">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Suéltalo aquí: arrastra un bloque desde «Bloques básicos» en el Constructor.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepContent({
  step,
  primary,
  isMobile,
  landingConstructorPick,
  logoUrl,
  contentFontFamily,
  currentQuestionIndex,
  totalQuestions,
  questionTextAlignClass,
}: {
  step: FunnelStep;
  primary: string;
  isMobile: boolean;
  landingConstructorPick?: boolean;
  logoUrl?: string;
  /** Familia tipográfica del funnel (settings.fontFamily). */
  contentFontFamily?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionTextAlignClass: string;
}) {
  const landingCtx = useLandingBuilderOptional();
  const introPick = Boolean(landingConstructorPick && landingCtx && step.type === "intro");

  const activeLanding = landingCtx?.activeComponent ?? null;
  const selectedBodyRowId = landingCtx?.selectedBodyRowId ?? null;
  const mainBlockSelected =
    introPick &&
    !landingCtx?.introLayoutChromeSection &&
    !selectedBodyRowId &&
    Boolean(landingCtx?.sheetOpen) &&
    activeLanding !== null &&
    (isLandingHeroTemplateId(activeLanding) ||
      activeLanding === "media_video" ||
      activeLanding === "core_text" ||
      activeLanding === "core_button");

  return (
    <>
      {step.type === "intro" && (() => {
        const ic = step.introConfig;
        const { cSize } = introHeroMetrics(ic, isMobile);
        return (
          <LandingCanvasIntroLayout
            logoUrl={logoUrl?.trim() ? logoUrl : undefined}
            showEditorChrome={introPick}
            showLandingDivider={ic?.showLandingDivider === true}
            fontFamily={funnelContentFontFamily(contentFontFamily)}
            mainSelected={mainBlockSelected}
            renderBrandingFooterInside={false}
          >
            <>
              <LandingIntroHeroColumn
                ic={ic}
                primary={primary}
                isMobile={isMobile}
                renderHeadline={(n) => (
                  <LandingPickZone
                    blockId="hero_tpl_center_logos"
                    matchActive={(id) => isLandingHeroTemplateId(id)}
                    enabled={introPick}
                    className="w-full"
                  >
                    {n}
                  </LandingPickZone>
                )}
                renderVideo={(el) =>
                  el ? (
                    <LandingPickZone
                      blockId="media_video"
                      matchActive={(id) => id === "media_video"}
                      enabled={introPick}
                      className={cn(
                        /* self-stretch: en columna flex con align-items:center el pick zone ocupaba menos ancho y el vídeo quedaba a la izquierda. */
                        "relative shrink-0 self-stretch w-full",
                        introPick && "[&_iframe]:pointer-events-none",
                      )}
                    >
                      {el}
                    </LandingPickZone>
                  ) : null
                }
                renderDescription={(n) => (
                  <LandingPickZone
                    blockId="core_text"
                    matchActive={(id) => id === "core_text"}
                    enabled={introPick}
                    className={cn("w-full", isMobile ? "max-w-full" : "max-w-[600px]")}
                  >
                    {n}
                  </LandingPickZone>
                )}
                ctaSlot={
                  <LandingPickZone
                    blockId="core_button"
                    matchActive={(id) => id === "core_button"}
                    enabled={introPick}
                    className="w-full"
                  >
                    <span
                      className={cn(
                        landingIntroCtaButtonClasses(isMobile),
                        introPick ? "cursor-pointer" : "cursor-default",
                      )}
                      style={landingIntroCtaButtonStyle(primary, cSize)}
                    >
                      {ic?.cta || "Empezar"}
                    </span>
                  </LandingPickZone>
                }
              />
              {introPick ? (
                <LandingIntroBodyBlocksEditorRegion introConfig={ic} primary={primary} isMobile={isMobile} />
              ) : (
                <LandingIntroBodyBlocks
                  blocks={ic?.landingBodyBlocks}
                  primary={primary}
                  isMobile={isMobile}
                />
              )}
            </>
          </LandingCanvasIntroLayout>
        );
      })()}

      {step.type === "question" && step.question && (
        <div className="animate-fade-in">
          {!isMobile && totalQuestions > 0 && currentQuestionIndex >= 0 ? (
            <div className="text-center text-sm font-semibold mb-3" style={{ color: primary }}>
              Pregunta {currentQuestionIndex + 1} de {totalQuestions}
            </div>
          ) : null}
          <h2
            className={cn(
              "font-extrabold tracking-tight",
              questionTextAlignClass,
              isMobile ? "text-[length:var(--question-font-size)]" : "text-[length:var(--question-font-size-md)]",
              isMobile ? "mb-[var(--question-options-spacing)]" : "mb-[var(--question-options-spacing-md)]",
              !isMobile && "leading-[1.08]",
            )}
          >
            {step.question.text}
          </h2>
          <div className={cn(
            step.question.layout === "opts-2" && !isMobile ? "grid grid-cols-2 gap-3" : "space-y-3"
          )}>
            {step.question.options.map((opt) => (
              <div key={opt.id} className={cn(
                "flex items-center gap-3 border-2 border-gray-200 rounded-xl cursor-default hover:border-blue-200 transition-colors font-medium",
                isMobile ? "text-sm py-3 px-4" : "text-base py-4 px-5"
              )}>
                <span className={cn(isMobile ? "text-lg" : "text-xl")}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step.type === "contact" && (
        <div className="animate-fade-in">
          <div className={cn(!isMobile && "text-center")}>
            <h2 className={cn(
              "font-extrabold tracking-tight",
              isMobile ? "text-base mb-6" : "text-5xl leading-[1.08] mb-8"
            )}>
              Tus datos
            </h2>
          </div>
          <div className={cn("space-y-4", !isMobile && "mx-auto w-full max-w-md")}>
            {(step.contactFields || []).map((f) => (
              <div key={f.id}>
                <label className={cn("font-semibold block mb-2", isMobile ? "text-xs" : "sr-only")}>{f.label}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {f.fieldType === "email" ? "✉️" : f.fieldType === "tel" ? "📞" : "👤"}
                  </span>
                  <div
                    className={cn(
                      "rounded-md border border-gray-200 bg-white text-gray-400",
                      isMobile ? "text-sm py-3 pl-10 pr-4" : "text-base py-3 pl-10 pr-4",
                    )}
                  >
                    {f.placeholder}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={cn("flex items-start gap-2 mt-6 text-xs text-gray-500", !isMobile && "mx-auto max-w-md justify-center")}>
            <div className="w-4 h-4 border-2 border-gray-300 rounded mt-0.5 shrink-0" />
            <span>{step.contactConsent || "Texto de consentimiento"}</span>
          </div>
          <button
            className={cn(
              "mt-6 px-8 py-4 rounded-md font-semibold w-full",
              !isMobile && "mx-auto block max-w-md",
              isMobile ? "text-sm" : "text-base"
            )}
            style={{ background: primary, color: "#fff" }}
          >
            {step.contactCta || "Enviar"}
          </button>
        </div>
      )}

      {step.type === "results" && step.resultsConfig && (
        <DynamicResultsPreview step={step} primary={primary} isMobile={isMobile} />
      )}

      {step.type === "booking" && (
        <div className="animate-fade-in text-center py-12">
          <h2 className={cn("font-bold mb-2", isMobile ? "text-base" : "text-2xl")}>Reserva tu llamada</h2>
          <p className="text-gray-500 mb-6">Elige un horario que te convenga.</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-gray-400 text-sm">
            El iframe del calendario aparecerá aquí
          </div>
        </div>
      )}

      {step.type === "vsl" && (
        <div className="animate-fade-in">
          <div className={cn("rounded-xl overflow-hidden aspect-video mb-6", isMobile ? "max-w-full" : "max-w-[640px] mx-auto")}>
            {step.vslConfig?.videoUrl ? (
              <VideoEmbed url={step.vslConfig.videoUrl} />
            ) : (
              <div className="bg-gray-100 w-full h-full flex items-center justify-center text-gray-400 text-sm">
                Pega una URL de video en el panel derecho
              </div>
            )}
          </div>
          {step.vslConfig?.ctaLabel && (
            <div className="text-center">
              <button className={cn("px-8 py-4 rounded-xl font-semibold", isMobile ? "text-sm w-full" : "text-base")} style={{ background: primary, color: "#fff" }}>
                {step.vslConfig.ctaLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {step.type === "delivery" && step.deliveryConfig && (
        <div className="animate-fade-in text-center">
          <div className="border-2 border-gray-200 rounded-2xl p-10 bg-gray-50">
            <h2 className={cn("font-bold mb-3", isMobile ? "text-base" : "text-2xl")}>{step.deliveryConfig.resourceTitle}</h2>
            <p className={cn("text-gray-500 mb-6", isMobile ? "text-sm" : "text-base")}>{step.deliveryConfig.resourceDescription}</p>
            <button className={cn("px-8 py-4 rounded-xl font-semibold", isMobile ? "text-sm w-full" : "text-base")} style={{ background: primary, color: "#fff" }}>
              {step.deliveryConfig.downloadButtonLabel}
            </button>
          </div>
        </div>
      )}

      {step.type === "thankyou" && step.thankYouConfig && (
        <div className="animate-fade-in">
          {step.thankYouConfig.showEmoji !== false && (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>🎉</div>
          )}
          <h1 className={cn("font-bold mb-3", isMobile ? "text-xl" : "text-3xl")}>{step.thankYouConfig.headline}</h1>
          <p className={cn("text-gray-500 mb-8", isMobile ? "text-sm" : "text-lg")}>{step.thankYouConfig.subtitle}</p>
          {step.thankYouConfig.videoUrl && (
            <div className={cn("rounded-xl overflow-hidden aspect-video mb-6", isMobile ? "max-w-full" : "max-w-[640px] mx-auto")}>
              <VideoEmbed url={step.thankYouConfig.videoUrl} />
            </div>
          )}
          {(!step.thankYouConfig.mode || step.thankYouConfig.mode === "steps") && step.thankYouConfig.nextSteps.map((ns) => (
            <div key={ns.number} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${primary}15`, color: primary }}>
                {ns.number}
              </div>
              <div>
                <div className={cn("font-semibold", isMobile ? "text-sm" : "text-base")}>{ns.title}</div>
                <div className={cn("text-gray-500", isMobile ? "text-xs" : "text-sm")}>{ns.description}</div>
              </div>
            </div>
          ))}
          {step.thankYouConfig.mode === "button" && step.thankYouConfig.buttonLabel && (
            <div className="mt-4">
              <button
                className={cn("px-8 py-4 rounded-xl font-semibold", isMobile ? "text-sm w-full" : "text-base")}
                style={{ background: primary, color: "#fff" }}
              >
                {step.thankYouConfig.buttonLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function DynamicResultsPreview({ step, primary, isMobile }: { step: FunnelStep; primary: string; isMobile: boolean }) {
  const r = step.resultsConfig!;
  const hasEngine = (r.formulas?.length ?? 0) > 0 || r.headline;

  if (!hasEngine) {
    return (
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>✅</div>
        <h1 className={cn("font-bold mb-3", isMobile ? "text-xl" : "text-3xl")}>{r.qualifiedHeadline}</h1>
        <p className={cn("text-gray-500 mb-6", isMobile ? "text-sm" : "text-lg")}>{r.qualifiedSubheadline}</p>
        <button className={cn("px-8 py-4 rounded-xl font-semibold", isMobile ? "text-sm w-full" : "text-base")} style={{ background: primary, color: "#fff" }}>
          {r.qualifiedCta}
        </button>
      </div>
    );
  }

  const headline = r.headline || "Resultados";
  const metricCards = r.metricCards || [];
  const cta = r.ctaConfig || { action: "next_step", label: "Continuar", url: "" };
  const sampleCtx: Record<string, number> = {};
  for (const f of r.formulas || []) sampleCtx[f.name] = 1250;

  return (
    <div className="animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>📊</div>
      <h1 className={cn("font-bold mb-4", isMobile ? "text-xl" : "text-3xl")}>
        {interpolate(headline, sampleCtx)}
      </h1>

      {metricCards.length > 0 && (
        <div className={cn("grid gap-3 mb-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
          {metricCards.map((card) => (
            <div key={card.id} className="border-2 border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{card.label}</div>
              <div className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")} style={{ color: primary }}>
                {card.valueSource && sampleCtx[card.valueSource] !== undefined ? formatNumber(sampleCtx[card.valueSource]) : "—"}{card.suffix}
              </div>
              {card.description && <div className="text-xs text-gray-400 mt-1">{card.description}</div>}
            </div>
          ))}
        </div>
      )}

      <button className={cn("px-8 py-4 rounded-xl font-semibold mt-4", isMobile ? "text-sm w-full" : "text-base")} style={{ background: primary, color: "#fff" }}>
        {cta.label || "Continuar"}
      </button>
    </div>
  );
}

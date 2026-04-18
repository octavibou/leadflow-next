import type { FunnelStep, FunnelSettings } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { interpolate, formatNumber } from "@/lib/resultsEngine";

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

export function EditorCanvas({ step, steps, settings, viewMode }: { step: FunnelStep; steps: FunnelStep[]; settings: FunnelSettings; viewMode: "desktop" | "mobile" }) {
  const primary = settings.primaryColor || "#1877F2";
  const isMobile = viewMode === "mobile";

  const questionSteps = steps.filter((s) => s.type === "question");
  const totalQuestions = questionSteps.length;
  const currentQuestionIndex = questionSteps.findIndex((s) => s.id === step.id);
  const isQuestion = step.type === "question";
  const progress = totalQuestions > 1 && currentQuestionIndex >= 0 ? (currentQuestionIndex / (totalQuestions - 1)) * 100 : isQuestion ? 0 : 100;

  return (
    <div className="flex-1 bg-white overflow-auto flex justify-center">
      <div className={cn(
        "w-full bg-white flex flex-col",
        isMobile ? "max-w-[375px] border-x border-gray-100" : "max-w-[900px]"
      )}>
        <div className={cn("mx-auto w-full flex-1", isMobile ? "px-5 py-6" : "px-10 py-8")}>
          <StepContent step={step} primary={primary} isMobile={isMobile} />
        </div>
        {/* Step counter + progress bar — only for questions */}
        {isQuestion && totalQuestions > 0 && (
          <div className={cn("w-full pb-4", isMobile ? "px-5" : "px-10")}>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>Pregunta {currentQuestionIndex + 1} de {totalQuestions}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: primary }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepContent({ step, primary, isMobile }: { step: FunnelStep; primary: string; isMobile: boolean }) {
  return (
    <>
      {step.type === "intro" && (() => {
        const ic = step.introConfig;
        const hSize = isMobile ? (ic?.mobileHeadlineFontSize || 20) : (ic?.headlineFontSize || 30);
        const dSize = isMobile ? (ic?.mobileDescriptionFontSize || 14) : (ic?.descriptionFontSize || 18);
        const cSize = isMobile ? (ic?.mobileCtaFontSize || 14) : (ic?.ctaFontSize || 16);
        const spacing = isMobile ? (ic?.mobileElementSpacing || 12) : (ic?.elementSpacing || 16);
        return (
          <div className="animate-fade-in text-center" style={{ gap: `${spacing}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 className="font-bold leading-tight" style={{ fontSize: `${hSize}px` }}>{ic?.headline || "Título"}</h1>
            {ic?.showVideo && ic?.videoUrl && (
              <div className={cn("rounded-xl overflow-hidden aspect-video w-full", isMobile ? "max-w-full" : "max-w-[640px]")}>
                <VideoEmbed url={ic.videoUrl} />
              </div>
            )}
            <p className={cn("text-gray-500 leading-relaxed", isMobile ? "max-w-full" : "max-w-[600px]")} style={{ fontSize: `${dSize}px` }}>{ic?.description || "Descripción"}</p>
            <button className="px-8 py-4 rounded-xl font-semibold" style={{ background: primary, color: "#fff", fontSize: `${cSize}px` }}>
              {ic?.cta || "Empezar"}
            </button>
          </div>
        );
      })()}

      {step.type === "question" && step.question && (
        <div className="animate-fade-in">
          <h2 className={cn("font-bold mb-6", isMobile ? "text-base" : "text-2xl")}>{step.question.text}</h2>
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
          <h2 className={cn("font-bold mb-6", isMobile ? "text-base" : "text-2xl")}>Tus datos</h2>
          <div className="space-y-5">
            {(step.contactFields || []).map((f) => (
              <div key={f.id}>
                <label className={cn("font-semibold block mb-2", isMobile ? "text-xs" : "text-sm")}>{f.label}</label>
                <div className={cn("border-2 border-gray-200 rounded-xl text-gray-400", isMobile ? "text-sm py-3 px-4" : "text-base py-3 px-4")}>{f.placeholder}</div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-6 text-xs text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 rounded mt-0.5 shrink-0" />
            <span>{step.contactConsent || "Texto de consentimiento"}</span>
          </div>
          <button className={cn("mt-6 px-8 py-4 rounded-xl font-semibold w-full", isMobile ? "text-sm" : "text-base")} style={{ background: primary, color: "#fff" }}>
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

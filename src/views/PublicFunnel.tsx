'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel, FunnelStep, FunnelType } from "@/types/funnel";
import { computeResults, interpolate, formatNumber } from "@/lib/resultsEngine";
import {
  trackEvent, saveLead, injectMetaPixel, injectGoogleTag,
  fireExternalEvent, extractUtms, fireMetaCapi,
} from "@/lib/tracking";

interface CampaignSettings {
  metaPixelId?: string;
  googleTagId?: string;
  trackingEnabled?: boolean;
}

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
  if (!embedUrl) return null;
  return (
    <iframe
      src={embedUrl}
      className="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

const PublicFunnel = () => {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [_totalScore, setTotalScore] = useState(0);
  const [qualified, setQualified] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>({});
  const utmsRef = useRef<Record<string, string>>({});
  const trackedPageView = useRef(false);
  const searchParams = useSearchParams();

  // Extract UTMs once
  useEffect(() => {
    utmsRef.current = extractUtms();
  }, []);

  // Load funnel
  useEffect(() => {
    if (!funnelId) return;
    supabase
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          // Check if funnel is published
          if (data.status !== "published") {
            setLoading(false);
            return;
          }
          setFunnel({
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            slug: data.slug,
            type: data.type as FunnelType,
            settings: data.settings as any,
            steps: (data.steps as any) || [],
            status: data.status,
            published_at: data.published_at,
            archived_at: data.archived_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
            saved_at: data.saved_at || data.updated_at,
          });
        }
        setLoading(false);
      });
  }, [funnelId]);

  // Load campaign from ?c= param
  useEffect(() => {
    if (!funnelId) return;
    const campaignSlug = searchParams.get("c");
    if (!campaignSlug) return;
    supabase
      .from("campaigns")
      .select("*")
      .eq("funnel_id", funnelId)
      .eq("slug", campaignSlug)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setCampaignId(data.id);
          const s = (data.settings || {}) as CampaignSettings;
          setCampaignSettings(s);
          // Campaign-level Google Tag (kept for backwards compat)
          if (s.trackingEnabled && s.googleTagId) injectGoogleTag(s.googleTagId);
          const campaignSteps = (data.steps as any[]) || [];
          if (campaignSteps.length > 0) {
            setFunnel((prev) => prev ? { ...prev, steps: campaignSteps } : prev);
          }
        }
      });
  }, [funnelId, searchParams]);

  // Inject funnel-level Meta Pixel
  useEffect(() => {
    if (!funnel) return;
    const pid = funnel.settings.metaPixelId;
    if (pid) injectMetaPixel(pid);
  }, [funnel]);

  // Helper to fire Meta CAPI for this funnel
  const fireCapiEvent = useCallback(
    (eventName: string, userData: Record<string, unknown> = {}, customData: Record<string, unknown> = {}) => {
      if (!funnel) return;
      const { metaPixelId, metaAccessToken, metaTestEventCode } = funnel.settings;
      if (!metaPixelId || !metaAccessToken) return;
      fireMetaCapi(metaPixelId, metaAccessToken, eventName, window.location.href, userData, customData, metaTestEventCode || undefined);
    },
    [funnel]
  );

  // Track page_view once
  useEffect(() => {
    if (!funnel || trackedPageView.current) return;
    trackedPageView.current = true;
    const params = { funnel_id: funnelId, campaign_id: campaignId, ...utmsRef.current };
    trackEvent(funnel.id, campaignId, "page_view", { ...utmsRef.current });
    // Pixel + CAPI: PageView
    fireCapiEvent("PageView");
    // Legacy campaign-level tracking
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("page_view", params);
    }
  }, [funnel, funnelId, campaignId, campaignSettings, fireCapiEvent]);

  const goNext = useCallback(() => {
    if (!funnel) return;
    setCurrentStepIndex((prev) => {
      const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
      let next = Math.min(prev + 1, sorted.length - 1);
      // Skip contact step if lead is disqualified and skip is enabled
      const nextStep = sorted[next];
      if (nextStep?.type === "contact" && nextStep.skipContactIfDisqualified && !qualified) {
        // If disqualifiedRoute is set, go there; otherwise just skip to next
        if (nextStep.disqualifiedRoute !== undefined) {
          const idx = sorted.findIndex((s) => s.order === nextStep.disqualifiedRoute);
          return idx >= 0 ? idx : Math.min(next + 1, sorted.length - 1);
        }
        next = Math.min(next + 1, sorted.length - 1);
      }
      return next;
    });
  }, [funnel, qualified]);

  const goToStep = useCallback((order: number) => {
    if (!funnel) return;
    const idx = funnel.steps.findIndex((s) => s.order === order);
    if (idx >= 0) setCurrentStepIndex(idx);
    else setCurrentStepIndex((prev) => Math.min(prev + 1, funnel.steps.length - 1));
  }, [funnel]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Funnel no encontrado</h2>
          <p className="text-gray-500">Este enlace puede haber expirado o no ser válido.</p>
        </div>
      </div>
    );
  }

  const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);
  const currentStep = sortedSteps[currentStepIndex];
  const primary = funnel.settings.primaryColor || "#1877F2";
  const font = funnel.settings.fontFamily || "Inter";
  const questionSteps = sortedSteps.filter((s) => s.type === "question");
  const totalQuestions = questionSteps.length;
  const currentQuestionIndex = questionSteps.findIndex((s) => s.id === currentStep?.id);
  const isQuestion = currentStep?.type === "question";
  const progress = totalQuestions > 1 && currentQuestionIndex >= 0 ? (currentQuestionIndex / (totalQuestions - 1)) * 100 : isQuestion ? 0 : 100;

  const handleOptionSelect = (step: FunnelStep, optionValue: string) => {
    if (!step.question) return;
    const option = step.question.options.find((o) => o.value === optionValue);
    if (!option) return;
    setAnswers((prev) => ({ ...prev, [step.id]: optionValue }));
    setTotalScore((prev) => prev + option.score);
    if (!option.qualifies) setQualified(false);
    // Track step_view
    trackEvent(funnel.id, campaignId, "step_view", { step_id: step.id, step_type: "question", answer: optionValue });
    // Meta CAPI: ViewContent
    fireCapiEvent("ViewContent", {}, { content_name: step.question.text, content_ids: [step.id] });
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("view_content", { funnel_id: funnel.id, campaign_id: campaignId, step_id: step.id });
    }
    setTimeout(goNext, 300);
  };

  const handleFormChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleContactSubmit = () => {
    // Track form_submit event
    trackEvent(funnel.id, campaignId, "form_submit", { ...utmsRef.current });
    // Meta CAPI: Lead
    fireCapiEvent("Lead", {}, { funnel_id: funnel.id, campaign_id: campaignId });
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("lead", { funnel_id: funnel.id, campaign_id: campaignId });
    }

    // Save lead to DB
    saveLead(funnel.id, campaignId, answers, qualified ? "qualified" : "disqualified", {
      formData,
      ...utmsRef.current,
    });

    // Build payload (shared between direct webhook and lead routing)
    const contactStep = sortedSteps.find((s) => s.type === "contact");
    const fields = contactStep?.contactFields || [];
    let firstName = "", lastName = "", email = "", phone = "";
    fields.forEach((f) => {
      const val = formData[f.id] || "";
      const lowerLabel = f.label.toLowerCase();
      if (f.fieldType === "email") { email = val; }
      else if (f.fieldType === "tel") { phone = val; }
      else if (lowerLabel.includes("apellido")) { lastName = val; }
      else if (f.fieldType === "text") { firstName = val; }
    });
    const namedAnswers: Record<string, string> = {};
    const answerOptionIds: Record<string, string> = {};
    for (const step of sortedSteps) {
      if (step.type === "question" && step.question && answers[step.id]) {
        const selectedOpt = step.question.options.find((o) => o.value === answers[step.id]);
        namedAnswers[step.question.text] = selectedOpt?.label || answers[step.id];
        if (selectedOpt) {
          answerOptionIds[step.question.id] = selectedOpt.id;
        }
      }
    }
    // Build readable summary for GHL notes
    const summaryLines: string[] = [];
    summaryLines.push(`📋 Resumen del lead`);
    summaryLines.push(`Nombre: ${firstName} ${lastName}`);
    if (email) summaryLines.push(`Email: ${email}`);
    if (phone) summaryLines.push(`Teléfono: ${phone}`);
    summaryLines.push(`Calificado: ${qualified ? "Sí" : "No"}`);
    summaryLines.push(``);
    summaryLines.push(`📝 Respuestas:`);
    for (const step of sortedSteps) {
      if (step.type === "question" && step.question && answers[step.id]) {
        const selectedOpt = step.question.options.find((o) => o.value === answers[step.id]);
        summaryLines.push(`• ${step.question.text}: ${selectedOpt?.label || answers[step.id]}`);
      }
    }
    const summary = summaryLines.join("\n");

    const webhookPayload = {
      firstName, lastName, email, phone, qualified,
      answers: namedAnswers,
      summary,
      campaign_id: campaignId,
      timestamp: new Date().toISOString(),
    };

    // 1. Send to funnel-level webhook (GHL direct)
    if (funnel?.settings?.webhookUrl) {
      fetch(funnel.settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch(() => {});
    }

    // 2. Send to lead routing edge function (multi-client routing)
    if (funnel.workspace_id) {
      const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/route-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({
          funnelId: funnel.id,
          workspaceId: funnel.workspace_id,
          answers,
          answerOptionIds,
          payload: webhookPayload,
        }),
      }).catch(() => {});
    }
    // Route based on qualification
    if (qualified && contactStep?.qualifiedRoute !== undefined) {
      goToStep(contactStep.qualifiedRoute);
    } else {
      goNext();
    }
  };

  const handleResultsCta = (step: FunnelStep) => {
    if (!step.resultsConfig) return;
    const r = step.resultsConfig;
    const hasEngine = (r.formulas?.length ?? 0) > 0 || r.headline;

    // Track result_assigned
    const resultLabel = hasEngine ? "engine" : (qualified ? "qualified" : "disqualified");
    trackEvent(funnel.id, campaignId, "result_assigned", { step_id: step.id, result: resultLabel });
    // Meta CAPI: CompleteRegistration
    fireCapiEvent("CompleteRegistration", {}, { result: resultLabel, funnel_id: funnel.id });
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("conversion", { funnel_id: funnel.id, campaign_id: campaignId, result: resultLabel });
    }

    if (hasEngine) {
      const cta = r.ctaConfig;
      if (!cta) { goNext(); return; }
      switch (cta.action) {
        case "redirect": window.open(cta.url || "#", "_blank"); break;
        case "booking": goNext(); break;
        case "webhook":
          fetch(cta.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, formData }) }).catch(() => {});
          goNext();
          break;
        default: goNext();
      }
    } else {
      const route = qualified ? r.qualifiedRoute : r.disqualifiedRoute;
      goToStep(route);
    }
  };

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden" style={{ fontFamily: font }}>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500">Cargando...</p>
          </div>
        </div>
      ) : !funnel ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 px-6">
            <h1 className="text-2xl font-bold">Formulario no disponible</h1>
            <p className="text-gray-500 max-w-sm">Este formulario no ha sido publicado o no existe. Por favor, verifica el enlace e intenta de nuevo.</p>
          </div>
        </div>
      ) : (
        <>
      {/* Logo */}
      {funnel.settings.logoUrl && (
        <div className="flex justify-center pt-4 pb-0 shrink-0">
          <img src={funnel.settings.logoUrl} alt="Logo" className="h-8 object-contain" />
        </div>
      )}

      {/* Content - scrollable area */}
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-[900px] px-5 py-6 md:px-10 md:py-8">

          {/* Landing */}
          {currentStep.type === "intro" && (() => {
            const ic = currentStep.introConfig;
            const isMob = window.innerWidth < 768;
            const hSize = isMob ? (ic?.mobileHeadlineFontSize || 20) : (ic?.headlineFontSize || 30);
            const dSize = isMob ? (ic?.mobileDescriptionFontSize || 14) : (ic?.descriptionFontSize || 18);
            const cSize = isMob ? (ic?.mobileCtaFontSize || 14) : (ic?.ctaFontSize || 16);
            const spacing = isMob ? (ic?.mobileElementSpacing || 12) : (ic?.elementSpacing || 16);
            return (
              <div className="animate-fade-in text-center" style={{ gap: `${spacing}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1 className="font-bold leading-tight" style={{ fontSize: `${hSize}px` }}>{ic?.headline || "Título"}</h1>
                {ic?.showVideo && ic?.videoUrl && (
                  <div className="rounded-xl overflow-hidden aspect-video w-full md:max-w-[640px]">
                    <VideoEmbed url={ic.videoUrl} />
                  </div>
                )}
                <p className="text-gray-500 leading-relaxed mx-auto md:max-w-[600px]" style={{ fontSize: `${dSize}px` }}>{ic?.description || "Descripción"}</p>
                <button
                  onClick={goNext}
                  className="px-8 py-4 rounded-xl font-semibold cursor-pointer hover:opacity-90 transition-opacity w-full md:w-auto"
                  style={{ background: primary, color: "#fff", fontSize: `${cSize}px` }}
                >
                  {ic?.cta || "Empezar"}
                </button>
              </div>
            );
          })()}

          {/* Question */}
          {currentStep.type === "question" && currentStep.question && (
            <div className="animate-fade-in">
              <h2 className="text-base md:text-2xl font-bold mb-6">{currentStep.question.text}</h2>
              <div className={currentStep.question.layout === "opts-2" ? "space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0" : "space-y-3"}>
                {currentStep.question.options.map((opt) => {
                  const selected = answers[currentStep.id] === opt.value;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionSelect(currentStep, opt.value)}
                      className="flex items-center gap-3 border-2 rounded-xl py-3 px-4 md:py-4 md:px-5 font-medium text-left w-full text-sm md:text-base cursor-pointer transition-all hover:shadow-md"
                      style={{
                        borderColor: selected ? primary : "#e5e7eb",
                        background: selected ? `${primary}10` : "transparent",
                      }}
                    >
                      <span className="text-lg md:text-xl">{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact */}
          {currentStep.type === "contact" && (
            <div className="animate-fade-in">
              <h2 className="text-base md:text-2xl font-bold mb-6">Tus datos</h2>
              <div className="space-y-5">
                {(currentStep.contactFields || []).map((f) => (
                  <div key={f.id}>
                    <label className="font-semibold text-xs md:text-sm block mb-2">{f.label}{f.required && " *"}</label>
                    <input
                      type={f.fieldType}
                      name={f.fieldType === "email" ? "email" : f.fieldType === "tel" ? "tel" : f.label === "Nombre" ? "given-name" : f.label === "Apellidos" ? "family-name" : f.label.toLowerCase().includes("empresa") || f.label.toLowerCase().includes("company") ? "organization" : undefined}
                      autoComplete={f.fieldType === "email" ? "email" : f.fieldType === "tel" ? "tel" : f.label === "Nombre" ? "given-name" : f.label === "Apellidos" ? "family-name" : f.label.toLowerCase().includes("empresa") || f.label.toLowerCase().includes("company") ? "organization" : "on"}
                      placeholder={f.placeholder}
                      value={formData[f.id] || ""}
                      onChange={(e) => handleFormChange(f.id, e.target.value)}
                      className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 text-sm md:text-base outline-none focus:border-blue-400 transition-colors"
                      required={f.required}
                    />
                  </div>
                ))}
              </div>
              {currentStep.contactConsent && (
                <label className="flex items-start gap-2 mt-6 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />
                  <span>{currentStep.contactConsent}</span>
                </label>
              )}
              <button
                onClick={handleContactSubmit}
                className="mt-6 px-8 py-4 rounded-xl font-semibold w-full text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: primary, color: "#fff" }}
              >
                {currentStep.contactCta || "Enviar"}
              </button>
            </div>
          )}

          {/* Results */}
          {currentStep.type === "results" && currentStep.resultsConfig && (
            <DynamicResultsPublic
              step={currentStep}
              primary={primary}
              answers={answers}
              qualified={qualified}
              allSteps={sortedSteps}
              onCta={() => handleResultsCta(currentStep)}
            />
          )}

          {/* Booking */}
          {currentStep.type === "booking" && (
            <div className="animate-fade-in text-center">
              <h2 className="text-base md:text-2xl font-bold mb-2">Reserva tu llamada</h2>
              <p className="text-gray-500 mb-6">Elige un horario que te convenga.</p>
              {currentStep.bookingConfig?.bookingUrl ? (
                <iframe src={currentStep.bookingConfig.bookingUrl} className="w-full h-[600px] border-0 rounded-xl" />
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-gray-400 text-sm">
                  No se ha configurado una URL de reservas
                </div>
              )}
            </div>
          )}

          {/* VSL */}
          {currentStep.type === "vsl" && (
            <div className="animate-fade-in">
              <div className="rounded-xl overflow-hidden aspect-video mb-6 md:max-w-[640px] mx-auto">
                {currentStep.vslConfig?.videoUrl ? <VideoEmbed url={currentStep.vslConfig.videoUrl} /> : (
                  <div className="bg-gray-100 w-full h-full flex items-center justify-center text-gray-400 text-sm">No se ha configurado un video</div>
                )}
              </div>
              {currentStep.vslConfig?.ctaLabel && (
                <div className="text-center">
                  <a href={currentStep.vslConfig.ctaUrl || "#"} target="_blank" rel="noopener noreferrer"
                    className="inline-block px-8 py-4 rounded-xl font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ background: primary, color: "#fff" }}>
                    {currentStep.vslConfig.ctaLabel}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Delivery */}
          {currentStep.type === "delivery" && currentStep.deliveryConfig && (
            <div className="animate-fade-in text-center">
              <div className="border-2 border-gray-200 rounded-2xl p-10 bg-gray-50">
                <h2 className="text-base md:text-2xl font-bold mb-3">{currentStep.deliveryConfig.resourceTitle}</h2>
                <p className="text-gray-500 text-sm md:text-base mb-6">{currentStep.deliveryConfig.resourceDescription}</p>
                <a href={currentStep.deliveryConfig.downloadUrl || "#"} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-8 py-4 rounded-xl font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: primary, color: "#fff" }}>
                  {currentStep.deliveryConfig.downloadButtonLabel}
                </a>
              </div>
            </div>
          )}

          {/* Thank You */}
          {currentStep.type === "thankyou" && currentStep.thankYouConfig && (
            <div className="animate-fade-in">
              {currentStep.thankYouConfig.showEmoji !== false && (
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>🎉</div>
              )}
              <h1 className="text-xl md:text-3xl font-bold mb-3">{currentStep.thankYouConfig.headline}</h1>
              <p className="text-gray-500 text-sm md:text-lg mb-8">{currentStep.thankYouConfig.subtitle}</p>
              {currentStep.thankYouConfig.videoUrl && (
                <div className="rounded-xl overflow-hidden aspect-video mb-6"><VideoEmbed url={currentStep.thankYouConfig.videoUrl} /></div>
              )}
              {(!currentStep.thankYouConfig.mode || currentStep.thankYouConfig.mode === "steps") && currentStep.thankYouConfig.nextSteps.map((ns) => (
                <div key={ns.number} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${primary}15`, color: primary }}>{ns.number}</div>
                  <div>
                    <div className="font-semibold text-sm md:text-base">{ns.title}</div>
                    <div className="text-gray-500 text-xs md:text-sm">{ns.description}</div>
                  </div>
                </div>
              ))}
              {currentStep.thankYouConfig.mode === "button" && currentStep.thankYouConfig.buttonLabel && (
                <div className="mt-4">
                  <a
                    href={currentStep.thankYouConfig.buttonUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-4 rounded-xl font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity w-full md:w-auto text-center"
                    style={{ background: primary, color: "#fff" }}
                  >
                    {currentStep.thankYouConfig.buttonLabel}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step counter + progress bar at bottom — only for questions */}
      {isQuestion && totalQuestions > 0 && (
        <div className="w-full max-w-[900px] mx-auto px-5 md:px-10 py-4 shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>Pregunta {currentQuestionIndex + 1} de {totalQuestions}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full w-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: primary }} />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

function DynamicResultsPublic({ step, primary, answers, qualified, allSteps, onCta }: {
  step: FunnelStep;
  primary: string;
  answers: Record<string, string>;
  qualified: boolean;
  allSteps: FunnelStep[];
  onCta: () => void;
}) {
  const r = step.resultsConfig!;
  const hasEngine = (r.formulas?.length ?? 0) > 0 || r.headline;

  if (!hasEngine) {
    return (
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>
          {qualified ? "✅" : "ℹ️"}
        </div>
        <h1 className="text-xl md:text-3xl font-bold mb-3">
          {qualified ? r.qualifiedHeadline : r.disqualifiedHeadline}
        </h1>
        <p className="text-gray-500 text-sm md:text-lg mb-6">
          {qualified ? r.qualifiedSubheadline : r.disqualifiedSubheadline}
        </p>
        <button onClick={onCta} className="px-8 py-4 rounded-xl font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity w-full md:w-auto" style={{ background: primary, color: "#fff" }}>
          {qualified ? r.qualifiedCta : r.disqualifiedCta}
        </button>
      </div>
    );
  }

  const ctx = computeResults(r.formulas || [], answers, allSteps);
  const headline = r.headline || "Resultados";
  const metricCards = r.metricCards || [];
  const cta = r.ctaConfig || { action: "next_step", label: "Continuar", url: "" };

  return (
    <div className="animate-fade-in">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-5" style={{ background: `${primary}15` }}>📊</div>
      <h1 className="text-xl md:text-3xl font-bold mb-4">
        {interpolate(headline, ctx)}
      </h1>

      {metricCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {metricCards.map((card) => (
            <div key={card.id} className="border-2 border-gray-100 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{card.label}</div>
              <div className="text-xl md:text-2xl font-bold" style={{ color: primary }}>
                {card.valueSource && ctx[card.valueSource] !== undefined ? formatNumber(ctx[card.valueSource]) : "—"}{card.suffix}
              </div>
              {card.description && <div className="text-xs text-gray-400 mt-1">{card.description}</div>}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onCta}
        className="px-8 py-4 rounded-xl font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity w-full md:w-auto mt-4"
        style={{ background: primary, color: "#fff" }}
      >
        {cta.label || "Continuar"}
      </button>
    </div>
  );
}

export default PublicFunnel;

'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel, FunnelStep, FunnelType } from "@/types/funnel";
import type { Language } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { resolveContactStepCopy } from "@/lib/contactStepCopy";
import { FunnelContactStepPanel } from "@/components/funnel/FunnelContactStepPanel";
import { computeResults } from "@/lib/resultsEngine";
import { FunnelResultsStep } from "@/components/funnel/FunnelResultsStep";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  trackEvent, saveLead, injectMetaPixel, injectGoogleTag,
  fireExternalEvent, fireMetaCapi, getOrCreateFunnelSessionId,
  getOrCreateFirstTouchForSession,
  syncLeadflowPreviewFromUrlSearch,
} from "@/lib/tracking";
import { funnelPublicFooterInnerClass } from "@/components/funnel/FunnelIntroScrollShell";
import { FunnelBrandingFooter } from "@/components/funnel/FunnelBrandingFooter";
import { FunnelGoogleFont } from "@/components/funnel/FunnelGoogleFont";
import {
  introHeroMetrics,
  LandingIntroHeroColumn,
  landingIntroCtaButtonClasses,
  landingIntroCtaButtonStyle,
} from "@/components/funnel/LandingIntroHeroColumn";
import { LandingCanvasIntroLayout } from "@/components/funnel/LandingCanvasIntroLayout";
import { LandingIntroBodyBlocks } from "@/components/funnel/LandingIntroBodyBlocks";
import { funnelContentFontFamily } from "@/lib/funnelTypography";

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
  /** UTMs + fbclid + referrer + attribution_source/medium (first-touch por funnel+sesión). */
  const trackingPayloadRef = useRef<Record<string, string>>({});
  const trackedPageView = useRef(false);
  const sessionIdRef = useRef<string>("");
  const qualificationTrackedRef = useRef(false);
  const contactViewTrackedRef = useRef(false);
  const searchParams = useSearchParams();
  const cSlug = searchParams.get("c");
  const [campaignGate, setCampaignGate] = useState<"pending" | "ok" | "fail">(() =>
    cSlug ? "pending" : "ok",
  );
  const isMobileViewport = useIsMobile();

  useLayoutEffect(() => {
    const q = searchParams.toString();
    syncLeadflowPreviewFromUrlSearch(q ? `?${q}` : "");
  }, [searchParams]);

  // First-touch + session id por funnel (URLs públicas no cambian)
  useEffect(() => {
    if (!funnelId) return;
    sessionIdRef.current = getOrCreateFunnelSessionId();
    trackingPayloadRef.current = getOrCreateFirstTouchForSession(funnelId, sessionIdRef.current);
    contactViewTrackedRef.current = false;
  }, [funnelId]);

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
          // Check if funnel is published (saved_at exists and is different from updated_at)
          const isPublished = data.saved_at && data.saved_at !== data.updated_at;
          if (!isPublished) {
            setLoading(false);
            return;
          }
          const steps = (data.steps as any) || [];
          const settings = data.settings as any;
          const sorted = [...steps].sort((a: FunnelStep, b: FunnelStep) => a.order - b.order);
          const forceNoLanding =
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("landing") === "0";
          const skipIntro = forceNoLanding || settings?.useLanding === false;
          if (skipIntro) {
            const idx = sorted.findIndex((s) => s.type !== "intro");
            setCurrentStepIndex(idx >= 0 ? idx : 0);
          } else {
            setCurrentStepIndex(0);
          }
          setFunnel({
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            slug: data.slug,
            type: data.type as FunnelType,
            settings: settings,
            steps,
            created_at: data.created_at,
            updated_at: data.updated_at,
            saved_at: data.saved_at || data.updated_at,
          });
        }
        setLoading(false);
      });
  }, [funnelId]);

  // Load campaign from ?c= (solo variantes publicadas)
  useEffect(() => {
    if (!funnelId) return;
    if (!cSlug) {
      setCampaignGate("ok");
      setCampaignId(null);
      setCampaignSettings({});
      return;
    }
    setCampaignGate("pending");
    let cancelled = false;
    supabase
      .from("campaigns")
      .select("*")
      .eq("funnel_id", funnelId)
      .eq("slug", cSlug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.published_at) {
          setCampaignGate("fail");
          setCampaignId(null);
          setCampaignSettings({});
          return;
        }
        const updatedAfterPublish =
          new Date(data.updated_at).getTime() > new Date(data.published_at).getTime();
        if (updatedAfterPublish) {
          setCampaignGate("fail");
          setCampaignId(null);
          setCampaignSettings({});
          return;
        }
        setCampaignGate("ok");
        setCampaignId(data.id);
        const s = (data.settings || {}) as CampaignSettings;
        setCampaignSettings(s);
        if (s.trackingEnabled && s.googleTagId) injectGoogleTag(s.googleTagId);
        const campaignSteps = (data.steps as any[]) || [];
        if (campaignSteps.length > 0) {
          setFunnel((prev) => (prev ? { ...prev, steps: campaignSteps } : prev));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [funnelId, cSlug]);

  // Inject funnel-level Meta Pixel automáticamente al cargar el funnel.
  // (El flujo de consentimiento de cookies se reactivará más adelante.)
  useEffect(() => {
    if (!funnel) return;
    const pid = funnel.settings.metaPixelId;
    if (pid) injectMetaPixel(pid);
  }, [funnel]);

  // Helper to fire Meta CAPI for this funnel
  const fireCapiEvent = useCallback(
    (eventName: string, userData: Record<string, unknown> = {}, customData: Record<string, unknown> = {}) => {
      if (!funnel) return;
      const { metaPixelId } = funnel.settings;
      if (!metaPixelId) return;
      const sid = sessionIdRef.current || getOrCreateFunnelSessionId();
      const fbclid = trackingPayloadRef.current?.fbclid;
      fireMetaCapi(funnel.id, eventName, window.location.href, userData, customData, {
        sessionId: sid,
        fbclid,
      });
    },
    [funnel]
  );

  // Track page_view once (esperar variante ?c= si aplica)
  useEffect(() => {
    if (!funnel || trackedPageView.current) return;
    if (cSlug && campaignGate !== "ok") return;
    trackedPageView.current = true;
    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    const payload = trackingPayloadRef.current;
    const params = { funnel_id: funnelId, campaign_id: campaignId, session_id: sessionId, ...payload };
    trackEvent(funnel.id, campaignId, "session_started", { session_id: sessionId, ...payload });
    trackEvent(funnel.id, campaignId, "page_view", { session_id: sessionId, ...payload });
    // Pixel + CAPI: PageView
    fireCapiEvent("PageView");
    // Legacy campaign-level tracking
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("page_view", params);
    }
  }, [funnel, funnelId, campaignId, campaignSettings, fireCapiEvent, cSlug, campaignGate]);

  useEffect(() => {
    if (!funnel || qualificationTrackedRef.current) return;

    const answeredQuestionCount = Object.keys(answers).length;
    const totalQuestionCount = funnel.steps.filter((s) => s.type === "question").length;
    if (totalQuestionCount === 0 || answeredQuestionCount < totalQuestionCount) return;

    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    trackEvent(funnel.id, campaignId, "qualification_evaluated", {
      session_id: sessionId,
      qualified,
      evaluated_questions: totalQuestionCount,
      ...trackingPayloadRef.current,
    });
    qualificationTrackedRef.current = true;
  }, [answers, qualified, funnel, campaignId]);

  const stepsSignature = useMemo(
    () => (funnel?.steps ? JSON.stringify(funnel.steps.map((s) => s.id)) : ""),
    [funnel?.steps],
  );

  // Track contact_view when user reaches the contact form step
  useEffect(() => {
    if (!funnel) return;
    const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
    const current = sorted[currentStepIndex];
    if (current?.type !== "contact") return;
    if (contactViewTrackedRef.current) return;
    contactViewTrackedRef.current = true;

    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    trackEvent(funnel.id, campaignId, "contact_view", {
      session_id: sessionId,
      step_id: current.id,
      step_type: "contact",
      ...trackingPayloadRef.current,
    });
  }, [funnel, currentStepIndex, campaignId]);

  /** Saltar la landing: ajuste global `useLanding === false`, o URL `?landing=0` (p. ej. enlace de Publicar «Solo funnel»). */
  const hideIntro = useMemo(() => {
    if (!funnel) return false;
    const forceNoLanding = searchParams.get("landing") === "0";
    return forceNoLanding || funnel.settings.useLanding === false;
  }, [funnel, searchParams]);

  const stepResetKey = `${stepsSignature}|${String(funnel?.settings?.useLanding)}|${searchParams.get("landing") ?? ""}`;
  const prevStepResetKey = useRef<string>("");

  /** Antes del pintado: evita un frame con la landing cuando `hideIntro` (quiz directo). */
  useLayoutEffect(() => {
    if (!funnel || !stepsSignature) return;
    if (prevStepResetKey.current === stepResetKey) return;
    prevStepResetKey.current = stepResetKey;
    const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
    if (hideIntro) {
      const idx = sorted.findIndex((s) => s.type !== "intro");
      setCurrentStepIndex(idx >= 0 ? idx : 0);
    } else {
      setCurrentStepIndex(0);
    }
  }, [funnel, stepsSignature, stepResetKey, hideIntro]);

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
          next = idx >= 0 ? idx : Math.min(next + 1, sorted.length - 1);
        } else {
          next = Math.min(next + 1, sorted.length - 1);
        }
      }
      if (hideIntro) {
        while (next < sorted.length && sorted[next]?.type === "intro") {
          next++;
        }
        next = Math.min(next, sorted.length - 1);
      }
      return next;
    });
  }, [funnel, qualified, hideIntro]);

  const goToStep = useCallback((order: number) => {
    if (!funnel) return;
    const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
    const target = sorted.find((s) => s.order === order);
    if (hideIntro && target?.type === "intro") {
      const fi = sorted.findIndex((s) => s.type !== "intro");
      setCurrentStepIndex(fi >= 0 ? fi : 0);
      return;
    }
    const idx = sorted.findIndex((s) => s.order === order);
    if (idx >= 0) setCurrentStepIndex(idx);
    else setCurrentStepIndex((prev) => Math.min(prev + 1, sorted.length - 1));
  }, [funnel, hideIntro]);

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

  if (cSlug && campaignGate === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (cSlug && campaignGate === "fail") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-xl font-semibold">Variante no disponible</h2>
          <p className="text-gray-500">
            Esta variante no está publicada, el enlace no es válido o tiene cambios sin publicar. Revisa la URL o vuelve a publicar en el editor.
          </p>
        </div>
      </div>
    );
  }

  const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);
  const currentStep = sortedSteps[currentStepIndex];
  const primary = funnel.settings.primaryColor || "#1877F2";
  const questionFontSizeMobilePx = funnel.settings.questionFontSizeMobile ?? 16;
  const questionFontSizeDesktopPx = funnel.settings.questionFontSizeDesktop ?? 48;
  const questionOptionsSpacingMobilePx = funnel.settings.questionOptionsSpacingMobile ?? 24;
  const questionOptionsSpacingDesktopPx = funnel.settings.questionOptionsSpacingDesktop ?? 24;
  const questionTextAlign = funnel.settings.questionTextAlign ?? "center";
  const questionTextAlignClass =
    questionTextAlign === "left" ? "text-left" : questionTextAlign === "right" ? "text-right" : "text-center";
  const questionSteps = sortedSteps.filter((s) => s.type === "question");
  const totalQuestions = questionSteps.length;
  const currentQuestionIndex = questionSteps.findIndex((s) => s.id === currentStep?.id);
  const isQuestion = currentStep?.type === "question";
  const lang = (funnel.settings.language || "es") as Language;
  const isContactStep = currentStep?.type === "contact";
  const contactResolved =
    isContactStep && currentStep ? resolveContactStepCopy(currentStep, lang) : null;
  const showContactStickyProgress = Boolean(contactResolved?.showProgress);

  const progress =
    isQuestion && totalQuestions > 0 && currentQuestionIndex >= 0
      ? ((currentQuestionIndex + 1) / totalQuestions) * 100
      : showContactStickyProgress && contactResolved
        ? contactResolved.progressPercent
        : isQuestion
          ? 0
          : 100;

  const handleOptionSelect = (step: FunnelStep, optionValue: string) => {
    if (!step.question) return;
    const option = step.question.options.find((o) => o.value === optionValue);
    if (!option) return;
    setAnswers((prev) => ({ ...prev, [step.id]: optionValue }));
    setTotalScore((prev) => prev + option.score);
    if (!option.qualifies) setQualified(false);
    // Track step_view
    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    trackEvent(funnel.id, campaignId, "step_view", {
      session_id: sessionId,
      step_id: step.id,
      step_type: "question",
      answer: optionValue,
      qualifies: option.qualifies,
    });
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
    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    const tp = trackingPayloadRef.current;

    const contactStep = sortedSteps.find((s) => s.type === "contact");
    const consentUiRequired =
      contactStep &&
      contactStep.showContactConsentCheckbox !== false &&
      Boolean(contactStep.contactConsent?.trim());
    if (consentUiRequired && !consentChecked) {
      alert(t((funnel!.settings.language || "es") as Language, "contact.consent.alert"));
      return;
    }

    const fields = contactStep?.contactFields || [];
    let firstName = "", lastName = "", email = "", phone = "";
    const hasLastNameField = fields.some((f) => f.label.toLowerCase().includes("apellido"));
    fields.forEach((f) => {
      const val = formData[f.id] || "";
      const lowerLabel = f.label.toLowerCase();
      if (f.fieldType === "email") { email = val; }
      else if (f.fieldType === "tel") { phone = val; }
      else if (lowerLabel.includes("apellido")) { lastName = val; }
      else if (f.fieldType === "text") { firstName = val; }
    });
    // Back-compat: funnels antiguos con un solo campo de nombre
    if (!hasLastNameField) {
      const virtualLast = (formData.__virtual_lastName || "").trim();
      if (virtualLast) lastName = virtualLast;
      const full = firstName.trim();
      if (!lastName && full.includes(" ")) {
        const parts = full.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          firstName = parts.slice(0, -1).join(" ");
          lastName = parts.slice(-1).join(" ");
        }
      }
    }

    trackEvent(funnel.id, campaignId, "form_submit", { session_id: sessionId, ...tp });
    fireCapiEvent(
      "Lead",
      {
        ...(email.trim() ? { em: email.trim() } : {}),
        ...(phone.trim() ? { ph: phone.trim() } : {}),
        ...(firstName.trim() ? { fn: firstName.trim() } : {}),
        ...(lastName.trim() ? { ln: lastName.trim() } : {}),
      },
      { funnel_id: funnel.id, campaign_id: campaignId },
    );
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("lead", { funnel_id: funnel.id, campaign_id: campaignId });
    }

    saveLead(funnel.id, campaignId, answers, qualified ? "qualified" : "disqualified", {
      session_id: sessionId,
      formData,
      ...tp,
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
    const hasEngine =
      (r.formulas?.length ?? 0) > 0 ||
      Boolean(r.headline?.trim()) ||
      Boolean(r.headlineLead?.trim()) ||
      Boolean(r.headlineEmphasis?.trim());

    // Track result_assigned
    const resultLabel = hasEngine ? "engine" : (qualified ? "qualified" : "disqualified");
    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    trackEvent(funnel.id, campaignId, "result_assigned", { session_id: sessionId, step_id: step.id, result: resultLabel });
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
    <div
      className="min-h-[100dvh] bg-white flex flex-col"
      style={{
        fontFamily: funnel ? funnelContentFontFamily(funnel.settings.fontFamily) : undefined,
        ["--question-font-size" as any]: `${questionFontSizeMobilePx}px`,
        ["--question-font-size-md" as any]: `${questionFontSizeDesktopPx}px`,
        ["--question-options-spacing" as any]: `${questionOptionsSpacingMobilePx}px`,
        ["--question-options-spacing-md" as any]: `${questionOptionsSpacingDesktopPx}px`,
      }}
    >
      {funnel ? <FunnelGoogleFont fontFamily={funnel.settings.fontFamily} /> : null}
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
      {/* Logo (fuera del scroll salvo landing: ahí va en la cabecera del canvas) */}
      {funnel.settings.logoUrl &&
        currentStep?.type !== "intro" &&
        !(
          currentStep?.type === "results" &&
          currentStep.resultsConfig?.resultsPageLayout === "conversion"
        ) && (
          <div className="flex justify-center pt-4 pb-0 shrink-0">
            <img src={funnel.settings.logoUrl} alt="Logo" className="h-8 object-contain" />
          </div>
        )}

      {/* Scroll natural del documento: footer siempre al final */}
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col">
          <div
            className={cn(
              // Extra bottom padding so content isn't covered by sticky footer/progress
              "flex w-full max-w-[760px] flex-col mx-auto flex-1 pb-24",
              currentStep.type === "intro" ? "px-0 pt-0 pb-0" : "px-5 py-6 md:px-10 md:py-8",
            )}
          >

          {/* Landing */}
          {currentStep.type === "intro" && (() => {
            const ic = currentStep.introConfig;
            const isMob = typeof window !== "undefined" && window.innerWidth < 768;
            const { cSize } = introHeroMetrics(ic, isMob);
            const logo = funnel.settings.logoUrl?.trim() ? funnel.settings.logoUrl : undefined;
            return (
              <LandingCanvasIntroLayout
                logoUrl={logo}
                showEditorChrome={false}
                showLandingDivider={false}
                fontFamily={funnelContentFontFamily(funnel.settings.fontFamily)}
                renderBrandingFooterInside={false}
              >
                <LandingIntroHeroColumn
                  ic={ic}
                  primary={primary}
                  isMobile={isMob}
                  renderHeadline={(n) => n}
                  renderDescription={(n) => n}
                  renderVideo={(n) => n}
                  ctaSlot={
                    <button
                      type="button"
                      onClick={goNext}
                      className={landingIntroCtaButtonClasses(isMob)}
                      style={landingIntroCtaButtonStyle(primary, cSize)}
                    >
                      {ic?.cta || "Empezar"}
                    </button>
                  }
                />
                <LandingIntroBodyBlocks blocks={ic?.landingBodyBlocks} primary={primary} isMobile={isMob} />
              </LandingCanvasIntroLayout>
            );
          })()}

          {/* Question */}
          {currentStep.type === "question" && currentStep.question && (
            <div className="animate-fade-in">
              {totalQuestions > 0 && currentQuestionIndex >= 0 && (
                <div
                  className={cn(
                    "text-xs font-semibold mb-2 md:text-sm md:mb-3",
                    questionTextAlignClass,
                  )}
                  style={{ color: primary }}
                >
                  Pregunta {currentQuestionIndex + 1} de {totalQuestions}
                </div>
              )}
              <h2
                className={cn(
                  "font-extrabold tracking-tight",
                  questionTextAlignClass,
                  "text-[length:var(--question-font-size)] md:text-[length:var(--question-font-size-md)]",
                  "mb-[var(--question-options-spacing)] md:mb-[var(--question-options-spacing-md)] md:leading-[1.08]",
                )}
              >
                {currentStep.question.text}
              </h2>
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
          {currentStep.type === "contact" && contactResolved && (
            <FunnelContactStepPanel
              copy={contactResolved}
              isMobile={isMobileViewport}
              fields={
                <>
                  {(() => {
                    const rawFields = currentStep.contactFields || [];
                    const hasLastName = rawFields.some((f) => f.label.toLowerCase().includes("apellido"));
                    const firstText = rawFields.find((f) => f.fieldType === "text");
                    const augmented =
                      !hasLastName && firstText
                        ? [
                            ...rawFields,
                            {
                              id: "__virtual_lastName",
                              step_id: currentStep.id,
                              fieldType: "text" as const,
                              label: "Apellidos",
                              placeholder: "Tus apellidos",
                              required: true,
                            },
                          ]
                        : rawFields;
                    const order = ["Nombre", "Apellidos", "Email", "Teléfono"];
                    const sorted = [...augmented].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
                    return sorted.map((f) => (
                      <div key={f.id}>
                        <label className="font-semibold text-xs md:sr-only block mb-2">
                          {f.label}
                          {f.required && " *"}
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {f.fieldType === "email" ? "✉️" : f.fieldType === "tel" ? "📞" : "👤"}
                          </span>
                          <input
                            type={f.fieldType}
                            name={
                              f.fieldType === "email"
                                ? "email"
                                : f.fieldType === "tel"
                                  ? "tel"
                                  : f.label === "Nombre"
                                    ? "given-name"
                                    : f.label === "Apellidos"
                                      ? "family-name"
                                      : f.label.toLowerCase().includes("empresa") || f.label.toLowerCase().includes("company")
                                        ? "organization"
                                        : undefined
                            }
                            autoComplete={
                              f.fieldType === "email"
                                ? "email"
                                : f.fieldType === "tel"
                                  ? "tel"
                                  : f.label === "Nombre"
                                    ? "given-name"
                                    : f.label === "Apellidos"
                                      ? "family-name"
                                      : f.label.toLowerCase().includes("empresa") || f.label.toLowerCase().includes("company")
                                        ? "organization"
                                        : "on"
                            }
                            placeholder={f.placeholder}
                            value={formData[f.id] || ""}
                            onChange={(e) => handleFormChange(f.id, e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm md:text-base outline-none focus:border-blue-400 transition-colors"
                            required={f.required}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </>
              }
              consentSlot={
                currentStep.showContactConsentCheckbox !== false && currentStep.contactConsent?.trim() ? (
                  <label className="mt-6 flex w-full items-start gap-2 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-left leading-snug">{currentStep.contactConsent}</span>
                  </label>
                ) : null
              }
              ctaSlot={
                <button
                  type="button"
                  onClick={handleContactSubmit}
                  className="mt-6 w-full rounded-xl px-8 py-4 font-semibold text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: primary, color: "#fff" }}
                >
                  {currentStep.contactCta || t(lang, "submit")}
                </button>
              }
            />
          )}

          {/* Results */}
          {currentStep.type === "results" && currentStep.resultsConfig && (
            <FunnelResultsStep
              resultsConfig={currentStep.resultsConfig}
              ctx={computeResults(currentStep.resultsConfig.formulas || [], answers, sortedSteps)}
              primary={primary}
              qualified={qualified}
              isMobile={isMobileViewport}
              logoUrl={funnel.settings.logoUrl}
              mode="public"
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
        {/* Sticky bottom area: progress + footer (like competitor) */}
        <div className="sticky bottom-0 z-10 shrink-0 w-full bg-white mt-auto">
          <div className={funnelPublicFooterInnerClass}>
            <FunnelBrandingFooter brandLogoUrl={funnel.settings.logoUrl} />
          </div>
          {((isQuestion && totalQuestions > 0) || showContactStickyProgress) && (
            <div className="w-full">
              <div className="h-1 bg-gray-100 w-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: primary }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PublicFunnel;

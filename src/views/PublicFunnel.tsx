'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel, FunnelStep, FunnelType } from "@/types/funnel";
import {
  applyLandingDeploymentToFunnel,
  getDeploymentSourceCampaignId,
  isPublishBranchesV1Enabled,
} from "@/lib/publish/publishResolve";
import { FUNNEL_BRANCH_SLUG_DIRECT } from "@/lib/publish/publishBranchConstants";
import type { Language } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { resolveContactStepCopy } from "@/lib/contactStepCopy";
import { splitFullNameToFirstLast } from "@/lib/splitFullName";
import { FunnelContactStepPanel } from "@/components/funnel/FunnelContactStepPanel";
import { computeResults } from "@/lib/resultsEngine";
import { FunnelResultsStep } from "@/components/funnel/FunnelResultsStep";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  trackEvent, saveLead, injectMetaPixel, injectGoogleTag,
  fireExternalEvent, fireMetaCapi, getOrCreateFunnelSessionId,
  getOrCreateFirstTouchForSession,
  syncLeadflowPreviewFromUrlSearch,
  isLeadflowPreviewMode,
  isLfPreviewRequestActive,
  trySyncFunnelVisitContextSession,
  getFunnelVisitContext,
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
import { PluginHost } from "@/components/plugins/PluginHost";
import { stepTypeToPluginPlacement } from "@/lib/plugins/stepPlacement";
import type { FunnelPluginRuntimeContext } from "@/components/plugins/pluginRuntimeTypes";

interface CampaignSettings {
  metaPixelId?: string;
  googleTagId?: string;
  trackingEnabled?: boolean;
}

/** PostgREST suele devolver JSONB como objeto; por si acaso llega string serializado. */
function parseJsonbField(raw: unknown): unknown {
  if (raw == null) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Sin landing (`?landing=0` o `useLanding === false`): ir a la primera pregunta; si no hay, al primer paso que no sea intro. */
function indexAfterSkippingLanding(sorted: FunnelStep[]): number {
  const qi = sorted.findIndex((s) => s.type === "question");
  if (qi >= 0) return qi;
  const ni = sorted.findIndex((s) => s.type !== "intro");
  return ni >= 0 ? ni : 0;
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
  const router = useRouter();
  const funnelId = params?.funnelId as string | undefined;
  const branchSlugParam = (params?.branchSlug as string | undefined)?.trim() || undefined;
  const [publishedFunnelFromDb, setPublishedFunnelFromDb] = useState<Funnel | null>(null);
  const [branchDeployment, setBranchDeployment] = useState<{
    id: string;
    version: number;
    branch_id: string;
    branch_slug: string;
    landing_snapshot: unknown;
    settings_patch: unknown;
  } | null>(null);
  const [campaignStepsReplacement, setCampaignStepsReplacement] = useState<FunnelStep[] | null>(null);
  const [branchResolveDone, setBranchResolveDone] = useState(() => !isPublishBranchesV1Enabled());
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [totalScore, setTotalScore] = useState(0);
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

  const funnel = useMemo((): Funnel | null => {
    if (!publishedFunnelFromDb) return null;
    let f = publishedFunnelFromDb;
    if (isPublishBranchesV1Enabled() && branchDeployment) {
      f = applyLandingDeploymentToFunnel(f, branchDeployment.landing_snapshot, branchDeployment.settings_patch);
    }
    if (campaignStepsReplacement && campaignStepsReplacement.length > 0) {
      f = { ...f, steps: campaignStepsReplacement };
    }
    return f;
  }, [publishedFunnelFromDb, branchDeployment, campaignStepsReplacement]);

  /** No pintar la superficie pública hasta resolver el deployment de rama (también con `?c=`, se fusiona antes que la variante). */
  const awaitingPublishBranchSurface = useMemo(
    () =>
      Boolean(
        publishedFunnelFromDb && isPublishBranchesV1Enabled() && !branchResolveDone,
      ),
    [publishedFunnelFromDb, branchResolveDone],
  );

  /** Hasta que la campaña de `?c=` o la ligada al deployment esté aplicada a `steps` (evita un frame con quiz base). */
  const awaitingCampaignSurface = useMemo(() => {
    if (campaignGate === "fail") return false;
    if (campaignGate === "pending") return true;
    if (!isPublishBranchesV1Enabled() || !branchResolveDone || cSlug) return false;
    const snap = branchDeployment?.landing_snapshot as Record<string, unknown> | null;
    if (
      snap &&
      Array.isArray(snap.source_variant_steps) &&
      snap.source_variant_steps.length > 0
    ) {
      return false;
    }
    const fromDep = getDeploymentSourceCampaignId(branchDeployment?.landing_snapshot);
    if (!fromDep) return false;
    return campaignId !== fromDep;
  }, [campaignGate, branchResolveDone, branchDeployment, campaignId, cSlug]);

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

  useEffect(() => {
    trackedPageView.current = false;
    setPublishedFunnelFromDb(null);
    setBranchResolveDone(!isPublishBranchesV1Enabled());
    setBranchDeployment(null);
    setCampaignStepsReplacement(null);
  }, [funnelId]);

  // Load funnel
  useEffect(() => {
    if (!funnelId) return;
    setLoading(true);
    supabase
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .single()
      .then(({ data, error }) => {
        if (!data || error) {
          setPublishedFunnelFromDb(null);
          setBranchResolveDone(true);
          setLoading(false);
          return;
        }
        // Público anónimo: RLS solo devuelve publicados. Con sesión, el propietario puede leer borradores.
        // Preview (lf_preview): permitir renderizar borrador en cliente si la fila llegó (p. ej. editor logueado).
        const isPublished = Boolean(data.saved_at && data.saved_at !== data.updated_at);
        if (!isPublished && !isLfPreviewRequestActive()) {
          setPublishedFunnelFromDb(null);
          setBranchResolveDone(true);
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
          setCurrentStepIndex(indexAfterSkippingLanding(sorted));
        } else {
          setCurrentStepIndex(0);
        }
        setPublishedFunnelFromDb({
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
        setLoading(false);
      });
  }, [funnelId, branchSlugParam]);

  // Deployment activo (rama main o /f/{id}/{branchSlug}); con `?c=` también se fusiona antes de aplicar la variante.
  useEffect(() => {
    if (!publishedFunnelFromDb || !funnelId) return;
    if (!isPublishBranchesV1Enabled()) {
      setBranchDeployment(null);
      setBranchResolveDone(true);
      return;
    }
    setBranchResolveDone(false);
    let cancelled = false;
    void (async () => {
      try {
        let q = supabase.from("funnel_branches").select("id, slug, is_main").eq("funnel_id", funnelId);
        if (branchSlugParam) {
          q = q.eq("slug", branchSlugParam);
        } else {
          q = q.eq("is_main", true);
        }
        const { data: br } = await q.maybeSingle();
        if (cancelled) return;
        if (!br?.id) {
          setBranchDeployment(null);
          setBranchResolveDone(true);
          return;
        }
        const { data: ptr } = await supabase
          .from("funnel_branch_pointers")
          .select("active_deployment_id")
          .eq("branch_id", br.id)
          .maybeSingle();
        const aid = ptr?.active_deployment_id;
        if (cancelled) return;
        if (!aid) {
          setBranchDeployment(null);
          setBranchResolveDone(true);
          return;
        }
        const { data: dep } = await supabase
          .from("funnel_deployments")
          .select("id, version, landing_snapshot, settings_patch")
          .eq("id", aid)
          .maybeSingle();
        if (cancelled) return;
        if (!dep?.id) {
          setBranchDeployment(null);
          setBranchResolveDone(true);
          return;
        }
        setBranchDeployment({
          id: dep.id,
          version: typeof dep.version === "number" ? dep.version : Number(dep.version) || 0,
          branch_id: br.id,
          branch_slug: typeof (br as { slug?: string }).slug === "string" ? (br as { slug: string }).slug : "main",
          landing_snapshot: parseJsonbField(dep.landing_snapshot),
          settings_patch: parseJsonbField(dep.settings_patch),
        });
        setBranchResolveDone(true);
      } catch {
        if (!cancelled) {
          setBranchDeployment(null);
          setBranchResolveDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publishedFunnelFromDb, funnelId, branchSlugParam]);

  /** `?landing=0` en URL corta: redirige a rama reservada `/f/{id}/direct` si existe (compat enlaces viejos). */
  useEffect(() => {
    if (!funnelId || cSlug) return;
    if (!isPublishBranchesV1Enabled()) return;
    if (branchSlugParam) return;
    if (searchParams.get("landing") !== "0") return;
    let cancelled = false;
    void supabase
      .from("funnel_branches")
      .select("id")
      .eq("funnel_id", funnelId)
      .eq("slug", FUNNEL_BRANCH_SLUG_DIRECT)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.id) return;
        const q = new URLSearchParams(searchParams.toString());
        const qs = q.toString();
        router.replace(`/f/${funnelId}/${FUNNEL_BRANCH_SLUG_DIRECT}${qs ? `?${qs}` : ""}`);
      });
    return () => {
      cancelled = true;
    };
  }, [funnelId, cSlug, branchSlugParam, searchParams, router]);

  /** Atribución por versión (sessionStorage): misma pestaña reutiliza deployment hasta que cambie el activo. */
  useEffect(() => {
    if (!funnelId || !branchDeployment) return;
    const entrySurface = searchParams.get("landing") === "0" ? "quiz_only" : "landing";
    trySyncFunnelVisitContextSession(funnelId, {
      deployment_id: branchDeployment.id,
      deployment_version: branchDeployment.version,
      branch_id: branchDeployment.branch_id,
      branch_slug: branchDeployment.branch_slug,
      entry_surface: entrySurface,
      campaign_id: campaignId,
    });
  }, [funnelId, branchDeployment, searchParams, campaignId]);

  // Load campaign: `?c=` (slug) tiene prioridad; si no, campaña UUID en `landing_snapshot.source_variant_id` del deployment activo.
  useEffect(() => {
    if (!funnelId) return;
    let cancelled = false;

    const fail = () => {
      setCampaignGate("fail");
      setCampaignId(null);
      setCampaignSettings({});
      setCampaignStepsReplacement(null);
    };

    const clear = () => {
      setCampaignGate("ok");
      setCampaignId(null);
      setCampaignSettings({});
      setCampaignStepsReplacement(null);
    };

    /**
     * @param skipPublishCheck — true cuando la campaña viene de `source_variant_id`
     *   (el push ya la validó al desplegar; no requiere `published_at`).
     */
    const applyCampaignRow = (
      data: {
        id: string;
        published_at: string | null;
        updated_at: string;
        settings: unknown;
        steps: unknown;
      },
      skipPublishCheck = false,
    ) => {
      if (!skipPublishCheck) {
        const preview = typeof window !== "undefined" && isLfPreviewRequestActive();
        if (!preview) {
          if (!data.published_at) {
            fail();
            return;
          }
          const updatedAfterPublish =
            new Date(data.updated_at).getTime() > new Date(data.published_at).getTime();
          if (updatedAfterPublish) {
            fail();
            return;
          }
        }
      }

      setCampaignGate("ok");
      setCampaignId(data.id);
      const s = (data.settings || {}) as CampaignSettings;
      setCampaignSettings(s);
      if (s.trackingEnabled && s.googleTagId) injectGoogleTag(s.googleTagId);
      const campaignSteps = (data.steps as unknown[]) || [];
      if (campaignSteps.length > 0) {
        setCampaignStepsReplacement(campaignSteps as FunnelStep[]);
      } else {
        setCampaignStepsReplacement(null);
      }
    };

    if (cSlug) {
      setCampaignGate("pending");
      void supabase
        .from("campaigns")
        .select("*")
        .eq("funnel_id", funnelId)
        .eq("slug", cSlug)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error || !data) {
            fail();
            return;
          }
          applyCampaignRow(data);
        });
      return () => {
        cancelled = true;
      };
    }

    if (!branchDeployment) {
      clear();
      return () => {
        cancelled = true;
      };
    }

    const snap = branchDeployment.landing_snapshot as Record<string, unknown> | null;
    const hasEmbeddedSteps =
      snap &&
      Array.isArray(snap.source_variant_steps) &&
      snap.source_variant_steps.length > 0;

    if (hasEmbeddedSteps) {
      const sourceCampaignId = getDeploymentSourceCampaignId(snap);
      setCampaignGate("ok");
      setCampaignId(sourceCampaignId);
      setCampaignSettings({});
      setCampaignStepsReplacement(null);
      return () => { cancelled = true; };
    }

    const sourceCampaignId = getDeploymentSourceCampaignId(branchDeployment.landing_snapshot);
    if (!sourceCampaignId) {
      clear();
      return () => {
        cancelled = true;
      };
    }

    setCampaignGate("pending");
    void supabase
      .from("campaigns")
      .select("*")
      .eq("funnel_id", funnelId)
      .eq("id", sourceCampaignId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          applyCampaignRow(data, true);
          return;
        }

        // Fallback servidor: evita bloqueo por RLS anónima para campañas no publicadas.
        try {
          const branchSlug = String(branchDeployment?.branch_slug || "").trim();
          if (!branchSlug) {
            clear();
            return;
          }
          const res = await fetch(
            `/api/funnels/${funnelId}/publish/branches/${encodeURIComponent(branchSlug)}/active-campaign`,
            { cache: "no-store" },
          );
          const body = (await res.json().catch(() => ({}))) as {
            campaign?: {
              id: string;
              settings: unknown;
              steps: unknown;
            } | null;
          };
          if (cancelled) return;
          if (!res.ok || !body.campaign) {
            clear();
            return;
          }
          applyCampaignRow(
            {
              id: body.campaign.id,
              published_at: null,
              updated_at: new Date().toISOString(),
              settings: body.campaign.settings,
              steps: body.campaign.steps,
            },
            true,
          );
        } catch {
          if (!cancelled) clear();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [funnelId, cSlug, branchDeployment]);

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
      const visit = !cSlug ? getFunnelVisitContext(funnel.id) : null;
      const visitCustom: Record<string, unknown> =
        visit != null
          ? {
              lf_deployment_version: String(visit.deployment_version),
              lf_branch_slug: String(visit.branch_slug).slice(0, 128),
            }
          : {};
      fireMetaCapi(
        funnel.id,
        eventName,
        window.location.href,
        userData,
        { ...visitCustom, ...customData },
        {
          sessionId: sid,
          fbclid,
        },
      );
    },
    [funnel, cSlug],
  );

  // Track page_view once (esperar variante `?c=` o campaña ligada al deployment; esperar resolución de rama si Publish v1)
  useEffect(() => {
    if (!funnel || trackedPageView.current) return;
    if (campaignGate !== "ok") return;
    if (isPublishBranchesV1Enabled() && !branchResolveDone) return;
    trackedPageView.current = true;
    const sessionId = sessionIdRef.current || getOrCreateFunnelSessionId();
    const payload = trackingPayloadRef.current;
    const visit = !cSlug && funnel.id ? getFunnelVisitContext(funnel.id) : null;
    const visitParams: Record<string, string> =
      visit != null
        ? {
            lf_deployment_version: String(visit.deployment_version),
            lf_branch_slug: visit.branch_slug,
            lf_deployment_id: visit.deployment_id,
          }
        : {};
    const params = {
      funnel_id: funnelId,
      campaign_id: campaignId,
      session_id: sessionId,
      ...payload,
      ...visitParams,
    };
    trackEvent(funnel.id, campaignId, "session_started", { session_id: sessionId, ...payload });
    trackEvent(funnel.id, campaignId, "page_view", { session_id: sessionId, ...payload });
    // Pixel + CAPI: PageView
    fireCapiEvent("PageView");
    // Legacy campaign-level tracking
    if (campaignSettings.trackingEnabled) {
      fireExternalEvent("page_view", params);
    }
  }, [
    funnel,
    funnelId,
    campaignId,
    campaignSettings,
    fireCapiEvent,
    cSlug,
    campaignGate,
    branchResolveDone,
    branchDeployment?.id,
  ]);

  useEffect(() => {
    if (!funnel || qualificationTrackedRef.current) return;
    if (isPublishBranchesV1Enabled() && !branchResolveDone) return;

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
  }, [answers, qualified, funnel, campaignId, cSlug, branchResolveDone]);

  const stepsSignature = useMemo(
    () => (funnel?.steps ? JSON.stringify(funnel.steps.map((s) => s.id)) : ""),
    [funnel?.steps],
  );

  // Track contact_view when user reaches the contact form step
  useEffect(() => {
    if (!funnel) return;
    if (isPublishBranchesV1Enabled() && !branchResolveDone) return;
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
  }, [funnel, currentStepIndex, campaignId, cSlug, branchResolveDone]);

  /** Saltar la landing: `?landing=0` o `useLanding === false` (p. ej. variante sin landing). */
  const hideIntro = useMemo(() => {
    if (!funnel) return false;
    const forceNoLanding = searchParams.get("landing") === "0";
    return forceNoLanding || funnel.settings.useLanding === false;
  }, [funnel, searchParams]);

  const stepResetKey = `${stepsSignature}|${String(funnel?.settings?.useLanding)}|${searchParams.get("landing") ?? ""}|slug:${branchSlugParam ?? ""}|dep:${branchDeployment?.id ?? "na"}|v:${branchDeployment?.version ?? ""}`;
  const prevStepResetKey = useRef<string>("");

  /** Antes del pintado: evita un frame con la landing cuando `hideIntro` (quiz directo). */
  useLayoutEffect(() => {
    if (!funnel || !stepsSignature) return;
    if (prevStepResetKey.current === stepResetKey) return;
    prevStepResetKey.current = stepResetKey;
    const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
    if (hideIntro) {
      setCurrentStepIndex(indexAfterSkippingLanding(sorted));
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
      setCurrentStepIndex(indexAfterSkippingLanding(sorted));
      return;
    }
    const idx = sorted.findIndex((s) => s.order === order);
    if (idx >= 0) setCurrentStepIndex(idx);
    else setCurrentStepIndex((prev) => Math.min(prev + 1, sorted.length - 1));
  }, [funnel, hideIntro]);

  const sortedStepsAll = useMemo((): FunnelStep[] => {
    if (!funnel) return [];
    return [...funnel.steps].sort((a, b) => a.order - b.order);
  }, [funnel]);

  const handlePluginExitRestore = useCallback(
    (snap: { sortedStepIndex: number; answers: Record<string, string>; qualified: boolean }) => {
      if (!funnel) return;
      const sorted = [...funnel.steps].sort((a, b) => a.order - b.order);
      const max = Math.max(0, sorted.length - 1);
      const nextI = Math.min(Math.max(0, snap.sortedStepIndex), max);
      setCurrentStepIndex(nextI);
      setAnswers(snap.answers);
      let q = true;
      let sc = 0;
      for (const s of sorted) {
        if (s.type !== "question" || !s.question) continue;
        const val = snap.answers[s.id];
        if (!val) continue;
        const opt = s.question.options.find((o) => o.value === val);
        if (opt) {
          sc += opt.score;
          if (!opt.qualifies) q = false;
        }
      }
      setQualified(q);
      setTotalScore(sc);
    },
    [funnel],
  );

  const pluginRuntimeCtx = useMemo((): FunnelPluginRuntimeContext | null => {
    if (!funnel) return null;
    const sortedSteps = sortedStepsAll;
    const currentStep = sortedSteps[currentStepIndex];
    if (!currentStep) return null;
    const questionSteps = sortedSteps.filter((s) => s.type === "question");
    const totalQuestions = questionSteps.length;
    const currentQuestionIndex = questionSteps.findIndex((s) => s.id === currentStep.id);
    const placement = stepTypeToPluginPlacement(currentStep.type);
    return {
      funnel,
      campaignId,
      sortedSteps,
      answers,
      totalScore,
      qualified,
      currentQuestionIndex: currentQuestionIndex >= 0 ? currentQuestionIndex : 0,
      totalQuestions,
      currentStep,
      placement,
      isPreview: isLeadflowPreviewMode(),
      primaryColor: funnel.settings.primaryColor || "#1877F2",
      isMobile: isMobileViewport,
    };
  }, [
    funnel,
    sortedStepsAll,
    currentStepIndex,
    campaignId,
    answers,
    totalScore,
    qualified,
    isMobileViewport,
  ]);

  if (loading || awaitingPublishBranchSurface || awaitingCampaignSurface) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!funnel) {
    const preview = isLfPreviewRequestActive();
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Funnel no encontrado</h2>
          <p className="text-gray-500">
            Este enlace puede haber expirado o no ser válido.
          </p>
          {preview ? (
            <p className="text-gray-500 text-sm mt-3 leading-relaxed">
              En modo prueba (<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">lf_preview</code>): si el funnel es un{" "}
              <strong className="font-medium text-gray-700">borrador</strong>, abre el enlace donde hayas{" "}
              <strong className="font-medium text-gray-700">iniciado sesión</strong> con la cuenta dueña. Sin sesión, la URL pública solo sirve si el
              funnel está <strong className="font-medium text-gray-700">publicado</strong>.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (campaignGate === "fail") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-xl font-semibold">Variante no disponible</h2>
          <p className="text-gray-500">
            Esta variante no está publicada, el enlace no es válido o tiene cambios sin publicar. Revisa la URL o vuelve a
            publicar en el editor.
          </p>
        </div>
      </div>
    );
  }

  const sortedSteps = sortedStepsAll;
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
  const showStickyProgressBar =
    (isQuestion && totalQuestions > 0) || showContactStickyProgress;

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

  const handleContactSubmit = async () => {
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
    let rawFirst = "", rawLast = "", email = "", phone = "";
    const hasLastNameField = fields.some((f) => f.label.toLowerCase().includes("apellido"));
    fields.forEach((f) => {
      const val = (formData[f.id] || "").trim();
      const lowerLabel = f.label.toLowerCase();
      if (f.fieldType === "email") email = val;
      else if (f.fieldType === "tel") phone = val;
      else if (lowerLabel.includes("apellido")) rawLast = val;
      else if (f.fieldType === "text" && !rawFirst) rawFirst = val;
    });

    const fullNameRaw = hasLastNameField ? [rawFirst, rawLast].filter(Boolean).join(" ").trim() : rawFirst;

    let firstName = rawFirst;
    let lastName = rawLast;
    if (hasLastNameField) {
      if (!lastName && rawFirst.includes(" ")) {
        const s = splitFullNameToFirstLast(rawFirst);
        firstName = s.firstName;
        lastName = s.lastName;
      }
    } else {
      const s = splitFullNameToFirstLast(rawFirst);
      firstName = s.firstName;
      lastName = s.lastName;
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

    const leadId = await saveLead(funnel.id, campaignId, answers, qualified ? "qualified" : "disqualified", {
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

    // Get attribution context for closed-loop tracking
    const visitCtx = getFunnelVisitContext(funnel.id);
    const firstTouch = getOrCreateFirstTouchForSession(funnel.id, sessionId);

    const webhookPayload = {
      firstName,
      lastName,
      fullName: fullNameRaw,
      first_name: firstName,
      last_name: lastName,
      full_name: fullNameRaw,
      email,
      phone,
      qualified,
      answers: namedAnswers,
      summary,
      campaign_id: campaignId,
      timestamp: new Date().toISOString(),
      // LeadFlow attribution fields for closed-loop revenue tracking
      lf_lead_id: leadId,
      lf_funnel_id: funnel.id,
      lf_funnel_name: funnel.name,
      lf_workspace_id: funnel.workspace_id,
      lf_campaign_id: campaignId,
      lf_branch_id: visitCtx?.branch_id ?? null,
      lf_branch_slug: visitCtx?.branch_slug ?? null,
      lf_deployment_id: visitCtx?.deployment_id ?? null,
      lf_deployment_version: visitCtx?.deployment_version ?? null,
      lf_session_id: sessionId,
      lf_attribution: {
        source: firstTouch.attribution_source ?? "direct",
        medium: firstTouch.attribution_medium ?? "none",
        utm_campaign: firstTouch.utm_campaign ?? null,
        utm_content: firstTouch.utm_content ?? null,
        utm_term: firstTouch.utm_term ?? null,
        fbclid: firstTouch.fbclid ?? null,
        gclid: firstTouch.gclid ?? null,
        ttclid: firstTouch.ttclid ?? null,
        landing_url: firstTouch.landing_url ?? null,
        referrer: firstTouch.referrer_host ?? null,
      },
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
      {loading || awaitingPublishBranchSurface ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto" />
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
              "flex w-full max-w-[760px] flex-col mx-auto flex-1",
              currentStep.type === "intro"
                ? "px-0 pt-0 pb-0"
                : cn(
                    "px-5 pt-6 md:px-10 md:pt-8",
                    showStickyProgressBar ? "pb-4 md:pb-5" : "pb-6 md:pb-8",
                  ),
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
                {pluginRuntimeCtx ? (
                  <div className="px-4 pt-3 md:px-6">
                    <PluginHost
                      ctx={pluginRuntimeCtx}
                      sortedStepIndex={currentStepIndex}
                      onExitRestore={handlePluginExitRestore}
                    />
                  </div>
                ) : null}
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
              {pluginRuntimeCtx ? (
                <PluginHost
                  ctx={pluginRuntimeCtx}
                  sortedStepIndex={currentStepIndex}
                  onExitRestore={handlePluginExitRestore}
                />
              ) : null}
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
            <>
            {pluginRuntimeCtx ? (
              <PluginHost
                ctx={pluginRuntimeCtx}
                sortedStepIndex={currentStepIndex}
                onExitRestore={handlePluginExitRestore}
              />
            ) : null}
            <FunnelContactStepPanel
              copy={contactResolved}
              isMobile={isMobileViewport}
              fields={
                <>
                  {(() => {
                    const rawFields = currentStep.contactFields || [];
                    const hasLastName = rawFields.some((f) => f.label.toLowerCase().includes("apellido"));
                    const order = ["Nombre completo", "Nombre", "Apellidos", "Email", "Teléfono"];
                    const sorted = [...rawFields].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
                    const firstNonApellidoTextId = sorted.find(
                      (x) => x.fieldType === "text" && !x.label.toLowerCase().includes("apellido"),
                    )?.id;
                    return sorted.map((f) => {
                      const isApellidos = f.label.toLowerCase().includes("apellido");
                      const isNombreSolo =
                        !hasLastName && f.fieldType === "text" && !isApellidos && f.id === firstNonApellidoTextId;
                      return (
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
                                  : isNombreSolo
                                    ? "name"
                                    : f.label === "Nombre" || f.label === "Nombre completo"
                                      ? "given-name"
                                      : isApellidos
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
                                  : isNombreSolo
                                    ? "name"
                                    : f.label === "Nombre" || f.label === "Nombre completo"
                                      ? "given-name"
                                      : isApellidos
                                        ? "family-name"
                                        : f.label.toLowerCase().includes("empresa") || f.label.toLowerCase().includes("company")
                                          ? "organization"
                                          : "on"
                            }
                            placeholder={f.placeholder}
                            value={formData[f.id] || ""}
                            onChange={(e) => handleFormChange(f.id, e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm md:text-base outline-none focus:border-primary transition-colors"
                            required={f.required}
                          />
                        </div>
                      </div>
                    );
                    });
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
            </>
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

          {/* Pie al final del scroll (términos + marca), no fijo */}
          <div className={funnelPublicFooterInnerClass}>
            <FunnelBrandingFooter brandLogoUrl={funnel.settings.logoUrl} />
          </div>
        </div>
        {/* Solo la barra de progreso queda pegada al borde inferior del viewport */}
        {showStickyProgressBar && (
          <div className="sticky bottom-0 z-10 shrink-0 w-full bg-white mt-auto">
            <div className="w-full">
              <div className="h-1 bg-gray-100 w-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: primary }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PublicFunnel;

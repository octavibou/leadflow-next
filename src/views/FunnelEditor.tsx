'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorProperties } from "@/components/editor/EditorProperties";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { EditorViewModeFloatingToggle } from "@/components/editor/EditorViewModeFloatingToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { DeviceMobile } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LandingEditorSkeleton } from "@/components/editor/LandingEditorSkeleton";
import { LandingTabSkeleton } from "@/components/editor/LandingTabSkeleton";
import { QuizEditorSkeleton } from "@/components/editor/QuizEditorSkeleton";
import { SendTabSkeleton } from "@/components/editor/SendTabSkeleton";
import {
  parseSendIntegrationParam,
  type SendIntegrationId,
} from "@/components/editor/sendIntegrationParam";
import {
  editorSessionKey,
  readUiSession,
  removeUiSession,
  writeUiSessionDebounced,
} from "@/lib/uiSessionState";
import type { FunnelStep, StepType } from "@/types/funnel";

export type EditorTab = "landing" | "funnel" | "webhook" | "publish";

const VALID_TABS: EditorTab[] = ["landing", "funnel", "webhook", "publish"];

function parseEditorTab(searchParams: URLSearchParams): EditorTab {
  const raw = searchParams.get("tab");
  /** `tab=tracking` antigua: Meta Pixel/CAPI vive ahora en Send. */
  const t = raw === "ab_test" ? "landing" : raw === "tracking" ? "webhook" : raw;
  if (t && VALID_TABS.includes(t as EditorTab)) return t as EditorTab;
  return "funnel";
}

/** Orden del paso del quiz leído de la URL; si falta o es inválido → primer paso del quiz. */
function parseQuizStepOrderFromUrl(searchParams: URLSearchParams, quizSteps: { order: number }[]): number {
  if (quizSteps.length === 0) return 0;
  const first = quizSteps[0].order;
  const raw = searchParams.get("step");
  if (raw == null || raw === "") return first;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || !quizSteps.some((s) => s.order === n)) return first;
  return n;
}

/** Normaliza `?tab=tracking` a Send → Meta (URL canónica). */
function useNormalizeLegacyTrackingTab(
  searchParams: ReturnType<typeof useSearchParams>,
  replaceQuery: (mutate: (q: URLSearchParams) => void) => void,
) {
  useEffect(() => {
    if (searchParams.get("tab") !== "tracking") return;
    replaceQuery((q) => {
      q.set("tab", "webhook");
      q.set("send", "meta_ads");
    });
  }, [searchParams, replaceQuery]);
}

type EditorSessionPrefs = {
  viewMode?: "desktop" | "mobile";
  quizSidebarTab?: "steps" | "design" | "plugins";
};

const GlobalSettingsSheet = dynamic(
  () => import("@/components/editor/GlobalSettingsSheet").then((m) => m.GlobalSettingsSheet),
  { ssr: false }
);
const SendTab = dynamic(
  () => import("@/components/editor/SendTab").then((m) => m.SendTab),
  { ssr: false, loading: () => <SendTabSkeleton /> }
);
const PublishTab = dynamic(
  () => import("@/components/editor/PublishTab").then((m) => m.PublishTab),
  { ssr: false }
);
const LandingTab = dynamic(
  () => import("@/components/editor/LandingTab").then((m) => m.LandingTab),
  { ssr: false, loading: () => <LandingTabSkeleton /> }
);
const FunnelEditor = () => {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fetchFunnels = useFunnelStore((s) => s.fetchFunnels);
  const funnelsLoading = useFunnelStore((s) => s.loading);
  const funnelsLoaded = useFunnelStore((s) => s.loaded);
  const funnel = useFunnelStore((s) => s.getFunnel(funnelId || ""));
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const { fetchCampaigns } = useCampaignStore();
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  /** Fuente de verdad: la URL (evita carreras con `window.location` y estado optimista). */
  const activeTab = useMemo(() => parseEditorTab(searchParams), [searchParams]);
  const sendIntegrationOpen = useMemo((): SendIntegrationId | null => {
    if (activeTab !== "webhook") return null;
    return parseSendIntegrationParam(searchParams.get("send"));
  }, [activeTab, searchParams]);
  const [quizSidebarTab, setQuizSidebarTab] = useState<"steps" | "design" | "plugins">("steps");
  /** Evita sobrescribir prefs en session antes de hidratar desde session. */
  const [editorPrefsHydrated, setEditorPrefsHydrated] = useState(false);
  const isMobile = useIsMobile();

  const replaceQuery = useCallback(
    (mutate: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(searchParams.toString());
      mutate(q);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleTabChange = useCallback(
    (tab: EditorTab) => {
      replaceQuery((q) => {
        if (tab === "funnel") {
          q.delete("tab");
          q.delete("send");
        } else if (tab === "webhook") {
          q.set("tab", "webhook");
        } else {
          q.set("tab", tab);
          q.delete("send");
        }
        if (tab !== "funnel") q.delete("step");
      });
    },
    [replaceQuery],
  );

  const handleSendIntegrationChange = useCallback(
    (id: SendIntegrationId | null) => {
      replaceQuery((q) => {
        q.set("tab", "webhook");
        if (id == null) q.delete("send");
        else q.set("send", id);
      });
    },
    [replaceQuery],
  );

  useNormalizeLegacyTrackingTab(searchParams, replaceQuery);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  useEffect(() => {
    // Ensure the funnel is loaded
    if (!funnel && funnelId) {
      fetchFunnels();
    }
  }, [funnelId, funnel, fetchFunnels]);

  useEffect(() => {
    if (activeTab === "landing" && funnelId) {
      fetchCampaigns(funnelId);
    }
  }, [activeTab, funnelId, fetchCampaigns]);

  const quizSteps = useMemo(
    () =>
      funnel
        ? [...funnel.steps].filter((s) => s.type !== "intro").sort((a, b) => a.order - b.order)
        : [],
    [funnel],
  );

  /** Una sola fuente de verdad con la URL: evita el bucle efecto URL↔estado. */
  const selectedStepOrder = useMemo(() => {
    if (activeTab !== "funnel" || quizSteps.length === 0) return 0;
    return parseQuizStepOrderFromUrl(searchParams, quizSteps);
  }, [activeTab, quizSteps, searchParams]);

  const setSelectedStepOrder = useCallback(
    (order: number) => {
      if (quizSteps.length === 0) return;
      const first = quizSteps[0].order;
      replaceQuery((q) => {
        if (order === first) q.delete("step");
        else q.set("step", String(order));
      });
    },
    [replaceQuery, quizSteps],
  );

  /** Quita `?step=` de la URL si ya no coincide con ningún paso (reordenar / borrar). */
  useEffect(() => {
    if (activeTab !== "funnel" || quizSteps.length === 0) return;
    const raw = searchParams.get("step");
    if (raw == null || raw === "") return;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && quizSteps.some((s) => s.order === n)) return;
    replaceQuery((q) => q.delete("step"));
  }, [activeTab, quizSteps, searchParams, replaceQuery]);

  useEffect(() => {
    setEditorPrefsHydrated(false);
  }, [funnelId]);

  useEffect(() => {
    if (!funnelId || !funnel) return;
    const p = readUiSession<EditorSessionPrefs>(editorSessionKey(funnelId, "prefs"));
    if (p?.viewMode === "desktop" || p?.viewMode === "mobile") setViewMode(p.viewMode);
    if (p?.quizSidebarTab === "steps" || p?.quizSidebarTab === "design" || p?.quizSidebarTab === "plugins") {
      setQuizSidebarTab(p.quizSidebarTab);
    }
    setEditorPrefsHydrated(true);
  }, [funnelId, funnel]);

  useEffect(() => {
    if (!funnelId || !editorPrefsHydrated) return;
    writeUiSessionDebounced(
      editorSessionKey(funnelId, "prefs"),
      { viewMode, quizSidebarTab },
      200,
    );
  }, [funnelId, editorPrefsHydrated, viewMode, quizSidebarTab]);

  useEffect(() => {
    if (!funnel) return;
    const dirty = !funnel.saved_at || funnel.updated_at > funnel.saved_at;
    if (!dirty) return;
    const t = window.setTimeout(() => {
      void saveFunnel(funnel.id);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [funnel?.id, funnel?.updated_at, funnel?.saved_at, saveFunnel, funnel]);

  useEffect(() => {
    if (!funnel || !funnelId) return;
    const dirty = !funnel.saved_at || funnel.updated_at > funnel.saved_at;
    if (!dirty) return;
    const t = window.setTimeout(() => {
      writeUiSessionDebounced(
        editorSessionKey(funnelId, "dirtyBackup"),
        {
          saved_at: funnel.saved_at,
          updated_at: funnel.updated_at,
          name: funnel.name,
          settings: funnel.settings,
          steps: funnel.steps,
        },
        500,
      );
    }, 800);
    return () => clearTimeout(t);
  }, [funnel, funnelId]);

  useEffect(() => {
    if (!funnelId || !funnel) return;
    const dirty = !funnel.saved_at || funnel.updated_at > funnel.saved_at;
    if (!dirty) removeUiSession(editorSessionKey(funnelId, "dirtyBackup"));
  }, [funnelId, funnel?.saved_at, funnel?.updated_at, funnel]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<FunnelStep>) => {
    if (!funnel) return;
    const newSteps = funnel.steps.map((s) => s.id === stepId ? { ...s, ...updates } : s);
    updateFunnel(funnel.id, { steps: newSteps });
  }, [funnel, updateFunnel]);

  const handleReorderSteps = useCallback((newQuizSteps: FunnelStep[]) => {
    if (!funnel) return;
    const intro = funnel.steps.find((s) => s.type === "intro");
    const merged = intro
      ? [{ ...intro, order: 0 }, ...newQuizSteps.map((s, i) => ({ ...s, order: i + 1 }))]
      : newQuizSteps.map((s, i) => ({ ...s, order: i }));
    updateFunnel(funnel.id, { steps: merged });
  }, [funnel, updateFunnel]);

  const handleAddStep = useCallback((type: StepType) => {
    if (!funnel) return;
    if (type === "intro" && funnel.steps.some((s) => s.type === "intro")) return;
    const maxOrder = Math.max(...funnel.steps.map((s) => s.order), -1);
    const newStep: FunnelStep = {
      id: crypto.randomUUID(),
      funnel_id: funnel.id,
      order: maxOrder + 1,
      type,
      ...(type === "question" && {
        question: {
          id: crypto.randomUUID(), step_id: "", text: "Nueva pregunta", layout: "opts-col" as const,
          options: [
            { id: crypto.randomUUID(), question_id: "", label: "Opción 1", emoji: "👍", value: "opcion-1", qualifies: true, score: 2 },
            { id: crypto.randomUUID(), question_id: "", label: "Opción 2", emoji: "👎", value: "opcion-2", qualifies: false, score: 0 },
          ],
        },
      }),
      ...(type === "intro" && { introConfig: { headline: "Bienvenido", description: "Responde unas preguntas.", cta: "Empezar →", showVideo: false } }),
      ...(type === "contact" && {
        contactFields: [
          { id: crypto.randomUUID(), step_id: "", fieldType: "text" as const, label: "Nombre completo", placeholder: "Ej.: María Pérez", required: true },
          { id: crypto.randomUUID(), step_id: "", fieldType: "email" as const, label: "Email", placeholder: "tu@email.com", required: true },
          { id: crypto.randomUUID(), step_id: "", fieldType: "tel" as const, label: "Teléfono", placeholder: "+34 600 000 000", required: true },
        ],
        contactCta: "Obtener mi resultado →",
        contactConsent:
          "He leído y acepto los Términos de Uso y la Política de Privacidad.",
      }),
      ...(type === "results" && { resultsConfig: { qualifiedHeadline: "¡Calificas!", qualifiedSubheadline: "Reserva una llamada abajo.", qualifiedCta: "Reservar ahora", disqualifiedHeadline: "¡Gracias!", disqualifiedSubheadline: "No es el mejor momento.", disqualifiedCta: "Saber más", qualifiedRoute: maxOrder + 2, disqualifiedRoute: maxOrder + 2 } }),
      ...(type === "booking" && { bookingConfig: { bookingUrl: "" } }),
      ...(type === "thankyou" && { thankYouConfig: { headline: "¡Gracias!", subtitle: "Nos pondremos en contacto.", nextSteps: [] } }),
      ...(type === "vsl" && { vslConfig: { videoUrl: "", ctaLabel: "Reservar llamada", ctaUrl: "" } }),
      ...(type === "delivery" && { deliveryConfig: { resourceTitle: "Recurso", resourceDescription: "Tu recurso está listo.", downloadButtonLabel: "Descargar", downloadUrl: "" } }),
    };
    updateFunnel(funnel.id, { steps: [...funnel.steps, newStep] });
    setSelectedStepOrder(newStep.order);
  }, [funnel, updateFunnel, setSelectedStepOrder]);

  const handleDeleteStep = useCallback((stepId: string) => {
    if (!funnel) return;
    const newSteps = funnel.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i }));
    updateFunnel(funnel.id, { steps: newSteps });
    const next = newSteps
      .filter((s) => s.type !== "intro")
      .sort((a, b) => a.order - b.order);
    const prevOrder = selectedStepOrder;
    let nextOrder = next[0]?.order ?? 0;
    if (next.length > 0 && next.some((s) => s.order === prevOrder)) nextOrder = prevOrder;
    setSelectedStepOrder(nextOrder);
  }, [funnel, updateFunnel, selectedStepOrder, setSelectedStepOrder]);

  /** Tras un refresh el store está vacío hasta que termina fetch; no confundir con ID inválido. */
  const editorResolvingFunnel = Boolean(
    funnelId && !funnel && (!funnelsLoaded || funnelsLoading),
  );

  if (editorResolvingFunnel) {
    if (activeTab === "funnel") {
      return <QuizEditorSkeleton />;
    }
    if (activeTab === "landing") {
      return <LandingEditorSkeleton />;
    }
    return (
      <div className="flex min-h-dvh w-full flex-1 items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-chrome text-chrome-fg">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Funnel no encontrado</h2>
          <Button variant="link" className="text-chrome-fg-muted hover:text-white" onClick={() => router.push("/dashboard")}>Volver al dashboard</Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-chrome p-6 text-chrome-fg">
        <div className="text-center">
          <DeviceMobile className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="bold" />
          <h2 className="text-xl font-semibold mb-2">Abre en escritorio para editar</h2>
          <p className="text-muted-foreground mb-4">El editor de funnels requiere una pantalla más grande.</p>
          <Button variant="link" className="text-chrome-fg-muted hover:text-white" onClick={() => router.push("/dashboard")}>Volver al dashboard</Button>
        </div>
      </div>
    );
  }

  const selectedStep =
    quizSteps.find((s) => s.order === selectedStepOrder) ?? quizSteps[0];

  const hasIntro = funnel.steps.some((s) => s.type === "intro");

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-chrome">
      <EditorTopBar
        funnel={funnel}
        onOpenSettings={() => setShowSettings(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg bg-background">
      {activeTab === "landing" && (
        <LandingTab
          funnel={funnel}
          viewMode={viewMode}
          onToggleView={() => setViewMode((v) => (v === "desktop" ? "mobile" : "desktop"))}
        />
      )}

      {activeTab === "funnel" && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <EditorSidebar
            steps={quizSteps}
            pluginSteps={funnel.steps}
            selectedIndex={selectedStepOrder}
            onSelect={setSelectedStepOrder}
            onReorder={handleReorderSteps}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
            excludeAddTypes={hasIntro ? ["intro"] : undefined}
            settings={funnel.settings}
            sidebarTab={quizSidebarTab}
            onSidebarTabChange={setQuizSidebarTab}
            onUpdateSettings={(updates) => updateFunnel(funnel.id, { settings: { ...funnel.settings, ...updates } })}
          />
          {selectedStep && (
            <>
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <EditorCanvas
                  step={selectedStep}
                  steps={funnel.steps}
                  settings={funnel.settings}
                  viewMode={viewMode}
                />
                <EditorViewModeFloatingToggle
                  viewMode={viewMode}
                  onToggleView={() => setViewMode((v) => (v === "desktop" ? "mobile" : "desktop"))}
                />
              </div>
              <EditorProperties step={selectedStep} funnel={funnel} onUpdateStep={handleUpdateStep} />
            </>
          )}
        </div>
      )}

      {activeTab === "webhook" && (
        <ScrollArea className="min-h-0 flex-1">
          <SendTab
            funnel={funnel}
            openIntegrationId={sendIntegrationOpen}
            onOpenIntegrationChange={handleSendIntegrationChange}
          />
        </ScrollArea>
      )}

      {activeTab === "publish" && (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <PublishTab funnel={funnel} />
        </div>
      )}

      <GlobalSettingsSheet funnel={funnel} open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};

export default FunnelEditor;

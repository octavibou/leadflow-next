'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import type { FunnelStep, StepType } from "@/types/funnel";

export type EditorTab = "landing" | "funnel" | "webhook" | "tracking" | "publish" | "metrics";

const VALID_TABS: EditorTab[] = ["landing", "funnel", "webhook", "tracking", "publish", "metrics"];

function parseEditorTab(searchParams: URLSearchParams): EditorTab {
  const raw = searchParams.get("tab");
  const t = raw === "ab_test" ? "landing" : raw;
  if (t && VALID_TABS.includes(t as EditorTab)) return t as EditorTab;
  return "funnel";
}

const GlobalSettingsSheet = dynamic(
  () => import("@/components/editor/GlobalSettingsSheet").then((m) => m.GlobalSettingsSheet),
  { ssr: false }
);
const WebhookTab = dynamic(
  () => import("@/components/editor/WebhookTab").then((m) => m.WebhookTab),
  { ssr: false }
);
const TrackingTab = dynamic(
  () => import("@/components/editor/TrackingTab").then((m) => m.TrackingTab),
  { ssr: false }
);
const PublishTab = dynamic(
  () => import("@/components/editor/PublishTab").then((m) => m.PublishTab),
  { ssr: false }
);
const LandingTab = dynamic(
  () => import("@/components/editor/LandingTab").then((m) => m.LandingTab),
  { ssr: false }
);
const FunnelMetricsTab = dynamic(
  () => import("@/components/editor/FunnelMetricsTab").then((m) => m.FunnelMetricsTab),
  { ssr: false }
);

const FunnelEditor = () => {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchFunnels = useFunnelStore((s) => s.fetchFunnels);
  const funnel = useFunnelStore((s) => s.getFunnel(funnelId || ""));
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const { fetchCampaigns } = useCampaignStore();
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  const [activeTab, setActiveTab] = useState<EditorTab>(() => parseEditorTab(searchParams));
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (activeTab !== "funnel" || quizSteps.length === 0) return;
    const ok = quizSteps.some((s) => s.order === selectedStepIndex);
    if (!ok) setSelectedStepIndex(quizSteps[0].order);
  }, [activeTab, quizSteps, selectedStepIndex]);

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
          { id: crypto.randomUUID(), step_id: "", fieldType: "text" as const, label: "Nombre", placeholder: "Tu nombre", required: true },
          { id: crypto.randomUUID(), step_id: "", fieldType: "email" as const, label: "Email", placeholder: "tu@email.com", required: true },
        ],
        contactCta: "Enviar", contactConsent: "Acepto los Términos de Uso.",
      }),
      ...(type === "results" && { resultsConfig: { qualifiedHeadline: "¡Calificas!", qualifiedSubheadline: "Reserva una llamada abajo.", qualifiedCta: "Reservar ahora", disqualifiedHeadline: "¡Gracias!", disqualifiedSubheadline: "No es el mejor momento.", disqualifiedCta: "Saber más", qualifiedRoute: maxOrder + 2, disqualifiedRoute: maxOrder + 2 } }),
      ...(type === "booking" && { bookingConfig: { bookingUrl: "" } }),
      ...(type === "thankyou" && { thankYouConfig: { headline: "¡Gracias!", subtitle: "Nos pondremos en contacto.", nextSteps: [] } }),
      ...(type === "vsl" && { vslConfig: { videoUrl: "", ctaLabel: "Reservar llamada", ctaUrl: "" } }),
      ...(type === "delivery" && { deliveryConfig: { resourceTitle: "Recurso", resourceDescription: "Tu recurso está listo.", downloadButtonLabel: "Descargar", downloadUrl: "" } }),
    };
    updateFunnel(funnel.id, { steps: [...funnel.steps, newStep] });
    setSelectedStepIndex(newStep.order);
  }, [funnel, updateFunnel]);

  const handleDeleteStep = useCallback((stepId: string) => {
    if (!funnel) return;
    const newSteps = funnel.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i }));
    updateFunnel(funnel.id, { steps: newSteps });
    setSelectedStepIndex((prev) => {
      const next = newSteps
        .filter((s) => s.type !== "intro")
        .sort((a, b) => a.order - b.order);
      if (next.length === 0) return 0;
      if (next.some((s) => s.order === prev)) return prev;
      return next[0].order;
    });
  }, [funnel, updateFunnel]);

  if (!funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Funnel no encontrado</h2>
          <Button variant="link" onClick={() => router.push("/dashboard")}>Volver al dashboard</Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <DeviceMobile className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="bold" />
          <h2 className="text-xl font-semibold mb-2">Abre en escritorio para editar</h2>
          <p className="text-muted-foreground mb-4">El editor de funnels requiere una pantalla más grande.</p>
          <Button variant="link" onClick={() => router.push("/dashboard")}>Volver al dashboard</Button>
        </div>
      </div>
    );
  }

  const selectedStep =
    quizSteps.find((s) => s.order === selectedStepIndex) ?? quizSteps[0];

  const hasIntro = funnel.steps.some((s) => s.type === "intro");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorTopBar
        funnel={funnel}
        onOpenSettings={() => setShowSettings(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
            selectedIndex={selectedStepIndex}
            onSelect={setSelectedStepIndex}
            onReorder={handleReorderSteps}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
            excludeAddTypes={hasIntro ? ["intro"] : undefined}
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
          <WebhookTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "tracking" && (
        <ScrollArea className="min-h-0 flex-1">
          <TrackingTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "publish" && (
        <ScrollArea className="min-h-0 flex-1">
          <PublishTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "metrics" && (
        <ScrollArea className="min-h-0 flex-1">
          <FunnelMetricsTab funnel={funnel} />
        </ScrollArea>
      )}

      <GlobalSettingsSheet funnel={funnel} open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default FunnelEditor;

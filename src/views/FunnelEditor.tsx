'use client';

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { EditorSidebar } from "@/components/editor/EditorSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorProperties } from "@/components/editor/EditorProperties";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { GlobalSettingsSheet } from "@/components/editor/GlobalSettingsSheet";
import { WebhookTab } from "@/components/editor/WebhookTab";
import { TrackingTab } from "@/components/editor/TrackingTab";
import { PublishTab } from "@/components/editor/PublishTab";
import FunnelAnalytics from "@/components/analytics/FunnelAnalytics";
import { CampaignsTab } from "@/components/editor/CampaignsTab";

import { useIsMobile } from "@/hooks/use-mobile";
import { DeviceMobile } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FunnelStep, StepType } from "@/types/funnel";

export type EditorTab = "funnel" | "ab_test" | "webhook" | "tracking" | "publish" | "metrics";

const FunnelEditor = () => {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as EditorTab | undefined;
  const fetchFunnels = useFunnelStore((s) => s.fetchFunnels);
  const funnel = useFunnelStore((s) => s.getFunnel(funnelId || ""));
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab || "funnel");
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
    if (funnelId) {
      fetchCampaigns(funnelId);
    }
  }, [funnelId, fetchCampaigns]);

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<FunnelStep>) => {
    if (!funnel) return;
    const newSteps = funnel.steps.map((s) => s.id === stepId ? { ...s, ...updates } : s);
    updateFunnel(funnel.id, { steps: newSteps });
  }, [funnel, updateFunnel]);

  const handleReorderSteps = useCallback((newSteps: FunnelStep[]) => {
    if (!funnel) return;
    updateFunnel(funnel.id, { steps: newSteps });
  }, [funnel, updateFunnel]);

  const handleAddStep = useCallback((type: StepType) => {
    if (!funnel) return;
    const maxOrder = Math.max(...funnel.steps.map((s) => s.order));
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
    setSelectedStepIndex((prev) => Math.max(0, prev - 1));
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

  const selectedStep = funnel.steps.find((s) => s.order === selectedStepIndex) || funnel.steps[0];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <EditorTopBar
        funnel={funnel}
        onOpenSettings={() => setShowSettings(true)}
        viewMode={viewMode}
        onToggleView={() => setViewMode((v) => v === "desktop" ? "mobile" : "desktop")}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "funnel" && (
        <div className="flex flex-1 overflow-hidden">
          <EditorSidebar
            steps={funnel.steps}
            selectedIndex={selectedStepIndex}
            onSelect={setSelectedStepIndex}
            onReorder={handleReorderSteps}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
          />
          <EditorCanvas step={selectedStep} steps={funnel.steps} settings={funnel.settings} viewMode={viewMode} />
          <EditorProperties step={selectedStep} funnel={funnel} onUpdateStep={handleUpdateStep} />
        </div>
      )}

      {activeTab === "ab_test" && (
        <CampaignsTab funnel={funnel} />
      )}

      {activeTab === "webhook" && (
        <ScrollArea className="flex-1">
          <WebhookTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "tracking" && (
        <ScrollArea className="flex-1">
          <TrackingTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "publish" && (
        <ScrollArea className="flex-1">
          <PublishTab funnel={funnel} />
        </ScrollArea>
      )}

      {activeTab === "metrics" && (
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-5xl mx-auto">
            {funnel.steps && funnel.steps.length > 0 ? (
              <FunnelAnalytics
                funnelId={funnel.id}
                campaigns={campaigns}
                steps={funnel.steps}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No hay datos de análisis disponibles aún. Crea pasos en el funnel primero.
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <GlobalSettingsSheet funnel={funnel} open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default FunnelEditor;

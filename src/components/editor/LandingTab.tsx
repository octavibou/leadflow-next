"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorViewModeFloatingToggle } from "@/components/editor/EditorViewModeFloatingToggle";
import { LandingVariationFloatingToolbar, type LandingSelection } from "@/components/editor/CampaignsTab";
import { LandingAddSectionPanel } from "@/components/editor/landing/LandingAddSectionPanel";
import { LandingLeftSidebarWithBasicBlocksCluster } from "@/components/editor/landing/LandingLeftSidebarWithBasicBlocks";
import {
  LandingBuilderProvider,
  useLandingBuilder,
  type LandingBodyCanvasActions,
  type LandingIntroChromeActions,
} from "@/components/editor/landing/LandingBuilderContext";
import {
  getLandingBasicBlockId,
  isLandingBuildPrimitiveKind,
  type LandingBuildPrimitiveKind,
} from "@/components/editor/landing/landingBuilderTypes";
import { LandingInspectorColumn } from "@/components/editor/landing/LandingInspectorColumn";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Funnel, FunnelStep, IntroConfig, LandingIntroBodyBlock } from "@/types/funnel";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { LANDING_BODY_REORDER_APPEND } from "@/lib/landingBodyDrag";

function CloseInspectorOnVariationChange({ selectedKey }: { selectedKey: LandingSelection }) {
  const { closeInspector } = useLandingBuilder();

  useEffect(() => {
    closeInspector();
  }, [selectedKey, closeInspector]);

  return null;
}

export function LandingTab({
  funnel,
  viewMode,
  onToggleView,
}: {
  funnel: Funnel;
  viewMode: "desktop" | "mobile";
  onToggleView: () => void;
}) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const { campaigns, fetchCampaigns, updateCampaign } = useCampaignStore();

  const [selectedKey, setSelectedKey] = useState<LandingSelection>("default");

  const emptyIntroBaseline: IntroConfig = useMemo(() => ({
    headline: "",
    description: "",
    cta: "",
    showVideo: false,
  }), []);

  const introStep = useMemo(
    () => funnel.steps.find((s) => s.type === "intro"),
    [funnel.steps],
  );

  const selectedCampaign = useMemo(
    () => (selectedKey !== "default" ? campaigns.find((c) => c.id === selectedKey) : null),
    [campaigns, selectedKey],
  );

  const campaignIntroStep = useMemo(() => {
    if (!selectedCampaign?.steps?.length) return undefined;
    return selectedCampaign.steps.find((s) => s.type === "intro") as FunnelStep | undefined;
  }, [selectedCampaign]);

  useEffect(() => {
    fetchCampaigns(funnel.id);
  }, [funnel.id, fetchCampaigns]);

  useEffect(() => {
    if (selectedKey === "default") return;
    if (!campaigns.some((c) => c.id === selectedKey)) {
      setSelectedKey("default");
    }
  }, [campaigns, selectedKey]);

  const useLanding = funnel.settings.useLanding !== false;

  const handleUpdateFunnelIntro = useCallback(
    (stepId: string, updates: Partial<FunnelStep>) => {
      const newSteps = funnel.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
      updateFunnel(funnel.id, { steps: newSteps });
    },
    [funnel, updateFunnel],
  );

  const handleUpdateCampaignIntro = useCallback(
    (stepId: string, updates: Partial<FunnelStep>) => {
      if (!selectedCampaign) return;
      const newSteps = selectedCampaign.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
      void updateCampaign(selectedCampaign.id, { steps: newSteps }).catch(() =>
        toast.error("No se pudo guardar los cambios"),
      );
    },
    [selectedCampaign, updateCampaign],
  );

  const editingSteps = selectedKey === "default" ? funnel.steps : (selectedCampaign?.steps ?? funnel.steps);
  const editingIntro =
    selectedKey === "default" ? introStep : campaignIntroStep;

  const variationLabel =
    selectedKey === "default" ? "Landing por defecto" : selectedCampaign?.name ?? "Variación";

  const handleUpdateIntro = useCallback(
    (updates: Partial<FunnelStep>) => {
      if (!editingIntro) return;
      if (selectedKey === "default") {
        handleUpdateFunnelIntro(editingIntro.id, updates);
      } else {
        handleUpdateCampaignIntro(editingIntro.id, updates);
      }
    },
    [editingIntro, selectedKey, handleUpdateFunnelIntro, handleUpdateCampaignIntro],
  );

  const bodyCanvasActions = useMemo((): LandingBodyCanvasActions | null => {
    if (!editingIntro) return null;

    const getIntroConfig = () => ({ ...emptyIntroBaseline, ...editingIntro.introConfig });

    const setLandingBodyBlocks = (landingBodyBlocks: LandingIntroBodyBlock[]) => {
      const ic = getIntroConfig();
      handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
    };

    return {
      appendPrimitive(kind: LandingBuildPrimitiveKind) {
        const ic = getIntroConfig();
        const id = crypto.randomUUID();
        const landingBodyBlocks = [...(ic.landingBodyBlocks ?? []), { id, kind }];
        handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
        return id;
      },
      patchBodyBlockDraft(blockId, patch) {
        const ic = getIntroConfig();
        const landingBodyBlocks = (ic.landingBodyBlocks ?? []).map((row) => {
          if (row.id !== blockId) return row;
          return {
            ...row,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
            ...(patch.body !== undefined ? { body: patch.body } : {}),
            ...(patch.ctaLabel !== undefined ? { ctaLabel: patch.ctaLabel } : {}),
          };
        });
        handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
      },
      removeBodyBlock(blockId) {
        const ic = getIntroConfig();
        const landingBodyBlocks = (ic.landingBodyBlocks ?? []).filter((r) => r.id !== blockId);
        handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
      },
      duplicateBodyBlock(blockId) {
        const ic = getIntroConfig();
        const rows = [...(ic.landingBodyBlocks ?? [])];
        const i = rows.findIndex((r) => r.id === blockId);
        if (i < 0) return null;
        const row = rows[i];
        if (!isLandingBuildPrimitiveKind(row.kind)) return null;
        const nid = crypto.randomUUID();
        const copy: LandingIntroBodyBlock = { ...row, id: nid };
        const landingBodyBlocks = [...rows.slice(0, i + 1), copy, ...rows.slice(i + 1)];
        handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
        return { id: nid, builderId: getLandingBasicBlockId(row.kind) };
      },
      insertBodyBlockBelow(afterBlockId) {
        const ic = getIntroConfig();
        const rows = [...(ic.landingBodyBlocks ?? [])];
        const i = rows.findIndex((r) => r.id === afterBlockId);
        if (i < 0) return null;
        const ref = rows[i];
        if (!isLandingBuildPrimitiveKind(ref.kind)) return null;
        const nid = crypto.randomUUID();
        const fresh: LandingIntroBodyBlock = { id: nid, kind: ref.kind };
        const landingBodyBlocks = [...rows.slice(0, i + 1), fresh, ...rows.slice(i + 1)];
        handleUpdateIntro({ introConfig: { ...ic, landingBodyBlocks } });
        return { id: nid, builderId: getLandingBasicBlockId(ref.kind) };
      },
      copyBodyBlock(blockId) {
        const ic = getIntroConfig();
        const row = (ic.landingBodyBlocks ?? []).find((r) => r.id === blockId);
        if (!row) {
          toast.error("No se ha encontrado el bloque.");
          return;
        }
        const text = JSON.stringify(row, null, 2);
        void navigator.clipboard.writeText(text).then(
          () => toast.success("Bloque copiado al portapapeles"),
          () => toast.error("No se pudo copiar al portapapeles"),
        );
      },
      moveBodyBlockBefore(activeId, beforeBlockId) {
        const ic = getIntroConfig();
        const rows = [...(ic.landingBodyBlocks ?? [])];
        const from = rows.findIndex((r) => r.id === activeId);
        if (from < 0) return;
        const [moved] = rows.splice(from, 1);

        if (beforeBlockId === LANDING_BODY_REORDER_APPEND) {
          rows.push(moved);
          setLandingBodyBlocks(rows);
          return;
        }

        const to = rows.findIndex((r) => r.id === beforeBlockId);
        if (to < 0) {
          rows.splice(from, 0, moved);
          setLandingBodyBlocks(rows);
          return;
        }
        rows.splice(to, 0, moved);
        setLandingBodyBlocks(rows);
      },
    };
  }, [editingIntro, handleUpdateIntro, emptyIntroBaseline]);

  const introChromeActions = useMemo((): LandingIntroChromeActions | null => {
    if (!editingIntro) return null;
    return {
      clearHeaderLogo: () => {
        updateFunnel(funnel.id, { settings: { ...funnel.settings, logoUrl: "" } });
      },
      hideLandingDivider: () => {
        const ic = { ...emptyIntroBaseline, ...editingIntro.introConfig };
        handleUpdateIntro({ introConfig: { ...ic, showLandingDivider: false } });
      },
    };
  }, [editingIntro, funnel.id, funnel.settings, handleUpdateIntro, updateFunnel, emptyIntroBaseline]);

  if (!introStep) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Este funnel no incluye un paso de landing (intro) en la plantilla.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {useLanding ? (
        <LandingBuilderProvider bodyCanvasActions={bodyCanvasActions} introChromeActions={introChromeActions}>
        <CloseInspectorOnVariationChange selectedKey={selectedKey} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <LandingLeftSidebarWithBasicBlocksCluster constructorTab={true}>
          <div className="flex w-80 shrink-0 flex-col border-r bg-muted/30 min-h-0">
            <div className="shrink-0 border-b px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Constructor
              </span>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3">
                <LandingAddSectionPanel />
              </div>
            </ScrollArea>
          </div>
          </LandingLeftSidebarWithBasicBlocksCluster>

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {editingIntro ? (
              <>
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <EditorCanvas
                    step={editingIntro}
                    steps={editingSteps}
                    settings={funnel.settings}
                    viewMode={viewMode}
                    landingConstructorPick={true}
                  />
                  <LandingVariationFloatingToolbar
                    funnel={funnel}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                  />
                  <EditorViewModeFloatingToggle viewMode={viewMode} onToggleView={onToggleView} />
                </div>
                <LandingInspectorColumn
                  step={editingIntro}
                  variationLabel={variationLabel}
                  onUpdateIntro={handleUpdateIntro}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                Esta variación no tiene paso de landing.
              </div>
            )}
          </div>
        </div>
        </LandingBuilderProvider>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-muted-foreground text-center max-w-md">
            El funnel público empezará en la primera pregunta. Activa &quot;Mostrar landing antes del quiz&quot; en la
            configuración del funnel (icono de engranaje en la barra superior) para diseñar la landing y las variaciones.
          </p>
        </div>
      )}
    </div>
  );
}

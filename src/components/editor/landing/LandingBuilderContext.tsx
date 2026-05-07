"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyDraft,
  getLandingBasicBlockId,
  type ConstructorFlyoutKind,
  type LandingBasicBlockId,
  type LandingBuildPrimitiveKind,
  type LandingBuilderBlockDraft,
  type LandingBuilderComponentId,
} from "@/components/editor/landing/landingBuilderTypes";

/** Zona clicable fuera del hero (cabecera con logo / franja divisor). */
export type LandingIntroLayoutChromeSection = "header" | "divider";

export type LandingIntroChromeActions = {
  /** Quita el logo del funnel (ajustes globales). */
  clearHeaderLogo: () => void;
  /** Oculta la línea divisoria logo / contenido en la intro. */
  hideLandingDivider: () => void;
};

/** Acciones de persistencia de filas debajo del hero (implementadas en LandingTab según funnel/variación). */
export type LandingBodyDuplicateResult = {
  id: string;
  builderId: LandingBasicBlockId;
};

export type LandingBodyCanvasActions = {
  appendPrimitive: (kind: LandingBuildPrimitiveKind) => string | null;
  patchBodyBlockDraft: (
    blockId: string,
    patch: Partial<LandingBuilderBlockDraft>,
  ) => void;
  removeBodyBlock: (blockId: string) => void;
  duplicateBodyBlock: (blockId: string) => LandingBodyDuplicateResult | null;
  insertBodyBlockBelow: (afterBlockId: string) => LandingBodyDuplicateResult | null;
  copyBodyBlock: (blockId: string) => void;
  /** Mueve `activeId` a la posición inmediatamente antes de `beforeBlockId`. */
  moveBodyBlockBefore: (activeId: string, beforeBlockId: string) => void;
};

type LandingBuilderContextValue = {
  activeComponent: LandingBuilderComponentId | null;
  sheetOpen: boolean;
  openComponent: (id: LandingBuilderComponentId) => void;
  setSheetOpen: (open: boolean) => void;
  /** Cierra el inspector y limpia la selección del canvas */
  closeInspector: () => void;
  patchDraft: (id: LandingBuilderComponentId, patch: Partial<LandingBuilderBlockDraft>) => void;
  activeDraft: LandingBuilderBlockDraft;
  /** Panel secundario del constructor (plantillas por sección, p. ej. Confianza / Testimonios). */
  constructorFlyout: ConstructorFlyoutKind;
  setConstructorFlyout: (v: ConstructorFlyoutKind) => void;
  /** Fila de bloques básicos seleccionada en el canvas (`null` = edición tipo hero desde pick zones). */
  selectedBodyRowId: string | null;
  /** Seleccionar una fila persistida (`landingBodyBlocks`) y abrir el inspector. */
  openLandingBodyRow: (rowId: string, componentId: LandingBuilderComponentId) => void;
  /** Tras drop desde sidebar: crear fila persistida + abrir inspector. */
  consumeDroppedPrimitive: (kind: LandingBuildPrimitiveKind) => void;
  /** Guardar campos de la fila (`PATCH` aplicado sobre `landingBodyBlocks`). */
  persistBodyBlockDraft: (blockId: string, patch: Partial<LandingBuilderBlockDraft>) => void;
  removeLandingBodyRow: (blockId: string) => void;
  duplicateLandingBodyRow: (blockId: string) => void;
  insertLandingBodyBelow: (afterBlockId: string) => void;
  copyLandingBodyRowJson: (blockId: string) => void;
  moveLandingBodyRowBefore: (activeId: string, beforeTargetId: string) => void;
  /** Si hay funnel de intro activo detrás (`bodyCanvasActions` no nulo). */
  bodyCanvasActionsConfigured: boolean;

  /** Selección tipo page builder sobre cabecera o divisor (`null` = ninguna). */
  introLayoutChromeSection: LandingIntroLayoutChromeSection | null;
  selectIntroLayoutChromeSection: (section: LandingIntroLayoutChromeSection) => void;

  /** Quitar logo / divisor (inyectadas desde LandingTab). */
  introChromeActions: LandingIntroChromeActions | null;

  /** True mientras se arrastra un bloque desde la barra «Bloques básicos» (overlay en el lienzo). */
  sidebarPrimitiveDragActive: boolean;
  beginSidebarPrimitiveDrag: () => void;
  endSidebarPrimitiveDrag: () => void;
};

const LandingBuilderContext = createContext<LandingBuilderContextValue | null>(null);

export function LandingBuilderProvider({
  children,
  bodyCanvasActions,
  introChromeActions,
}: {
  children: ReactNode;
  bodyCanvasActions?: LandingBodyCanvasActions | null;
  /** Acciones opcionales al pulsar borrar en cabecera / divisor. */
  introChromeActions?: LandingIntroChromeActions | null;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeComponent, setActiveComponent] = useState<LandingBuilderComponentId | null>(null);
  const [selectedBodyRowId, setSelectedBodyRowId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<LandingBuilderComponentId, LandingBuilderBlockDraft>>>({});

  const [constructorFlyout, setConstructorFlyout] = useState<ConstructorFlyoutKind>(null);
  const [introLayoutChromeSection, setIntroLayoutChromeSection] = useState<LandingIntroLayoutChromeSection | null>(
    null,
  );
  const [sidebarPrimitiveDragActive, setSidebarPrimitiveDragActive] = useState(false);

  const bodyCanvasActionsConfigured = Boolean(bodyCanvasActions);
  const mergedIntroChromeActions = introChromeActions ?? null;

  const persistBodyBlockDraft = useCallback(
    (blockId: string, patch: Partial<LandingBuilderBlockDraft>) => {
      bodyCanvasActions?.patchBodyBlockDraft(blockId, patch);
    },
    [bodyCanvasActions],
  );

  const openLandingBodyRow = useCallback((rowId: string, componentId: LandingBuilderComponentId) => {
    setIntroLayoutChromeSection(null);
    setSelectedBodyRowId(rowId);
    setActiveComponent(componentId);
    setSheetOpen(true);
    setConstructorFlyout(null);
  }, []);

  const openComponent = useCallback((id: LandingBuilderComponentId) => {
    setIntroLayoutChromeSection(null);
    setSelectedBodyRowId(null);
    setActiveComponent(id);
    setSheetOpen(true);
    setConstructorFlyout(null);
  }, []);

  const closeInspector = useCallback(() => {
    setSheetOpen(false);
    setActiveComponent(null);
    setSelectedBodyRowId(null);
    setConstructorFlyout(null);
    setIntroLayoutChromeSection(null);
    setSidebarPrimitiveDragActive(false);
  }, []);

  const selectIntroLayoutChromeSection = useCallback((section: LandingIntroLayoutChromeSection) => {
    setIntroLayoutChromeSection(section);
    setSelectedBodyRowId(null);
    setActiveComponent(null);
    setSheetOpen(false);
    setConstructorFlyout(null);
  }, []);

  const patchDraft = useCallback((id: LandingBuilderComponentId, patch: Partial<LandingBuilderBlockDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...emptyDraft(), ...prev[id], ...patch },
    }));
  }, []);

  const activeDraft = useMemo((): LandingBuilderBlockDraft => {
    if (!activeComponent) return emptyDraft();
    return { ...emptyDraft(), ...drafts[activeComponent] };
  }, [activeComponent, drafts]);

  const consumeDroppedPrimitive = useCallback(
    (kind: LandingBuildPrimitiveKind) => {
      const id = bodyCanvasActions?.appendPrimitive(kind);
      if (id) openLandingBodyRow(id, getLandingBasicBlockId(kind));
    },
    [bodyCanvasActions, openLandingBodyRow],
  );

  const removeLandingBodyRow = useCallback(
    (blockId: string) => {
      bodyCanvasActions?.removeBodyBlock(blockId);
      if (selectedBodyRowId === blockId) closeInspector();
    },
    [bodyCanvasActions, selectedBodyRowId, closeInspector],
  );

  const duplicateLandingBodyRow = useCallback(
    (blockId: string) => {
      const r = bodyCanvasActions?.duplicateBodyBlock(blockId);
      if (r) openLandingBodyRow(r.id, r.builderId);
    },
    [bodyCanvasActions, openLandingBodyRow],
  );

  const insertLandingBodyBelow = useCallback(
    (afterBlockId: string) => {
      const r = bodyCanvasActions?.insertBodyBlockBelow(afterBlockId);
      if (r) openLandingBodyRow(r.id, r.builderId);
    },
    [bodyCanvasActions, openLandingBodyRow],
  );

  const copyLandingBodyRowJson = useCallback(
    (blockId: string) => {
      bodyCanvasActions?.copyBodyBlock(blockId);
    },
    [bodyCanvasActions],
  );

  const moveLandingBodyRowBefore = useCallback(
    (activeId: string, beforeTargetId: string) => {
      bodyCanvasActions?.moveBodyBlockBefore(activeId, beforeTargetId);
    },
    [bodyCanvasActions],
  );

  const beginSidebarPrimitiveDrag = useCallback(() => {
    setSidebarPrimitiveDragActive(true);
  }, []);

  const endSidebarPrimitiveDrag = useCallback(() => {
    setSidebarPrimitiveDragActive(false);
  }, []);

  const value = useMemo(
    (): LandingBuilderContextValue => ({
      activeComponent,
      sheetOpen,
      openComponent,
      setSheetOpen,
      closeInspector,
      patchDraft,
      activeDraft,
      constructorFlyout,
      setConstructorFlyout,
      selectedBodyRowId,
      openLandingBodyRow,
      consumeDroppedPrimitive,
      persistBodyBlockDraft,
      removeLandingBodyRow,
      duplicateLandingBodyRow,
      insertLandingBodyBelow,
      copyLandingBodyRowJson,
      moveLandingBodyRowBefore,
      bodyCanvasActionsConfigured,
      introLayoutChromeSection,
      selectIntroLayoutChromeSection,
      introChromeActions: mergedIntroChromeActions,
      sidebarPrimitiveDragActive,
      beginSidebarPrimitiveDrag,
      endSidebarPrimitiveDrag,
    }),
    [
      activeComponent,
      sheetOpen,
      openComponent,
      closeInspector,
      patchDraft,
      activeDraft,
      constructorFlyout,
      selectedBodyRowId,
      openLandingBodyRow,
      consumeDroppedPrimitive,
      persistBodyBlockDraft,
      removeLandingBodyRow,
      duplicateLandingBodyRow,
      insertLandingBodyBelow,
      copyLandingBodyRowJson,
      moveLandingBodyRowBefore,
      bodyCanvasActionsConfigured,
      introLayoutChromeSection,
      selectIntroLayoutChromeSection,
      mergedIntroChromeActions,
      sidebarPrimitiveDragActive,
      beginSidebarPrimitiveDrag,
      endSidebarPrimitiveDrag,
    ],
  );

  return <LandingBuilderContext.Provider value={value}>{children}</LandingBuilderContext.Provider>;
}

export function useLandingBuilder(): LandingBuilderContextValue {
  const ctx = useContext(LandingBuilderContext);
  if (!ctx) throw new Error("useLandingBuilder must be used within LandingBuilderProvider");
  return ctx;
}

export function useLandingBuilderOptional(): LandingBuilderContextValue | null {
  return useContext(LandingBuilderContext);
}

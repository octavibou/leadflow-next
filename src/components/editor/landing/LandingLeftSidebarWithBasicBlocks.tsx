"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LandingBasicBlocksGrids } from "@/components/editor/landing/LandingBasicBlocksGrids";
import { LandingHeroVariantsGrid } from "@/components/editor/landing/LandingHeroVariantsGrid";
import { LandingProductVariantsGrid } from "@/components/editor/landing/LandingProductVariantsGrid";
import { LandingCTAVariantsGrid } from "@/components/editor/landing/LandingCTAVariantsGrid";
import { LandingAboutVariantsGrid } from "@/components/editor/landing/LandingAboutVariantsGrid";
import { LandingQuizVariantsGrid } from "@/components/editor/landing/LandingQuizVariantsGrid";
import { LandingTeamVariantsGrid } from "@/components/editor/landing/LandingTeamVariantsGrid";
import { LandingTestimonialsVariantsGrid } from "@/components/editor/landing/LandingTestimonialsVariantsGrid";
import { LandingTrustVariantsGrid } from "@/components/editor/landing/LandingTrustVariantsGrid";
import { LandingPluginsFlyoutContent } from "@/components/editor/landing/LandingPluginsFlyoutContent";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

/**
 * Panel secundario superpuesto al canvas (`absolute`), sin ocupar hueco en el flex → el preview no se desplaza.
 */
function ConstructorFlyoutOverlay() {
  const { constructorFlyout, sidebarPrimitiveDragActive } = useLandingBuilder();
  if (!constructorFlyout) return null;
  /* Al arrastrar desde la paleta solo se oculta el volador de «Bloques básicos», no el panel Constructor. */
  if (sidebarPrimitiveDragActive && constructorFlyout === "basic_blocks") return null;

  const title =
    constructorFlyout === "basic_blocks"
      ? "Bloques básicos"
      : constructorFlyout === "hero"
        ? "Plantillas Hero"
        : constructorFlyout === "product"
          ? "Plantillas producto"
          : constructorFlyout === "cta"
            ? "Plantillas CTA"
            : constructorFlyout === "about"
              ? "Plantillas Sobre nosotros"
              : constructorFlyout === "quiz"
                ? "Plantillas Quiz"
                : constructorFlyout === "team"
                  ? "Plantillas Equipo"
                  : constructorFlyout === "testimonials"
                    ? "Plantillas Testimonios"
                    : constructorFlyout === "trust"
                      ? "Plantillas Confianza"
                      : constructorFlyout === "plugins"
                        ? "Plugins de conversión"
                        : "";

  return (
    <div
      className="absolute left-full top-0 z-50 flex h-full min-h-0 w-80 flex-col overflow-hidden border-l border-t border-b border-border bg-background shadow-xl"
      role="presentation"
    >
      <div className="shrink-0 border-b px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3">
          {constructorFlyout === "basic_blocks" && <LandingBasicBlocksGrids />}
          {constructorFlyout === "hero" && <LandingHeroVariantsGrid />}
          {constructorFlyout === "product" && <LandingProductVariantsGrid />}
          {constructorFlyout === "cta" && <LandingCTAVariantsGrid />}
          {constructorFlyout === "about" && <LandingAboutVariantsGrid />}
          {constructorFlyout === "quiz" && <LandingQuizVariantsGrid />}
          {constructorFlyout === "team" && <LandingTeamVariantsGrid />}
          {constructorFlyout === "testimonials" && <LandingTestimonialsVariantsGrid />}
          {constructorFlyout === "trust" && <LandingTrustVariantsGrid />}
          {constructorFlyout === "plugins" && <LandingPluginsFlyoutContent />}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Barra Constructor (w-80) + menú secundario en overlay a la derecha. El preview no cambia de ancho al abrir el menú.
 */
export function LandingLeftSidebarWithBasicBlocksCluster({
  constructorTab,
  children,
}: {
  constructorTab: boolean;
  children: ReactNode;
}) {
  const { setConstructorFlyout } = useLandingBuilder();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setConstructorFlyout(null), 220);
  };

  useEffect(() => {
    if (!constructorTab) setConstructorFlyout(null);
  }, [constructorTab, setConstructorFlyout]);

  return (
    <div
      className="relative h-full min-h-0 w-80 shrink-0 self-stretch"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      {children}
      <ConstructorFlyoutOverlay />
    </div>
  );
}

"use client";

import { CaretRight } from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";
import {
  isLandingAboutTemplateId,
  isLandingBasicBlockId,
  isLandingCTATemplateId,
  isLandingHeroTemplateId,
  isLandingProductTemplateId,
  isLandingQuizTemplateId,
  isLandingTeamTemplateId,
  isLandingTestimonialsTemplateId,
  isLandingTrustTemplateId,
} from "@/components/editor/landing/landingBuilderTypes";

/** Contenedor del icono de vista previa (estilo captura: caja clara con borde). */
function PreviewIconBox({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/90 bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function BasicBlocksIcon() {
  return (
    <PreviewIconBox>
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded bg-primary text-[12px] font-bold leading-none text-primary-foreground">
        T
      </span>
    </PreviewIconBox>
  );
}

function HeroSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] flex-col justify-start gap-1 p-1">
        <div className="h-1.5 w-full rounded-sm bg-primary" />
        <div className="h-2 w-full rounded-sm bg-primary/15" />
      </div>
    </PreviewIconBox>
  );
}

function ProductSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] gap-0.5 p-1">
        <div className="h-full w-2 rounded-sm bg-primary" />
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="h-1.5 w-full rounded-sm bg-primary/20" />
          <div className="flex-1 rounded-sm bg-primary/10" />
        </div>
      </div>
    </PreviewIconBox>
  );
}

function CtaSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] items-center justify-center p-1">
        <div className="h-2 w-[90%] rounded-sm bg-primary" />
      </div>
    </PreviewIconBox>
  );
}

function AboutSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] flex-col gap-0.5 p-1">
        <div className="h-1.5 w-full rounded-sm bg-primary" />
        <div className="h-2 w-full rounded-sm bg-primary/25" />
        <div className="h-2 w-full rounded-sm bg-primary/10" />
      </div>
    </PreviewIconBox>
  );
}

function QuizSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] justify-center gap-1 p-1">
        <div className="h-full w-[38%] rounded-sm bg-primary/90" />
        <div className="h-full w-[38%] rounded-sm bg-primary/90" />
      </div>
    </PreviewIconBox>
  );
}

function TeamSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="grid h-[26px] w-[26px] grid-cols-2 gap-0.5 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-sm bg-primary/80" />
        ))}
      </div>
    </PreviewIconBox>
  );
}

function TestimonialsSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="flex h-[26px] w-[26px] flex-col justify-end gap-1 p-1">
        <div className="h-2 flex-1 rounded-sm bg-primary/12" />
        <div className="h-1.5 w-full rounded-sm bg-primary" />
      </div>
    </PreviewIconBox>
  );
}

function TrustSectionIcon() {
  return (
    <PreviewIconBox>
      <div className="relative h-[26px] w-[26px] p-1">
        <div className="absolute left-1 top-1 h-2 w-2 rounded-sm bg-primary" />
        <div className="h-full w-full rounded-sm border border-dashed border-primary/35" />
      </div>
    </PreviewIconBox>
  );
}

/**
 * Constructor de bloques; paneles flotantes a la derecha viven en `LandingLeftSidebarWithBasicBlocksCluster`.
 */
export function LandingAddSectionPanel() {
  const { activeComponent, sheetOpen, setConstructorFlyout, constructorFlyout } = useLandingBuilder();

  const basicRowActive =
    constructorFlyout === "basic_blocks" || (isLandingBasicBlockId(activeComponent) && sheetOpen);

  const heroRowActive =
    constructorFlyout === "hero" || (isLandingHeroTemplateId(activeComponent) && sheetOpen);

  const productRowActive =
    constructorFlyout === "product" || (isLandingProductTemplateId(activeComponent) && sheetOpen);

  const ctaRowActive =
    constructorFlyout === "cta" || (isLandingCTATemplateId(activeComponent) && sheetOpen);

  const aboutRowActive =
    constructorFlyout === "about" || (isLandingAboutTemplateId(activeComponent) && sheetOpen);

  const quizRowActive =
    constructorFlyout === "quiz" || (isLandingQuizTemplateId(activeComponent) && sheetOpen);

  const teamRowActive =
    constructorFlyout === "team" || (isLandingTeamTemplateId(activeComponent) && sheetOpen);

  const testimonialsRowActive =
    constructorFlyout === "testimonials" || (isLandingTestimonialsTemplateId(activeComponent) && sheetOpen);

  const trustRowActive =
    constructorFlyout === "trust" || (isLandingTrustTemplateId(activeComponent) && sheetOpen);

  return (
    <div className="flex flex-col">
      <h3 className="mb-1 text-base font-semibold tracking-tight">Añadir sección</h3>
      <p className="mb-4 text-xs text-muted-foreground">Elige un tipo de bloque o sección para la landing.</p>

      <button
        type="button"
        onMouseEnter={() => setConstructorFlyout("basic_blocks")}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          basicRowActive && "bg-primary/10",
        )}
      >
        <BasicBlocksIcon />
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Bloques básicos</span>
        <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
      </button>

      <Separator className="my-4" />

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Secciones</p>

      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("hero")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            heroRowActive && "bg-primary/10",
          )}
        >
          <HeroSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Hero</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("product")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            productRowActive && "bg-primary/10",
          )}
        >
          <ProductSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Producto</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("cta")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            ctaRowActive && "bg-primary/10",
          )}
        >
          <CtaSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Llamada a la acción</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("about")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            aboutRowActive && "bg-primary/10",
          )}
        >
          <AboutSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Sobre nosotros</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("quiz")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            quizRowActive && "bg-primary/10",
          )}
        >
          <QuizSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Quiz</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("team")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            teamRowActive && "bg-primary/10",
          )}
        >
          <TeamSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Equipo</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("testimonials")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            testimonialsRowActive && "bg-primary/10",
          )}
        >
          <TestimonialsSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Testimonios</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
        <button
          type="button"
          onMouseEnter={() => setConstructorFlyout("trust")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2.5 pl-2 pr-2 text-left transition-colors hover:bg-muted/70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            trustRowActive && "bg-primary/10",
          )}
        >
          <TrustSectionIcon />
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Confianza</span>
          <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground/45" weight="bold" />
        </button>
      </div>
    </div>
  );
}

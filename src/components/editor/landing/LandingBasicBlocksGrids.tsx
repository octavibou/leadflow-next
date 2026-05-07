"use client";

import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId, LandingBasicBlockId } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";
import {
  Minus,
  Star,
  VideoCamera,
  ImagesSquare,
  MapPin,
  Code,
} from "@phosphor-icons/react";
import {
  LANDING_BASIC_BLOCK_DRAG_TYPE,
  type LandingBasicBlockDragPayload,
} from "@/lib/landingBodyDrag";

function BlockTile({
  label,
  bgClassName,
  isActive,
  onSelect,
  builderBlockId,
  children,
}: {
  label: string;
  bgClassName: string;
  isActive: boolean;
  onSelect: () => void;
  /** Arrastrable al lienzo cuando hay constructor (`LandingBuilderProvider` con canvas). */
  builderBlockId: LandingBasicBlockId;
  children: React.ReactNode;
}) {
  const { bodyCanvasActionsConfigured, beginSidebarPrimitiveDrag, endSidebarPrimitiveDrag } = useLandingBuilder();

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        try {
          const payload: LandingBasicBlockDragPayload = { builderBlockId };
          e.dataTransfer.setData(LANDING_BASIC_BLOCK_DRAG_TYPE, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = "copy";
        } catch {
          /* noop */
        }
        if (bodyCanvasActionsConfigured) beginSidebarPrimitiveDrag();
      }}
      onDragEnd={() => {
        if (bodyCanvasActionsConfigured) endSidebarPrimitiveDrag();
      }}
      onClick={onSelect}
      className={cn(
        "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border border-border/40 p-2 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors",
        bgClassName,
        "hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 dark:hover:brightness-110",
        isActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      <div className="flex h-11 w-full shrink-0 items-center justify-center">{children}</div>
      <span className="text-[11px] font-medium leading-tight text-foreground">{label}</span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 mt-4 text-sm font-semibold tracking-tight text-foreground first:mt-0">{children}</p>
  );
}

/** Iconos miniatura al estilo referencia (Core). */
function CoreTextIcon() {
  return (
    <div className="flex w-full max-w-[44px] flex-col gap-1">
      <div className="h-1.5 w-full rounded-sm bg-slate-500/80" />
      <div className="h-1 w-[85%] rounded-sm bg-slate-400/70" />
      <div className="h-1 w-full rounded-sm bg-slate-400/50" />
    </div>
  );
}

function CoreButtonIcon() {
  return (
    <div className="flex h-9 w-11 items-center justify-center rounded-lg bg-primary shadow-sm">
      <Minus className="h-4 w-4 text-primary-foreground" weight="bold" />
    </div>
  );
}

function CoreImageIcon() {
  return (
    <div className="h-10 w-12 overflow-hidden rounded-md bg-gradient-to-br from-muted to-muted-foreground/25">
      <div className="h-full w-full bg-[linear-gradient(135deg,#94a3b8_0%,#64748b_40%,#475569_100%)] opacity-90" />
    </div>
  );
}

function CoreListIcon() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-sm bg-violet-500" />
        <div className="h-1 w-10 rounded-sm bg-slate-400" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-sky-500" />
        <div className="h-1 w-8 rounded-sm bg-slate-400" />
      </div>
    </div>
  );
}

function CoreDividerIcon() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="h-0 w-0 border-x-4 border-x-transparent border-b-[6px] border-b-slate-500" />
      <div className="h-1 w-14 rounded-full bg-slate-500" />
      <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-slate-500" />
    </div>
  );
}

function CoreLogoBarIcon() {
  return (
    <div className="flex items-center gap-0.5">
      <div className="h-4 w-4 rounded-sm bg-violet-500" />
      <div className="h-0 w-0 border-x-[5px] border-x-transparent border-b-[9px] border-b-emerald-500" />
      <div className="text-[10px] leading-none text-amber-500">★</div>
      <div className="h-4 w-4 rounded-full bg-sky-500" />
    </div>
  );
}

function CoreReviewsIcon() {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex -space-x-1">
        <div className="h-5 w-5 rounded-full border border-background bg-amber-100" />
        <div className="h-5 w-5 rounded-full border border-background bg-amber-200" />
        <div className="h-5 w-5 rounded-full border border-background bg-amber-50" />
      </div>
      <div className="flex gap-0.5 text-[9px] text-amber-500">★★★★★</div>
    </div>
  );
}

function MediaGraphicIcon() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-0.5 text-sm">
      <span>😊</span>
      <span className="text-emerald-500">✦</span>
      <span className="text-violet-500">⚡</span>
      <span className="text-rose-500">♥</span>
    </div>
  );
}

function EmbedKununuIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFCC00]">
      <span className="text-[11px] font-bold leading-none text-[#1a365d]">m</span>
    </div>
  );
}

function EmbedTrustpilotIcon() {
  return <Star className="h-9 w-9 text-emerald-500" weight="fill" />;
}

function EmbedProvenExpertIcon() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c4a574] shadow-inner">
      <span className="text-sm font-bold text-white">✓</span>
    </div>
  );
}

function EmbedGoogleMapsIcon() {
  return (
    <div className="relative">
      <MapPin className="h-10 w-10 text-[#4285F4]" weight="fill" />
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#34A853]" />
    </div>
  );
}

function EmbedHtmlIcon() {
  return <Code className="h-10 w-10 text-muted-foreground" weight="bold" />;
}

export function LandingBasicBlocksGrids() {
  const { activeComponent, sheetOpen, openComponent } = useLandingBuilder();

  const isActive = (id: LandingBuilderComponentId) => activeComponent === id && sheetOpen;

  return (
    <div className="flex flex-col">
      <SectionTitle>Core</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <BlockTile
          label="Texto"
          bgClassName="bg-slate-100/90 dark:bg-slate-800/50"
          isActive={isActive("core_text")}
          onSelect={() => openComponent("core_text")}
          builderBlockId="core_text"
        >
          <CoreTextIcon />
        </BlockTile>
        <BlockTile
          label="Botón"
          bgClassName="bg-sky-100/80 dark:bg-sky-950/40"
          isActive={isActive("core_button")}
          onSelect={() => openComponent("core_button")}
          builderBlockId="core_button"
        >
          <CoreButtonIcon />
        </BlockTile>
        <BlockTile
          label="Imagen"
          bgClassName="bg-slate-200/70 dark:bg-slate-700/40"
          isActive={isActive("core_image")}
          onSelect={() => openComponent("core_image")}
          builderBlockId="core_image"
        >
          <CoreImageIcon />
        </BlockTile>
        <BlockTile
          label="Lista"
          bgClassName="bg-violet-100/50 dark:bg-violet-950/30"
          isActive={isActive("core_list")}
          onSelect={() => openComponent("core_list")}
          builderBlockId="core_list"
        >
          <CoreListIcon />
        </BlockTile>
        <BlockTile
          label="Divisor"
          bgClassName="bg-emerald-100/40 dark:bg-emerald-950/25"
          isActive={isActive("core_divider")}
          onSelect={() => openComponent("core_divider")}
          builderBlockId="core_divider"
        >
          <CoreDividerIcon />
        </BlockTile>
        <BlockTile
          label="Barra de logos"
          bgClassName="bg-fuchsia-100/35 dark:bg-fuchsia-950/25"
          isActive={isActive("core_logo_bar")}
          onSelect={() => openComponent("core_logo_bar")}
          builderBlockId="core_logo_bar"
        >
          <CoreLogoBarIcon />
        </BlockTile>
        <BlockTile
          label="Reseñas"
          bgClassName="bg-amber-100/50 dark:bg-amber-950/25"
          isActive={isActive("core_reviews")}
          onSelect={() => openComponent("core_reviews")}
          builderBlockId="core_reviews"
        >
          <CoreReviewsIcon />
        </BlockTile>
      </div>

      <SectionTitle>Media</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <BlockTile
          label="Vídeo"
          bgClassName="bg-violet-100/45 dark:bg-violet-950/25"
          isActive={isActive("media_video")}
          onSelect={() => openComponent("media_video")}
          builderBlockId="media_video"
        >
          <div className="relative h-10 w-12 overflow-hidden rounded-md border border-border/50 bg-muted">
            <VideoCamera className="absolute inset-0 m-auto h-6 w-6 text-primary" weight="fill" />
          </div>
        </BlockTile>
        <BlockTile
          label="Testimonio"
          bgClassName="bg-amber-100/45 dark:bg-amber-950/25"
          isActive={isActive("media_testimonial")}
          onSelect={() => openComponent("media_testimonial")}
          builderBlockId="media_testimonial"
        >
          <div className="flex items-center gap-1.5">
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted-foreground/20" />
            <div className="flex flex-col gap-0.5">
              <div className="h-1 w-10 rounded-sm bg-muted-foreground/40" />
              <div className="h-1 w-8 rounded-sm bg-muted-foreground/25" />
            </div>
          </div>
        </BlockTile>
        <BlockTile
          label="Carrusel"
          bgClassName="bg-slate-100/80 dark:bg-slate-800/45"
          isActive={isActive("media_slider")}
          onSelect={() => openComponent("media_slider")}
          builderBlockId="media_slider"
        >
          <div className="flex w-full max-w-[52px] flex-col gap-1">
            <ImagesSquare className="h-8 w-full text-muted-foreground" weight="duotone" />
            <div className="flex justify-center gap-1">
              <div className="h-1 w-1 rounded-full bg-primary" />
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            </div>
          </div>
        </BlockTile>
        <BlockTile
          label="Gráfico"
          bgClassName="bg-yellow-100/50 dark:bg-yellow-950/20"
          isActive={isActive("media_graphic")}
          onSelect={() => openComponent("media_graphic")}
          builderBlockId="media_graphic"
        >
          <MediaGraphicIcon />
        </BlockTile>
      </div>

      <SectionTitle>Embed</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <BlockTile
          label="Kununu"
          bgClassName="bg-amber-50/95 dark:bg-amber-950/25"
          isActive={isActive("embed_kununu")}
          onSelect={() => openComponent("embed_kununu")}
          builderBlockId="embed_kununu"
        >
          <EmbedKununuIcon />
        </BlockTile>
        <BlockTile
          label="Trustpilot"
          bgClassName="bg-emerald-100/35 dark:bg-emerald-950/20"
          isActive={isActive("embed_trustpilot")}
          onSelect={() => openComponent("embed_trustpilot")}
          builderBlockId="embed_trustpilot"
        >
          <EmbedTrustpilotIcon />
        </BlockTile>
        <BlockTile
          label="Proven Expert"
          bgClassName="bg-[#faf6f1] dark:bg-stone-900/40"
          isActive={isActive("embed_proven_expert")}
          onSelect={() => openComponent("embed_proven_expert")}
          builderBlockId="embed_proven_expert"
        >
          <EmbedProvenExpertIcon />
        </BlockTile>
        <BlockTile
          label="Google Maps"
          bgClassName="bg-indigo-100/35 dark:bg-indigo-950/25"
          isActive={isActive("embed_google_maps")}
          onSelect={() => openComponent("embed_google_maps")}
          builderBlockId="embed_google_maps"
        >
          <EmbedGoogleMapsIcon />
        </BlockTile>
        <BlockTile
          label="HTML"
          bgClassName="bg-slate-200/60 dark:bg-slate-700/35"
          isActive={isActive("embed_html")}
          onSelect={() => openComponent("embed_html")}
          builderBlockId="embed_html"
        >
          <EmbedHtmlIcon />
        </BlockTile>
      </div>
    </div>
  );
}

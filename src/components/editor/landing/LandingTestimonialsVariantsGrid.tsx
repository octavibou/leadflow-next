"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "testimonials_tpl_center_three_cards",
  "testimonials_tpl_center_three_photo",
  "testimonials_tpl_center_three_rich",
  "testimonials_tpl_split_featured",
  "testimonials_tpl_center_single",
  "testimonials_tpl_center_single_immersive",
] as const satisfies readonly LandingBuilderComponentId[];

function SectionHeader() {
  return (
    <div className="flex w-full flex-col items-center gap-0.5">
      <div className="h-1 w-[60%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[78%] rounded-sm bg-muted-foreground/35" />
    </div>
  );
}

function PreviewThreeCards() {
  return (
    <div className="flex w-full flex-col gap-1 px-0.5">
      <SectionHeader />
      <div className="mt-1 flex gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded border border-border/60 bg-muted/45 p-1">
            <span className="text-[6px] text-amber-500">★★★★★</span>
            <div className="h-0.5 w-full rounded-sm bg-foreground/75" />
            <div className="mt-1 flex gap-0.5">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                <div className="h-0.5 w-full rounded-sm bg-foreground/85" />
                <div className="h-0.5 w-[80%] rounded-sm bg-muted-foreground/35" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewThreePhoto() {
  return (
    <div className="flex w-full flex-col gap-1 px-0.5">
      <SectionHeader />
      <div className="mt-1 flex gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="relative min-w-0 flex-1 overflow-hidden rounded-md">
            <div className="aspect-[3/5] w-full bg-gradient-to-b from-muted-foreground/35 to-muted-foreground/15" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-1 pb-1 pt-4">
              <div className="h-0.5 w-full rounded-sm bg-white/95" />
              <div className="mt-[2px] h-0.5 w-[70%] rounded-sm bg-white/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewThreeRich() {
  return (
    <div className="flex w-full flex-col gap-1 px-0.5">
      <SectionHeader />
      <div className="mt-1 flex gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[6px] text-amber-500">★★★★★</span>
            <div className="h-0.5 w-full rounded-sm bg-foreground/80" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/28" />
            <div className="h-0.5 w-[90%] rounded-sm bg-muted-foreground/22" />
            <div className="mt-0.5 h-0.5 w-[55%] rounded-sm bg-foreground/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSplitFeatured() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-0.5">
          <div className="h-2 w-4 rounded-sm bg-muted-foreground/30" />
          <div className="h-0.5 w-8 rounded-sm bg-foreground/60" />
        </div>
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-1 w-[92%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-[70%] rounded-sm bg-foreground/85" />
        <div className="mt-1 h-0.5 w-[45%] rounded-sm bg-foreground/80" />
        <div className="h-0.5 w-[65%] rounded-sm bg-muted-foreground/35" />
      </div>
      <div className="w-[38%] shrink-0 rounded-md bg-gradient-to-br from-amber-100/60 to-muted-foreground/25" />
    </div>
  );
}

function PreviewCenterSingle() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-2">
      <span className="text-[7px] text-amber-500">★★★★★</span>
      <div className="h-1 w-[92%] rounded-sm bg-foreground/85" />
      <div className="h-1 w-[88%] rounded-sm bg-foreground/85" />
      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      <div className="h-0.5 w-[40%] rounded-sm bg-foreground/80" />
      <div className="h-0.5 w-[55%] rounded-sm bg-muted-foreground/35" />
    </div>
  );
}

function PreviewCenterSingleImmersive() {
  return (
    <div className="relative flex w-full flex-col items-center gap-1 overflow-hidden rounded-lg px-2 py-2">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 to-slate-950/95" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(100,120,140,0.5) 0%, rgba(40,50,60,0.4) 100%)",
        }}
      />
      <div className="relative z-[1] flex flex-col items-center gap-1">
        <div className="h-1 w-6 rounded-sm bg-white/90" />
        <div className="h-1 w-[88%] rounded-sm bg-white" />
        <div className="h-1 w-[82%] rounded-sm bg-white" />
        <div className="mt-1 h-2.5 w-2.5 rounded-full border border-white/40 bg-white/25" />
        <div className="h-0.5 w-[38%] rounded-sm bg-white" />
        <div className="h-0.5 w-[50%] rounded-sm bg-white/75" />
      </div>
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  testimonials_tpl_center_three_cards: PreviewThreeCards,
  testimonials_tpl_center_three_photo: PreviewThreePhoto,
  testimonials_tpl_center_three_rich: PreviewThreeRich,
  testimonials_tpl_split_featured: PreviewSplitFeatured,
  testimonials_tpl_center_single: PreviewCenterSingle,
  testimonials_tpl_center_single_immersive: PreviewCenterSingleImmersive,
};

function TemplateCard({ id }: { id: (typeof TEMPLATE_ORDER)[number] }) {
  const { activeComponent, sheetOpen, openComponent } = useLandingBuilder();
  const meta = LANDING_COMPONENT_META[id];
  const Preview = PREVIEW_BY_ID[id];
  const active = activeComponent === id && sheetOpen;

  return (
    <button
      type="button"
      onClick={() => openComponent(id)}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-border/70 bg-card p-2.5 text-left shadow-sm transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "ring-2 ring-primary",
      )}
    >
      <div className="flex min-h-[100px] w-full items-center justify-center rounded-lg border border-border/50 bg-muted/20 px-1 py-2">
        <Preview />
      </div>
      <div>
        <p className="text-xs font-semibold leading-tight text-foreground">
          {meta.title.replace(/^Testimonios · /, "")}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingTestimonialsVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

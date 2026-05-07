"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "quiz_tpl_split_benefits",
  "quiz_tpl_center_grid_bordered",
  "quiz_tpl_center_grid_solid",
  "quiz_tpl_row_image_cards",
  "quiz_tpl_center_dual_image",
  "quiz_tpl_split_info_sidebar",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewSplitBenefits() {
  return (
    <div className="flex w-full gap-1 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-0.5 w-[40%] rounded-sm bg-primary" />
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-0.5 rounded border border-border/60 bg-background py-[1px] pl-0.5 pr-0.5"
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-sm bg-muted-foreground/35" />
            <div className="h-0.5 min-w-0 flex-1 rounded-sm bg-muted-foreground/35" />
            <div className="h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/45" />
          </div>
        ))}
        <div className="mt-0.5 h-2 w-full rounded-sm bg-primary" />
      </div>
      <div className="flex w-[38%] shrink-0 flex-col gap-0.5 rounded-md border border-border/50 bg-muted/45 p-0.5">
        <div className="h-0.5 w-full rounded-sm bg-foreground/75" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-0.5">
            <div className="h-2 w-2 shrink-0 rounded-full bg-primary/35" />
            <div className="flex flex-1 flex-col gap-[1px]">
              <div className="h-0.5 w-[45%] rounded-sm bg-foreground/80" />
              <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCenterGridBordered() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-0.5 w-[32%] rounded-sm bg-primary" />
      <div className="h-1 w-[88%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[75%] rounded-sm bg-muted-foreground/35" />
      <div className="mt-0.5 grid w-full grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-0.5 rounded border border-border/70 bg-background p-0.5"
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-sm bg-amber-400/80" />
            <div className="h-0.5 min-w-0 flex-1 rounded-sm bg-muted-foreground/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCenterGridSolid() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-0.5 w-[32%] rounded-sm bg-primary" />
      <div className="h-1 w-[88%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[75%] rounded-sm bg-muted-foreground/35" />
      <div className="mt-0.5 grid w-full grid-cols-2 gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-0.5 rounded bg-primary py-[3px] pl-0.5 pr-0.5">
            <div className="h-1.5 w-1.5 shrink-0 rounded-sm bg-primary-foreground/90" />
            <div className="h-0.5 min-w-0 flex-1 rounded-sm bg-primary-foreground/80" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewRowImageCards() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="h-0.5 w-[30%] rounded-sm bg-primary" />
      <div className="h-1 w-[85%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[70%] rounded-sm bg-muted-foreground/35" />
      <div className="mt-0.5 flex w-full gap-0.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border/50">
            <div className="aspect-[4/3] w-full bg-gradient-to-br from-muted-foreground/25 to-muted-foreground/15" />
            <div className="h-2 w-full bg-primary" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCenterDualImage() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-0.5 w-[34%] rounded-sm bg-primary" />
      <div className="h-1 w-[80%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[72%] rounded-sm bg-muted-foreground/35" />
      <div className="mt-0.5 flex w-full gap-1">
        <div className="aspect-video min-w-0 flex-1 rounded-md bg-gradient-to-br from-sky-200/50 to-muted-foreground/20" />
        <div className="aspect-video min-w-0 flex-1 rounded-md bg-gradient-to-br from-amber-100/60 to-muted-foreground/20" />
      </div>
    </div>
  );
}

function PreviewSplitInfoSidebar() {
  return (
    <div className="flex w-full gap-1 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="grid grid-cols-2 gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded border border-border/50">
              <div className="aspect-square w-full bg-muted-foreground/25" />
              <div className="h-1.5 w-full bg-primary" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex w-[40%] shrink-0 flex-col gap-0.5 rounded-md border border-border/50 bg-muted/45 p-0.5">
        <div className="mx-auto h-3 w-6 rounded-sm bg-primary/25" />
        <div className="h-0.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/22" />
      </div>
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  quiz_tpl_split_benefits: PreviewSplitBenefits,
  quiz_tpl_center_grid_bordered: PreviewCenterGridBordered,
  quiz_tpl_center_grid_solid: PreviewCenterGridSolid,
  quiz_tpl_row_image_cards: PreviewRowImageCards,
  quiz_tpl_center_dual_image: PreviewCenterDualImage,
  quiz_tpl_split_info_sidebar: PreviewSplitInfoSidebar,
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
        <p className="text-xs font-semibold leading-tight text-foreground">{meta.title.replace(/^Quiz · /, "")}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingQuizVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

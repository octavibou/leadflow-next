"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "team_tpl_center_grid_six",
  "team_tpl_center_photo_overlay",
  "team_tpl_center_photo_stacked",
  "team_tpl_split_spotlight_text",
  "team_tpl_split_spotlight_icons",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewGridSix() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="h-0.5 w-[30%] rounded-sm bg-primary" />
      <div className="h-1 w-[75%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[88%] rounded-sm bg-muted-foreground/30" />
      <div className="mt-1 grid w-full grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-0.5 rounded border border-border/60 bg-muted/40 p-0.5">
            <div className="flex gap-0.5">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/35" />
              <div className="flex min-w-0 flex-1 flex-col gap-[1px] pt-0.5">
                <div className="h-0.5 w-full rounded-sm bg-foreground/80" />
                <div className="h-0.5 w-[70%] rounded-sm bg-muted-foreground/40" />
              </div>
            </div>
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPhotoOverlay() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="h-0.5 w-[28%] rounded-sm bg-primary" />
      <div className="h-1 w-[70%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[82%] rounded-sm bg-muted-foreground/30" />
      <div className="mt-1 flex w-full gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-md">
            <div className="aspect-[3/5] w-full bg-gradient-to-b from-muted-foreground/35 to-muted-foreground/20" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-0.5 pb-0.5 pt-2">
              <div className="h-0.5 w-[85%] rounded-sm bg-white/95" />
              <div className="mt-[1px] h-0.5 w-[55%] rounded-sm bg-white/75" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewPhotoStacked() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="h-1 w-[65%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[78%] rounded-sm bg-muted-foreground/30" />
      <div className="mt-1 flex w-full gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="aspect-[4/5] w-full rounded-md bg-gradient-to-br from-slate-300/60 to-muted-foreground/25" />
            <div className="h-0.5 w-full rounded-sm bg-foreground/85" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/28" />
            <div className="h-0.5 w-[90%] rounded-sm bg-muted-foreground/22" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSplitText() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="w-[40%] shrink-0 rounded-md bg-gradient-to-b from-rose-100/50 to-muted-foreground/25 dark:from-rose-950/40" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-0.5 w-[38%] rounded-sm bg-primary" />
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
      </div>
    </div>
  );
}

function PreviewSplitIcons() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-0.5 w-[36%] rounded-sm bg-primary" />
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-0.5 flex gap-0.5">
            <div className="h-2 w-2 shrink-0 rounded-full bg-primary/35" />
            <div className="flex flex-1 flex-col gap-[1px]">
              <div className="h-0.5 w-[50%] rounded-sm bg-foreground/80" />
              <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
            </div>
          </div>
        ))}
      </div>
      <div className="w-[38%] shrink-0 rounded-md bg-gradient-to-b from-slate-300/50 to-muted-foreground/30" />
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  team_tpl_center_grid_six: PreviewGridSix,
  team_tpl_center_photo_overlay: PreviewPhotoOverlay,
  team_tpl_center_photo_stacked: PreviewPhotoStacked,
  team_tpl_split_spotlight_text: PreviewSplitText,
  team_tpl_split_spotlight_icons: PreviewSplitIcons,
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
        <p className="text-xs font-semibold leading-tight text-foreground">{meta.title.replace(/^Equipo · /, "")}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingTeamVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

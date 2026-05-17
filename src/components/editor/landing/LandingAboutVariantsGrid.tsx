"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "about_tpl_center_logos",
  "about_tpl_split_columns",
  "about_tpl_three_pillars",
  "about_tpl_contact_map",
  "about_tpl_split_image_cta",
  "about_tpl_split_features",
  "about_tpl_split_accordion",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewCenterLogos() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-2">
      <div className="h-1 w-[88%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[72%] rounded-sm bg-muted-foreground/35" />
      <div className="h-0.5 w-[80%] rounded-sm bg-muted-foreground/25" />
      <div className="mt-1 flex justify-center gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-2 w-6 rounded-sm bg-muted-foreground/40" />
        ))}
      </div>
    </div>
  );
}

function PreviewSplitColumns() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/35" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
      </div>
    </div>
  );
}

function PreviewThreePillars() {
  return (
    <div className="flex w-full flex-col gap-1.5 px-0.5">
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-1 w-[70%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-[85%] rounded-sm bg-muted-foreground/30" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="aspect-[5/3] w-full rounded-md bg-muted-foreground/25" />
            <div className="h-0.5 w-full rounded-sm bg-foreground/80" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewContactMap() {
  return (
    <div className="flex w-full flex-col gap-1 px-0.5">
      <div className="flex gap-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="h-0.5 w-[28%] rounded-sm bg-primary" />
          <div className="h-1 w-full rounded-sm bg-foreground/85" />
          <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
          <div className="h-0.5 w-[90%] rounded-sm bg-muted-foreground/25" />
        </div>
        <div className="flex w-[42%] shrink-0 flex-col gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-0.5">
              <div className="h-2 w-2 shrink-0 rounded-full bg-primary/25" />
              <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                <div className="h-0.5 w-[40%] rounded-sm bg-foreground/80" />
                <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-6 w-full rounded-md bg-muted-foreground/20" />
    </div>
  );
}

function PreviewSplitImageCta() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
        <div className="mt-0.5 h-2 w-[45%] rounded-sm bg-primary" />
        <div className="flex items-center gap-0.5 pt-0.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-background bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[6px] text-amber-500">★★★★★</span>
      </div>
      <div className="w-[34%] shrink-0 self-stretch rounded-md bg-gradient-to-b from-primary/15 to-muted-foreground/25 dark:from-chrome-panel/40" />
    </div>
  );
}

function PreviewSplitFeatures() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="w-[38%] shrink-0 rounded-md bg-gradient-to-br from-muted-foreground/30 to-muted-foreground/15" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-0.5">
            <div className="h-2 w-2 shrink-0 rounded-full bg-primary/30" />
            <div className="flex flex-1 flex-col gap-[2px]">
              <div className="h-0.5 w-[50%] rounded-sm bg-foreground/80" />
              <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewSplitAccordion() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-0.5 flex flex-col gap-[2px] rounded border border-border/50 bg-muted/30 p-0.5">
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/40" />
            {i === 0 && <div className="h-0.5 w-full rounded-sm bg-muted-foreground/20" />}
          </div>
        ))}
      </div>
      <div className="w-[34%] shrink-0 self-stretch rounded-md bg-gradient-to-b from-slate-200/60 to-muted-foreground/25 dark:from-slate-800/50" />
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  about_tpl_center_logos: PreviewCenterLogos,
  about_tpl_split_columns: PreviewSplitColumns,
  about_tpl_three_pillars: PreviewThreePillars,
  about_tpl_contact_map: PreviewContactMap,
  about_tpl_split_image_cta: PreviewSplitImageCta,
  about_tpl_split_features: PreviewSplitFeatures,
  about_tpl_split_accordion: PreviewSplitAccordion,
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
          {meta.title.replace(/^Sobre nosotros · /, "")}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingAboutVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

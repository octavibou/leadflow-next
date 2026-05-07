"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "product_tpl_split_checklist",
  "product_tpl_split_support_image",
  "product_tpl_split_analyses",
  "product_tpl_three_columns",
  "product_tpl_cta_two_col_grid",
  "product_tpl_center_feature_grid",
  "product_tpl_split_list_dashboard",
  "product_tpl_split_logos_support",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewSplitChecklist() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/35" />
        <div className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-background bg-muted-foreground/40" />
          ))}
        </div>
        <span className="text-[7px] text-amber-500">★★★★★</span>
      </div>
      <div className="flex w-[44%] shrink-0 flex-col gap-0.5 rounded-md border border-border/50 bg-muted/40 p-1">
        <div className="text-[6px] font-semibold text-foreground/80">Why?</div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span className="text-primary">✓</span>
            <div className="h-1 flex-1 rounded-sm bg-muted-foreground/30" />
          </div>
        ))}
        <div className="mt-0.5 h-2 w-full rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewSplitSupportImage() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-[95%] rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/35" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/25" />
        <div className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-2 w-2 rounded-full bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[7px] text-amber-500">★★★★★</span>
      </div>
      <div className="w-[38%] shrink-0 rounded-md bg-gradient-to-b from-rose-100/60 to-muted-foreground/20 dark:from-rose-950/40" />
    </div>
  );
}

function PreviewSplitAnalyses() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="w-[42%] shrink-0 rounded-md bg-gradient-to-br from-sky-200/50 to-muted-foreground/30" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-0.5">
            <div className="h-2 w-2 shrink-0 rounded-sm bg-primary/80" />
            <div className="flex flex-1 flex-col gap-0.5 pt-0.5">
              <div className="h-1 w-full rounded-sm bg-foreground/70" />
              <div className="h-1 w-full rounded-sm bg-muted-foreground/30" />
            </div>
          </div>
        ))}
        <div className="h-2 w-[70%] rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewThreeColumns() {
  return (
    <div className="flex w-full flex-col gap-1.5 px-0.5">
      <div className="h-1 w-[20%] self-center rounded-sm bg-primary" />
      <div className="h-1.5 w-[85%] self-center rounded-sm bg-foreground/80" />
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="aspect-[4/3] w-full rounded-md bg-muted-foreground/25" />
            <div className="h-1 w-full rounded-sm bg-foreground/80" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCtaTwoColGrid() {
  return (
    <div className="flex w-full flex-col gap-1 px-0.5">
      <div className="h-1 w-[18%] self-center rounded-sm bg-primary" />
      <div className="h-1 w-[70%] self-center rounded-sm bg-foreground/80" />
      <div className="mx-auto h-2 w-[40%] rounded-sm bg-primary" />
      <div className="flex gap-1">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="aspect-video w-full rounded-md bg-muted-foreground/20" />
          <div className="h-1 w-full rounded-sm bg-foreground/70" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="aspect-video w-full rounded-md bg-muted-foreground/20" />
          <div className="h-1 w-full rounded-sm bg-foreground/70" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-0.5 rounded-sm border border-border/40 p-0.5">
            <div className="h-3 w-3 shrink-0 rounded-full bg-primary/40" />
            <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
              <div className="h-0.5 w-full rounded-sm bg-foreground/70" />
              <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCenterFeatureGrid() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-1 w-[22%] rounded-sm bg-primary" />
      <div className="h-1.5 w-[88%] rounded-sm bg-foreground/80" />
      <div className="h-2 w-[42%] rounded-sm bg-primary" />
      <div className="mt-0.5 grid w-full grid-cols-2 gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5 rounded-md border border-border/50 bg-muted/25 p-1">
            <div className="h-3 w-3 rounded-full bg-primary/50" />
            <div className="h-0.5 w-full rounded-sm bg-foreground/70" />
            <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewListDashboard() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1 w-[28%] rounded-sm bg-primary" />
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/35" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="h-2 w-2 shrink-0 rounded-sm bg-primary/70" />
            <div className="h-1 flex-1 rounded-sm bg-muted-foreground/35" />
          </div>
        ))}
      </div>
      <div className="w-[35%] shrink-0 rounded-md border border-border/40 bg-gradient-to-b from-indigo-100/40 to-muted-foreground/25 dark:from-indigo-950/50" />
    </div>
  );
}

function PreviewLogosSupport() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1 w-[30%] rounded-sm bg-primary" />
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/35" />
        <div className="text-[6px] text-muted-foreground">200+ clientes</div>
        <div className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-2 w-6 rounded-sm bg-muted-foreground/40" />
          ))}
        </div>
        <div className="h-2 w-full rounded-sm bg-primary" />
      </div>
      <div className="w-[36%] shrink-0 rounded-md bg-gradient-to-b from-slate-200/60 to-muted-foreground/30" />
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  product_tpl_split_checklist: PreviewSplitChecklist,
  product_tpl_split_support_image: PreviewSplitSupportImage,
  product_tpl_split_analyses: PreviewSplitAnalyses,
  product_tpl_three_columns: PreviewThreeColumns,
  product_tpl_cta_two_col_grid: PreviewCtaTwoColGrid,
  product_tpl_center_feature_grid: PreviewCenterFeatureGrid,
  product_tpl_split_list_dashboard: PreviewListDashboard,
  product_tpl_split_logos_support: PreviewLogosSupport,
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
          {meta.title.replace(/^Producto · /, "")}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingProductVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

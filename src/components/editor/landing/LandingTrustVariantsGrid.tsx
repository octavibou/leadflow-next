"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "trust_tpl_center_mission_cta",
  "trust_tpl_center_band_muted",
  "trust_tpl_center_band_open",
  "trust_tpl_split_copy_grid",
] as const satisfies readonly LandingBuilderComponentId[];

function LogoRowFaded({ dense }: { dense?: boolean }) {
  const n = dense ? 6 : 8;
  return (
    <div className="flex w-full items-center justify-center gap-[3px] px-1">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="h-2 rounded-sm bg-muted-foreground/45"
          style={{
            opacity: i === 0 || i === n - 1 ? 0.35 : i === 1 || i === n - 2 ? 0.55 : 1,
            width: dense ? "10px" : "9px",
          }}
        />
      ))}
    </div>
  );
}

function PreviewMissionCta() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-1 w-[72%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[88%] rounded-sm bg-muted-foreground/30" />
      <div className="h-0.5 w-[85%] rounded-sm bg-muted-foreground/25" />
      <div className="h-0.5 w-[80%] rounded-sm bg-muted-foreground/22" />
      <div className="mt-1 flex w-full flex-col gap-[3px]">
        <LogoRowFaded />
        <LogoRowFaded />
      </div>
      <div className="mt-1 h-2 w-[38%] rounded-sm bg-primary" />
    </div>
  );
}

function PreviewBandMuted() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="flex w-full flex-col gap-1 rounded-lg border border-border/50 bg-muted/50 px-1 py-1.5">
        <div className="h-1 w-[75%] self-center rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-[88%] self-center rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-[82%] self-center rounded-sm bg-muted-foreground/25" />
        <LogoRowFaded dense />
      </div>
    </div>
  );
}

function PreviewBandOpen() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-1">
      <div className="h-1 w-[75%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[88%] rounded-sm bg-muted-foreground/30" />
      <div className="h-0.5 w-[82%] rounded-sm bg-muted-foreground/25" />
      <div className="mt-1 w-full">
        <LogoRowFaded dense />
      </div>
    </div>
  );
}

function PreviewSplitCopyGrid() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-0.5 w-[92%] rounded-sm bg-muted-foreground/25" />
      </div>
      <div className="w-[42%] shrink-0 rounded-lg border border-border/60 bg-card p-1 shadow-sm">
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[5/3] rounded-sm bg-muted-foreground/35" />
          ))}
        </div>
      </div>
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  trust_tpl_center_mission_cta: PreviewMissionCta,
  trust_tpl_center_band_muted: PreviewBandMuted,
  trust_tpl_center_band_open: PreviewBandOpen,
  trust_tpl_split_copy_grid: PreviewSplitCopyGrid,
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
          {meta.title.replace(/^Confianza · /, "")}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingTrustVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

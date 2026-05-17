"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "cta_tpl_split_form",
  "cta_tpl_split_proof_faq",
  "cta_tpl_center_minimal",
  "cta_tpl_center_dark_social",
  "cta_tpl_center_light_social",
  "cta_tpl_center_gradient_logos",
  "cta_tpl_split_trial_social",
  "cta_tpl_split_trial_copy",
  "cta_tpl_center_narrow",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewSplitForm() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-1 w-[72%] rounded-sm bg-foreground/85" />
      </div>
      <div className="flex w-[46%] shrink-0 flex-col gap-0.5">
        <div className="h-1.5 w-full rounded-sm border border-border/60 bg-muted/50" />
        <div className="h-1.5 w-full rounded-sm border border-border/60 bg-muted/50" />
        <div className="flex gap-0.5">
          <div className="h-1.5 w-1.5 rounded-[2px] border border-muted-foreground/40" />
          <div className="h-1 flex-1 rounded-sm bg-muted-foreground/25" />
        </div>
        <div className="mt-0.5 h-2 w-full rounded-sm bg-primary" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/20" />
      </div>
    </div>
  );
}

function PreviewSplitProofFaq() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/35" />
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-background bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[7px] text-amber-500">★★★★★</span>
        <div className="text-[6px] text-muted-foreground">4,9 / 200+</div>
      </div>
      <div className="flex w-[42%] shrink-0 flex-col gap-1">
        <div className="h-2 w-full rounded-sm bg-primary" />
        <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-0.5">
          <div className="h-0.5 w-full rounded-sm bg-muted-foreground/35" />
          <div className="h-0.5 w-[90%] rounded-sm bg-muted-foreground/25" />
          <div className="h-0.5 w-full rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="flex flex-col gap-0.5 rounded-md bg-muted/50 p-0.5">
          <div className="h-0.5 w-full rounded-sm bg-muted-foreground/35" />
          <div className="h-0.5 w-full rounded-sm bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}

function PreviewCenterMinimal() {
  return (
    <div className="flex w-full justify-center px-1">
      <div className="flex w-full max-w-[85%] flex-col items-center gap-1 rounded-md border border-border/50 bg-muted/35 px-2 py-1.5">
        <div className="h-1 w-[88%] rounded-sm bg-foreground/80" />
        <div className="h-0.5 w-[75%] rounded-sm bg-muted-foreground/40" />
        <div className="mt-0.5 h-2 w-[40%] rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewCenterDarkSocial() {
  return (
    <div className="flex w-full justify-center px-1">
      <div className="flex w-full max-w-[88%] flex-col items-center gap-1 rounded-md bg-neutral-900 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-neutral-700 bg-neutral-600" />
          ))}
        </div>
        <span className="text-[6px] text-amber-400">★★★★★</span>
        <div className="h-1 w-[80%] rounded-sm bg-white/90" />
        <div className="h-0.5 w-[65%] rounded-sm bg-white/45" />
        <div className="mt-0.5 h-2 w-[42%] rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewCenterLightSocial() {
  return (
    <div className="flex w-full justify-center px-1">
      <div className="flex w-full max-w-[88%] flex-col items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-background bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[7px] text-amber-500">★★★★★</span>
        <div className="text-[6px] text-muted-foreground">200+ clientes</div>
        <div className="h-1 w-[78%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-[70%] rounded-sm bg-muted-foreground/35" />
        <div className="h-2 w-[44%] rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewCenterGradientLogos() {
  return (
    <div className="flex w-full justify-center px-1">
      <div className="flex w-full max-w-[90%] flex-col items-center gap-1 rounded-md bg-gradient-to-b from-primary/12 to-background px-2 py-1.5 dark:from-chrome-panel/50">
        <div className="h-1 w-[82%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-[72%] rounded-sm bg-muted-foreground/35" />
        <div className="h-2 w-[42%] rounded-sm bg-primary/90" />
        <div className="mt-1 flex w-full justify-center gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-1.5 w-3 rounded-sm bg-muted-foreground/45" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSplitTrialSocial() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-1 w-[70%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/30" />
        <div className="flex gap-0.5 pt-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full border border-background bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[6px] text-amber-500">★★★★★</span>
      </div>
      <div className="flex w-[48%] shrink-0 flex-col gap-0.5">
        <div className="h-0.5 w-full rounded-sm bg-foreground/70" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 w-full rounded-sm border border-border/60 bg-muted/40" />
        ))}
        <div className="flex gap-0.5 pt-0.5">
          <div className="h-1 w-1 rounded-[1px] border border-muted-foreground/35" />
          <div className="h-1 flex-1 rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="h-2 w-full rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewSplitTrialCopy() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-1 w-full rounded-sm bg-foreground/85" />
        <div className="h-1 w-[65%] rounded-sm bg-foreground/85" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/35" />
        <div className="h-0.5 w-full rounded-sm bg-muted-foreground/25" />
        <div className="h-0.5 w-[85%] rounded-sm bg-muted-foreground/25" />
      </div>
      <div className="flex w-[46%] shrink-0 flex-col gap-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 w-full rounded-sm border border-border/60 bg-muted/40" />
        ))}
        <div className="flex gap-0.5 pt-0.5">
          <div className="h-1 w-1 rounded-[1px] border border-muted-foreground/35" />
          <div className="h-1 flex-1 rounded-sm bg-muted-foreground/20" />
        </div>
        <div className="h-2 w-full rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewCenterNarrow() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-2">
      <div className="h-1 w-[88%] rounded-sm bg-foreground/85" />
      <div className="h-0.5 w-[72%] rounded-sm bg-muted-foreground/35" />
      <div className="h-2 w-[32%] rounded-sm bg-primary" />
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => ReactNode> = {
  cta_tpl_split_form: PreviewSplitForm,
  cta_tpl_split_proof_faq: PreviewSplitProofFaq,
  cta_tpl_center_minimal: PreviewCenterMinimal,
  cta_tpl_center_dark_social: PreviewCenterDarkSocial,
  cta_tpl_center_light_social: PreviewCenterLightSocial,
  cta_tpl_center_gradient_logos: PreviewCenterGradientLogos,
  cta_tpl_split_trial_social: PreviewSplitTrialSocial,
  cta_tpl_split_trial_copy: PreviewSplitTrialCopy,
  cta_tpl_center_narrow: PreviewCenterNarrow,
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
        <p className="text-xs font-semibold leading-tight text-foreground">{meta.title.replace(/^CTA · /, "")}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingCTAVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";

const TEMPLATE_ORDER = [
  "hero_tpl_center_logos",
  "hero_tpl_split_media",
  "hero_tpl_split_lead",
  "hero_tpl_lead_image",
  "hero_tpl_split_corporate",
  "hero_tpl_promo_tint",
  "hero_tpl_center_media_below",
  "hero_tpl_center_social",
] as const satisfies readonly LandingBuilderComponentId[];

function PreviewCenterLogos() {
  return (
    <div className="flex w-full flex-col items-center gap-1.5 px-1">
      <div className="h-1.5 w-[70%] rounded-sm bg-foreground/80" />
      <div className="h-1 w-[85%] rounded-sm bg-muted-foreground/35" />
      <div className="mt-0.5 h-2 w-[45%] rounded-sm bg-primary" />
      <div className="mt-1 flex w-full justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-2 w-4 rounded-sm bg-muted-foreground/30" />
        ))}
      </div>
    </div>
  );
}

function PreviewSplitMedia() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/30" />
        <div className="mt-0.5 h-2 w-[60%] rounded-sm bg-primary" />
        <div className="mt-0.5 flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 w-3 rounded-sm bg-muted-foreground/25" />
          ))}
        </div>
      </div>
      <div className="w-[38%] shrink-0 rounded-md bg-gradient-to-br from-muted to-muted-foreground/30" />
    </div>
  );
}

function PreviewSplitLead() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-full rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/30" />
      </div>
      <div className="flex w-[42%] shrink-0 flex-col gap-1 rounded-md border border-border/60 bg-muted/40 p-1">
        <div className="h-1.5 w-full rounded border border-border/50 bg-background" />
        <div className="h-1.5 w-full rounded border border-border/50 bg-background" />
        <div className="mt-0.5 h-2 w-full rounded-sm bg-primary" />
      </div>
    </div>
  );
}

function PreviewLeadImage() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex w-[44%] shrink-0 flex-col gap-1 rounded-md border border-border/60 bg-muted/40 p-1">
        <div className="h-1.5 w-full rounded border border-border/50 bg-background" />
        <div className="h-1.5 w-full rounded border border-border/50 bg-background" />
        <div className="h-2 w-full rounded-sm bg-primary" />
      </div>
      <div className="min-w-0 flex-1 rounded-md bg-gradient-to-br from-amber-100/50 to-muted-foreground/20 dark:from-amber-950/30" />
    </div>
  );
}

function PreviewCorporate() {
  return (
    <div className="flex w-full gap-1.5 px-0.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="h-1.5 w-[90%] rounded-sm bg-foreground/80" />
        <div className="h-1 w-full rounded-sm bg-muted-foreground/30" />
        <div className="h-2 w-[55%] rounded-sm bg-primary" />
      </div>
      <div className="w-[40%] shrink-0 rounded-md bg-gradient-to-br from-slate-300/60 to-slate-500/40" />
    </div>
  );
}

function PreviewPromoTint() {
  return (
    <div className="flex w-full flex-col gap-1 rounded-md bg-primary/12 px-2 py-1.5 dark:bg-chrome-panel/40">
      <div className="h-1.5 w-[80%] self-center rounded-sm bg-foreground/90" />
      <div className="h-1 w-full rounded-sm bg-foreground/40" />
      <div className="mx-auto h-2 w-[50%] rounded-sm bg-primary" />
    </div>
  );
}

function PreviewMediaBelow() {
  return (
    <div className="flex w-full flex-col items-center gap-1.5 px-0.5">
      <div className="h-1.5 w-[75%] rounded-sm bg-foreground/80" />
      <div className="h-1 w-[90%] rounded-sm bg-muted-foreground/35" />
      <div className="h-2 w-[48%] rounded-sm bg-primary" />
      <div className="mt-0.5 h-10 w-full rounded-md bg-gradient-to-br from-muted to-muted-foreground/25" />
    </div>
  );
}

function PreviewSocial() {
  return (
    <div className="flex w-full flex-col items-center gap-1 px-0.5">
      <div className="h-1.5 w-[70%] rounded-sm bg-foreground/80" />
      <div className="h-1 w-[88%] rounded-sm bg-muted-foreground/35" />
      <div className="h-2 w-[45%] rounded-sm bg-primary" />
      <div className="flex items-center gap-1">
        <div className="flex -space-x-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-3 rounded-full border border-background bg-muted-foreground/35" />
          ))}
        </div>
        <span className="text-[8px] text-amber-500">★★★★★</span>
      </div>
      <div className="h-8 w-full rounded-md bg-gradient-to-br from-muted to-muted-foreground/20" />
    </div>
  );
}

const PREVIEW_BY_ID: Record<(typeof TEMPLATE_ORDER)[number], () => React.ReactNode> = {
  hero_tpl_center_logos: PreviewCenterLogos,
  hero_tpl_split_media: PreviewSplitMedia,
  hero_tpl_split_lead: PreviewSplitLead,
  hero_tpl_lead_image: PreviewLeadImage,
  hero_tpl_split_corporate: PreviewCorporate,
  hero_tpl_promo_tint: PreviewPromoTint,
  hero_tpl_center_media_below: PreviewMediaBelow,
  hero_tpl_center_social: PreviewSocial,
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
        <p className="text-xs font-semibold leading-tight text-foreground">{meta.title.replace(/^Hero · /, "")}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
      </div>
    </button>
  );
}

export function LandingHeroVariantsGrid() {
  return (
    <div className="flex flex-col gap-3">
      {TEMPLATE_ORDER.map((id) => (
        <TemplateCard key={id} id={id} />
      ))}
    </div>
  );
}

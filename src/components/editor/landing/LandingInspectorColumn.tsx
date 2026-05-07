"use client";

import { useState } from "react";
import { Monitor, DeviceMobile, X } from "@phosphor-icons/react";
import type { FunnelStep } from "@/types/funnel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useLandingBuilder } from "@/components/editor/landing/LandingBuilderContext";
import {
  type LandingBuilderComponentId,
  emptyDraft,
  isIntroLandingPickComponentId,
  isLandingBasicBlockId,
  isLandingHeroTemplateId,
  LANDING_COMPONENT_META,
} from "@/components/editor/landing/landingBuilderTypes";
import { LandingComponentEditPanel } from "@/components/editor/landing/LandingComponentEditPanel";

function LandingIntroPickFields({
  componentId,
  step,
  onUpdateIntro,
}: {
  componentId: LandingBuilderComponentId;
  step: FunnelStep;
  onUpdateIntro: (updates: Partial<FunnelStep>) => void;
}) {
  const c = step.introConfig || {
    headline: "",
    description: "",
    cta: "",
    showVideo: false,
  };

  const set = (key: string, value: unknown) =>
    onUpdateIntro({ introConfig: { ...c, [key]: value } });

  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const prefix = device === "mobile" ? "mobile" : "";
  const hKey = prefix ? "mobileHeadlineFontSize" : "headlineFontSize";
  const dKey = prefix ? "mobileDescriptionFontSize" : "descriptionFontSize";
  const cKey = prefix ? "mobileCtaFontSize" : "ctaFontSize";
  const sKey = prefix ? "mobileElementSpacing" : "elementSpacing";

  const hDefault = device === "mobile" ? 20 : 30;
  const dDefault = device === "mobile" ? 14 : 18;
  const cDefault = device === "mobile" ? 14 : 16;
  const sDefault = device === "mobile" ? 12 : 16;

  const v = (key: string, fallback: number) => {
    const raw = (c as unknown as Record<string, unknown>)[key];
    const n = typeof raw === "number" ? raw : fallback;
    return n;
  };

  const deviceToolbar = (
    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-2 py-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Vista</Label>
      <div className="flex gap-1 rounded-md border border-border/60 bg-background p-0.5">
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          className={`rounded-md p-1.5 transition-colors ${device === "desktop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Monitor className="h-3.5 w-3.5" weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          className={`rounded-md p-1.5 transition-colors ${device === "mobile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <DeviceMobile className="h-3.5 w-3.5" weight="bold" />
        </button>
      </div>
    </div>
  );

  if (isLandingHeroTemplateId(componentId)) {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs mb-1.5 block">Título</Label>
          <Input
            value={c.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Titular principal"
            className="h-9 text-sm"
          />
        </div>
        {deviceToolbar}
        <div>
          <Label className="text-xs text-muted-foreground">
            Título — {v(hKey, hDefault)}px
          </Label>
          <Slider
            min={12}
            max={60}
            step={1}
            value={[v(hKey, hDefault)]}
            onValueChange={([v]) => set(hKey, v)}
            className="mt-1"
          />
        </div>
        <Separator />
        <div>
          <Label className="text-xs text-muted-foreground">
            Espacio entre elementos — {v(sKey, sDefault)}px
          </Label>
          <Slider
            min={4}
            max={48}
            step={2}
            value={[v(sKey, sDefault)]}
            onValueChange={([v]) => set(sKey, v)}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  if (componentId === "core_text") {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs mb-1.5 block">Descripción</Label>
          <Textarea
            value={c.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Párrafo de apoyo"
            rows={5}
            className="resize-y text-sm"
          />
        </div>
        {deviceToolbar}
        <div>
          <Label className="text-xs text-muted-foreground">
            Descripción — {v(dKey, dDefault)}px
          </Label>
          <Slider
            min={10}
            max={32}
            step={1}
            value={[v(dKey, dDefault)]}
            onValueChange={([v]) => set(dKey, v)}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  if (componentId === "core_button") {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs mb-1.5 block">Texto del botón</Label>
          <Input
            value={c.cta}
            onChange={(e) => set("cta", e.target.value)}
            placeholder="Ej. Empezar"
            className="h-9 text-sm"
          />
        </div>
        {deviceToolbar}
        <div>
          <Label className="text-xs text-muted-foreground">
            Botón — {v(cKey, cDefault)}px
          </Label>
          <Slider
            min={10}
            max={28}
            step={1}
            value={[v(cKey, cDefault)]}
            onValueChange={([v]) => set(cKey, v)}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  if (componentId === "media_video") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Mostrar vídeo</Label>
          <Switch checked={c.showVideo} onCheckedChange={(v) => set("showVideo", v)} />
        </div>
        {c.showVideo && (
          <div>
            <Label className="text-xs mb-1.5 block">URL del vídeo</Label>
            <Input
              value={c.videoUrl || ""}
              onChange={(e) => set("videoUrl", e.target.value)}
              placeholder="YouTube, Vimeo, Loom…"
              className="h-9 text-sm font-mono text-[13px]"
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function LandingInspectorColumn({
  step,
  variationLabel,
  onUpdateIntro,
}: {
  step: FunnelStep;
  variationLabel: string;
  onUpdateIntro: (updates: Partial<FunnelStep>) => void;
}) {
  const {
    sheetOpen,
    activeComponent,
    closeInspector,
    patchDraft,
    activeDraft,
    selectedBodyRowId,
    persistBodyBlockDraft,
    introLayoutChromeSection,
  } = useLandingBuilder();

  const hasSelection = Boolean(sheetOpen && activeComponent);

  const introC = step.type === "intro" ? (step.introConfig || { headline: "", description: "", cta: "", showVideo: false }) : null;
  const setIntroField = (key: string, value: unknown) => {
    if (!introC || step.type !== "intro") return;
    onUpdateIntro({ introConfig: { ...introC, [key]: value } });
  };

  const title = (() => {
    if (sheetOpen && activeComponent) {
      const meta = LANDING_COMPONENT_META[activeComponent];
      if (meta) return meta.title;
      return "Bloque";
    }
    if (introLayoutChromeSection === "header") return "Cabecera";
    if (introLayoutChromeSection === "divider") return "Divisor";
    return "Contenido";
  })();

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-background min-h-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="min-w-0">
          <div className="block truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {variationLabel}
          </div>
          <div className="truncate text-sm font-medium leading-tight">{title}</div>
        </div>
        {(hasSelection || introLayoutChromeSection) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={closeInspector}
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" weight="bold" />
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {!hasSelection ? (
          <div className="space-y-4 p-4 text-sm text-muted-foreground">
            {step.type === "intro" && introC && introLayoutChromeSection === "divider" ? (
              <div className="space-y-3 text-foreground">
                <p className="text-sm font-medium leading-snug">Línea entre logo y contenido</p>
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs leading-snug">Mostrar línea divisoria</Label>
                  <Switch
                    checked={Boolean(introC.showLandingDivider)}
                    onCheckedChange={(v) => setIntroField("showLandingDivider", v)}
                  />
                </div>
                <p className="text-xs leading-snug text-muted-foreground">
                  Aunque la línea esté oculta, el lienzo conserva el mismo hueco vertical para mantener la alineación.
                </p>
              </div>
            ) : (
              <>
                {step.type === "intro" && introC && introLayoutChromeSection === "header" ? (
                  <div className="rounded-lg border border-border bg-muted/25 p-3 text-xs leading-snug text-foreground">
                    <span className="font-semibold">Cabecera</span>
                    <p className="mt-2 text-muted-foreground">
                      El logo se toma de los ajustes globales del funnel. Puedes quitarlo con la papelera en el lienzo o
                      cambiarlo desde la configuración del funnel (icono del engranaje arriba a la derecha).
                    </p>
                  </div>
                ) : null}
                <p>Pulsa en el título, la descripción, el botón o el vídeo en la vista previa para editar ese bloque.</p>
                <p className="text-xs">
                  También puedes arrastrar <span className="font-medium text-foreground/90">Bloques básicos</span> desde
                  el Constructor hasta la zona de contenido bajo el hero.
                </p>
                {step.type === "intro" && introC ? (
                  <>
                    <Separator />
                    <div className="space-y-3 text-foreground">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs leading-snug">Mostrar línea divisoria (logo / contenido)</Label>
                        <Switch
                          checked={Boolean(introC.showLandingDivider)}
                          onCheckedChange={(v) => setIntroField("showLandingDivider", v)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La zona superior siempre reserva espacio en la vista previa. El logo solo se muestra si lo subes
                        en ajustes globales del funnel.
                      </p>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : step.type === "intro" &&
          hasSelection &&
          activeComponent &&
          selectedBodyRowId &&
          isLandingBasicBlockId(activeComponent) ? (
          <div className="p-4">
            {(() => {
              const row = introC?.landingBodyBlocks?.find((b) => b.id === selectedBodyRowId);
              if (!row) {
                return <p className="text-sm text-muted-foreground">Este bloque ya no existe. Cierra el panel.</p>;
              }
              const draftFromRow = {
                ...emptyDraft(),
                title: row.title ?? "",
                subtitle: row.subtitle ?? "",
                body: row.body ?? "",
                ctaLabel: row.ctaLabel ?? "",
              };
              return (
                <LandingComponentEditPanel
                  variant="inline"
                  componentId={activeComponent}
                  draft={draftFromRow}
                  onChange={(patch) => persistBodyBlockDraft(selectedBodyRowId, patch)}
                  onClose={closeInspector}
                />
              );
            })()}
          </div>
        ) : step.type === "intro" && isIntroLandingPickComponentId(activeComponent) && !selectedBodyRowId ? (
          <div className="p-4">
            <LandingIntroPickFields componentId={activeComponent} step={step} onUpdateIntro={onUpdateIntro} />
          </div>
        ) : activeComponent ? (
          <LandingComponentEditPanel
            variant="inline"
            componentId={activeComponent}
            draft={activeDraft}
            onChange={(patch) => patchDraft(activeComponent, patch)}
            onClose={closeInspector}
          />
        ) : null}
      </ScrollArea>
    </div>
  );
}

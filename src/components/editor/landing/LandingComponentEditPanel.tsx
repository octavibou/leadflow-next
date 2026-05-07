"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LandingBuilderBlockDraft, LandingBuilderComponentId } from "@/components/editor/landing/landingBuilderTypes";
import { LANDING_COMPONENT_META } from "@/components/editor/landing/landingBuilderTypes";

/**
 * Panel lateral de edición de bloque, mismo cromo que {@link EditorProperties} (sin overlay ni Sheet).
 */
export function LandingComponentEditPanel({
  componentId,
  draft,
  onChange,
  onClose,
  variant = "sidebar",
}: {
  componentId: LandingBuilderComponentId;
  draft: LandingBuilderBlockDraft;
  onChange: (patch: Partial<LandingBuilderBlockDraft>) => void;
  onClose: () => void;
  /** `inline`: solo el formulario para incrustar dentro de otro panel (inspector unificado). */
  variant?: "sidebar" | "inline";
}) {
  const meta = LANDING_COMPONENT_META[componentId];
  const sid = `lb-${componentId}`;

  const form = (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{meta.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${sid}-title`} className="text-xs">
          Título
        </Label>
        <Input
          id={`${sid}-title`}
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Titular visible en la landing"
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${sid}-subtitle`} className="text-xs">
          Subtítulo
        </Label>
        <Input
          id={`${sid}-subtitle`}
          value={draft.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="Línea secundaria (opcional)"
          className="h-9 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${sid}-body`} className="text-xs">
          Contenido
        </Label>
        <Textarea
          id={`${sid}-body`}
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Párrafo o texto largo del bloque"
          rows={5}
          className="resize-y text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${sid}-cta`} className="text-xs">
          Texto del botón (CTA)
        </Label>
        <Input
          id={`${sid}-cta`}
          value={draft.ctaLabel}
          onChange={(e) => onChange({ ctaLabel: e.target.value })}
          placeholder="Ej. Empezar, Reservar, Saber más"
          className="h-9 text-sm"
        />
      </div>

      {variant !== "inline" && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={onClose}>
          Cerrar
        </Button>
      )}
    </div>
  );

  if (variant === "inline") {
    return form;
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-background min-h-0">
      <div className="shrink-0 border-b px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Propiedades</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">{form}</ScrollArea>
    </div>
  );
}

"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import type { LandingIntroBodyBlock } from "@/types/funnel";
import { landingIntroCtaButtonClasses, landingIntroCtaButtonStyle } from "@/components/funnel/LandingIntroHeroColumn";
import {
  getLandingBasicBlockId,
  isLandingBuildPrimitiveKind,
  LANDING_COMPONENT_META,
} from "@/components/editor/landing/landingBuilderTypes";
import {
  LANDING_BODY_ROW_REORDER_TYPE,
  LANDING_BODY_REORDER_APPEND,
  type LandingBodyRowReorderPayload,
} from "@/lib/landingBodyDrag";

export type LandingBodyEditorToolbarSlotArgs = {
  block: LandingIntroBodyBlock;
  selected: boolean;
};

function bodyBlockBadgeLabel(kind: string): string {
  if (isLandingBuildPrimitiveKind(kind)) {
    const bid = getLandingBasicBlockId(kind);
    const meta = LANDING_COMPONENT_META[bid];
    if (meta) return meta.title;
  }
  return friendlyPrimitiveLabel(kind);
}

/** Vista de las filas de bloques persistidos debajo del hero (público y editor). */
export function LandingIntroBodyBlocks({
  blocks,
  primary,
  isMobile,
  editorChrome,
  selectedRowId,
  onRowActivate,
  editorToolbarSlot,
  onReorderRow,
}: {
  blocks: LandingIntroBodyBlock[] | undefined;
  primary: string;
  isMobile: boolean;
  /** Constructor: pulsable y resaltado selección estilo builder. */
  editorChrome?: boolean;
  selectedRowId?: string | null;
  onRowActivate?: (block: LandingIntroBodyBlock) => void;
  /** Cromado derecho cuando la fila está seleccionada (inyectado desde la pestaña editor). */
  editorToolbarSlot?: (args: LandingBodyEditorToolbarSlotArgs) => ReactNode | null;
  /** Reordenación por drag (`activeId`, `antes de este`). */
  onReorderRow?: (activeId: string, beforeRowId: string) => void;
}) {
  const list = blocks?.length ? blocks : [];
  const canDragReorder = Boolean(editorChrome && editorToolbarSlot && onReorderRow);

  const readDraggedRowId = (raw: string | null): string | null => {
    try {
      if (!raw) return null;
      const j = JSON.parse(raw) as LandingBodyRowReorderPayload;
      return typeof j.rowId === "string" ? j.rowId : null;
    } catch {
      return null;
    }
  };

  const [dragOverAppend, setDragOverAppend] = useState(false);

  const isRowReorderMime = (e: React.DragEvent) =>
    [...e.dataTransfer.types].includes(LANDING_BODY_ROW_REORDER_TYPE);

  if (list.length === 0 && !editorChrome) return null;

  return (
    <div
      className={cn(
        "mt-2 flex w-full max-w-full flex-col",
        !isMobile && "max-w-[600px]",
        editorChrome ? "gap-3" : "gap-3",
      )}
      style={{ marginTop: list.length === 0 && editorChrome ? 0 : undefined }}
    >
      {list.map((b) => {
        const selected = Boolean(editorChrome && selectedRowId === b.id);
        return (
          <div key={b.id} className="relative w-full overflow-visible">
            <div
              role={editorChrome ? "button" : undefined}
              tabIndex={editorChrome ? 0 : undefined}
              draggable={Boolean(canDragReorder)}
              className={cn(
                "group relative z-0 box-border w-full overflow-visible rounded-xl text-left outline-none transition-[border-color,box-shadow]",
                editorChrome &&
                  cn(
                    "border-2",
                    selected
                      ? "border-solid border-primary bg-background"
                      : "border-dashed border-transparent hover:border-muted-foreground/40",
                  ),
                editorChrome && selected && "shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
                !editorChrome && "rounded-none border-0",
              )}
              onDragStart={(e) => {
                if (!canDragReorder) return;
                e.stopPropagation();
                try {
                  e.dataTransfer.setData(
                    LANDING_BODY_ROW_REORDER_TYPE,
                    JSON.stringify({ rowId: b.id } satisfies LandingBodyRowReorderPayload),
                  );
                  e.dataTransfer.effectAllowed = "move";
                } catch {
                  /* noop */
                }
              }}
              onDragOver={(e) => {
                if (!canDragReorder || ![...e.dataTransfer.types].includes(LANDING_BODY_ROW_REORDER_TYPE)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (!canDragReorder) return;
                const dragged = readDraggedRowId(e.dataTransfer.getData(LANDING_BODY_ROW_REORDER_TYPE));
                e.preventDefault();
                if (!dragged || dragged === b.id || !onReorderRow) return;
                onReorderRow(dragged, b.id);
              }}
              onClick={(ev) => {
                if (!editorChrome) return;
                ev.stopPropagation();
                onRowActivate?.(b);
              }}
              onKeyDown={(ev) => {
                if (!editorChrome) return;
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onRowActivate?.(b);
                }
              }}
            >
              {editorChrome &&
                (selected ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute left-4 top-0 z-[2] inline-flex -translate-y-1/2 select-none items-center rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold leading-none uppercase tracking-wide text-primary-foreground shadow-sm",
                    )}
                  >
                    {bodyBlockBadgeLabel(b.kind)}
                  </span>
                ) : (
                  <span className="pointer-events-none absolute left-4 top-0 z-[1] inline-flex -translate-y-1/2 select-none items-center rounded-md bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                    {bodyBlockBadgeLabel(b.kind)}
                  </span>
                ))}
              <div className={cn("px-3 py-3", editorChrome && selected && "pr-14", !editorChrome && "px-0 py-1")}>
                <LandingIntroBodyBlockInner block={b} primary={primary} isMobile={isMobile} />
              </div>
              {editorChrome && editorToolbarSlot ? editorToolbarSlot({ block: b, selected }) : null}
            </div>
          </div>
        );
      })}
      {editorChrome && canDragReorder && list.length > 0 ? (
        <div
          className={cn(
            "relative z-0 mx-auto min-h-5 w-full max-w-full rounded-lg transition-colors max-sm:min-h-4",
            dragOverAppend && "bg-primary/12 ring-2 ring-primary/35 ring-offset-1 ring-offset-background",
          )}
          onDragOver={(e) => {
            if (!canDragReorder || !isRowReorderMime(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverAppend(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setDragOverAppend(false);
          }}
          onDrop={(e) => {
            if (!canDragReorder) return;
            const dragged = readDraggedRowId(e.dataTransfer.getData(LANDING_BODY_ROW_REORDER_TYPE));
            e.preventDefault();
            setDragOverAppend(false);
            if (!dragged || !onReorderRow) return;
            onReorderRow(dragged, LANDING_BODY_REORDER_APPEND);
          }}
        >
          {/* Zona compacta para soltar al final de la lista */}
        </div>
      ) : null}
    </div>
  );
}

function LandingIntroBodyBlockInner({
  block,
  primary,
  isMobile,
}: {
  block: LandingIntroBodyBlock;
  primary: string;
  isMobile: boolean;
}) {
  const title = block.title?.trim();
  const subtitle = block.subtitle?.trim();
  const body = block.body?.trim();
  const cta = block.ctaLabel?.trim();

  switch (block.kind) {
    case "divider":
      return (
        <div className="py-2">
          <hr className="border-0 border-t border-gray-200" />
        </div>
      );
    case "button": {
      const cSize = isMobile ? 14 : 16;
      return (
        <div className="flex justify-center py-1">
          <span
            className={cn(
              landingIntroCtaButtonClasses(isMobile),
              "pointer-events-none inline-flex cursor-default select-none opacity-[0.98]",
            )}
            style={landingIntroCtaButtonStyle(primary, cSize)}
          >
            {cta || "Botón"}
          </span>
        </div>
      );
    }
    case "text":
      return (
        <div className={cn("space-y-2 text-gray-700", isMobile ? "text-xs" : "text-sm")}>
          {title ? <p className="m-0 font-semibold leading-snug text-gray-900">{title}</p> : null}
          {subtitle ? <p className="m-0 text-muted-foreground">{subtitle}</p> : null}
          {body ? (
            <p className={cn("m-0 whitespace-pre-wrap leading-relaxed text-gray-600")}>{body}</p>
          ) : !title && !subtitle ? (
            <p className="m-0 italic text-muted-foreground">Escribe contenido en el panel derecho.</p>
          ) : null}
        </div>
      );
    default:
      return (
        <div
          className={cn(
            "rounded-lg border border-dashed border-muted-foreground/30 bg-muted/15 px-3 py-3 text-muted-foreground",
            isMobile ? "text-[11px]" : "text-xs",
          )}
        >
          Bloque ({friendlyPrimitiveLabel(block.kind)}) — vista simplificada. Ajusta textos desde el inspector.
        </div>
      );
  }
}

function friendlyPrimitiveLabel(kind: string): string {
  const map: Record<string, string> = {
    image: "imagen",
    video: "vídeo",
    list: "lista",
    logo_bar: "logos",
    reviews: "reseñas",
    testimonial: "testimonio",
    slider: "carrusel",
    graphic: "gráfico",
    embed_kununu: "Kununu",
    embed_trustpilot: "Trustpilot",
    embed_proven_expert: "ProvenExpert",
    embed_google_maps: "mapa",
    embed_html: "HTML",
  };
  return map[kind] ?? kind.replace(/_/g, " ");
}

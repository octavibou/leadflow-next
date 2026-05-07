"use client";

import { Plus, Equals, Files, ClipboardText, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Botonera vertical al estilo page builder (dentro del marco seleccionado, a la derecha).
 */
export function LandingBodyBlockFloatingTools({
  onAddBelow,
  onDuplicate,
  onCopyClipboard,
  onRemove,
}: {
  onAddBelow: () => void;
  onDuplicate: () => void;
  onCopyClipboard: () => void;
  onRemove: () => void;
}) {
  const btnCls =
    "h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/80";

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className={cn(
          "pointer-events-auto absolute bottom-4 right-3 top-auto z-[6] flex flex-col gap-0.5 rounded-2xl border border-border bg-background px-1.5 py-2 shadow-md",
          "xl:bottom-auto xl:top-1/2 xl:-translate-y-1/2",
        )}
        onDragStart={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnCls}
              aria-label="Añadir debajo"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onAddBelow}
            >
              <Plus className="h-5 w-5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Añadir bloque debajo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn(btnCls, "cursor-grab active:cursor-grabbing")} aria-label="Arrastra el bloque para reordenar">
              <Equals className="h-5 w-5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Arrastrar para reordenar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnCls}
              aria-label="Duplicar"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onDuplicate}
            >
              <Files className="h-5 w-5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Duplicar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={btnCls}
              aria-label="Copiar al portapapeles"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onCopyClipboard}
            >
              <ClipboardText className="h-5 w-5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Copiar JSON</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(btnCls, "text-destructive/80 hover:text-destructive hover:bg-destructive/10")}
              aria-label="Eliminar"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onRemove}
            >
              <Trash className="h-5 w-5" weight="bold" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Eliminar</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

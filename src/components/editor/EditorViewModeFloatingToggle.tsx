"use client";

import { DeviceMobile, Monitor } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Conmutador móvil/desktop flotante sobre el área del canvas (esquina inferior derecha). */
export function EditorViewModeFloatingToggle({
  viewMode,
  onToggleView,
  className,
}: {
  viewMode: "desktop" | "mobile";
  onToggleView: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-6 right-6 z-20 flex flex-col gap-0.5 rounded-2xl border border-border/80 bg-background p-1 shadow-md",
        className,
      )}
      role="toolbar"
      aria-label="Vista previa"
    >
      <Button
        type="button"
        variant={viewMode === "mobile" ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={viewMode === "desktop" ? onToggleView : undefined}
        title="Vista móvil"
      >
        <DeviceMobile className="h-4 w-4" weight={viewMode === "mobile" ? "fill" : "bold"} />
      </Button>
      <Button
        type="button"
        variant={viewMode === "desktop" ? "default" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={viewMode === "mobile" ? onToggleView : undefined}
        title="Vista escritorio"
      >
        <Monitor className="h-4 w-4" weight={viewMode === "desktop" ? "fill" : "bold"} />
      </Button>
    </div>
  );
}

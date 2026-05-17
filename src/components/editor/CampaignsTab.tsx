import { useState, useCallback } from "react";
import { Plus, Copy, Trash, Link, DotsThree, TextAlignLeft, Megaphone, CaretDown, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCampaignStore, type Campaign } from "@/store/campaignStore";
import type { Funnel } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { VariationSettingsDialog } from "@/components/editor/VariationSettingsDialog";

export type LandingSelection = "default" | string;

interface LandingVariationsSidebarProps {
  funnel: Funnel;
  selectedKey: LandingSelection;
  onSelect: (key: LandingSelection) => void;
  disabled?: boolean;
  /** Alineación del menú del selector (útil si el trigger está a la izquierda del canvas). */
  menuAlign?: "start" | "end";
  /** Dentro de otro contenedor (tabs): sin ancho fijo ni borde exterior. */
  embedded?: boolean;
}

/** Barra superior: elegir variación, acciones y crear nueva (sustituye el listado en tab lateral). */
export function LandingVariationToolbar({
  funnel,
  selectedKey,
  onSelect,
  disabled = false,
  menuAlign = "end",
}: LandingVariationsSidebarProps) {
  const { campaigns, loading, createCampaign, deleteCampaign, duplicateCampaign } = useCampaignStore();
  const [creating, setCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const selectedCampaign = selectedKey === "default" ? null : campaigns.find((c) => c.id === selectedKey) ?? null;

  const handleCreateVariation = async () => {
    if (disabled) return;
    setCreating(true);
    const count = campaigns.length + 1;
    const name = `Variacion ${count}`;
    const steps = funnel.steps.map((s) => ({
      ...JSON.parse(JSON.stringify(s)),
      id: crypto.randomUUID(),
    }));
    const c = await createCampaign(funnel.id, name, steps);
    if (c) {
      toast.success("Variación creada");
      onSelect(c.id);
    }
    setCreating(false);
  };

  const handleCopyUrl = useCallback(
    (campaign: Campaign) => {
      const url = `${window.location.origin}/f/${funnel.id}?c=${campaign.slug}`;
      navigator.clipboard.writeText(url).then(() => toast.success("URL copiada"));
    },
    [funnel.id],
  );

  const currentLabel =
    selectedKey === "default" ? "Por defecto" : selectedCampaign?.name ?? "Variación";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-[200px] max-w-[min(280px,78vw)] justify-between gap-2 px-3 font-normal"
            disabled={disabled}
            aria-label="Elegir variación de landing"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {selectedKey === "default" ? (
                <TextAlignLeft className="h-4 w-4 shrink-0 text-muted-foreground" weight="bold" />
              ) : (
                <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" weight="bold" />
              )}
              <span className="truncate">{loading ? "Cargando…" : currentLabel}</span>
            </span>
            <CaretDown className="h-4 w-4 shrink-0 opacity-50" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={menuAlign}
          className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-80 overflow-y-auto"
        >
          <DropdownMenuRadioGroup
            value={selectedKey}
            onValueChange={(v) => onSelect(v as LandingSelection)}
            className="space-y-0.5 p-1"
          >
            <DropdownMenuRadioItem value="default" className="gap-2 text-sm">
              <TextAlignLeft className="h-4 w-4 shrink-0" weight="bold" />
              <span>Por defecto</span>
            </DropdownMenuRadioItem>
            {campaigns.map((c) => (
              <DropdownMenuRadioItem key={c.id} value={c.id} className="gap-2 text-sm">
                <Megaphone className="h-4 w-4 shrink-0" weight="bold" />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                {c.is_default ? (
                  <Badge variant="secondary" className="ml-auto shrink-0 py-0 px-1.5 text-[10px]">
                    Default
                  </Badge>
                ) : null}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-sm"
            onClick={(e) => {
              e.preventDefault();
              void handleCreateVariation();
            }}
            disabled={creating || disabled}
          >
            <Plus className="h-4 w-4" weight="bold" />
            Nueva variación
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VariationSettingsDialog
        open={!!editingCampaign}
        onOpenChange={(o) => {
          if (!o) setEditingCampaign(null);
        }}
        funnelId={funnel.id}
        campaign={editingCampaign}
        campaigns={campaigns}
      />

      {selectedCampaign && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Acciones de la variación"
            >
              <DotsThree className="h-4 w-4" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingCampaign(selectedCampaign)}>
              <PencilSimple className="mr-2 h-4 w-4" weight="bold" /> Editar nombre y enlace
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => duplicateCampaign(selectedCampaign.id).then(() => toast.success("Variación duplicada"))}
            >
              <Copy className="mr-2 h-4 w-4" weight="bold" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyUrl(selectedCampaign)}>
              <Link className="mr-2 h-4 w-4" weight="bold" /> Copiar URL
            </DropdownMenuItem>
            {!selectedCampaign.is_default && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  deleteCampaign(selectedCampaign.id).then(() => {
                    toast.success("Variación eliminada");
                    if (selectedKey === selectedCampaign.id) onSelect("default");
                  });
                }}
              >
                <Trash className="mr-2 h-4 w-4" weight="bold" /> Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Selector de variación sobre el preview del constructor (esquina superior izquierda). */
export function LandingVariationFloatingToolbar(
  props: Pick<LandingVariationsSidebarProps, "funnel" | "selectedKey" | "onSelect" | "disabled">,
) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute left-4 top-4 z-[19] rounded-2xl border border-border/80 bg-background/95 p-1 shadow-md backdrop-blur-sm",
        "sm:left-6 sm:top-6",
      )}
      role="toolbar"
      aria-label="Variación de landing"
    >
      <LandingVariationToolbar {...props} menuAlign="start" />
    </div>
  );
}

/**
 * Lista vertical izquierda (estilo pasos del funnel): landing por defecto + variaciones.
 */
export function LandingVariationsSidebar({
  funnel,
  selectedKey,
  onSelect,
  disabled = false,
  embedded = false,
}: LandingVariationsSidebarProps) {
  const { campaigns, loading, createCampaign, deleteCampaign, duplicateCampaign } = useCampaignStore();
  const [creating, setCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleCreateVariation = async () => {
    if (disabled) return;
    setCreating(true);
    const count = campaigns.length + 1;
    const name = `Variacion ${count}`;
    const steps = funnel.steps.map((s) => ({
      ...JSON.parse(JSON.stringify(s)),
      id: crypto.randomUUID(),
    }));
    const c = await createCampaign(funnel.id, name, steps);
    if (c) {
      toast.success("Variación creada");
      onSelect(c.id);
    }
    setCreating(false);
  };

  const handleCopyUrl = useCallback(
    (campaign: Campaign) => {
      const url = `${window.location.origin}/f/${funnel.id}?c=${campaign.slug}`;
      navigator.clipboard.writeText(url).then(() => toast.success("URL copiada"));
    },
    [funnel.id],
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        embedded ? "flex h-full min-h-0 min-w-0 flex-1 flex-col bg-muted/20" : "w-80 shrink-0 border-r bg-muted/30",
      )}
    >
      {!embedded && (
        <div className="border-b px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variaciones</span>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2 pr-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect("default")}
            className={cn(
              "relative flex w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg py-2.5 pl-3 pr-3 text-sm text-left transition-colors",
              selectedKey === "default"
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted",
              disabled && "opacity-50 pointer-events-none",
            )}
          >
            <span className="shrink-0 text-muted-foreground">
              <TextAlignLeft className="h-4 w-4" weight="bold" />
            </span>
            <span className="min-w-0 flex-1 truncate">Por defecto</span>
          </button>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "relative flex w-full min-w-0 items-center gap-1 rounded-lg py-2 pl-3 pr-10 text-sm transition-colors group",
                  selectedKey === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex flex-1 min-w-0 items-center gap-2.5 text-left",
                    disabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">
                    <Megaphone className="h-4 w-4" weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {c.is_default && (
                    <Badge variant="secondary" className="text-[10px] shrink-0 py-0 px-1.5">
                      Default
                    </Badge>
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DotsThree className="h-4 w-4" weight="bold" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCampaign(c)}>
                      <PencilSimple className="h-4 w-4 mr-2" weight="bold" /> Editar nombre y enlace
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicateCampaign(c.id).then(() => toast.success("Variación duplicada"))}
                    >
                      <Copy className="h-4 w-4 mr-2" weight="bold" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyUrl(c)}>
                      <Link className="h-4 w-4 mr-2" weight="bold" /> Copiar URL
                    </DropdownMenuItem>
                    {!c.is_default && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          deleteCampaign(c.id).then(() => {
                            toast.success("Variación eliminada");
                            if (selectedKey === c.id) onSelect("default");
                          });
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" weight="bold" /> Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t shrink-0">
        <Button variant="outline" size="sm" className="w-full" onClick={handleCreateVariation} disabled={creating || disabled}>
          <Plus className="h-4 w-4 mr-2" weight="bold" /> Crear variación
        </Button>
      </div>

      <VariationSettingsDialog
        open={!!editingCampaign}
        onOpenChange={(o) => {
          if (!o) setEditingCampaign(null);
        }}
        funnelId={funnel.id}
        campaign={editingCampaign}
        campaigns={campaigns}
      />
    </div>
  );
}

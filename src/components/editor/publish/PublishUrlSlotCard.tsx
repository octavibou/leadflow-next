"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowCounterClockwise,
  Broadcast,
  Check,
  ClockCounterClockwise,
  Code,
  DotsThree,
  Eye,
  GitBranch,
  Link as LinkIcon,
  PencilSimple,
  QrCode,
  Rocket,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PublishWorkspace, PublishVariantId } from "@/components/editor/publish/usePublishWorkspace";
import type { PublishBranchRow } from "@/lib/publish/publishApi";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type Props = {
  ws: PublishWorkspace;
  slot: PublishBranchRow;
};

/** Card autosuficiente que representa una URL pública (slot) y permite empujar variantes. */
export function PublishUrlSlotCard({ ws, slot }: Props) {
  const isSystem = ws.slotIsSystem(slot);
  const isLanding = ws.slotIsLanding(slot);
  const url = ws.slotShareUrl(slot);
  const path = ws.slotPath(slot);
  const activeVariant = ws.slotActiveVariantId(slot);
  const versionLabel = slot.activeDeployment ? `v${slot.activeDeployment.version}` : null;
  const deployments = ws.slotDeployments[slot.id] ?? [];
  const activeDeploymentId = slot.activeDeployment?.id ?? null;
  const isPushing = ws.pushingSlotId === slot.id;
  const isDeleting = ws.deletingSlotId === slot.id;
  const slotName = ws.slotLabel(slot);
  const isLive = !!slot.activeDeployment;

  const [copyKind, setCopyKind] = useState<"url" | "embed" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editSlugTouched, setEditSlugTouched] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const copyHere = (text: string, kind: "url" | "embed") => {
    void navigator.clipboard.writeText(text);
    setCopyKind(kind);
    setTimeout(() => setCopyKind(null), 1800);
  };

  const handleVariantChange = (next: PublishVariantId) => {
    if (next === activeVariant) return;
    void ws.pushVariantToSlot(slot.id, next);
  };

  const handleRepublish = () => {
    const defaultVariant = isLanding ? "default" : "no-landing";
    const v = (activeVariant ?? defaultVariant) as PublishVariantId;
    void ws.pushVariantToSlot(slot.id, v);
  };

  const openEditDialog = () => {
    setEditName(slot.name);
    setEditSlug(slot.slug);
    setEditSlugTouched(false);
    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen || editSlugTouched) return;
    const auto = slugify(editName);
    setEditSlug(auto);
  }, [editName, editOpen, editSlugTouched]);

  const handleSaveEdit = async () => {
    const name = editName.trim();
    let slug = editSlug.trim().toLowerCase();
    slug = slug
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!name) return;
    if (!slug) return;

    const updates: { name?: string; slug?: string } = {};
    if (name !== slot.name) updates.name = name;
    if (slug !== slot.slug) updates.slug = slug;

    if (Object.keys(updates).length === 0) {
      setEditOpen(false);
      return;
    }

    setEditBusy(true);
    const ok = await ws.updateSlot(slot.id, updates);
    setEditBusy(false);
    if (ok) setEditOpen(false);
  };

  return (
    <>
    <Card
      size="sm"
      className={cn(
        "group/card relative flex h-full min-h-0 flex-col overflow-hidden transition-all",
        isLive
          ? "ring-1 ring-primary/20 hover:ring-primary/40"
          : "ring-1 ring-border/40 hover:ring-border/80",
      )}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
              isSystem
                ? "border-primary/30 bg-primary/5 text-primary dark:border-brand-lime/30 dark:bg-brand-lime/10 dark:text-brand-lime"
                : "border-border/80 bg-muted/40 text-muted-foreground",
            )}
          >
            {isSystem ? (
              <Sparkle className="h-4 w-4" weight="fill" />
            ) : (
              <GitBranch className="h-4 w-4" weight="bold" />
            )}
            {isLive && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-brand-lime/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-lime" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{slotName}</h3>
              {versionLabel && (
                <Badge 
                  variant="outline" 
                  className="shrink-0 font-mono text-[0.6rem] tabular-nums"
                >
                  {versionLabel}
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-[0.68rem] text-muted-foreground" title={path}>
              {path}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isLive ? (
              <Badge className="gap-1 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide">
                <Broadcast className="h-3 w-3" weight="fill" />
                Live
              </Badge>
            ) : (
              <Badge 
                variant="outline" 
                className="border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-medium text-amber-700 dark:text-amber-400"
              >
                Sin publicar
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Más acciones"
                >
                  <DotsThree className="h-4 w-4" weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => ws.openPreview(slot)}>
                  <Eye className="h-4 w-4" weight="bold" />
                  Vista previa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyHere(ws.buildEmbedSnippet(url), "embed")}>
                  {copyKind === "embed" ? (
                    <Check className="h-4 w-4 text-primary" weight="bold" />
                  ) : (
                    <Code className="h-4 w-4" weight="bold" />
                  )}
                  Copiar embed
                </DropdownMenuItem>
                {!isSystem ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        setTimeout(() => openEditDialog(), 0);
                      }}
                    >
                      <PencilSimple className="h-4 w-4" weight="bold" />
                      Editar URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        setTimeout(() => setDeleteOpen(true), 0);
                      }}
                    >
                      <Trash className="h-4 w-4" weight="bold" />
                      Eliminar URL
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div 
          className={cn(
            "group/url flex items-stretch gap-1.5 rounded-lg border px-2.5 py-2 transition-all",
            "border-border/50 bg-muted/20 hover:border-border/80 hover:bg-muted/30"
          )}
        >
          <span 
            className="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-muted-foreground" 
            title={url}
          >
            {url}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-50 transition-opacity hover:opacity-100"
            onClick={() => copyHere(url, "url")}
            aria-label="Copiar URL"
          >
            {copyKind === "url" ? (
              <Check className="h-3.5 w-3.5 text-primary" weight="bold" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5" weight="bold" />
            )}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-50 transition-opacity hover:opacity-100" aria-label="Mostrar QR">
                <QrCode className="h-3.5 w-3.5" weight="bold" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-4">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-lg ring-1 ring-black/[0.04] dark:bg-white dark:ring-white/10">
                  <QRCodeSVG value={url || "https://"} size={160} level="M" bgColor="#ffffff" fgColor="#142a27" />
                </div>
                <p className="max-w-[13rem] text-center text-[0.65rem] text-muted-foreground">
                  Escanea para abrir esta URL en producción
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Variante activa
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={(activeVariant ?? (isLanding ? "default" : "no-landing")) as string}
              onValueChange={(v) => handleVariantChange(v as PublishVariantId)}
              disabled={isPushing}
            >
              <SelectTrigger size="default" className="h-9 w-full justify-between bg-background text-xs font-medium sm:min-w-0 sm:flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ws.variantOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={isLive ? "outline" : "default"}
              size="sm"
              className={cn(
                "h-9 shrink-0 gap-2 px-3 text-xs sm:w-auto",
                isLive ? "font-medium text-muted-foreground" : "font-semibold",
              )}
              title={
                isLive
                  ? "Vuelve a desplegar la misma variante (p. ej. tras editar el funnel)"
                  : "Publicar la variante seleccionada en esta URL"
              }
              disabled={isPushing}
              onClick={handleRepublish}
            >
              {isPushing ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <Rocket className="h-3.5 w-3.5" weight={isLive ? "bold" : "fill"} />
              )}
              {isLive ? "Republicar" : "Publicar"}
            </Button>
          </div>
          {isLive ? (
            <p className="text-[0.65rem] leading-snug text-muted-foreground">
              Al elegir otra variante en el desplegable se publica en esta URL al instante.
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/30 pt-3">
          <span className="flex items-center gap-1.5 truncate text-[0.68rem] text-muted-foreground">
            {slot.activeDeployment ? (
              <>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand-lime" />
                <span className="font-medium text-foreground">{versionLabel}</span>
                <span className="opacity-50">·</span>
                <span>{timeAgo(slot.activeDeployment.created_at)}</span>
              </>
            ) : (
              <span className="italic opacity-60">Aún sin versión publicada</span>
            )}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="h-7 gap-1.5 px-2 text-[0.68rem] font-medium opacity-60 transition-opacity hover:opacity-100"
              >
                <ClockCounterClockwise className="h-3.5 w-3.5" weight="bold" />
                Historial
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(22rem,80vw)] p-4">
              <DeploymentHistoryList
                deployments={deployments}
                activeId={activeDeploymentId}
                busy={isPushing}
                onRollback={(depId) => void ws.rollbackSlotDeployment(slot.id, depId)}
                onRefresh={() => void ws.refreshSlotDeployments(slot.id)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta URL?</AlertDialogTitle>
          <AlertDialogDescription className="text-left sm:text-left">
            Se eliminará la ruta <span className="break-all font-mono text-foreground">{path}</span> y su historial de
            publicaciones en esta URL. Las rutas Principal y Solo quiz no se pueden borrar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => setDeleteOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            className="gap-2"
            onClick={async () => {
              const ok = await ws.deleteSlot(slot.id);
              if (ok) setDeleteOpen(false);
            }}
          >
            {isDeleting ? <Spinner className="h-3.5 w-3.5" /> : null}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar URL</DialogTitle>
          <DialogDescription>
            Modifica el nombre y la ruta de esta URL pública.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Mi campaña"
              disabled={editBusy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-slug">Slug (ruta)</Label>
            <Input
              id="edit-slug"
              value={editSlug}
              onChange={(e) => {
                setEditSlugTouched(true);
                setEditSlug(slugify(e.target.value));
              }}
              placeholder="mi-campana"
              disabled={editBusy}
              className="font-mono text-sm"
            />
            <p className="text-[0.7rem] text-muted-foreground">
              Solo letras minúsculas, números y guiones. La URL final será:{" "}
              <span className="font-mono text-foreground">{ws.basePath}/{editSlug || "..."}</span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={editBusy}
            onClick={() => setEditOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={editBusy || !editName.trim() || !editSlug.trim()}
            className="gap-2"
            onClick={handleSaveEdit}
          >
            {editBusy ? <Spinner className="h-3.5 w-3.5" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function DeploymentHistoryList({
  deployments,
  activeId,
  busy,
  onRollback,
  onRefresh,
}: {
  deployments: { id: string; version: number; created_at: string; status: string }[];
  activeId: string | null;
  busy: boolean;
  onRollback: (depId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">Versiones</p>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[0.65rem] font-medium" onClick={onRefresh}>
          Actualizar
        </Button>
      </div>
      {deployments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-4 text-center text-xs text-muted-foreground/70">
          Aún no hay versiones desplegadas
        </p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {deployments.map((d) => {
            const active = d.id === activeId;
            return (
              <li
                key={d.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                  active 
                    ? "border-primary/20 bg-primary/5 dark:border-brand-lime/20 dark:bg-brand-lime/5" 
                    : "border-border/40 bg-card hover:border-border/60 hover:bg-muted/20",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {active ? (
                    <span className="flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-2 w-2 animate-live-ring rounded-full bg-brand-lime/50" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-lime" />
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
                  )}
                  <span className={cn(
                    "font-mono text-xs font-semibold tabular-nums",
                    active ? "text-primary dark:text-brand-lime" : "text-foreground"
                  )}>
                    v{d.version}
                  </span>
                  <span className="truncate text-[0.65rem] text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()}
                  </span>
                </div>
                {active ? (
                  <Badge className="text-[0.6rem] font-semibold">
                    Activa
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1.5 px-2 text-[0.65rem] font-medium opacity-60 hover:opacity-100"
                    disabled={busy}
                    onClick={() => onRollback(d.id)}
                  >
                    <ArrowCounterClockwise className="h-3 w-3" weight="bold" />
                    Restaurar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString();
}

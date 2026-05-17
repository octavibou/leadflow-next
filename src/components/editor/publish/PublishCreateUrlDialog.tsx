"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "@phosphor-icons/react";
import type { PublishWorkspace } from "@/components/editor/publish/usePublishWorkspace";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Dialog para crear un nuevo slot URL: nombre + slug (auto desde nombre hasta que el usuario edite el slug). */
export function PublishCreateUrlDialog({ ws }: { ws: PublishWorkspace }) {
  const { newBranchOpen, setNewBranchOpen, newBranchName, newBranchSlug, createBranchBusy, createSlot, origin, basePath } = ws;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  /** Al abrir el diálogo, alineamos con el estado del workspace (normalmente vacío). */
  useEffect(() => {
    if (!newBranchOpen) return;
    setName(newBranchName);
    setSlug(newBranchSlug);
    setSlugTouched(false);
  }, [newBranchOpen, newBranchName, newBranchSlug]);

  /** Mientras no hayas editado el slug a mano, sigue al nombre. */
  useEffect(() => {
    if (!newBranchOpen || slugTouched) return;
    setSlug(slugify(name));
  }, [name, newBranchOpen, slugTouched]);

  const previewUrl = slug ? `${origin}${basePath}/${slug}` : `${origin}${basePath}/…`;

  return (
    <Dialog open={newBranchOpen} onOpenChange={setNewBranchOpen}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva URL pública</DialogTitle>
          <DialogDescription>
            Cada URL es un slot live al que puedes empujar la variante de landing que quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-0 space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="publish-create-name">Nombre</Label>
            <Input
              id="publish-create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Campaña verano"
              autoFocus
              className="h-9 bg-background text-sm shadow-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publish-create-slug">Slug en la URL</Label>
            <div className="flex min-h-9 items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 shadow-sm">
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground select-none">
                {origin}
                {basePath}/
              </span>
              <input
                id="publish-create-slug"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="verano-2026"
                className="min-w-0 flex-1 border-0 bg-transparent py-1 font-mono text-xs text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:ring-0"
              />
            </div>
            <p className="text-[0.65rem] text-muted-foreground">
              Reservados: <code className="font-mono">main</code>, <code className="font-mono">direct</code>.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">URL final</p>
            <p className="mt-1 break-all font-mono text-xs text-foreground">{previewUrl}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setNewBranchOpen(false)} disabled={createBranchBusy}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => void createSlot({ name, slug })}
            disabled={createBranchBusy}
          >
            <Plus className="h-4 w-4" weight="bold" />
            {createBranchBusy ? "Creando…" : "Crear URL"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { toast } from "sonner";
import { useCampaignStore, type Campaign } from "@/store/campaignStore";
import { normalizeCampaignSlug } from "@/lib/campaignSlug";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnelId: string;
  campaign: Campaign | null;
  /** Lista de campañas del funnel (para comprobar slug único) */
  campaigns: Campaign[];
};

export function VariationSettingsDialog({
  open,
  onOpenChange,
  funnelId,
  campaign,
  campaigns,
}: Props) {
  const updateCampaign = useCampaignStore((s) => s.updateCampaign);
  const [name, setName] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !campaign) return;
    setName(campaign.name);
    setSlugDraft(campaign.slug);
  }, [open, campaign]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewUrl =
    campaign && slugDraft
      ? `${origin}/f/${funnelId}?c=${encodeURIComponent(normalizeCampaignSlug(slugDraft) || slugDraft)}`
      : "";

  const handleSave = async () => {
    if (!campaign) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    const nextSlug = normalizeCampaignSlug(slugDraft);
    if (!nextSlug) {
      toast.error("El identificador del enlace no puede estar vacío");
      return;
    }

    const duplicate = campaigns.some(
      (c) => c.funnel_id === funnelId && c.id !== campaign.id && c.slug === nextSlug,
    );
    if (duplicate) {
      toast.error("Ya hay otra variación con ese enlace en este funnel");
      return;
    }

    setSaving(true);
    try {
      await updateCampaign(campaign.id, {
        name: trimmedName,
        slug: nextSlug,
      });
      toast.success("Variación actualizada");
      onOpenChange(false);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "23505") {
        toast.error("Ese enlace ya está en uso. Elige otro identificador.");
      } else {
        toast.error(err?.message || "No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nombre y enlace de la variación</DialogTitle>
          <DialogDescription>
            El nombre es solo para tu equipo. El identificador forma parte de la URL pública{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">?c=…</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="var-name">Nombre</Label>
            <Input
              id="var-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Anuncio Meta frío"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="var-slug">Identificador en la URL</Label>
            <Input
              id="var-slug"
              value={slugDraft}
              onChange={(e) => setSlugDraft(normalizeCampaignSlug(e.target.value))}
              placeholder="ej. meta-frio"
              autoComplete="off"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones. Si lo cambias después de compartir el enlace,
              el link antiguo dejará de apuntar a esta variación.
            </p>
          </div>
          {previewUrl ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vista previa</p>
              <p className="mt-1 break-all font-mono text-xs text-foreground">{previewUrl}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

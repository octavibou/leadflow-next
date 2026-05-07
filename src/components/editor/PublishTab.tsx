import { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { Copy, Check, Eye, Code, Rocket, Link as LinkIcon, XCircle, PencilSimple } from "@phosphor-icons/react";
import type { Funnel } from "@/types/funnel";
import type { Campaign } from "@/store/campaignStore";
import { VariationSettingsDialog } from "@/components/editor/VariationSettingsDialog";

type PublishVariant = {
  key: string;
  label: string;
  url: string;
  embedCode: string;
};

function buildEmbedSnippet(url: string) {
  return `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
}

function funnelIsLive(f: Funnel) {
  return !!f.saved_at && f.saved_at !== f.updated_at;
}

export function PublishTab({ funnel }: { funnel: Funnel }) {
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const unpublishFunnel = useFunnelStore((s) => s.unpublishFunnel);
  const liveFunnel = useFunnelStore((s) => s.getFunnel(funnel.id)) ?? funnel;

  const campaigns = useCampaignStore((s) => s.campaigns);
  const fetchCampaigns = useCampaignStore((s) => s.fetchCampaigns);
  const publishCampaign = useCampaignStore((s) => s.publishCampaign);
  const unpublishCampaign = useCampaignStore((s) => s.unpublishCampaign);

  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("default");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    void fetchCampaigns(funnel.id);
  }, [funnel.id, fetchCampaigns]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const basePath = `/f/${funnel.id}`;

  const variants = useMemo((): PublishVariant[] => {
    const defaultUrl = `${origin}${basePath}`;
    const noLandingUrl = `${origin}${basePath}?landing=0`;
    const rows: PublishVariant[] = [
      {
        key: "default",
        label: "Por defecto",
        url: defaultUrl,
        embedCode: buildEmbedSnippet(defaultUrl),
      },
      {
        key: "no-landing",
        label: "Solo funnel (sin landing)",
        url: noLandingUrl,
        embedCode: buildEmbedSnippet(noLandingUrl),
      },
    ];
    const forFunnel = campaigns.filter((c) => c.funnel_id === funnel.id);
    for (const c of forFunnel) {
      const vUrl = `${origin}${basePath}?c=${encodeURIComponent(c.slug)}`;
      rows.push({
        key: c.id,
        label: c.name,
        url: vUrl,
        embedCode: buildEmbedSnippet(vUrl),
      });
    }
    return rows;
  }, [origin, basePath, funnel.id, campaigns]);

  useEffect(() => {
    if (variants.length === 0) return;
    setSelectedKey((prev) => (variants.some((v) => v.key === prev) ? prev : variants[0].key));
  }, [variants]);

  const selected = useMemo(
    () => variants.find((v) => v.key === selectedKey) ?? variants[0],
    [variants, selectedKey],
  );

  const selectedCampaign =
    selectedKey !== "default" && selectedKey !== "no-landing" ? campaigns.find((c) => c.id === selectedKey) ?? null : null;

  const selectedIsLive =
    selectedKey === "default" || selectedKey === "no-landing"
      ? funnelIsLive(liveFunnel)
      : !!selectedCampaign?.published_at;

  const hasDraftChangesAfterPublish =
    selectedKey !== "default" &&
    selectedKey !== "no-landing" &&
    selectedCampaign?.published_at &&
    new Date(selectedCampaign.updated_at).getTime() > new Date(selectedCampaign.published_at).getTime();

  const handlePublishOrUnpublish = async (action: "publish" | "unpublish") => {
    setBusy(true);
    try {
      if (selectedKey === "default" || selectedKey === "no-landing") {
        if (action === "publish") {
          await saveFunnel(funnel.id);
          toast.success("Funnel publicado");
        } else {
          await unpublishFunnel(funnel.id);
          toast.success("Funnel despublicado");
        }
      } else if (selectedCampaign) {
        if (action === "publish") {
          await publishCampaign(selectedCampaign.id);
          toast.success("Variación publicada");
        } else {
          await unpublishCampaign(selectedCampaign.id);
          toast.success("Variación despublicada");
        }
      }
    } catch {
      toast.error("No se pudo actualizar el estado de publicación");
    }
    setBusy(false);
  };

  const copy = (text: string, kind: "url" | "embed") => {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(null), 2000);
  };

  const variantDotClass = (key: string) => {
    if (key === "default" || key === "no-landing") {
      return funnelIsLive(liveFunnel) ? "bg-green-500" : "bg-amber-500";
    }
    const c = campaigns.find((x) => x.id === key);
    return c?.published_at ? "bg-green-500" : "bg-amber-500";
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => selected && window.open(selected.url, "_blank", "noopener,noreferrer")}
        >
          <Eye className="h-4 w-4" weight="bold" />
          Preview
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {selectedIsLive ? (
            <>
              Variante <span className="text-green-600">en vivo</span>
            </>
          ) : (
            <>Publica y comparte</>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          «Solo funnel (sin landing)» entra directo al cuestionario (parámetro{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">landing=0</code>). El resto de variantes usan su enlace; publicación y QR son por selección.
        </p>
      </div>

      <div className="grid min-h-[280px] gap-6 md:grid-cols-[minmax(0,200px)_1fr] md:items-stretch">
        <div
          className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
          role="tablist"
          aria-label="Variantes de publicación"
        >
          {variants.map((v) => {
            const isSel = selected?.key === v.key;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => setSelectedKey(v.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors md:w-full",
                  isSel
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-transparent bg-muted/40 text-foreground hover:bg-muted",
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", variantDotClass(v.key))} aria-hidden />
                {v.label}
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  {selectedIsLive ? (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className="font-semibold text-green-600">Publicado</span>
                      {(selectedKey === "default" || selectedKey === "no-landing") && liveFunnel.saved_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(liveFunnel.saved_at).toLocaleString()}
                        </span>
                      )}
                      {selectedCampaign?.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(selectedCampaign.published_at).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                      <span className="font-semibold text-amber-600">Borrador</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCampaign ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => setEditingCampaign(selectedCampaign)}
                    >
                      <PencilSimple className="h-4 w-4 shrink-0" weight="bold" />
                      Nombre y enlace
                    </Button>
                  ) : null}
                  {!selectedIsLive ? (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      disabled={busy}
                      onClick={() => void handlePublishOrUnpublish("publish")}
                    >
                      <Rocket className="h-4 w-4 shrink-0" weight="bold" />
                      {busy ? "…" : "Publicar"}
                    </Button>
                  ) : (
                    <>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void handlePublishOrUnpublish("unpublish")}>
                        <XCircle className="h-4 w-4 shrink-0" weight="bold" />
                        {busy ? "…" : "Despublicar"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {hasDraftChangesAfterPublish ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
                  Hay cambios en el editor sin publicar: vuelve a pulsar Publicar para actualizar la versión en vivo.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-stretch gap-6 rounded-xl border bg-card p-6 shadow-sm sm:flex-row sm:items-start sm:justify-center sm:gap-10">
              <div className="mx-auto shrink-0 rounded-xl border bg-white p-3 shadow-sm sm:mx-0">
                <QRCodeSVG value={selected.url} size={140} level="M" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
                <p className="break-all text-xs leading-relaxed text-muted-foreground" title={selected.url}>
                  {selected.url}
                </p>
                <div className="flex w-full max-w-sm flex-col gap-2">
                  <Button type="button" variant="outline" className="h-10 justify-center gap-2" onClick={() => copy(selected.url, "url")}>
                    {copied === "url" ? <Check className="h-4 w-4 shrink-0" weight="bold" /> : <LinkIcon className="h-4 w-4 shrink-0" weight="bold" />}
                    Copiar enlace
                  </Button>
                  <Button type="button" variant="outline" className="h-10 justify-center gap-2" onClick={() => copy(selected.embedCode, "embed")}>
                    {copied === "embed" ? <Check className="h-4 w-4 shrink-0" weight="bold" /> : <Code className="h-4 w-4 shrink-0" weight="bold" />}
                    Copiar embed
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
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

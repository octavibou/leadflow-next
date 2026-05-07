'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Monitor, Smartphone, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import { VariationSettingsDialog } from "@/components/editor/VariationSettingsDialog";
import type { FunnelStep, IntroConfig } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { funnelContentFontFamily } from "@/lib/funnelTypography";
import { FunnelGoogleFont } from "@/components/funnel/FunnelGoogleFont";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const ytMatch = u.hostname.includes("youtube.com") ? u.searchParams.get("v") : u.hostname === "youtu.be" ? u.pathname.slice(1) : null;
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch}`;
    const vimeoMatch = u.hostname.includes("vimeo.com") && u.pathname.match(/\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (u.hostname.includes("loom.com")) return `https://www.loom.com/embed/${u.pathname.split("/").pop()}`;
    return url;
  } catch {
    return null;
  }
}

const CampaignLandingEditor = () => {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const campaignId = params?.campaignId as string | undefined;
  const router = useRouter();
  const fetchFunnels = useFunnelStore((s) => s.fetchFunnels);
  const funnel = useFunnelStore((s) => s.getFunnel(funnelId || ""));
  const { campaigns, fetchCampaigns, updateCampaign } = useCampaignStore();
  const campaign = campaigns.find((c) => c.id === campaignId);

  const [editingMeta, setEditingMeta] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => { fetchFunnels(); }, [fetchFunnels]);
  useEffect(() => {
    if (funnelId) fetchCampaigns(funnelId);
  }, [funnelId, fetchCampaigns]);

  // Find the intro step in campaign steps
  const introStep = campaign?.steps?.find((s: any) => s.type === "intro") as FunnelStep | undefined;
  const defaultIntroConfig: IntroConfig = useMemo(
    () => ({ headline: "", description: "", cta: "", showVideo: false }),
    [],
  );
  const ic = introStep?.introConfig || defaultIntroConfig;

  const handleUpdate = useCallback((key: string, value: any) => {
    if (!campaign || !introStep) return;
    const updatedIntro = { ...ic, [key]: value };
    const newSteps = campaign.steps.map((s: any) =>
      s.id === introStep.id ? { ...s, introConfig: updatedIntro } : s
    );
    void updateCampaign(campaign.id, { steps: newSteps }).catch(() =>
      toast.error("No se pudo guardar los cambios"),
    );
  }, [campaign, introStep, ic, updateCampaign]);

  if (!funnel || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!introStep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Esta variación no tiene landing</h2>
          <button className="text-primary underline" onClick={() => router.push(`/editor/${funnelId}?tab=landing`)}>Volver a campañas</button>
        </div>
      </div>
    );
  }

  const primary = funnel.settings.primaryColor || "#1877F2";
  const isMobile = viewMode === "mobile";

  const prefix = device === "mobile" ? "mobile" : "";
  const hKey = prefix ? "mobileHeadlineFontSize" : "headlineFontSize";
  const dKey = prefix ? "mobileDescriptionFontSize" : "descriptionFontSize";
  const cKey = prefix ? "mobileCtaFontSize" : "ctaFontSize";
  const sKey = prefix ? "mobileElementSpacing" : "elementSpacing";
  const hDefault = device === "mobile" ? 20 : 30;
  const dDefault = device === "mobile" ? 14 : 18;
  const cDefault = device === "mobile" ? 14 : 16;
  const sDefault = device === "mobile" ? 12 : 16;

  // Preview values based on viewMode
  const previewH = isMobile ? (ic.mobileHeadlineFontSize || 20) : (ic.headlineFontSize || 30);
  const previewD = isMobile ? (ic.mobileDescriptionFontSize || 14) : (ic.descriptionFontSize || 18);
  const previewC = isMobile ? (ic.mobileCtaFontSize || 14) : (ic.ctaFontSize || 16);
  const previewS = isMobile ? (ic.mobileElementSpacing || 12) : (ic.elementSpacing || 16);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="border-b bg-background shrink-0">
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-2 text-sm flex-wrap">
          <Badge variant="secondary" className="text-xs">Variación</Badge>
          <span className="font-medium">{campaign.name}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingMeta(true)}>
            Editar nombre y enlace
          </Button>
          <span className="text-muted-foreground">— Solo la landing de esta variación</span>
          <VariationSettingsDialog
            open={editingMeta}
            onOpenChange={setEditingMeta}
            funnelId={funnel.id}
            campaign={campaign}
            campaigns={campaigns}
          />
        </div>
        <div className="flex items-center gap-3 h-12 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/editor/${funnelId}?tab=landing`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{funnel.name}</span>
          <div className="flex-1" />
          <div className="flex gap-1 border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("desktop")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Preview */}
        <div className="flex flex-1 items-start justify-center overflow-hidden bg-muted/30 py-8">
          <FunnelGoogleFont fontFamily={funnel.settings.fontFamily} />
          <div
            className={cn(
              "bg-white rounded-xl shadow-lg overflow-hidden",
              isMobile ? "w-[375px]" : "w-[800px]",
            )}
            style={{ fontFamily: funnelContentFontFamily(funnel.settings.fontFamily) }}
          >
            <div className={cn("p-6", isMobile ? "px-5 py-6" : "px-10 py-8")}>
              <div className="text-center" style={{ gap: `${previewS}px`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h1 className="font-bold leading-tight" style={{ fontSize: `${previewH}px` }}>
                  {ic.headline || "Título de la landing"}
                </h1>
                {ic.showVideo && ic.videoUrl && (
                  <div className="rounded-xl overflow-hidden aspect-video w-full">
                    {(() => {
                      const embedUrl = getEmbedUrl(ic.videoUrl);
                      return embedUrl ? (
                        <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen />
                      ) : (
                        <div className="bg-muted w-full h-full flex items-center justify-center text-muted-foreground text-sm">URL no válida</div>
                      );
                    })()}
                  </div>
                )}
                <p className="text-muted-foreground leading-relaxed" style={{ fontSize: `${previewD}px` }}>
                  {ic.description || "Descripción de la landing"}
                </p>
                <button
                  className="px-8 py-4 rounded-xl font-semibold w-full cursor-default"
                  style={{ background: primary, color: "#fff", fontSize: `${previewC}px` }}
                >
                  {ic.cta || "Empezar"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-80 border-l bg-background flex flex-col shrink-0">
          <div className="px-4 py-3 border-b">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landing de la variación</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs mb-1.5 block">Título</Label>
                <Input value={ic.headline || ""} onChange={(e) => handleUpdate("headline", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Descripción</Label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  rows={3}
                  value={ic.description || ""}
                  onChange={(e) => handleUpdate("description", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Texto del botón</Label>
                <Input value={ic.cta || ""} onChange={(e) => handleUpdate("cta", e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mostrar video</Label>
                <Switch checked={ic.showVideo || false} onCheckedChange={(v) => handleUpdate("showVideo", v)} />
              </div>
              {ic.showVideo && (
                <div>
                  <Label className="text-xs mb-1.5 block">URL del video</Label>
                  <Input value={ic.videoUrl || ""} onChange={(e) => handleUpdate("videoUrl", e.target.value)} placeholder="https://youtube.com/..." className="h-9 text-sm" />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Tamaño y espaciado</Label>
                <div className="flex gap-1 border rounded-lg p-0.5">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Título — {(ic as any)[hKey] || hDefault}px</Label>
                <Slider min={12} max={60} step={1} value={[(ic as any)[hKey] || hDefault]} onValueChange={([v]) => handleUpdate(hKey, v)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descripción — {(ic as any)[dKey] || dDefault}px</Label>
                <Slider min={10} max={32} step={1} value={[(ic as any)[dKey] || dDefault]} onValueChange={([v]) => handleUpdate(dKey, v)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Botón — {(ic as any)[cKey] || cDefault}px</Label>
                <Slider min={10} max={28} step={1} value={[(ic as any)[cKey] || cDefault]} onValueChange={([v]) => handleUpdate(cKey, v)} className="mt-1" />
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Espacio entre elementos — {(ic as any)[sKey] || sDefault}px</Label>
                <Slider min={4} max={48} step={2} value={[(ic as any)[sKey] || sDefault]} onValueChange={([v]) => handleUpdate(sKey, v)} className="mt-1" />
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default CampaignLandingEditor;

import { useState, useCallback, useMemo } from "react";
import { Plus, Copy, Trash, Link, DotsThree, Megaphone, Pencil, X, Monitor, DeviceMobile, Gear } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCampaignStore, type Campaign } from "@/store/campaignStore";
import type { Funnel, FunnelStep, IntroConfig } from "@/types/funnel";
import { cn } from "@/lib/utils";

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

interface CampaignsTabProps {
  funnel: Funnel;
}

export function CampaignsTab({ funnel }: CampaignsTabProps) {
  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign, duplicateCampaign } = useCampaignStore();
  const [creating, setCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleCreateVariation = async () => {
    setCreating(true);
    const count = campaigns.length + 1;
    const name = `Variacion ${count}`;
    const steps = funnel.steps.map((s) => ({
      ...JSON.parse(JSON.stringify(s)),
      id: crypto.randomUUID(),
    }));
    const c = await createCampaign(funnel.id, name, steps);
    if (c) {
      toast.success("Variacion creada");
      setEditingCampaign(c);
    }
    setCreating(false);
  };

  const handleCopyUrl = (campaign: Campaign) => {
    const url = `${window.location.origin}/f/${funnel.id}?c=${campaign.slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success("URL copiada"));
  };

  // If editing a campaign, show the inline landing editor
  if (editingCampaign) {
    return (
      <CampaignLandingInline
        funnel={funnel}
        campaign={editingCampaign}
        onBack={() => setEditingCampaign(null)}
        onUpdate={(updates) => {
          updateCampaign(editingCampaign.id, updates);
          setEditingCampaign({ ...editingCampaign, ...updates });
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" weight="fill" />
            A/B Test - Landing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Crea variaciones de tu landing para optimizar la conversion. Solo cambia la intro, el resto del funnel permanece igual.
          </p>
        </div>
        <Button size="sm" onClick={handleCreateVariation} disabled={creating}>
          <Plus className="h-4 w-4 mr-2" weight="bold" /> Crear variacion
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" weight="bold" />
            <p className="mb-1 font-medium">No hay variaciones aun</p>
            <p className="text-sm">Crea tu primera variacion para hacer A/B testing en la landing.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.name}</span>
                    {c.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">/f/{funnel.id}?c={c.slug}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditingCampaign(c)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" weight="bold" /> Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleCopyUrl(c)} title="Copiar URL">
                  <Link className="h-4 w-4" weight="bold" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><DotsThree className="h-4 w-4" weight="bold" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateCampaign(c.id).then(() => toast.success("Variacion duplicada"))}>
                      <Copy className="h-4 w-4 mr-2" weight="bold" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyUrl(c)}>
                      <Link className="h-4 w-4 mr-2" weight="bold" /> Copiar URL
                    </DropdownMenuItem>
                    {!c.is_default && (
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteCampaign(c.id).then(() => toast.success("Variacion eliminada"))}>
                        <Trash className="h-4 w-4 mr-2" weight="bold" /> Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* -- Inline campaign landing editor -- */

interface CampaignLandingInlineProps {
  funnel: Funnel;
  campaign: Campaign;
  onBack: () => void;
  onUpdate: (updates: Partial<Campaign>) => void;
}

function CampaignLandingInline({ funnel, campaign, onBack, onUpdate }: CampaignLandingInlineProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("mobile");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const introStep = campaign.steps?.find((s: any) => s.type === "intro") as FunnelStep | undefined;
  const defaultIntroConfig: IntroConfig = useMemo(
    () => ({ headline: "", description: "", cta: "", showVideo: false }),
    [],
  );
  const ic = introStep?.introConfig || defaultIntroConfig;

  const handleUpdate = useCallback((key: string, value: any) => {
    if (!introStep) return;
    const updatedIntro = { ...ic, [key]: value };
    const newSteps = campaign.steps.map((s: any) =>
      s.id === introStep.id ? { ...s, introConfig: updatedIntro } : s
    );
    onUpdate({ steps: newSteps });
  }, [campaign, introStep, ic, onUpdate]);

  if (!introStep) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground mb-4">Esta variacion no tiene landing.</p>
        <Button variant="outline" onClick={onBack}>Volver</Button>
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

  const previewH = isMobile ? (ic.mobileHeadlineFontSize || 20) : (ic.headlineFontSize || 30);
  const previewD = isMobile ? (ic.mobileDescriptionFontSize || 14) : (ic.descriptionFontSize || 18);
  const previewC = isMobile ? (ic.mobileCtaFontSize || 14) : (ic.ctaFontSize || 16);
  const previewS = isMobile ? (ic.mobileElementSpacing || 12) : (ic.elementSpacing || 16);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Preview */}
      <div className="flex-1 bg-muted/30 overflow-auto flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <X className="h-4 w-4 mr-1.5" weight="bold" /> Volver a variaciones
          </Button>
          <Badge variant="secondary" className="text-xs">{campaign.name}</Badge>
          <div className="flex-1" />
          <div className="flex gap-1 border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("mobile")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <DeviceMobile className="h-3.5 w-3.5" weight="bold" />
            </button>
            <button
              onClick={() => setViewMode("desktop")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Monitor className="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-start py-8">
          <div className={cn("bg-white rounded-xl shadow-lg overflow-hidden", isMobile ? "w-[375px]" : "w-[800px]")}>
            <div className={cn("p-6", isMobile ? "px-5 py-6" : "px-10 py-8")}>
              <div className="text-center" style={{ gap: `${previewS}px`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h1 className="font-bold leading-tight" style={{ fontSize: `${previewH}px` }}>
                  {ic.headline || "Titulo de la landing"}
                </h1>
                {ic.showVideo && ic.videoUrl && (
                  <div className="rounded-xl overflow-hidden aspect-video w-full">
                    {(() => {
                      const embedUrl = getEmbedUrl(ic.videoUrl);
                      return embedUrl ? (
                        <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen />
                      ) : (
                        <div className="bg-muted w-full h-full flex items-center justify-center text-muted-foreground text-sm">URL no valida</div>
                      );
                    })()}
                  </div>
                )}
                <p className="text-muted-foreground leading-relaxed" style={{ fontSize: `${previewD}px` }}>
                  {ic.description || "Descripcion de la landing"}
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
      </div>

      {/* Properties panel */}
      <div className="w-80 border-l bg-background flex flex-col shrink-0">
        <div className="px-4 py-3 border-b">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landing de la variacion</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Titulo</Label>
              <Input value={ic.headline || ""} onChange={(e) => handleUpdate("headline", e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Descripcion</Label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                rows={3}
                value={ic.description || ""}
                onChange={(e) => handleUpdate("description", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Texto del boton</Label>
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
              <Label className="text-xs font-semibold">Tamano y espaciado</Label>
              <div className="flex gap-1 border rounded-lg p-0.5">
                <button onClick={() => setDevice("desktop")} className={cn("p-1.5 rounded-md transition-colors", device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <Monitor className="h-3.5 w-3.5" weight="bold" />
                </button>
                <button onClick={() => setDevice("mobile")} className={cn("p-1.5 rounded-md transition-colors", device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <DeviceMobile className="h-3.5 w-3.5" weight="bold" />
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Titulo - {(ic as any)[hKey] || hDefault}px</Label>
              <Slider min={12} max={60} step={1} value={[(ic as any)[hKey] || hDefault]} onValueChange={([v]) => handleUpdate(hKey, v)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descripcion - {(ic as any)[dKey] || dDefault}px</Label>
              <Slider min={10} max={32} step={1} value={[(ic as any)[dKey] || dDefault]} onValueChange={([v]) => handleUpdate(dKey, v)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Boton - {(ic as any)[cKey] || cDefault}px</Label>
              <Slider min={10} max={28} step={1} value={[(ic as any)[cKey] || cDefault]} onValueChange={([v]) => handleUpdate(cKey, v)} className="mt-1" />
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Espacio entre elementos - {(ic as any)[sKey] || sDefault}px</Label>
              <Slider min={4} max={48} step={2} value={[(ic as any)[sKey] || sDefault]} onValueChange={([v]) => handleUpdate(sKey, v)} className="mt-1" />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

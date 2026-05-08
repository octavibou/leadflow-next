import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { HexColorPicker } from "react-colorful";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFunnelStore } from "@/store/funnelStore";
import { LANGUAGE_LABELS } from "@/lib/i18n";
import { Copy, Check, CaretDown, Globe } from "@phosphor-icons/react";
import { Activity } from "lucide-react";
import type { Language } from "@/lib/i18n";
import type { Funnel, FunnelSettings } from "@/types/funnel";

const FONTS = ["Inter", "System", "Poppins", "Montserrat"];
const LANGUAGES = Object.keys(LANGUAGE_LABELS) as Language[];

export function GlobalSettingsSheet({ funnel, open, onClose }: { funnel: Funnel; open: boolean; onClose: () => void }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);
  const [metaToken, setMetaToken] = useState("");
  const [savingMetaToken, setSavingMetaToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSettings(funnel.settings);
  }, [open, funnel.settings, funnel.id]);

  const set = <K extends keyof FunnelSettings>(k: K, v: FunnelSettings[K]) => {
    const updated: FunnelSettings = { ...settings, [k]: v };
    setSettings(updated);
    updateFunnel(funnel.id, { settings: updated });
  };

  const questionSteps = [...funnel.steps]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.type === "question" && s.question?.text);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const testWebhook = async () => {
    if (!settings.webhookUrl) return;
    try {
      await fetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
      alert("¡Webhook de prueba enviado!");
    } catch {
      alert("No se pudo conectar con la URL del webhook");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        hideOverlay
        side="right"
        className="flex max-h-full w-full max-w-80 flex-col gap-0 overflow-hidden border-l bg-background p-0 sm:max-w-80"
      >
        <div className="shrink-0 border-b px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuración global
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">
          <div>
            <Label className="text-xs mb-1.5 block">Idioma del funnel</Label>
            <select className="w-full h-9 border rounded-md px-3 text-sm bg-background" value={settings.language || "es"} onChange={(e) => set("language", e.target.value)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Color primario</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 border rounded-md px-3 py-2 w-full text-sm">
                  <div className="w-5 h-5 rounded" style={{ background: settings.primaryColor }} />
                  {settings.primaryColor}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <HexColorPicker color={settings.primaryColor} onChange={(c) => set("primaryColor", c)} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Tipografía</Label>
            <select className="w-full h-9 border rounded-md px-3 text-sm bg-background" value={settings.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">URL del logo</Label>
            <Input className="h-9 text-sm" value={settings.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." />
          </div>

          {funnel.steps.some((s) => s.type === "intro") && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="use-landing-settings" className="text-xs">
                    Mostrar landing antes del quiz
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Si lo desactivas, el funnel público empieza en la primera pregunta.
                  </p>
                </div>
                <Switch
                  id="use-landing-settings"
                  className="mt-0.5 shrink-0"
                  checked={settings.useLanding !== false}
                  onCheckedChange={(checked) => {
                    const updated = { ...settings, useLanding: checked };
                    setSettings(updated);
                    updateFunnel(funnel.id, { settings: updated });
                  }}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Custom Domain */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs font-semibold">Dominio personalizado</Label>
            </div>
            <Input
              className="h-9 text-sm mb-2"
              value={settings.customDomain}
              onChange={(e) => set("customDomain", e.target.value)}
              placeholder="quiz.tudominio.com"
            />
            {settings.customDomain && (
              <div className="space-y-2 mt-3">
                <p className="text-[11px] text-muted-foreground">
                  Configura estos registros DNS en tu proveedor de dominios:
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold w-12 shrink-0">Tipo</span>
                    <span className="font-semibold flex-1">Host</span>
                    <span className="font-semibold flex-1">Valor</span>
                    <span className="w-7" />
                  </div>
                  {[
                    { type: "CNAME", host: settings.customDomain, value: "embeddable-quiz.lovable.app" },
                  ].map((record) => (
                    <div key={record.type + record.host} className="flex items-center gap-2 text-[11px]">
                      <span className="font-mono bg-background border rounded px-1.5 py-1 w-12 text-center shrink-0">{record.type}</span>
                      <span className="font-mono bg-background border rounded px-1.5 py-1 flex-1 truncate" title={record.host}>{record.host}</span>
                      <span className="font-mono bg-background border rounded px-1.5 py-1 flex-1 truncate" title={record.value}>{record.value}</span>
                      <button onClick={() => copyToClipboard(record.value)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                        {copiedField === record.value ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Apunta tu subdominio con un registro CNAME hacia tu URL publicada. El funnel estará disponible en: <strong className="font-mono">https://{settings.customDomain}/f/{funnel.slug}</strong>
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Meta Tracking */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs font-semibold">Meta Tracking</Label>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">Pixel ID</Label>
                <Input
                  className="h-9 text-sm"
                  value={settings.metaPixelId || ""}
                  onChange={(e) => set("metaPixelId", e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">Conversions API Access Token</Label>
                <Input
                  className="h-9 text-sm"
                  type="password"
                  value={metaToken}
                  onChange={(e) => setMetaToken(e.target.value)}
                  placeholder="EAAxxxxxxx..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Genera el token en Meta Events Manager → Settings → Conversions API.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!metaToken || savingMetaToken}
                    onClick={async () => {
                      setSavingMetaToken(true);
                      try {
                        const { supabase } = await import("@/integrations/supabase/client");
                        const { error } = await supabase
                          .from("funnel_secrets")
                          .upsert({ funnel_id: funnel.id, meta_access_token: metaToken });
                        if (!error) setMetaToken("");
                      } finally {
                        setSavingMetaToken(false);
                      }
                    }}
                  >
                    {savingMetaToken ? "Guardando..." : "Guardar token"}
                  </Button>
                  <span className="text-[10px] text-muted-foreground">Por seguridad, no se volverá a mostrar.</span>
                </div>
              </div>
              <div>
                <Label className="text-[11px] mb-1 block text-muted-foreground">Test Event Code (opcional)</Label>
                <Input
                  className="h-9 text-sm"
                  value={settings.metaTestEventCode || ""}
                  onChange={(e) => set("metaTestEventCode", e.target.value)}
                  placeholder="TEST12345"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Solo para pruebas. Los eventos aparecerán en Meta Events Manager → Test Events.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs mb-1.5 block">URL del Webhook GHL</Label>
            <div className="flex gap-2">
              <Input className="h-9 text-sm flex-1" value={settings.webhookUrl} onChange={(e) => set("webhookUrl", e.target.value)} placeholder="https://..." />
              <Button size="sm" variant="outline" onClick={testWebhook}>Probar</Button>
            </div>
          </div>

          {/* Custom fields reference for GHL mapping */}
          {questionSteps.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs font-semibold mb-2 block">Custom Fields para GHL</Label>
              <p className="text-[11px] text-muted-foreground mb-3">Estos son los nombres que recibirás en el webhook. Cópialos para crear los custom fields en GHL.</p>
              <div className="space-y-1.5">
                {["firstName", "lastName", "email", "phone"].map((field) => (
                  <div key={field} className="flex items-center gap-2 text-[11px]">
                    <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">{field}</span>
                    <button onClick={() => copyToClipboard(field)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                ))}
                <div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      onClick={() => setExpandedQuestion(expandedQuestion === "__qualified" ? null : "__qualified")}
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    >
                      <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedQuestion === "__qualified" ? "rotate-180" : ""}`} />
                    </button>
                    <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">qualified</span>
                    <button onClick={() => copyToClipboard("qualified")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedField === "qualified" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  {expandedQuestion === "__qualified" && (
                    <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                      <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                      {["true", "false"].map((val) => (
                        <div key={val} className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono bg-background border rounded px-1.5 py-0.5 flex-1 truncate">{val}</span>
                          <button onClick={() => copyToClipboard(val)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                            {copiedField === val ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">summary</span>
                  <button onClick={() => copyToClipboard("summary")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                    {copiedField === "summary" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 mb-2">Texto formateado con todas las respuestas, ideal para crear una nota en GHL.</p>
                <Separator className="my-2" />
                <p className="text-[10px] text-muted-foreground mb-1">Respuestas (dentro de "answers"):</p>
                {questionSteps.map((step) => {
                  const label = step.question!.text;
                  const options = step.question!.options || [];
                  const isExpanded = expandedQuestion === step.id;
                  return (
                    <div key={step.id}>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : step.id)}
                          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                        >
                          <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate" title={label}>{label}</span>
                        <button onClick={() => copyToClipboard(label)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                          {copiedField === label ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                      {isExpanded && options.length > 0 && (
                        <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                          <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                          {options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-2 text-[10px]">
                              <span className="font-mono bg-background border rounded px-1.5 py-0.5 flex-1 truncate" title={opt.label}>{opt.label}</span>
                              <button onClick={() => copyToClipboard(opt.label)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                                {copiedField === opt.label ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(funnel.type === "appointment" || funnel.type === "strategy_call" || funnel.type === "recruiting") && (
            <>
              <Separator />
              <div>
                <Label className="text-xs mb-1.5 block">URL de reserva</Label>
                <Input className="h-9 text-sm" value={settings.bookingUrl} onChange={(e) => set("bookingUrl", e.target.value)} placeholder="URL del embed de calendario" />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">URL de redirección después de reservar</Label>
                <Input className="h-9 text-sm" value={settings.redirectUrlAfterBooking} onChange={(e) => set("redirectUrlAfterBooking", e.target.value)} placeholder="https://... (el sistema añade ?booked=1)" />
              </div>
            </>
          )}

          {funnel.type === "vsl" && (
            <>
              <Separator />
              <div>
                <Label className="text-xs mb-1.5 block">URL del video VSL</Label>
                <Input className="h-9 text-sm" value={settings.vslVideoUrl} onChange={(e) => set("vslVideoUrl", e.target.value)} placeholder="URL de YouTube o Vimeo" />
              </div>
            </>
          )}

          {funnel.type === "lead_magnet" && (
            <>
              <Separator />
              <div>
                <Label className="text-xs mb-1.5 block">Título del Lead Magnet</Label>
                <Input className="h-9 text-sm" value={settings.leadMagnetTitle} onChange={(e) => set("leadMagnetTitle", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Descripción del Lead Magnet</Label>
                <Input className="h-9 text-sm" value={settings.leadMagnetDescription} onChange={(e) => set("leadMagnetDescription", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">URL de descarga</Label>
                <Input className="h-9 text-sm" value={settings.leadMagnetDownloadUrl} onChange={(e) => set("leadMagnetDownloadUrl", e.target.value)} />
              </div>
            </>
          )}

          <Separator />

          <div>
            <Label className="text-xs mb-1.5 block">Funnel ID</Label>
            <div className="flex items-center gap-2">
              <Input
                className="h-9 text-sm font-mono flex-1"
                value={funnel.id}
                readOnly
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(funnel.id)}
                className="gap-2"
              >
                {copiedField === funnel.id ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import type { Funnel, FunnelSettings } from "@/types/funnel";
import { cn } from "@/lib/utils";

export function TrackingTab({ funnel, embedded = false }: { funnel: Funnel; embedded?: boolean }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);
  const [metaToken, setMetaToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  const set = (k: keyof FunnelSettings, v: string) => {
    const updated = { ...settings, [k]: v };
    setSettings(updated);
    updateFunnel(funnel.id, { settings: updated });
  };

  const hasPixel = !!settings.metaPixelId;
  const isConfigured = hasPixel;

  return (
    <div
      className={cn(
        "w-full min-w-0 px-6 pb-6 lg:px-8",
        embedded ? "pt-4" : "mx-auto max-w-2xl space-y-8 py-10",
        !embedded && "space-y-8",
      )}
    >
      {!embedded && (
        <div>
          <h2 className="text-2xl font-bold mb-1">Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Conecta Meta Pixel y la Conversions API para medir el rendimiento de tus campanas.
          </p>
        </div>
      )}

      <div className={cn(embedded && "mx-auto w-full max-w-2xl space-y-6")}>
        <div className="border rounded-xl p-6 bg-card space-y-5">
          <div className="flex items-center gap-3">
            {!embedded && (
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                <Image
                  src="/meta-ads-logo.png"
                  alt="Meta"
                  width={40}
                  height={40}
                  className="object-contain"
                  sizes="40px"
                />
              </div>
            )}
            <div className={cn(!embedded && "min-w-0")}>
              <h3 className="text-sm font-semibold">Meta (Facebook)</h3>
              <p className="text-xs text-muted-foreground">Pixel + Conversions API</p>
            </div>
            {isConfigured && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                Conectado
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Pixel ID</Label>
              <Input
                className="h-10 text-sm"
                value={settings.metaPixelId || ""}
                onChange={(e) => set("metaPixelId", e.target.value)}
                placeholder="123456789012345"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Conversions API Access Token</Label>
              <Input
                className="h-10 text-sm"
                type="password"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                placeholder="EAAxxxxxxx..."
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Genera el token en Meta Events Manager - Settings - Conversions API.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!metaToken || savingToken}
                  onClick={async () => {
                    setSavingToken(true);
                    try {
                      const { supabase } = await import("@/integrations/supabase/client");
                      const { error } = await supabase
                        .from("funnel_secrets")
                        .upsert({ funnel_id: funnel.id, meta_access_token: metaToken });
                      if (!error) setMetaToken("");
                    } finally {
                      setSavingToken(false);
                    }
                  }}
                >
                  {savingToken ? "Guardando..." : "Guardar token"}
                </Button>
                <span className="text-[10px] text-muted-foreground">Por seguridad, no se volverá a mostrar.</span>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Test Event Code (opcional)</Label>
              <Input
                className="h-10 text-sm"
                value={settings.metaTestEventCode || ""}
                onChange={(e) => set("metaTestEventCode", e.target.value)}
                placeholder="TEST12345"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Solo para pruebas. Los eventos apareceran en Meta Events Manager - Test Events.
              </p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Eventos que se trackean automaticamente</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { event: "PageView", desc: "Al cargar el funnel" },
                { event: "ViewContent", desc: "En cada paso" },
                { event: "Lead", desc: "Al enviar el formulario" },
                { event: "CompleteRegistration", desc: "Al mostrar resultado" },
              ].map(({ event, desc }) => (
                <div key={event} className="flex items-start gap-2 text-xs border rounded-lg p-2.5 bg-muted/30">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" weight="fill" />
                  <div>
                    <span className="font-mono font-medium">{event}</span>
                    <p className="text-muted-foreground text-[10px]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

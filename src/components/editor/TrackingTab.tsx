import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, CheckCircle, PaperPlaneTilt, SpinnerGap, Warning, ArrowSquareOut } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import type { Funnel, FunnelSettings } from "@/types/funnel";

const TEST_EVENTS = [
  { value: "PageView", label: "PageView", desc: "Visita a la pagina" },
  { value: "ViewContent", label: "ViewContent", desc: "Visualizacion de contenido" },
  { value: "Lead", label: "Lead", desc: "Envio de formulario" },
  { value: "CompleteRegistration", label: "CompleteRegistration", desc: "Conversion / resultado" },
  { value: "InitiateCheckout", label: "InitiateCheckout", desc: "Inicio de checkout" },
  { value: "Purchase", label: "Purchase", desc: "Compra realizada" },
];

export function TrackingTab({ funnel }: { funnel: Funnel }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);

  // Test event state
  const [testEvent, setTestEvent] = useState("PageView");
  const [testSourceUrl, setTestSourceUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  });
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const set = (k: keyof FunnelSettings, v: string) => {
    const updated = { ...settings, [k]: v };
    setSettings(updated);
    updateFunnel(funnel.id, { settings: updated });
  };

  const hasPixel = !!settings.metaPixelId;
  const hasToken = !!settings.metaAccessToken;
  const isConfigured = hasPixel && hasToken;

  const handleSendTestEvent = async () => {
    if (!settings.metaPixelId || !settings.metaAccessToken) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const projectId = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID;
      const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const eventId = crypto.randomUUID();

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/meta-capi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          pixelId: settings.metaPixelId,
          accessToken: settings.metaAccessToken,
          testEventCode: settings.metaTestEventCode || undefined,
          events: [
            {
              event_name: testEvent,
              event_time: Math.floor(Date.now() / 1000),
              event_source_url: testSourceUrl,
              action_source: "website",
              event_id: eventId,
              user_data: {
                client_ip_address: "0.0.0.0",
                client_user_agent: navigator.userAgent,
              },
            },
          ],
        }),
      });

      const data = await res.json();

      if (res.ok && data.events_received) {
        setTestResult({
          ok: true,
          message: `Evento "${testEvent}" enviado correctamente. ${data.events_received} evento(s) recibido(s) por Meta.`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `Error: ${data.error?.message || JSON.stringify(data)}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Error de red: ${err.message}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Tracking</h2>
        <p className="text-sm text-muted-foreground">
          Conecta Meta Pixel y la Conversions API para medir el rendimiento de tus campanas.
        </p>
      </div>

      {/* Configuration card */}
      <div className="border rounded-xl p-6 bg-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-blue-500" weight="bold" />
          </div>
          <div>
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
              value={settings.metaAccessToken || ""}
              onChange={(e) => set("metaAccessToken", e.target.value)}
              placeholder="EAAxxxxxxx..."
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Genera el token en Meta Events Manager - Settings - Conversions API.
            </p>
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

        {/* Events tracked */}
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

      {/* Test events card */}
      <div className="border rounded-xl p-6 bg-card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <PaperPlaneTilt className="h-5 w-5 text-orange-500" weight="bold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Probar eventos</h3>
            <p className="text-xs text-muted-foreground">
              Envia un evento de prueba a Meta para verificar la conexion.
            </p>
          </div>
        </div>

        {!isConfigured && (
          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
            <Warning className="h-4 w-4 shrink-0 mt-0.5" weight="bold" />
            <p>Configura el Pixel ID y el Access Token arriba para poder enviar eventos de prueba.</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">Tipo de evento</Label>
            <Select value={testEvent} onValueChange={setTestEvent}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_EVENTS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{e.label}</span>
                      <span className="text-muted-foreground text-xs">- {e.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">URL de origen</Label>
            <Input
              className="h-10 text-sm"
              value={testSourceUrl}
              onChange={(e) => setTestSourceUrl(e.target.value)}
              placeholder="https://tu-dominio.com"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              La URL que aparecera como origen del evento en Meta.
            </p>
          </div>

          <Button
            onClick={handleSendTestEvent}
            disabled={!isConfigured || testSending}
            className="w-full"
          >
            {testSending ? (
              <>
                <SpinnerGap className="h-4 w-4 mr-2 animate-spin" weight="bold" />
                Enviando...
              </>
            ) : (
              <>
                <PaperPlaneTilt className="h-4 w-4 mr-2" weight="bold" />
                Enviar evento de prueba
              </>
            )}
          </Button>

          {testResult && (
            <div
              className={`text-sm rounded-lg p-3 ${
                testResult.ok
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
              }`}
            >
              {testResult.message}
            </div>
          )}

          {settings.metaTestEventCode && (
            <a
              href="https://business.facebook.com/events_manager2/list/pixel/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <ArrowSquareOut className="h-3 w-3" weight="bold" />
              Abrir Meta Events Manager - Test Events
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

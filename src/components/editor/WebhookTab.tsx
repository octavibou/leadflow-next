import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, CaretDown, PaperPlaneTilt, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import type { Funnel, FunnelSettings } from "@/types/funnel";

export function WebhookTab({ funnel }: { funnel: Funnel }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const set = (k: keyof FunnelSettings, v: string) => {
    const updated = { ...settings, [k]: v };
    setSettings(updated);
    updateFunnel(funnel.id, { settings: updated });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const testWebhook = async () => {
    if (!settings.webhookUrl) return;
    setTesting(true);
    try {
      await fetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
      toast.success("¡Webhook de prueba enviado!");
    } catch {
      toast.error("No se pudo conectar con la URL del webhook");
    } finally {
      setTesting(false);
    }
  };

  const questionSteps = [...funnel.steps]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.type === "question" && s.question?.text);

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">Webhook</h2>
        <p className="text-sm text-muted-foreground">
          Configura dónde se enviarán los datos de tus leads cuando completen el funnel.
        </p>
      </div>

      <div className="border rounded-xl p-6 space-y-4 bg-card">
        <Label className="text-sm font-medium">URL del Webhook</Label>
        <div className="flex gap-2">
          <Input
            className="h-10 text-sm flex-1"
            value={settings.webhookUrl}
            onChange={(e) => set("webhookUrl", e.target.value)}
            placeholder="https://hooks.zapier.com/... o tu endpoint GHL"
          />
          <Button
            variant="outline"
            onClick={testWebhook}
            disabled={!settings.webhookUrl || testing}
            className="gap-2"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="bold" />
            Probar
          </Button>
        </div>
        {settings.webhookUrl && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" weight="bold" />
            Webhook configurado
          </div>
        )}
      </div>

      {/* Custom fields reference */}
      {questionSteps.length > 0 && (
        <div className="border rounded-xl p-6 bg-card space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">Custom Fields para GHL</h3>
            <p className="text-xs text-muted-foreground">
              Estos son los nombres que recibirás en el webhook. Cópialos para crear los custom fields.
            </p>
          </div>
          <div className="space-y-1.5">
            {["firstName", "lastName", "email", "phone"].map((field) => (
              <div key={field} className="flex items-center gap-2 text-xs">
                <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">{field}</span>
                <button onClick={() => copyToClipboard(field)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                  {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                </button>
              </div>
            ))}
            {/* qualified */}
            <div>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setExpandedQuestion(expandedQuestion === "__qualified" ? null : "__qualified")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                  <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedQuestion === "__qualified" ? "rotate-180" : ""}`} weight="bold" />
                </button>
                <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">qualified</span>
                <button onClick={() => copyToClipboard("qualified")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                  {copiedField === "qualified" ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                </button>
              </div>
              {expandedQuestion === "__qualified" && (
                <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                  <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                  {["true", "false"].map((val) => (
                    <div key={val} className="flex items-center gap-2 text-[10px]">
                      <span className="font-mono bg-muted border rounded px-1.5 py-0.5 flex-1 truncate">{val}</span>
                      <button onClick={() => copyToClipboard(val)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                        {copiedField === val ? <Check className="w-3 h-3 text-green-500" weight="bold" /> : <Copy className="w-3 h-3 text-muted-foreground" weight="bold" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* summary */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">summary</span>
              <button onClick={() => copyToClipboard("summary")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                {copiedField === "summary" ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 mb-2">Texto con todas las respuestas, ideal para notas en GHL.</p>
            <Separator className="my-2" />
            <p className="text-[10px] text-muted-foreground mb-1">Respuestas (dentro de "answers"):</p>
            {questionSteps.map((step) => {
              const label = step.question!.text;
              const options = step.question!.options || [];
              const isExpanded = expandedQuestion === step.id;
              return (
                <div key={step.id}>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => setExpandedQuestion(isExpanded ? null : step.id)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} weight="bold" />
                    </button>
                    <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate" title={label}>{label}</span>
                    <button onClick={() => copyToClipboard(label)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedField === label ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                    </button>
                  </div>
                  {isExpanded && options.length > 0 && (
                    <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                      <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                      {options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono bg-muted border rounded px-1.5 py-0.5 flex-1 truncate" title={opt.label}>{opt.label}</span>
                          <button onClick={() => copyToClipboard(opt.label)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                            {copiedField === opt.label ? <Check className="w-3 h-3 text-green-500" weight="bold" /> : <Copy className="w-3 h-3 text-muted-foreground" weight="bold" />}
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
    </div>
  );
}

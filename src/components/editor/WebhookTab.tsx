"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, Check, CaretDown, PaperPlaneTilt, CheckCircle, ArrowSquareOut, ArrowSquareIn } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import type { Funnel, FunnelSettings } from "@/types/funnel";
import { cn } from "@/lib/utils";
import { GhlInboundConfig } from "@/components/editor/GhlInboundConfig";

type WebhookDirectionTab = "send" | "receive";

export function WebhookTab({ funnel, embedded = false }: { funnel: Funnel; embedded?: boolean }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [directionTab, setDirectionTab] = useState<WebhookDirectionTab>("send");

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

  const fieldsAccordion =
    questionSteps.length > 0 ? (
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold">Custom Fields para GHL</h3>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
            Despliega cada bloque para ver los nombres de campo y copiarlos a tu CRM.
          </p>
        </div>
        <Accordion type="multiple" className="rounded-none border-0">
          <AccordionItem value="contacto" className="border-b-0 not-last:border-b">
            <AccordionTrigger className="px-4 py-3 text-sm sm:px-5">
              <span className="flex flex-col gap-0.5 text-left sm:flex-row sm:items-baseline sm:gap-2">
                <span>Contacto</span>
                <span className="text-[11px] font-normal text-muted-foreground">firstName, lastName, email, phone</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-5">
              <div className="grid max-w-3xl gap-1.5 sm:grid-cols-2">
                {["firstName", "lastName", "email", "phone"].map((field) => (
                  <div key={field} className="flex items-center gap-2 text-xs">
                    <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">{field}</span>
                    <button type="button" onClick={() => copyToClipboard(field)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                    </button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="estado" className="border-b-0 not-last:border-b">
            <AccordionTrigger className="px-4 py-3 text-sm sm:px-5">
              <span className="flex flex-col gap-0.5 text-left sm:flex-row sm:items-baseline sm:gap-2">
                <span>Calificación y resumen</span>
                <span className="text-[11px] font-normal text-muted-foreground">qualified, summary</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-5">
              <div className="max-w-3xl space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedQuestion(expandedQuestion === "__qualified" ? null : "__qualified")}
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    >
                      <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedQuestion === "__qualified" ? "rotate-180" : ""}`} weight="bold" />
                    </button>
                    <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">qualified</span>
                    <button type="button" onClick={() => copyToClipboard("qualified")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {copiedField === "qualified" ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                    </button>
                  </div>
                  {expandedQuestion === "__qualified" && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-2">
                      <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                      {["true", "false"].map((val) => (
                        <div key={val} className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono bg-muted border rounded px-1.5 py-0.5 flex-1 truncate">{val}</span>
                          <button type="button" onClick={() => copyToClipboard(val)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                            {copiedField === val ? <Check className="w-3 h-3 text-green-500" weight="bold" /> : <Copy className="w-3 h-3 text-muted-foreground" weight="bold" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate">summary</span>
                  <button type="button" onClick={() => copyToClipboard("summary")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                    {copiedField === "summary" ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  <span className="font-medium text-foreground/80">summary:</span> texto con todas las respuestas, ideal para notas en GHL.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preguntas" className="border-0">
            <AccordionTrigger className="px-4 py-3 text-sm sm:px-5">
              <span className="flex flex-col gap-0.5 text-left sm:flex-row sm:items-baseline sm:gap-2">
                <span>Respuestas del quiz</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {questionSteps.length} en &quot;answers&quot; · despliega cada pregunta para ver valores
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-5">
              <div className="max-h-[min(24rem,50vh)] space-y-1.5 overflow-y-auto overscroll-contain pr-1">
                {questionSteps.map((step) => {
                  const label = step.question!.text;
                  const options = step.question!.options || [];
                  const isExpanded = expandedQuestion === step.id;
                  return (
                    <div key={step.id} className="rounded-md border bg-muted/20 p-2">
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedQuestion(isExpanded ? null : step.id)}
                          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                        >
                          <CaretDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} weight="bold" />
                        </button>
                        <span className="font-mono bg-muted border rounded px-2 py-1.5 flex-1 truncate text-left" title={label}>
                          {label}
                        </span>
                        <button type="button" onClick={() => copyToClipboard(label)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                          {copiedField === label ? <Check className="w-3.5 h-3.5 text-green-500" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />}
                        </button>
                      </div>
                      {isExpanded && options.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1 border-l-2 border-muted pl-2">
                          <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                          {options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-2 text-[10px]">
                              <span className="font-mono bg-muted border rounded px-1.5 py-0.5 flex-1 truncate" title={opt.label}>
                                {opt.label}
                              </span>
                              <button type="button" onClick={() => copyToClipboard(opt.label)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    ) : null;

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
          <h2 className="text-2xl font-bold mb-1">Webhook</h2>
          <p className="text-sm text-muted-foreground">
            Conecta LeadFlow con tu CRM: envía leads al completar el funnel y recibe cierres para trackear revenue.
          </p>
        </div>
      )}

      <div className={cn(embedded && "mx-auto w-full max-w-2xl")}>
        <Tabs
          value={directionTab}
          onValueChange={(v) => setDirectionTab(v as WebhookDirectionTab)}
          className="gap-4"
        >
          <TabsList variant="line" className="w-full justify-start gap-1">
            <TabsTrigger value="send" className="gap-1.5">
              <ArrowSquareOut className="h-3.5 w-3.5" weight="bold" />
              Enviar leads
            </TabsTrigger>
            <TabsTrigger value="receive" className="gap-1.5" disabled={!funnel.workspace_id}>
              <ArrowSquareIn className="h-3.5 w-3.5" weight="bold" />
              Recibir cierres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">LeadFlow → tu CRM.</span>{" "}
              Cuando alguien completa el funnel, enviamos sus datos a la URL que configures (GHL, Zapier, Make…).
            </p>

            <div className="border rounded-xl p-4 space-y-3 bg-card sm:p-5">
              <Label className="text-sm font-medium">URL de destino</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  className="h-9 text-sm flex-1 min-w-0"
                  value={settings.webhookUrl}
                  onChange={(e) => set("webhookUrl", e.target.value)}
                  placeholder="https://hooks.zapier.com/... o tu endpoint GHL"
                />
                <Button
                  variant="outline"
                  onClick={testWebhook}
                  disabled={!settings.webhookUrl || testing}
                  className="h-9 shrink-0 gap-2 sm:w-auto w-full"
                >
                  <PaperPlaneTilt className="h-4 w-4" weight="bold" />
                  Probar
                </Button>
              </div>
              {settings.webhookUrl && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" weight="bold" />
                  Webhook de envío configurado
                </div>
              )}
            </div>

            {fieldsAccordion}
          </TabsContent>

          <TabsContent value="receive" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">Tu CRM → LeadFlow.</span>{" "}
              Cuando cierras una oportunidad en GHL, nos avisas el importe y atribuimos el revenue al funnel, variante y campaña.
            </p>

            {funnel.workspace_id ? (
              <GhlInboundConfig workspaceId={funnel.workspace_id} embedded />
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este funnel no está vinculado a un workspace. La recepción de cierres requiere un workspace activo.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Copy,
  Check,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  Info,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useGhlIntegration } from "@/hooks/useGhlIntegration";
import { Skeleton } from "@/components/ui/skeleton";

interface GhlInboundConfigProps {
  workspaceId: string;
  /** Oculta el título principal cuando va dentro de una sub-pestaña. */
  embedded?: boolean;
}

const LF_FIELDS = [
  { field: "lf_lead_id", desc: "ID único del lead en LeadFlow (requerido para match exacto)" },
  { field: "lf_funnel_id", desc: "ID del funnel" },
  { field: "lf_funnel_name", desc: "Nombre del funnel" },
  { field: "lf_workspace_id", desc: "ID del workspace" },
  { field: "lf_campaign_id", desc: "ID de la campaña (si aplica)" },
  { field: "lf_branch_id", desc: "ID de la rama/variante de landing" },
  { field: "lf_branch_slug", desc: "Slug de la rama (ej: 'main', 'test-a')" },
  { field: "lf_deployment_id", desc: "ID del deployment específico" },
  { field: "lf_session_id", desc: "ID de sesión del visitante" },
];

export function GhlInboundConfig({ workspaceId, embedded = false }: GhlInboundConfigProps) {
  const {
    integration,
    loading,
    generateSecret,
    regenerateSecret,
    toggleEnabled,
  } = useGhlIntegration(workspaceId);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/integrations/ghl/${workspaceId}/inbound`
      : `/api/integrations/ghl/${workspaceId}/inbound`;

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    toast.success(label ? `${label} copiado` : "Copiado al portapapeles");
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleGenerateSecret = async () => {
    setGenerating(true);
    const secret = integration?.inbound_secret
      ? await regenerateSecret()
      : await generateSecret();
    setGenerating(false);
    if (secret) {
      toast.success("Secret generado correctamente");
    }
  };

  if (loading) {
    return (
      <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const isConfigured = integration?.inbound_secret && integration?.enabled;

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {!embedded ? (
            <>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Recibir cierres desde GHL
                {isConfigured ? (
                  <CheckCircle className="h-4 w-4 text-green-500" weight="fill" />
                ) : (
                  <WarningCircle className="h-4 w-4 text-amber-500" weight="fill" />
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configura un webhook en GHL para recibir actualizaciones de
                oportunidades y citas.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {isConfigured ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" weight="fill" />
              ) : (
                <WarningCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" weight="fill" />
              )}
              {isConfigured
                ? "Integración activa — GHL puede enviar cierres y citas a LeadFlow."
                : "Genera un secret y configura el workflow en GHL para empezar."}
            </p>
          )}
        </div>
        {integration && (
          <div className="flex items-center gap-2">
            <Label htmlFor="ghl-enabled" className="text-xs text-muted-foreground">
              {integration.enabled ? "Activo" : "Inactivo"}
            </Label>
            <Switch
              id="ghl-enabled"
              checked={integration.enabled}
              onCheckedChange={toggleEnabled}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">URL del Webhook</Label>
          <div className="flex gap-2 mt-1">
            <Input
              readOnly
              value={webhookUrl}
              className="h-9 text-xs font-mono bg-muted/50"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => copyToClipboard(webhookUrl, "URL")}
            >
              {copiedField === webhookUrl ? (
                <Check className="h-4 w-4 text-green-500" weight="bold" />
              ) : (
                <Copy className="h-4 w-4" weight="bold" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            Secret de Autenticación
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              readOnly
              type="password"
              value={integration?.inbound_secret || "No configurado"}
              className="h-9 text-xs font-mono bg-muted/50"
            />
            {integration?.inbound_secret && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() =>
                  copyToClipboard(integration.inbound_secret!, "Secret")
                }
              >
                {copiedField === integration.inbound_secret ? (
                  <Check className="h-4 w-4 text-green-500" weight="bold" />
                ) : (
                  <Copy className="h-4 w-4" weight="bold" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={handleGenerateSecret}
              disabled={generating}
            >
              <ArrowsClockwise
                className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
                weight="bold"
              />
              {integration?.inbound_secret ? "Regenerar" : "Generar"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Usa este secret como header <code className="bg-muted px-1 rounded">Authorization: Bearer {'<secret>'}</code> en GHL.
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="border-t pt-3">
        <AccordionItem value="setup" className="border-0">
          <AccordionTrigger className="py-2 text-xs hover:no-underline">
            <span className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" weight="bold" />
              Cómo configurar en GHL
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground space-y-3 pb-0">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                En GHL, ve a <strong>Automation</strong> → <strong>Workflows</strong>
              </li>
              <li>
                Crea un workflow con trigger <strong>&quot;Opportunity Status Changed&quot;</strong> o{" "}
                <strong>&quot;Appointment Status&quot;</strong>
              </li>
              <li>
                Añade una acción <strong>&quot;Webhook&quot;</strong>
              </li>
              <li>
                Configura:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>URL: la URL de arriba</li>
                  <li>Method: POST</li>
                  <li>
                    Header: <code className="bg-muted px-1 rounded">Authorization</code> ={" "}
                    <code className="bg-muted px-1 rounded">Bearer {'<tu_secret>'}</code>
                  </li>
                </ul>
              </li>
              <li>
                En el body, incluye los campos de GHL + el campo{" "}
                <code className="bg-muted px-1 rounded">lf_lead_id</code> que enviamos cuando se genera el lead
              </li>
            </ol>

            <div className="border-t pt-3 mt-3">
              <p className="font-medium text-foreground mb-2">
                Campos de atribución enviados con cada lead:
              </p>
              <div className="space-y-1">
                {LF_FIELDS.map((item) => (
                  <div
                    key={item.field}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {item.field}
                      </code>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {item.desc}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.field)}
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                    >
                      {copiedField === item.field ? (
                        <Check className="w-3 h-3 text-green-500" weight="bold" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" weight="bold" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 mt-3">
              <p className="font-medium text-foreground mb-2">
                Estados que detectamos automáticamente:
              </p>
              <ul className="space-y-1 text-[11px]">
                <li>
                  <span className="font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                    won
                  </span>{" "}
                  → stageName contiene &quot;won&quot;, &quot;ganado&quot; o &quot;closed won&quot;
                </li>
                <li>
                  <span className="font-mono bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                    lost
                  </span>{" "}
                  → stageName contiene &quot;lost&quot;, &quot;perdido&quot; o &quot;closed lost&quot;
                </li>
                <li>
                  <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                    booked
                  </span>{" "}
                  → Cita creada
                </li>
                <li>
                  <span className="font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                    show
                  </span>{" "}
                  → Cita con status &quot;show&quot;
                </li>
                <li>
                  <span className="font-mono bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                    no_show
                  </span>{" "}
                  → Cita con status &quot;no_show&quot;
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

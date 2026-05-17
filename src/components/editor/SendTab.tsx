"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BracketsCurly,
  Lightning,
  TreeStructure,
} from "@phosphor-icons/react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Funnel } from "@/types/funnel";
import { WebhookTab } from "@/components/editor/WebhookTab";
import { TrackingTab } from "@/components/editor/TrackingTab";
import { GhlConnectionPanel } from "@/components/editor/GhlConnectionPanel";
import { GhlSyncPanel } from "@/components/editor/GhlSyncPanel";
import type { SendIntegrationId } from "@/components/editor/sendIntegrationParam";

export type { SendIntegrationId } from "@/components/editor/sendIntegrationParam";

type IntegrationTileKind = "webhook" | "meta" | "ghl" | "standard";

/** Destinos: envío del lead a otra URL o herramienta. Tracking: medición (p. ej. Meta Ads). */
export type SendIntegrationCategory = "destination" | "tracking";

export type SendIntegrationListFilter = "all" | SendIntegrationCategory;

type IntegrationDef = {
  id: SendIntegrationId;
  category: SendIntegrationCategory;
  name: string;
  description: string;
  detailSubtitle: string;
  cardHint: string;
  tileKind: IntegrationTileKind;
  icon: ComponentType<{ className?: string; weight?: "bold" | "fill" | "regular" | "thin" | "light" | "duotone" }> | null;
  available: boolean;
};

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "webhook",
    category: "destination",
    name: "Webhook",
    description: "POST JSON a cualquier URL (Zapier, n8n, tu backend…).",
    detailSubtitle: "Configura dónde se enviarán los datos de tus leads cuando completen el funnel.",
    cardHint: "Pulsa para configurar la URL y los campos del payload.",
    tileKind: "webhook",
    icon: null,
    available: true,
  },
  {
    id: "meta_ads",
    category: "tracking",
    name: "Meta Ads",
    description: "Pixel y Conversions API (CAPI) para medir el rendimiento de tus campañas.",
    detailSubtitle: "Conecta Meta Pixel y la Conversions API para medir el rendimiento de tus campañas.",
    cardHint: "Pulsa para configurar Pixel ID, token de CAPI y pruebas.",
    tileKind: "meta",
    icon: null,
    available: true,
  },
  {
    id: "gohighlevel",
    category: "destination",
    name: "GoHighLevel",
    description: "Sincronización nativa con contactos y campos personalizados.",
    detailSubtitle: "Conecta tu cuenta de GoHighLevel para enviar leads automáticamente.",
    cardHint: "Pulsa para conectar y configurar la sincronización de campos.",
    tileKind: "ghl",
    icon: null,
    available: true,
  },
  {
    id: "zapier",
    category: "destination",
    name: "Zapier",
    description: "Automatiza miles de apps con Zaps.",
    detailSubtitle: "",
    cardHint: "",
    tileKind: "standard",
    icon: Lightning,
    available: false,
  },
  {
    id: "make",
    category: "destination",
    name: "Make",
    description: "Escenarios visuales y routers avanzados.",
    detailSubtitle: "",
    cardHint: "",
    tileKind: "standard",
    icon: TreeStructure,
    available: false,
  },
  {
    id: "api",
    category: "destination",
    name: "API",
    description: "Claves y envío programático desde tu código.",
    detailSubtitle: "",
    cardHint: "",
    tileKind: "standard",
    icon: BracketsCurly,
    available: false,
  },
];

function IntegrationIconTile({ item }: { item: IntegrationDef }) {
  if (item.tileKind === "webhook" || item.tileKind === "meta" || item.tileKind === "ghl") {
    const logoSrc =
      item.tileKind === "webhook"
        ? "/webhook-integration-logo.png"
        : item.tileKind === "meta"
          ? "/meta-ads-logo.png"
          : "/gohighlevel-integration-logo.png";
    const logoAlt =
      item.tileKind === "webhook"
        ? "Webhook"
        : item.tileKind === "meta"
          ? "Meta"
          : "GoHighLevel";
    const isGhl = item.tileKind === "ghl";
    return (
      <div
        className={cn(
          "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg",
          isGhl ? "border-0" : "border border-border bg-white",
        )}
      >
        <Image
          src={logoSrc}
          alt={logoAlt}
          fill
          className={cn(
            "object-center",
            isGhl ? "object-cover" : "object-contain p-0.5",
          )}
          sizes="40px"
        />
      </div>
    );
  }
  const Icon = item.icon;
  if (!Icon) return null;
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
        item.available
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-transparent bg-muted/50 text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" weight="bold" />
    </div>
  );
}

function IntegrationGrid({
  items,
  onOpenIntegrationChange,
}: {
  items: IntegrationDef[];
  onOpenIntegrationChange: (id: SendIntegrationId | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        return (
          <Card
            key={item.id}
            size="sm"
            className={cn(
              "transition-shadow",
              item.available
                ? "cursor-pointer hover:ring-foreground/20 hover:shadow-md"
                : "opacity-80",
            )}
            role="button"
            tabIndex={item.available ? 0 : -1}
            onClick={() => {
              if (item.available) {
                onOpenIntegrationChange(item.id);
                return;
              }
              toast.info("Próximamente", { description: `${item.name} estará disponible pronto.` });
            }}
            onKeyDown={(e) => {
              if (!item.available) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenIntegrationChange(item.id);
              }
            }}
          >
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <IntegrationIconTile item={item} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.category === "tracking" && (
                    <Badge variant="outline" className="text-[0.625rem] font-medium border-primary/25 text-primary">
                      Tracking
                    </Badge>
                  )}
                  {!item.available && (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      Próximamente
                    </Badge>
                  )}
                </div>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[11px] text-muted-foreground">
                {item.available ? item.cardHint : "Te avisaremos cuando esté listo."}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function SendTab({
  funnel,
  openIntegrationId,
  onOpenIntegrationChange,
}: {
  funnel: Funnel;
  openIntegrationId: SendIntegrationId | null;
  onOpenIntegrationChange: (id: SendIntegrationId | null) => void;
}) {
  const [listFilter, setListFilter] = useState<SendIntegrationListFilter>("all");
  const visibleIntegrations = useMemo(() => {
    if (listFilter === "all") return INTEGRATIONS;
    return INTEGRATIONS.filter((i) => i.category === listFilter);
  }, [listFilter]);

  const detail = openIntegrationId ? INTEGRATIONS.find((i) => i.id === openIntegrationId) : undefined;

  if (openIntegrationId && detail) {
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b px-6 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 -ml-3 shrink-0 text-muted-foreground hover:text-foreground lg:-ml-4"
              onClick={() => onOpenIntegrationChange(null)}
            >
              <ArrowLeft className="h-4 w-4" weight="bold" />
              Integraciones
            </Button>
            <IntegrationIconTile item={detail} />
            <span className="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-tight tracking-tight">{detail.name}</h2>
                {detail.category === "tracking" && (
                  <Badge variant="outline" className="text-[0.625rem] font-medium border-primary/25 text-primary">
                    Tracking
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{detail.detailSubtitle}</p>
            </div>
          </div>
        </header>
        {openIntegrationId === "webhook" && <WebhookTab funnel={funnel} embedded />}
        {openIntegrationId === "meta_ads" && <TrackingTab funnel={funnel} embedded />}
        {openIntegrationId === "gohighlevel" && funnel.workspace_id && (
          <div className="w-full min-w-0 px-6 pb-6 pt-4 lg:px-8">
            <div className="mx-auto w-full max-w-2xl space-y-4">
              <GhlConnectionPanel workspaceId={funnel.workspace_id} embedded />
              <GhlSyncPanel funnelId={funnel.id} workspaceId={funnel.workspace_id} embedded />
            </div>
          </div>
        )}
        {openIntegrationId === "gohighlevel" && !funnel.workspace_id && (
          <div className="w-full min-w-0 px-6 pb-6 pt-4 lg:px-8">
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este funnel no está vinculado a un workspace. La integración con GoHighLevel requiere un workspace activo.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl font-bold mb-0.5">Enviar leads</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Conecta tu funnel a las plataformas donde quieres recibir cada lead.
          </p>
        </div>
        <div className="shrink-0 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground sm:text-right">Filtrar</p>
          <ToggleGroup
            type="single"
            value={listFilter}
            onValueChange={(v) => setListFilter((v || "all") as SendIntegrationListFilter)}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full justify-stretch sm:w-auto"
          >
            <ToggleGroupItem value="all" className="flex-1 sm:flex-initial px-3">
              Todos
            </ToggleGroupItem>
            <ToggleGroupItem value="destination" className="flex-1 sm:flex-initial px-3">
              Envío
            </ToggleGroupItem>
            <ToggleGroupItem value="tracking" className="flex-1 sm:flex-initial px-3">
              Tracking
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <IntegrationGrid items={visibleIntegrations} onOpenIntegrationChange={onOpenIntegrationChange} />
    </div>
  );
}

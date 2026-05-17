"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle,
  WarningCircle,
  Plus,
  Minus,
  Pencil,
  ArrowsClockwise,
  CloudArrowUp,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FieldDiff, GhlFieldMapping, LeadflowField, GhlSyncStatus } from "@/lib/ghl/types";

interface GhlSyncPanelProps {
  funnelId: string;
  workspaceId: string;
  embedded?: boolean;
}

export function GhlSyncPanel({
  funnelId,
  workspaceId,
  embedded = false,
}: GhlSyncPanelProps) {
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<GhlSyncStatus | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    if (!funnelId) return;

    try {
      const response = await fetch(`/api/funnels/${funnelId}/ghl-sync`);
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error("[GHL Sync Status]", err);
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const handlePushSync = async () => {
    setPushing(true);
    try {
      const response = await fetch(`/api/funnels/${funnelId}/ghl-sync`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Sincronización completada", {
          description: `${data.created} creados, ${data.updated} actualizados`,
        });
        fetchSyncStatus();
      } else {
        const errMsg = String(data.errors?.[0] || data.error || "Error desconocido");
        const needsReconnect =
          errMsg.includes("not authorized for this scope") ||
          errMsg.includes("401");
        toast.error("Error en sincronización", {
          description: needsReconnect
            ? "Faltan permisos para campos personalizados. En GoHighLevel Marketplace activa los scopes locations/customFields.readonly y locations/customFields.write, luego desconecta y vuelve a conectar GoHighLevel aquí."
            : errMsg,
        });
      }
    } catch (err) {
      toast.error("Error al sincronizar con GoHighLevel");
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!syncStatus?.connected) {
    return (
      <div className="border rounded-xl p-4 sm:p-5 bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <WarningCircle className="h-4 w-4" weight="fill" />
          Conecta GoHighLevel primero para sincronizar campos
        </div>
      </div>
    );
  }

  const { pendingChanges, hasPendingChanges, diffSummary, lastSyncAt } = syncStatus;

  const added = pendingChanges.filter((d) => d.type === "added");
  const renamed = pendingChanges.filter((d) => d.type === "renamed");
  const removed = pendingChanges.filter((d) => d.type === "removed");
  const typeChanged = pendingChanges.filter((d) => d.type === "type_changed");

  const DiffIcon = ({ type }: { type: FieldDiff["type"] }) => {
    switch (type) {
      case "added":
        return <Plus className="h-3.5 w-3.5 text-green-500" weight="bold" />;
      case "renamed":
      case "type_changed":
        return <Pencil className="h-3.5 w-3.5 text-amber-500" weight="bold" />;
      case "removed":
        return <Minus className="h-3.5 w-3.5 text-red-500" weight="bold" />;
    }
  };

  const getDiffLabel = (diff: FieldDiff) => {
    switch (diff.type) {
      case "added":
        return "Nuevo campo";
      case "renamed":
        return `Etiqueta actualizada (antes: "${diff.previousLabel}")`;
      case "removed":
        return "Campo eliminado del funnel";
      case "type_changed":
        return `Tipo cambiado (antes: ${diff.previousType})`;
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Sincronización de Campos
            {hasPendingChanges ? (
              <Badge variant="warning" className="gap-1">
                <WarningCircle className="h-3 w-3" weight="fill" />
                {pendingChanges.length} pendiente{pendingChanges.length > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3 w-3" weight="fill" />
                Sincronizado
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasPendingChanges
              ? diffSummary
              : `Última sincronización: ${lastSyncAt ? new Date(lastSyncAt).toLocaleDateString("es-ES") : "Nunca"}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSyncStatus}
          className="h-8 w-8 p-0"
        >
          <ArrowsClockwise className="h-4 w-4" weight="bold" />
        </Button>
      </div>

      {hasPendingChanges && (
        <>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {added.map((diff) => (
              <DiffRow key={diff.field.slug} diff={diff} />
            ))}
            {renamed.map((diff) => (
              <DiffRow key={diff.field.slug} diff={diff} />
            ))}
            {typeChanged.map((diff) => (
              <DiffRow key={diff.field.slug} diff={diff} />
            ))}
            {removed.map((diff) => (
              <DiffRow key={diff.field.slug} diff={diff} />
            ))}
          </div>

          {removed.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-medium text-muted-foreground mb-1">
                Campos eliminados
              </p>
              <p className="text-muted-foreground">
                Los campos eliminados del funnel no se borrarán de GHL. Se marcarán como
                huérfanos y podrás archivarlos manualmente desde GoHighLevel.
              </p>
            </div>
          )}

          <Button
            onClick={handlePushSync}
            disabled={pushing}
            className="w-full gap-2"
          >
            {pushing ? (
              <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
            ) : (
              <CloudArrowUp className="h-4 w-4" weight="bold" />
            )}
            {pushing ? "Sincronizando..." : "Aplicar cambios en GHL"}
          </Button>
        </>
      )}

      {!hasPendingChanges && syncStatus.mappings.length > 0 && (
        <Accordion type="single" collapsible className="border-t pt-3">
          <AccordionItem value="mappings" className="border-0">
            <AccordionTrigger className="py-2 text-xs hover:no-underline">
              Ver {syncStatus.mappings.length} campos sincronizados
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {syncStatus.mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/30 text-xs"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" weight="fill" />
                    <span className="truncate flex-1">{mapping.leadflow_field_label}</span>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {mapping.ghl_field_name || mapping.ghl_field_id}
                    </span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function DiffRow({ diff }: { diff: FieldDiff }) {
  const DiffIcon = () => {
    switch (diff.type) {
      case "added":
        return <Plus className="h-3.5 w-3.5 text-green-500" weight="bold" />;
      case "renamed":
      case "type_changed":
        return <Pencil className="h-3.5 w-3.5 text-amber-500" weight="bold" />;
      case "removed":
        return <Minus className="h-3.5 w-3.5 text-red-500" weight="bold" />;
    }
  };

  const getBgClass = () => {
    switch (diff.type) {
      case "added":
        return "bg-green-500/10";
      case "renamed":
      case "type_changed":
        return "bg-amber-500/10";
      case "removed":
        return "bg-red-500/10";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded text-xs",
        getBgClass()
      )}
    >
      <DiffIcon />
      <span className="truncate flex-1 font-medium">{diff.field.label}</span>
      <span className="text-muted-foreground text-[10px] shrink-0">
        {diff.field.category}
      </span>
    </div>
  );
}

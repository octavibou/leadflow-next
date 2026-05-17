"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  WarningCircle,
  XCircle,
  ArrowSquareOut,
  ArrowsClockwise,
  SignOut,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { GhlConnectionStatus } from "@/lib/ghl/types";

interface GhlConnectionPanelProps {
  workspaceId: string;
  embedded?: boolean;
  onStatusChange?: (status: GhlConnectionStatus) => void;
}

interface ConnectionState {
  connected: boolean;
  expired: boolean;
  locationId: string | null;
  locationName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
}

export function GhlConnectionPanel({
  workspaceId,
  embedded = false,
  onStatusChange,
}: GhlConnectionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/integrations/ghl/status?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setConnectionState(data);

        if (onStatusChange) {
          let status: GhlConnectionStatus = "disconnected";
          if (data.connected) {
            status = data.expired ? "expired" : "connected";
          }
          onStatusChange(status);
        }
      }
    } catch (err) {
      console.error("[GHL Status]", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ghlStatus = params.get("ghl");

    if (ghlStatus === "connected") {
      toast.success("GoHighLevel conectado correctamente");
      fetchStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete("ghl");
      window.history.replaceState({}, "", url.toString());
    } else if (ghlStatus === "error") {
      const message = params.get("message") || "Error desconocido";
      toast.error(`Error al conectar GoHighLevel: ${message}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("ghl");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchStatus]);

  const handleConnect = () => {
    window.location.href = `/api/integrations/ghl/connect?workspace_id=${workspaceId}`;
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch(`/api/integrations/ghl/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      if (response.ok) {
        toast.success("GoHighLevel desconectado");
        setConnectionState(null);
        onStatusChange?.("disconnected");
        fetchStatus();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al desconectar");
      }
    } catch (err) {
      toast.error("Error al desconectar GoHighLevel");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  const isConnected = connectionState?.connected;
  const isExpired = connectionState?.expired;

  const getStatusBadge = () => {
    if (!isConnected) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" weight="fill" />
          Desconectado
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="warning" className="gap-1">
          <WarningCircle className="h-3 w-3" weight="fill" />
          Expirado
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" weight="fill" />
        Conectado
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-card sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/gohighlevel-integration-logo.png"
              alt="GoHighLevel"
              fill
              className="object-cover object-center"
              sizes="40px"
            />
          </div>
          <div>
            {!embedded && (
              <h3 className="text-sm font-semibold flex items-center gap-2">
                GoHighLevel
                {getStatusBadge()}
              </h3>
            )}
            {embedded && (
              <div className="flex items-center gap-2">
                {getStatusBadge()}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {isConnected
                ? `Ubicación: ${connectionState?.locationName || connectionState?.locationId || "—"}`
                : "Conecta para enviar leads automáticamente"}
            </p>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Conectado</p>
            <p className="font-medium">{formatDate(connectionState?.connectedAt || null)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Última sincronización</p>
            <p className="font-medium">{formatDate(connectionState?.lastSyncAt || null)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!isConnected && (
          <Button onClick={handleConnect} className="flex-1 gap-2">
            <ArrowSquareOut className="h-4 w-4" weight="bold" />
            Conectar GoHighLevel
          </Button>
        )}

        {isConnected && isExpired && (
          <Button onClick={handleConnect} variant="outline" className="flex-1 gap-2">
            <ArrowsClockwise className="h-4 w-4" weight="bold" />
            Reconectar
          </Button>
        )}

        {isConnected && !isExpired && (
          <>
            <Button
              variant="outline"
              onClick={fetchStatus}
              className="gap-2"
            >
              <ArrowsClockwise className="h-4 w-4" weight="bold" />
              Actualizar
            </Button>
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <SignOut className="h-4 w-4" weight="bold" />
              {disconnecting ? "Desconectando..." : "Desconectar"}
            </Button>
          </>
        )}
      </div>

      {!isConnected && (
        <p className="text-[10px] text-muted-foreground">
          Al conectar, autorizas a Leadflow a crear contactos y campos personalizados en tu cuenta de GoHighLevel.
        </p>
      )}
    </div>
  );
}

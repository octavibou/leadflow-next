"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, ArrowsClockwise, Info, Rocket, Flask } from "@phosphor-icons/react";
import type { Funnel } from "@/types/funnel";
import { VariationSettingsDialog } from "@/components/editor/VariationSettingsDialog";
import { PublishUrlSlotCard } from "@/components/editor/publish/PublishUrlSlotCard";
import { PublishCreateUrlDialog } from "@/components/editor/publish/PublishCreateUrlDialog";
import { usePublishWorkspace } from "@/components/editor/publish/usePublishWorkspace";
import { funnelIsLive } from "@/components/editor/publish/publishPrimitives";

/**
 * Tablero de Publish: cabecera con CTA + grid de URL slots autosuficientes.
 *
 * Cada slot maneja su URL, QR, variante activa, republicar e historial sin abandonar la vista.
 * Crear nuevas URLs ocurre desde el CTA principal; el push de variantes a cada URL solo desde aquí.
 */
export function PublishStudio({ funnel }: { funnel: Funnel }) {
  const ws = usePublishWorkspace(funnel);

  const variantCount = ws.variantOptions.length - 1;
  const funnelPublished = funnelIsLive(ws.liveFunnel);
  const liveCount = ws.slots.filter((s) => !!s.activeDeployment).length;

  if (!ws.publishBranchesEnvOn) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-3 p-8 text-center">
        <h2 className="text-lg font-semibold">Publicar no esta disponible</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Activa el flag{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_PUBLISH_BRANCHES_V1=1</code>{" "}
          en tu entorno para usar el sistema de URLs publicas y push de variantes.
        </p>
      </div>
    );
  }

  const openCreate = () => {
    ws.setNewBranchName("");
    ws.setNewBranchSlug("");
    ws.setNewBranchOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-border/50 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold sm:text-xl">URLs en producción</h2>
            {ws.pubRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground">
                <ArrowsClockwise className="h-3 w-3 animate-spin" weight="bold" />
                Sincronizando
              </span>
            ) : null}
          </div>
          {ws.initialLoading ? (
            <div className="mt-1.5 flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-brand-lime animate-live-pulse" />
                <span className="tabular-nums text-foreground">{liveCount}</span> live
              </span>
              <span className="opacity-40">·</span>
              <span>
                <span className="tabular-nums text-foreground">{ws.slots.length}</span> URL{ws.slots.length === 1 ? "" : "s"}
              </span>
              <span className="opacity-40">·</span>
              <span>
                <span className="tabular-nums text-foreground">{variantCount}</span> variante{variantCount === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
        <label
          htmlFor="test-mode-toggle"
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 px-3 py-1.5 text-xs transition-colors select-none hover:bg-muted/30"
          title="Modo test: desactiva tracking, pixels y envío de leads en todas las URLs"
        >
          <Flask className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
          <span className="text-muted-foreground">Test</span>
          <Switch
            id="test-mode-toggle"
            size="sm"
            checked={ws.testMode}
            onCheckedChange={ws.setTestMode}
          />
        </label>
      </header>

      {!funnelPublished && (
        <Alert className="mx-5 mt-4 shrink-0 border-amber-500/30 bg-amber-500/5 sm:mx-6">
          <Info className="text-amber-600 dark:text-amber-400" weight="fill" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Funnel aún no publicado</AlertTitle>
          <AlertDescription className="text-amber-800/80 dark:text-amber-100/80">
            Las URLs ya son rutas públicas, pero los visitantes no verán la experiencia en producción hasta que publiques el funnel.
          </AlertDescription>
        </Alert>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        {ws.initialLoading ? (
          <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {[1, 2].map((i) => (
              <UrlSlotSkeleton key={i} />
            ))}
          </div>
        ) : ws.slots.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/50 bg-muted/10 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Rocket className="h-6 w-6 text-muted-foreground" weight="bold" />
            </div>
            <div>
              <p className="text-sm font-semibold">Aún no hay URLs públicas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea la primera URL para empezar a publicar variantes de tu funnel.
              </p>
            </div>
            <Button type="button" size="sm" className="mt-2 gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" weight="bold" />
              Crear primera URL
            </Button>
          </div>
        ) : (
          <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {ws.slots.map((slot) => (
              <PublishUrlSlotCard key={slot.id} ws={ws} slot={slot} />
            ))}
            <button
              type="button"
              onClick={openCreate}
              className="group flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/40 bg-transparent p-4 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:hover:border-brand-lime/40 dark:hover:bg-brand-lime/5 dark:hover:text-brand-lime"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current/30 transition-colors group-hover:border-current/50 group-hover:bg-primary/10 dark:group-hover:bg-brand-lime/10">
                <Plus className="h-5 w-5" weight="bold" />
              </div>
              <span className="text-xs font-semibold tracking-wide">Nueva URL</span>
            </button>
          </div>
        )}
      </div>

      <PublishCreateUrlDialog ws={ws} />

      <VariationSettingsDialog
        open={!!ws.editingCampaign}
        onOpenChange={(o) => {
          if (!o) ws.setEditingCampaign(null);
        }}
        funnelId={funnel.id}
        campaign={ws.editingCampaign}
        campaigns={ws.campaigns}
      />
    </div>
  );
}

function UrlSlotSkeleton() {
  return (
    <Card size="sm" className="flex h-full min-h-0 flex-col ring-1 ring-border/40">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border/30 pt-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

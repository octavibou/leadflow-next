'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, DotsThree, Copy, DownloadSimple, Trash, Pencil, Megaphone, MagnifyingGlass, SquaresFour, List, Lock, ArrowRight, Sparkle } from "@phosphor-icons/react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { FUNNEL_TYPE_LABELS } from "@/types/funnel";
import { TemplatePicker } from "@/components/TemplatePicker";
import { PendingInvitations } from "@/components/workspace/PendingInvitations";
import { exportFunnelToHtml } from "@/lib/exportHtml";

const Dashboard = () => {
  const { funnels, loading, fetchFunnels, deleteFunnel, duplicateFunnel } = useFunnelStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const { canCreateFunnel, usage, limits, loading: limitsLoading } = usePlanLimits();
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const router = useRouter();

  const handleNewFunnel = () => {
    if (!canCreateFunnel) {
      toast.error(`Has alcanzado el limite de ${limits.funnels} funnels de tu plan. Actualiza tu plan para crear mas.`);
      return;
    }
    setShowPicker(true);
  };

  useEffect(() => {
    fetchFunnels(currentWorkspaceId || undefined);
  }, [fetchFunnels, currentWorkspaceId]);

  const filteredFunnels = funnels.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = (id: string) => {
    const funnel = useFunnelStore.getState().getFunnel(id);
    if (!funnel) return;
    const html = exportFunnelToHtml(funnel);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${funnel.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PendingInvitations />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Funnels</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="bold" />
            <Input
              placeholder="Buscar funnels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <div className="flex items-center border rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === "grid" ? "bg-accent" : ""}
              onClick={() => setViewMode("grid")}
            >
              <SquaresFour className="h-4 w-4" weight="bold" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === "list" ? "bg-accent" : ""}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" weight="bold" />
            </Button>
          </div>
          <Button onClick={handleNewFunnel} variant={canCreateFunnel ? "default" : "outline"}>
            {canCreateFunnel ? (
              <Plus className="h-4 w-4 mr-2" weight="bold" />
            ) : (
              <Lock className="h-4 w-4 mr-2" weight="bold" />
            )}
            New Funnel
            {!limitsLoading && (
              <span className="ml-1 text-xs opacity-70">({usage.funnels}/{limits.funnels})</span>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-[16/10] w-full rounded-t-lg" />
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFunnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
          <div className="rounded-2xl bg-accent/50 p-6 mb-6">
            <Plus className="h-12 w-12 text-primary" weight="bold" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {searchQuery ? "Sin resultados" : "Crea tu primer funnel"}
          </h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            {searchQuery
              ? "No se encontraron funnels con ese nombre."
              : "Construye funnels de quiz de alta conversion y compartelos con un link unico."}
          </p>
          {!searchQuery && (
            <Button size="lg" onClick={() => setShowPicker(true)}>
              <Plus className="h-4 w-4 mr-2" weight="bold" /> New Funnel
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {filteredFunnels.map((f) => (
            <FunnelCard
              key={f.id}
              funnel={f}
              onEdit={() => router.push(`/editor/${f.id}`)}
              onCampaigns={() => router.push(`/editor/${f.id}?tab=ab_test`)}
              onDuplicate={() => duplicateFunnel(f.id)}
              onExport={() => handleExport(f.id)}
              onDelete={() => deleteFunnel(f.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFunnels.map((f) => (
            <FunnelListItem
              key={f.id}
              funnel={f}
              onEdit={() => router.push(`/editor/${f.id}`)}
              onCampaigns={() => router.push(`/editor/${f.id}?tab=ab_test`)}
              onDuplicate={() => duplicateFunnel(f.id)}
              onExport={() => handleExport(f.id)}
              onDelete={() => deleteFunnel(f.id)}
            />
          ))}
        </div>
      )}

      <TemplatePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </div>
  );
};

interface FunnelActionProps {
  funnel: any;
  onEdit: () => void;
  onCampaigns: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function FunnelCard({ funnel, onEdit, onCampaigns, onDuplicate, onExport, onDelete }: FunnelActionProps) {
  const typeLabel = FUNNEL_TYPE_LABELS[funnel.type as keyof typeof FUNNEL_TYPE_LABELS];
  return (
    <Card className="relative mx-auto w-full pt-0 cursor-pointer group">
      <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
      <div
        className="relative z-20 aspect-video w-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/40 brightness-60 grayscale"
        onClick={onEdit}
      >
        <div className="text-6xl font-bold text-foreground/10">
          {funnel.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <CardHeader onClick={onEdit}>
        <CardAction>
          <Badge variant="secondary" className="gap-1">
            <Sparkle className="h-3 w-3" weight="fill" />
            {typeLabel}
          </Badge>
        </CardAction>
        <CardTitle>{funnel.name}</CardTitle>
        <CardDescription>
          Editado {new Date(funnel.updated_at).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Abrir funnel
        </Button>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <FunnelDropdown
            onEdit={onEdit}
            onCampaigns={onCampaigns}
            onDuplicate={onDuplicate}
            onExport={onExport}
            onDelete={onDelete}
          />
        </div>
      </CardFooter>
    </Card>
  );
}

function FunnelListItem({ funnel, onEdit, onCampaigns, onDuplicate, onExport, onDelete }: FunnelActionProps) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer group"
      onClick={onEdit}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{funnel.name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium truncate">{funnel.name}</h3>
        <p className="text-xs text-muted-foreground">
          {new Date(funnel.updated_at).toLocaleDateString("es-ES")}
        </p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {FUNNEL_TYPE_LABELS[funnel.type as keyof typeof FUNNEL_TYPE_LABELS]}
      </Badge>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <FunnelDropdown
          onEdit={onEdit}
          onCampaigns={onCampaigns}
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function FunnelDropdown({ onEdit, onCampaigns, onDuplicate, onExport, onDelete }: Omit<FunnelActionProps, "funnel">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <DotsThree className="h-4 w-4" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" weight="bold" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCampaigns}>
          <Megaphone className="h-4 w-4 mr-2" weight="bold" /> Campanas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" weight="bold" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <DownloadSimple className="h-4 w-4 mr-2" weight="bold" /> Exportar HTML
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash className="h-4 w-4 mr-2" weight="bold" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Dashboard;

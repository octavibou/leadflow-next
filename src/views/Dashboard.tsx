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
import { supabase } from "@/integrations/supabase/client";

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
  const [leadsTotal, setLeadsTotal] = useState<number>(0);

  useEffect(() => {
    const fetchLeadsCount = async () => {
      // Get leads count for last 7 days
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('funnel_id', funnel.id)
        .gte('created_at', last7Days.toISOString());

      if (count !== null) {
        setLeadsTotal(count);
      }
    };

    fetchLeadsCount();
  }, [funnel.id]);

  return (
    <Card className="relative mx-auto w-full pt-0 cursor-pointer group" onClick={onEdit}>
      <div className="absolute inset-0 z-30 aspect-square bg-black/35" />
      <div className="relative z-20 aspect-square w-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/40 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
          <polyline
            points="20,150 50,120 80,130 110,80 140,100 170,50 190,70"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <p className="text-4xl font-bold text-white drop-shadow-lg">{leadsTotal}</p>
          <p className="text-xs text-white/80 drop-shadow-lg">últimos 7 días</p>
        </div>
      </div>
      <CardHeader className="p-3">
        <CardAction>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Sparkle className="h-2.5 w-2.5" weight="fill" />
            {typeLabel}
          </Badge>
        </CardAction>
        <CardTitle className="text-sm">{funnel.name}</CardTitle>
        <CardDescription className="text-xs">
          Editado {new Date(funnel.updated_at).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <FunnelDropdown
          onEdit={onEdit}
          onCampaigns={onCampaigns}
          onDuplicate={onDuplicate}
          onExport={onExport}
          onDelete={onDelete}
        />
      </div>
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

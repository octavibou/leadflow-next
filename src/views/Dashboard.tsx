'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, DotsThree, Copy, DownloadSimple, Trash, Pencil, Megaphone, MagnifyingGlass, SquaresFour, List, Lock, ArrowRight, Sparkle, Archive, Undo } from "@phosphor-icons/react";
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
import type { FunnelStatus } from "@/types/funnel";
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
  const [statusFilter, setStatusFilter] = useState<FunnelStatus | "all">("all");
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

  const filteredFunnels = funnels.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <div className="flex items-center gap-2 border rounded-lg">
            <Button
              variant={statusFilter === "all" ? "ghost" : "outline"}
              size="sm"
              className={statusFilter === "all" ? "bg-accent" : ""}
              onClick={() => setStatusFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "published" ? "ghost" : "outline"}
              size="sm"
              className={statusFilter === "published" ? "bg-accent" : ""}
              onClick={() => setStatusFilter("published")}
            >
              Publicados
            </Button>
            <Button
              variant={statusFilter === "draft" ? "ghost" : "outline"}
              size="sm"
              className={statusFilter === "draft" ? "bg-accent" : ""}
              onClick={() => setStatusFilter("draft")}
            >
              Borradores
            </Button>
            <Button
              variant={statusFilter === "archived" ? "ghost" : "outline"}
              size="sm"
              className={statusFilter === "archived" ? "bg-accent" : ""}
              onClick={() => setStatusFilter("archived")}
            >
              Archivados
            </Button>
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
  const [chartData, setChartData] = useState<Array<{ date: string; leads: number }>>([
    { date: "Lun", leads: 0 },
    { date: "Mar", leads: 0 },
    { date: "Mié", leads: 0 },
    { date: "Jue", leads: 0 },
    { date: "Vie", leads: 0 },
    { date: "Sab", leads: 0 },
    { date: "Dom", leads: 0 },
  ]);
  const [leadsTotal, setLeadsTotal] = useState(0);

  useEffect(() => {
    const fetchLeadsData = async () => {
      try {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const { data, error } = await supabase
          .from('leads')
          .select('created_at')
          .eq('funnel_id', funnel.id)
          .gte('created_at', last7Days[0]);

        if (!error && data) {
          const leadsPerDay = last7Days.map((date, i) => ({
            date: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sab", "Dom"][i],
            leads: data.filter((l) => l.created_at.startsWith(date)).length,
          }));
          setChartData(leadsPerDay);
          setLeadsTotal(data.length);
        }
      } catch (err) {
        console.error("Error fetching leads data:", err);
      }
    };

    fetchLeadsData();
  }, [funnel.id]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{funnel.name}</CardTitle>
        <CardDescription className="flex gap-2 mt-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Sparkle className="h-2.5 w-2.5" weight="fill" />
            {typeLabel}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {leadsTotal} leads
          </Badge>
          {funnel.status === "published" && (
            <Badge className="gap-1 text-xs bg-green-500/10 text-green-700 border-green-200">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full" />
              Publicado
            </Badge>
          )}
          {funnel.status === "draft" && (
            <Badge className="gap-1 text-xs bg-yellow-500/10 text-yellow-700 border-yellow-200">
              <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full" />
              Borrador
            </Badge>
          )}
          {funnel.status === "archived" && (
            <Badge className="gap-1 text-xs bg-gray-500/10 text-gray-700 border-gray-200">
              <div className="h-1.5 w-1.5 bg-gray-500 rounded-full" />
              Archivado
            </Badge>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="relative flex justify-center gap-1.5 items-end w-full overflow-hidden rounded-lg bg-muted p-4 h-40 max-w-full">
          {chartData.map((item, index) => {
            const maxLeads = Math.max(...chartData.map(d => d.leads), 1);
            const heightPercent = (item.leads / maxLeads) * 100;
            
            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full bg-muted-foreground/20 rounded-full overflow-hidden relative flex-1 flex items-end justify-center min-w-0">
                  <div
                    className="w-full bg-chart-3 rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{item.date}</span>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Abrir funnel
        </Button>
        <div onClick={(e) => e.stopPropagation()}>
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

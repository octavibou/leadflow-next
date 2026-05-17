'use client';

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash, ArrowsClockwise, Users, CaretDown, CaretUp, DotsSixVertical, Link } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { GhlFieldsReference } from "@/components/routing/GhlFieldsReference";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUiSessionState } from "@/hooks/useUiSessionState";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { Funnel } from "@/types/funnel";

export type DistributionMode = "all" | "one";
export type TiebreakerStrategy = "round_robin" | "least_recent" | "priority";
export type DistributionStrategy = "all" | "round_robin" | "least_recent" | "priority";

export interface RouteClient {
  id: string;
  name: string;
  webhookUrl: string;
  priority: number;
  qualifyingAnswers: Record<string, Record<string, string[]>>;
}

export interface WorkspaceRouteConfig {
  distributionStrategy: DistributionStrategy;
  clients: RouteClient[];
}

const ROUTING_EXPANDED_DEFAULT = { expandedClient: null as string | null };

const LeadRouting = () => {
  const { funnels, fetchFunnels } = useFunnelStore();
  const { currentWorkspaceId } = useWorkspaceStore();
  const [routeConfig, setRouteConfig] = useState<WorkspaceRouteConfig>({ distributionStrategy: "all", clients: [] });
  const [routingPanel, setRoutingPanel] = useUiSessionState("routing-panels", ROUTING_EXPANDED_DEFAULT);
  const expandedClient = routingPanel.expandedClient;
  const [_saving, setSaving] = useState(false);
  const [configRowId, setConfigRowId] = useState<string | null>(null);

  useEffect(() => {
    fetchFunnels(currentWorkspaceId || undefined);
  }, [fetchFunnels, currentWorkspaceId]);

  // Load config from DB
  useEffect(() => {
    if (!currentWorkspaceId) return;
    supabase
      .from("route_configs")
      .select("id, config")
      .eq("workspace_id", currentWorkspaceId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfigRowId(data.id);
          const cfg = data.config as any;
          setRouteConfig({
            distributionStrategy: cfg.distributionStrategy || "all",
            clients: cfg.clients || [],
          });
        }
      });
  }, [currentWorkspaceId]);

  const saveConfig = useCallback(async (config: WorkspaceRouteConfig) => {
    setRouteConfig(config);
    if (!currentWorkspaceId) return;

    setSaving(true);
    const payload = {
      workspace_id: currentWorkspaceId,
      config: config as any,
    };

    let error;
    if (configRowId) {
      ({ error } = await supabase
        .from("route_configs")
        .update({ config: config as any })
        .eq("id", configRowId));
    } else {
      const res = await supabase
        .from("route_configs")
        .upsert(payload, { onConflict: "workspace_id" })
        .select("id")
        .single();
      error = res.error;
      if (res.data) setConfigRowId(res.data.id);
    }

    setSaving(false);
    if (error) {
      toast.error("Error al guardar");
    } else {
      toast.success("Configuracion guardada");
    }
  }, [currentWorkspaceId, configRowId]);

  const generateOnboardingLink = async (client: RouteClient) => {
    if (!currentWorkspaceId) return;
    try {
      const { data, error } = await supabase
        .from("route_invitations")
        .upsert({
          workspace_id: currentWorkspaceId,
          client_id: client.id,
          client_name: client.name,
          client_webhook_url: client.webhookUrl,
          status: "pending",
        }, { onConflict: "workspace_id,client_id" })
        .select("token")
        .single();

      if (error) {
        const { data: existing } = await supabase
          .from("route_invitations")
          .select("token")
          .eq("workspace_id", currentWorkspaceId)
          .eq("client_id", client.id)
          .single();

        if (existing) {
          const link = `${window.location.origin}/onboarding/${existing.token}`;
          await navigator.clipboard.writeText(link);
          toast.success("Link de onboarding copiado al portapapeles");
          return;
        }

        const { data: newInv } = await supabase
          .from("route_invitations")
          .insert({
            workspace_id: currentWorkspaceId,
            client_id: client.id,
            client_name: client.name,
            client_webhook_url: client.webhookUrl,
          })
          .select("token")
          .single();

        if (newInv) {
          const link = `${window.location.origin}/onboarding/${newInv.token}`;
          await navigator.clipboard.writeText(link);
          toast.success("Link de onboarding copiado al portapapeles");
        }
        return;
      }

      if (data) {
        const link = `${window.location.origin}/onboarding/${data.token}`;
        await navigator.clipboard.writeText(link);
        toast.success("Link de onboarding copiado al portapapeles");
      }
    } catch {
      toast.error("Error al generar el link");
    }
  };

  const addClient = () => {
    const newClient: RouteClient = {
      id: crypto.randomUUID(),
      name: "",
      webhookUrl: "",
      priority: routeConfig.clients.length + 1,
      qualifyingAnswers: {},
    };
    saveConfig({ ...routeConfig, clients: [...routeConfig.clients, newClient] });
    setRoutingPanel((u) => ({ ...u, expandedClient: newClient.id }));
  };

  const updateClient = (clientId: string, updates: Partial<RouteClient>) => {
    saveConfig({
      ...routeConfig,
      clients: routeConfig.clients.map((c) =>
        c.id === clientId ? { ...c, ...updates } : c
      ),
    });
  };

  const removeClient = (clientId: string) => {
    saveConfig({
      ...routeConfig,
      clients: routeConfig.clients.filter((c) => c.id !== clientId),
    });
  };

  const toggleOption = (clientId: string, funnelId: string, questionId: string, optionId: string) => {
    const client = routeConfig.clients.find((c) => c.id === clientId);
    if (!client) return;

    const funnelAnswers = client.qualifyingAnswers[funnelId] || {};
    const currentAnswers = funnelAnswers[questionId] || [];
    const newAnswers = currentAnswers.includes(optionId)
      ? currentAnswers.filter((id) => id !== optionId)
      : [...currentAnswers, optionId];

    updateClient(clientId, {
      qualifyingAnswers: {
        ...client.qualifyingAnswers,
        [funnelId]: {
          ...funnelAnswers,
          [questionId]: newAnswers,
        },
      },
    });
  };

  const getTotalAssigned = (client: RouteClient) =>
    Object.values(client.qualifyingAnswers).reduce(
      (sum, fa) => sum + Object.values(fa).reduce((s, opts) => s + opts.length, 0),
      0
    );

  const funnelsWithQuestions = funnels.filter((f) =>
    f.steps.some((s) => s.type === "question" && s.question)
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lead Routing</h1>
        <p className="text-muted-foreground mt-1">
          Enruta los leads de tus funnels a tus clientes segun las respuestas cualificadas.
          Cada cliente recibe un POST a su webhook con los datos del lead.
        </p>
      </div>

      <Separator />

      {/* Distribution config */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Cuantos clientes reciben cada lead?</Label>
            <p className="text-xs text-muted-foreground">Si un lead cualifica para varios clientes, quieres enviarlo a todos o solo a uno?</p>
          </div>
          <div className="flex gap-3">
            {([
              { value: "all" as const, label: "A todos los que cualifiquen", desc: "Cada cliente que coincida recibe el lead" },
              { value: "one" as const, label: "Solo a uno", desc: "Solo un cliente recibe el lead, aunque varios coincidan" },
            ]).map((opt) => {
              const currentMode: DistributionMode = routeConfig.distributionStrategy === "all" ? "all" : "one";
              const isSelected = currentMode === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newStrategy: DistributionStrategy = opt.value === "all" ? "all" : "round_robin";
                    saveConfig({ ...routeConfig, distributionStrategy: newStrategy });
                  }}
                  className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm font-medium block">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Tiebreaker */}
          {routeConfig.distributionStrategy !== "all" && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Como decidimos a cual enviarlo?</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: "round_robin" as TiebreakerStrategy, label: "Distribucion equitativa", desc: "Rota entre clientes" },
                  { value: "least_recent" as TiebreakerStrategy, label: "Al menos reciente", desc: "El que lleva mas tiempo sin recibir" },
                  { value: "priority" as TiebreakerStrategy, label: "Por prioridad", desc: "Siempre al de mayor prioridad" },
                ]).map((opt) => {
                  const isSelected = routeConfig.distributionStrategy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => saveConfig({ ...routeConfig, distributionStrategy: opt.value })}
                      className={`flex-1 min-w-[140px] p-2.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xs font-medium block">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client list */}
      <div className="space-y-4">
        {routeConfig.clients.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" weight="bold" />
              <p className="text-sm text-muted-foreground mb-4">
                No tienes clientes configurados. Anade uno para empezar a enrutar leads.
              </p>
              <Button onClick={addClient}>
                <Plus className="h-4 w-4 mr-2" weight="bold" /> Anadir cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {routeConfig.clients.map((client) => {
          const isExpanded = expandedClient === client.id;
          const totalAssigned = getTotalAssigned(client);

          return (
            <Collapsible
              key={client.id}
              open={isExpanded}
              onOpenChange={(open) => setRoutingPanel((u) => ({ ...u, expandedClient: open ? client.id : null }))}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DotsSixVertical className="h-4 w-4 text-muted-foreground" weight="bold" />
                        <div>
                          <CardTitle className="text-base">{client.name || "Sin nombre"}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {client.webhookUrl ? (
                              <Badge variant="secondary" className="text-xs">
                                <ArrowsClockwise className="h-3 w-3 mr-1" weight="bold" /> Webhook configurado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Sin webhook</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {totalAssigned} respuesta{totalAssigned !== 1 ? "s" : ""} asignada{totalAssigned !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeClient(client.id); }}
                        >
                          <Trash className="h-4 w-4" weight="bold" />
                        </Button>
                        {isExpanded ? <CaretUp className="h-4 w-4 text-muted-foreground" weight="bold" /> : <CaretDown className="h-4 w-4 text-muted-foreground" weight="bold" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-5 pt-0">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre del cliente</Label>
                        <Input placeholder="Ej: Clinica Dental Madrid" value={client.name} onChange={(e) => updateClient(client.id, { name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Webhook URL</Label>
                        <Input placeholder="https://hooks.example.com/..." value={client.webhookUrl} onChange={(e) => updateClient(client.id, { webhookUrl: e.target.value })} />
                      </div>
                    </div>

                    {routeConfig.distributionStrategy === "priority" && (
                      <div className="space-y-2 max-w-[120px]">
                        <Label>Prioridad</Label>
                        <Input type="number" min={1} value={client.priority} onChange={(e) => updateClient(client.id, { priority: parseInt(e.target.value) || 1 })} className="h-9" />
                        <p className="text-[10px] text-muted-foreground">Menor numero = mayor prioridad</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold">Respuestas que enrutan a este cliente</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Selecciona las opciones cualificadas o envia el link de onboarding al cliente.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateOnboardingLink(client);
                          }}
                        >
                          <Link className="h-3 w-3" weight="bold" /> Copiar link de onboarding
                        </Button>
                      </div>
                      {funnelsWithQuestions.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No hay funnels con preguntas en este workspace.</p>
                      )}
                      {funnelsWithQuestions.map((funnel) => (
                        <FunnelQuestionMapping
                          key={funnel.id}
                          funnel={funnel}
                          client={client}
                          onToggle={(questionId, optionId) => toggleOption(client.id, funnel.id, questionId, optionId)}
                        />
                      ))}
                    </div>

                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                          Custom fields
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        {funnelsWithQuestions.map((funnel) => (
                          <GhlFieldsReference key={funnel.id} funnel={funnel} />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {routeConfig.clients.length > 0 && (
        <Button variant="outline" onClick={addClient} className="w-full">
          <Plus className="h-4 w-4 mr-2" weight="bold" /> Anadir otro cliente
        </Button>
      )}
    </div>
  );
};

interface FunnelQuestionMappingProps {
  funnel: Funnel;
  client: RouteClient;
  onToggle: (questionId: string, optionId: string) => void;
}

function FunnelQuestionMapping({ funnel, client, onToggle }: FunnelQuestionMappingProps) {
  const [expanded, setExpanded] = useState(false);
  const questionSteps = funnel.steps.filter((s) => s.type === "question" && s.question);
  const qualifiedQuestions = questionSteps.filter((s) =>
    s.question!.options.some((o) => o.qualifies)
  );

  if (qualifiedQuestions.length === 0) return null;

  const funnelAnswers = client.qualifyingAnswers[funnel.id] || {};
  const assignedCount = Object.values(funnelAnswers).reduce((s, opts) => s + opts.length, 0);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">{funnel.name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium">{funnel.name}</span>
            {assignedCount > 0 && (
              <Badge variant="secondary" className="text-xs">{assignedCount} asignada{assignedCount !== 1 ? "s" : ""}</Badge>
            )}
          </div>
          {expanded ? <CaretUp className="h-4 w-4 text-muted-foreground" weight="bold" /> : <CaretDown className="h-4 w-4 text-muted-foreground" weight="bold" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pl-4 space-y-3">
        {qualifiedQuestions.map((step) => {
          const question = step.question!;
          const qualifyingOptions = question.options.filter((o) => o.qualifies);
          const selectedAnswers = funnelAnswers[question.id] || [];

          return (
            <div key={question.id} className="space-y-2">
              <p className="text-sm font-medium">{question.text}</p>
              <div className="flex flex-wrap gap-2">
                {qualifyingOptions.map((opt) => {
                  const isSelected = selectedAnswers.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => onToggle(question.id, opt.id)} />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default LeadRouting;

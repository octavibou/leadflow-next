import { useState } from "react";
import { Plus, Trash, Webhooks, Users, CaretDown, CaretUp, Rows } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { Funnel, FunnelStep } from "@/types/funnel";

export interface RouteClient {
  id: string;
  name: string;
  webhookUrl: string;
  /** Map of questionId → array of optionIds that route to this client */
  qualifyingAnswers: Record<string, string[]>;
}

export interface RouteConfig {
  clients: RouteClient[];
  /** If true, leads that don't match any client route go to the global webhook */
  fallbackToGlobal: boolean;
}

interface LeadRouterProps {
  funnel: Funnel;
  onUpdateSettings: (settings: Partial<Funnel["settings"] & { routeConfig?: RouteConfig }>) => void;
}

export function LeadRouter({ funnel, onUpdateSettings }: LeadRouterProps) {
  const routeConfig: RouteConfig = (funnel.settings as any).routeConfig || {
    clients: [],
    fallbackToGlobal: true,
  };

  const questionSteps = funnel.steps.filter((s) => s.type === "question" && s.question);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const updateRouteConfig = (newConfig: RouteConfig) => {
    onUpdateSettings({ routeConfig: newConfig } as any);
  };

  const addClient = () => {
    const newClient: RouteClient = {
      id: crypto.randomUUID(),
      name: "",
      webhookUrl: "",
      qualifyingAnswers: {},
    };
    updateRouteConfig({
      ...routeConfig,
      clients: [...routeConfig.clients, newClient],
    });
    setExpandedClient(newClient.id);
  };

  const updateClient = (clientId: string, updates: Partial<RouteClient>) => {
    updateRouteConfig({
      ...routeConfig,
      clients: routeConfig.clients.map((c) =>
        c.id === clientId ? { ...c, ...updates } : c
      ),
    });
  };

  const removeClient = (clientId: string) => {
    updateRouteConfig({
      ...routeConfig,
      clients: routeConfig.clients.filter((c) => c.id !== clientId),
    });
    toast.success("Cliente eliminado");
  };

  const toggleOption = (clientId: string, questionId: string, optionId: string) => {
    const client = routeConfig.clients.find((c) => c.id === clientId);
    if (!client) return;

    const currentAnswers = client.qualifyingAnswers[questionId] || [];
    const newAnswers = currentAnswers.includes(optionId)
      ? currentAnswers.filter((id) => id !== optionId)
      : [...currentAnswers, optionId];

    updateClient(clientId, {
      qualifyingAnswers: {
        ...client.qualifyingAnswers,
        [questionId]: newAnswers,
      },
    });
  };

  const getAssignedOptionCount = (client: RouteClient) => {
    return Object.values(client.qualifyingAnswers).reduce(
      (sum, opts) => sum + opts.length,
      0
    );
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lead Routing</h2>
          <p className="text-muted-foreground mt-1">
            Enruta los leads a tus clientes según las respuestas cualificadas. Cada cliente
            recibe un POST a su webhook con los datos del lead.
          </p>
        </div>

        <Separator />

        {/* Client list */}
        <div className="space-y-4">
          {routeConfig.clients.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  No tienes clientes configurados. Añade uno para empezar a enrutar leads.
                </p>
                <Button onClick={addClient}>
                  <Plus className="h-4 w-4 mr-2" /> Añadir cliente
                </Button>
              </CardContent>
            </Card>
          )}

          {routeConfig.clients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const optionCount = getAssignedOptionCount(client);

            return (
              <Collapsible
                key={client.id}
                open={isExpanded}
                onOpenChange={(open) => setExpandedClient(open ? client.id : null)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Rows className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base">
                              {client.name || "Sin nombre"}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              {client.webhookUrl ? (
                                <Badge variant="secondary" className="text-xs">
                                  <Webhooks className="h-3 w-3 mr-1" />
                                  Webhook configurado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Sin webhook
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {optionCount} respuesta{optionCount !== 1 ? "s" : ""} asignada{optionCount !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClient(client.id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <CaretUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CaretDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="space-y-5 pt-0">
                      <Separator />

                      {/* Client info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre del cliente</Label>
                          <Input
                            placeholder="Ej: Clínica Dental Madrid"
                            value={client.name}
                            onChange={(e) => updateClient(client.id, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input
                            placeholder="https://hooks.example.com/..."
                            value={client.webhookUrl}
                            onChange={(e) => updateClient(client.id, { webhookUrl: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Question-option mapping */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold">Respuestas que enrutan a este cliente</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Selecciona las opciones cualificadas que correspondan a este cliente.
                          </p>
                        </div>

                        {questionSteps.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            No hay preguntas en el funnel todavía.
                          </p>
                        )}

                        {questionSteps.map((step) => {
                          const q = step.question!;
                          const qualifiedOptions = q.options.filter((o) => o.qualifies);

                          if (qualifiedOptions.length === 0) return null;

                          const selectedForQuestion = client.qualifyingAnswers[q.id] || [];

                          return (
                            <div key={q.id} className="space-y-2">
                              <p className="text-sm font-medium">{q.text}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {qualifiedOptions.map((opt) => (
                                  <label
                                    key={opt.id}
                                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                                  >
                                    <Checkbox
                                      checked={selectedForQuestion.includes(opt.id)}
                                      onCheckedChange={() =>
                                        toggleOption(client.id, q.id, opt.id)
                                      }
                                    />
                                    <span className="text-sm">
                                      {opt.emoji && <span className="mr-1">{opt.emoji}</span>}
                                      {opt.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Add client button */}
        {routeConfig.clients.length > 0 && (
          <Button variant="outline" onClick={addClient} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Añadir otro cliente
          </Button>
        )}
      </div>
    </ScrollArea>
  );
}

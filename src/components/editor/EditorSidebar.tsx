import { Plus, DotsSixVertical, Trash, TextAlignLeft, Question, UserCircle, ChartBar, CalendarBlank, VideoCamera, Gift, ThumbsUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FunnelSettings, FunnelStep, StepType } from "@/types/funnel";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { EditorPluginsPanel } from "@/components/editor/EditorPluginsPanel";

const STEP_ICONS: Record<StepType, React.ReactNode> = {
  intro: <TextAlignLeft className="h-4 w-4" weight="bold" />,
  question: <Question className="h-4 w-4" weight="bold" />,
  contact: <UserCircle className="h-4 w-4" weight="bold" />,
  results: <ChartBar className="h-4 w-4" weight="bold" />,
  booking: <CalendarBlank className="h-4 w-4" weight="bold" />,
  vsl: <VideoCamera className="h-4 w-4" weight="bold" />,
  delivery: <Gift className="h-4 w-4" weight="bold" />,
  thankyou: <ThumbsUp className="h-4 w-4" weight="bold" />,
};

const STEP_LABELS: Record<StepType, string> = {
  intro: "Landing",
  question: "Pregunta",
  contact: "Contacto",
  results: "Resultados",
  booking: "Reserva",
  vsl: "VSL",
  delivery: "Entrega",
  thankyou: "Gracias",
};

const ADD_TYPES: StepType[] = ["question", "intro", "contact", "results", "booking", "vsl", "delivery", "thankyou"];

function SortableStep({ step, isSelected, onSelect, onDelete }: { step: FunnelStep; isSelected: boolean; onSelect: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const fullLabel = step.type === "question" && step.question
    ? step.question.text
    : STEP_LABELS[step.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex w-full min-w-0 items-start gap-2 rounded-lg py-2 pl-2.5 pr-10 text-sm leading-snug transition-colors group cursor-pointer",
        isSelected
          ? "bg-primary font-medium text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted"
      )}
      onClick={onSelect}
    >
      <span
        {...attributes}
        {...listeners}
        className={cn(
          "mt-0.5 shrink-0 cursor-grab",
          isSelected ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <DotsSixVertical className="h-3.5 w-3.5" weight="bold" />
      </span>
      <span className={cn("mt-0.5 shrink-0", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>{STEP_ICONS[step.type]}</span>
      <span className="min-w-0 flex-1 break-words text-left" title={fullLabel}>{fullLabel}</span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-0.5 top-1/2 h-6 w-6 shrink-0 -translate-y-1/2",
          isSelected
            ? "text-primary-foreground/50 hover:bg-white/15 hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        )}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label={`Eliminar paso ${fullLabel}`}
      >
        <Trash className="h-3 w-3" weight="regular" />
      </Button>
    </div>
  );
}

export function EditorSidebar({
  steps,
  pluginSteps,
  selectedIndex,
  onSelect,
  onReorder,
  onAddStep,
  onDeleteStep,
  excludeAddTypes,
  settings,
  sidebarTab,
  onSidebarTabChange,
  onUpdateSettings,
}: {
  steps: FunnelStep[];
  /** Pasos completos del funnel (p. ej. fórmulas en Plugins). Por defecto `steps`. */
  pluginSteps?: FunnelStep[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onReorder: (steps: FunnelStep[]) => void;
  onAddStep: (type: StepType) => void;
  onDeleteStep: (stepId: string) => void;
  excludeAddTypes?: StepType[];
  settings: FunnelSettings;
  sidebarTab: "steps" | "design" | "plugins";
  onSidebarTabChange: (tab: "steps" | "design" | "plugins") => void;
  onUpdateSettings: (updates: Partial<FunnelSettings>) => void;
}) {
  const stepsForPlugins = pluginSteps ?? steps;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const addTypesMenu = excludeAddTypes?.length
    ? ADD_TYPES.filter((t) => !excludeAddTypes.includes(t))
    : ADD_TYPES;

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
    onReorder(reordered);
  };

  return (
    <div className="flex min-h-0 w-80 shrink-0 flex-col border-r border-border bg-background text-foreground">
      <Tabs
        value={sidebarTab}
        onValueChange={(v) => onSidebarTabChange(v as "steps" | "design" | "plugins")}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="shrink-0 border-b border-border px-4 py-3">
          <TabsList className="w-full p-1" variant="default">
            <TabsTrigger
              value="steps"
              className="text-xs data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Pasos
            </TabsTrigger>
            <TabsTrigger
              value="design"
              className="text-xs data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Diseño
            </TabsTrigger>
            <TabsTrigger
              value="plugins"
              className="text-xs data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Plugins
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="steps" className="min-h-0 flex-1">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-0.5 p-2 pr-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  {sorted.map((step) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      isSelected={step.order === selectedIndex}
                      onSelect={() => onSelect(step.order)}
                      onDelete={() => onDeleteStep(step.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </ScrollArea>
          <div className="shrink-0 border-t border-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" weight="bold" /> Añadir paso
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {addTypesMenu.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => onAddStep(type)}>
                    {STEP_ICONS[type]}
                    <span className="ml-2">{STEP_LABELS[type]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TabsContent>

        <TabsContent value="plugins" className="min-h-0 flex-1">
          <ScrollArea className="min-h-0 flex-1">
            <EditorPluginsPanel
              settings={settings}
              steps={stepsForPlugins}
              onUpdateSettings={onUpdateSettings}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="design" className="min-h-0 flex-1">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Alineación de la pregunta</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "left", label: "Izq." },
                      { id: "center", label: "Centro" },
                      { id: "right", label: "Der." },
                    ] as const).map((opt) => {
                      const active = (settings.questionTextAlign ?? "center") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateSettings({ questionTextAlign: opt.id })}
                          className={cn(
                            "h-9 rounded-lg border text-xs font-semibold transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Controla si el texto de la pregunta se alinea a la izquierda, centro o derecha.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Tamaño de la pregunta</span>
                </div>
                <div className="space-y-4 rounded-xl border border-border bg-muted/50 p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Mobile</span>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {(settings.questionFontSizeMobile ?? 16)}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.questionFontSizeMobile ?? 16]}
                      min={12}
                      max={40}
                      step={1}
                      onValueChange={(v) => onUpdateSettings({ questionFontSizeMobile: v[0] })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Desktop</span>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {(settings.questionFontSizeDesktop ?? 48)}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.questionFontSizeDesktop ?? 48]}
                      min={24}
                      max={96}
                      step={1}
                      onValueChange={(v) => onUpdateSettings({ questionFontSizeDesktop: v[0] })}
                    />
                  </div>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Cambia en tiempo real en el builder (mobile/desktop según el toggle de vista).
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Espacio pregunta → respuestas</span>
                </div>
                <div className="space-y-4 rounded-xl border border-border bg-muted/50 p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Mobile</span>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {(settings.questionOptionsSpacingMobile ?? 24)}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.questionOptionsSpacingMobile ?? 24]}
                      min={8}
                      max={64}
                      step={1}
                      onValueChange={(v) => onUpdateSettings({ questionOptionsSpacingMobile: v[0] })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Desktop</span>
                      <span className="text-xs font-medium tabular-nums text-foreground">
                        {(settings.questionOptionsSpacingDesktop ?? 24)}px
                      </span>
                    </div>
                    <Slider
                      value={[settings.questionOptionsSpacingDesktop ?? 24]}
                      min={8}
                      max={96}
                      step={1}
                      onValueChange={(v) => onUpdateSettings({ questionOptionsSpacingDesktop: v[0] })}
                    />
                  </div>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Controla el margen inferior del título de la pregunta.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Plus, DotsSixVertical, Trash, TextAlignLeft, Question, UserCircle, ChartBar, CalendarBlank, VideoCamera, Gift, ThumbsUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FunnelStep, StepType } from "@/types/funnel";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

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
        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
      )}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="mt-0.5 shrink-0 cursor-grab text-muted-foreground hover:text-foreground">
        <DotsSixVertical className="h-3.5 w-3.5" weight="bold" />
      </span>
      <span className="mt-0.5 shrink-0 text-muted-foreground">{STEP_ICONS[step.type]}</span>
      <span className="min-w-0 flex-1 break-words text-left" title={fullLabel}>{fullLabel}</span>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0.5 top-1/2 h-6 w-6 shrink-0 -translate-y-1/2 text-muted-foreground/35 hover:bg-destructive/10 hover:text-destructive/90"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label={`Eliminar paso ${fullLabel}`}
      >
        <Trash className="h-3 w-3" weight="regular" />
      </Button>
    </div>
  );
}

export function EditorSidebar({ steps, selectedIndex, onSelect, onReorder, onAddStep, onDeleteStep, excludeAddTypes }: {
  steps: FunnelStep[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onReorder: (steps: FunnelStep[]) => void;
  onAddStep: (type: StepType) => void;
  onDeleteStep: (stepId: string) => void;
  excludeAddTypes?: StepType[];
}) {
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
    <div className="flex min-h-0 w-80 shrink-0 flex-col border-r bg-muted/30">
      <div className="shrink-0 border-b px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pasos</span>
      </div>
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
      <div className="shrink-0 border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
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
    </div>
  );
}

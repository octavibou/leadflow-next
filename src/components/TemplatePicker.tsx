'use client';

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarBlank, VideoCamera, BookOpen, Users, PhoneCall, Robot, ArrowLeft, File } from "@phosphor-icons/react";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { FunnelType } from "@/types/funnel";
import { FUNNEL_TYPE_LABELS, FUNNEL_TYPE_TAGS, FUNNEL_TYPE_DESCRIPTIONS } from "@/types/funnel";

const ICONS: Record<FunnelType, React.ReactNode> = {
  blank: <File className="h-8 w-8 text-primary" weight="bold" />,
  appointment: <CalendarBlank className="h-8 w-8 text-primary" weight="bold" />,
  strategy_call: <PhoneCall className="h-8 w-8 text-primary" weight="bold" />,
  vsl: <VideoCamera className="h-8 w-8 text-primary" weight="bold" />,
  lead_magnet: <BookOpen className="h-8 w-8 text-primary" weight="bold" />,
  recruiting: <Users className="h-8 w-8 text-primary" weight="bold" />,
  ai_secretary: <Robot className="h-8 w-8 text-primary" weight="bold" />,
};

const TYPES: FunnelType[] = ["blank", "appointment", "strategy_call", "vsl", "lead_magnet", "recruiting", "ai_secretary"];

export function TemplatePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createFunnel = useFunnelStore((s) => s.createFunnel);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const router = useRouter();

  const [phase, setPhase] = useState<"templates" | "landing">("templates");
  const [pendingType, setPendingType] = useState<FunnelType | null>(null);
  const [useLanding, setUseLanding] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("templates");
      setPendingType(null);
      setUseLanding(true);
      setCreating(false);
    }
  }, [open]);

  const resetAndClose = () => {
    setPhase("templates");
    setPendingType(null);
    setUseLanding(true);
    setCreating(false);
    onClose();
  };

  const handlePickType = (type: FunnelType) => {
    setPendingType(type);
    setPhase("landing");
  };

  const handleCreate = async () => {
    if (!pendingType) return;
    setCreating(true);
    const funnelName =
      pendingType === "blank" ? "Mi Funnel en blanco" : `Mi Funnel de ${FUNNEL_TYPE_LABELS[pendingType]}`;
    const funnel = await createFunnel(
      funnelName,
      pendingType,
      currentWorkspaceId || undefined,
      { useLanding },
    );
    setCreating(false);
    if (!funnel) return;
    resetAndClose();
    const tab = useLanding ? "landing" : "funnel";
    router.push(`/editor/${funnel.id}?tab=${tab}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAndClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {phase === "templates" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Elige una plantilla de funnel</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              {TYPES.map((type) => (
                <Card
                  key={type}
                  className={
                    type === "blank"
                      ? "cursor-pointer border-dashed hover:ring-2 hover:ring-primary/20 transition-all"
                      : "cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                  }
                  onClick={() => handlePickType(type)}
                >
                  <CardContent className="p-4 flex gap-4">
                    <div className="shrink-0 rounded-lg bg-accent/50 p-3 self-start">
                      {ICONS[type]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{FUNNEL_TYPE_LABELS[type]}</span>
                        <Badge variant="outline" className="text-xs">{FUNNEL_TYPE_TAGS[type]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{FUNNEL_TYPE_DESCRIPTIONS[type]}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Landing antes del quiz</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {pendingType
                ? `Plantilla: ${FUNNEL_TYPE_LABELS[pendingType]}. Puedes cambiar esto después en el editor.`
                : ""}
            </p>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4 mt-2">
              <Label htmlFor="tpl-use-landing" className="text-sm font-medium cursor-pointer">
                Mostrar landing antes del quiz
              </Label>
              <Switch id="tpl-use-landing" checked={useLanding} onCheckedChange={setUseLanding} />
            </div>
            <div className="flex flex-wrap justify-between gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => setPhase("templates")}>
                <ArrowLeft className="h-4 w-4 mr-1.5" weight="bold" /> Volver
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? "Creando…" : "Crear funnel"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

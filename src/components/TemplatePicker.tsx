'use client';

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, BookOpen, Users, PhoneCall } from "lucide-react";
import { useFunnelStore } from "@/store/funnelStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { FunnelType } from "@/types/funnel";
import { FUNNEL_TYPE_LABELS, FUNNEL_TYPE_TAGS, FUNNEL_TYPE_DESCRIPTIONS } from "@/types/funnel";
import { Bot } from "lucide-react";

const ICONS: Record<FunnelType, React.ReactNode> = {
  appointment: <Calendar className="h-8 w-8 text-primary" />,
  strategy_call: <PhoneCall className="h-8 w-8 text-primary" />,
  vsl: <Video className="h-8 w-8 text-primary" />,
  lead_magnet: <BookOpen className="h-8 w-8 text-primary" />,
  recruiting: <Users className="h-8 w-8 text-primary" />,
  ai_secretary: <Bot className="h-8 w-8 text-primary" />,
};

const TYPES: FunnelType[] = ["appointment", "strategy_call", "vsl", "lead_magnet", "recruiting", "ai_secretary"];

export function TemplatePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createFunnel = useFunnelStore((s) => s.createFunnel);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const router = useRouter();

  const handlePick = async (type: FunnelType) => {
    const funnel = await createFunnel(`Mi Funnel de ${FUNNEL_TYPE_LABELS[type]}`, type, currentWorkspaceId || undefined);
    if (!funnel) return;
    onClose();
    router.push(`/editor/${funnel.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elige una plantilla de funnel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 mt-2">
          {TYPES.map((type) => (
            <Card key={type} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all" onClick={() => handlePick(type)}>
              <CardContent className="p-4 flex gap-4">
                <div className="shrink-0 rounded-lg bg-accent/50 p-3 self-start">
                  {ICONS[type]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{FUNNEL_TYPE_LABELS[type]}</span>
                    <Badge variant="outline" className="text-xs">{FUNNEL_TYPE_TAGS[type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{FUNNEL_TYPE_DESCRIPTIONS[type]}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

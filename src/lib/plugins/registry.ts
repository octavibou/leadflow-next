import type { FunnelPluginId, FunnelPluginPlacement } from "@/types/funnelPlugins";

export type PluginRegistryMeta = {
  id: FunnelPluginId;
  title: string;
  description: string;
  placements: FunnelPluginPlacement[];
};

export const FUNNEL_PLUGIN_REGISTRY: PluginRegistryMeta[] = [
  {
    id: "live_activity",
    title: "Live Activity Feed",
    description:
      "Notificaciones de actividad basadas en datos reales del funnel (con opción de plantillas segmentadas).",
    placements: ["landing", "between_questions", "contact"],
  },
  {
    id: "ai_momentum",
    title: "AI Progress Momentum",
    description: "Barra e insights dinámicos mientras el visitante avanza en el quiz (reglas, sin LLM).",
    placements: ["between_questions"],
  },
  {
    id: "locked_preview",
    title: "Locked Result Preview",
    description: "Antes del formulario, muestra parte del resultado calculado y el resto bloqueado.",
    placements: ["contact"],
  },
  {
    id: "qualification_score",
    title: "Qualification Score Engine",
    description: "Puntuación y percentil estimado para refuerzo de ego y sensación técnica.",
    placements: ["between_questions"],
  },
  {
    id: "exit_recovery",
    title: "Smart Exit Recovery",
    description: "Detecta inactividad o cambio de pestaña y ofrece mensajes adaptados; puede restaurar progreso.",
    placements: ["landing", "between_questions", "contact"],
  },
];

export function getPluginMeta(id: FunnelPluginId): PluginRegistryMeta | undefined {
  return FUNNEL_PLUGIN_REGISTRY.find((p) => p.id === id);
}

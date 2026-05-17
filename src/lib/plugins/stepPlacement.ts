import type { FunnelPluginPlacement } from "@/types/funnelPlugins";
import type { StepType } from "@/types/funnel";

/** Mapea el paso actual del funnel a un placement de plugins. */
export function stepTypeToPluginPlacement(stepType: StepType): FunnelPluginPlacement | null {
  if (stepType === "intro") return "landing";
  if (stepType === "question") return "between_questions";
  if (stepType === "contact") return "contact";
  if (stepType === "results") return "results";
  return null;
}

export function placementEnabled(
  placements: FunnelPluginPlacement[] | undefined,
  current: FunnelPluginPlacement | null,
): boolean {
  if (!current) return false;
  return Boolean(placements?.includes(current));
}

import type { Funnel, FunnelStep } from "@/types/funnel";
import type { FunnelPluginPlacement } from "@/types/funnelPlugins";

export type FunnelPluginRuntimeContext = {
  funnel: Funnel;
  campaignId: string | null;
  sortedSteps: FunnelStep[];
  answers: Record<string, string>;
  totalScore: number;
  qualified: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentStep: FunnelStep;
  placement: FunnelPluginPlacement | null;
  isPreview: boolean;
  primaryColor: string;
  isMobile: boolean;
};

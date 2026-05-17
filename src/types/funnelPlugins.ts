/**
 * Plugins de conversión (config persistida en `FunnelSettings.plugins`).
 * `version` permite migraciones futuras del JSON.
 */

export type FunnelPluginId =
  | "live_activity"
  | "ai_momentum"
  | "locked_preview"
  | "qualification_score"
  | "exit_recovery";

export type FunnelPluginPlacement = "landing" | "between_questions" | "contact" | "results";

export type ExitRecoveryPhase = "intro" | "question" | "contact";

export interface LiveActivityPluginConfig {
  pollIntervalMs: number;
  placements: FunnelPluginPlacement[];
  /** `variableName` de la pregunta usada para segmentar plantillas (opcional). */
  segmentVariableName?: string;
  /** Plantillas con placeholders: {count}, {activeNow}, {completedWeek}, {vertical} */
  templatesDefault: string[];
  /** Clave = valor de opción (`option.value`) o "default". */
  templatesBySegment: Record<string, string[]>;
  /** Si true, se combinan nombres de demostración con datos agregados reales. */
  useSyntheticNames: boolean;
  /** Mostrar línea tipo "X personas en este paso" usando agregados del API. */
  showStepActivity: boolean;
}

export interface AiMomentumRule {
  id: string;
  minQuestionIndex: number;
  maxQuestionIndex: number;
  /** Si se define, la regla solo aplica si `answers[stepId] === matchOptionValue` para el paso con `variableName`. */
  matchVariableName?: string;
  matchOptionValue?: string;
  message: string;
}

export interface AiMomentumPluginConfig {
  placements: FunnelPluginPlacement[];
  barLabel: string;
  analysisMinPercent: number;
  analysisMaxPercent: number;
  rules: AiMomentumRule[];
}

export interface LockedPreviewPluginConfig {
  headline: string;
  subheadline: string;
  /** Nombres de fórmulas (`ResultFormula.name`) visibles con check. */
  unlockedFormulaNames: string[];
  /** Nombres de fórmulas mostradas como candado (solo etiqueta). */
  lockedFormulaKeys: string[];
  /** Etiqueta UI por clave de fórmula (opcional). */
  lockedLabels: Record<string, string>;
  /** Texto con `{{nombreVariable}}` interpolado desde el contexto de fórmulas. */
  snippetTemplate: string;
  unlockCtaHint: string;
}

export interface QualificationScorePluginConfig {
  placements: FunnelPluginPlacement[];
  engineLabel: string;
  /** Score mínimo del quiz (suma de option.score) para mapear al percentil bajo. */
  pseudoMinTotalScore: number;
  pseudoMaxTotalScore: number;
  /** Percentil mostrado se escala entre pseudoMinPercent y pseudoMaxPercent. */
  pseudoMinPercent: number;
  pseudoMaxPercent: number;
}

export interface ExitRecoveryMessageRow {
  id: string;
  phase: ExitRecoveryPhase;
  minQuestionIndex?: number;
  maxQuestionIndex?: number;
  title: string;
  body: string;
}

export interface ExitRecoveryPluginConfig {
  placements: FunnelPluginPlacement[];
  idleMs: number;
  onVisibilityHidden: boolean;
  maxPromptsPerSession: number;
  /** No guardar respuestas en localStorage (solo índice de paso). */
  saveAnswersInStorage: boolean;
  messages: ExitRecoveryMessageRow[];
  resumeTitle: string;
  resumeBody: string;
}

export type FunnelPluginConfigById = {
  live_activity: LiveActivityPluginConfig;
  ai_momentum: AiMomentumPluginConfig;
  locked_preview: LockedPreviewPluginConfig;
  qualification_score: QualificationScorePluginConfig;
  exit_recovery: ExitRecoveryPluginConfig;
};

export type FunnelPluginEntry<T extends FunnelPluginId = FunnelPluginId> = {
  enabled: boolean;
  config: FunnelPluginConfigById[T];
};

export interface FunnelPluginsBundle {
  version: 1;
  items: Partial<{ [K in FunnelPluginId]: FunnelPluginEntry<K> }>;
}

const defaultLiveActivity: LiveActivityPluginConfig = {
  pollIntervalMs: 45_000,
  placements: ["landing", "between_questions", "contact"],
  segmentVariableName: undefined,
  templatesDefault: [
    "{count} personas han completado este análisis esta semana.",
    "Ahora mismo hay {activeNow} personas en este funnel.",
    "Tu sector está muy activo: {completedWeek} envíos esta semana.",
  ],
  templatesBySegment: {
    default: [
      "{vertical}: buen momento para captar leads.",
      "Más de {count} análisis completados en los últimos días.",
    ],
  },
  useSyntheticNames: false,
  showStepActivity: true,
};

const defaultAiMomentum: AiMomentumPluginConfig = {
  placements: ["between_questions"],
  barLabel: "Análisis en curso",
  analysisMinPercent: 14,
  analysisMaxPercent: 86,
  rules: [
    {
      id: "r0",
      minQuestionIndex: 0,
      maxQuestionIndex: 2,
      message: "Detectando oportunidades de automatización en tu perfil…",
    },
    {
      id: "r1",
      minQuestionIndex: 3,
      maxQuestionIndex: 8,
      message: "Tu perfil encaja con campañas de alta conversión…",
    },
    {
      id: "r2",
      minQuestionIndex: 9,
      maxQuestionIndex: 99,
      message: "Generando recomendaciones finales personalizadas…",
    },
  ],
};

const defaultLockedPreview: LockedPreviewPluginConfig = {
  headline: "Tu análisis está casi listo",
  subheadline: "Estos bloques ya están calculados. El resto se desbloquea al enviar el formulario.",
  unlockedFormulaNames: [],
  lockedFormulaKeys: [],
  lockedLabels: {},
  snippetTemplate: "Hemos detectado señales claras en tu perfil ({{hint}}).",
  unlockCtaHint: "Introduce tus datos para ver el plan completo.",
};

const defaultQualification: QualificationScorePluginConfig = {
  placements: ["between_questions"],
  engineLabel: "AI Qualification Engine",
  pseudoMinTotalScore: 0,
  pseudoMaxTotalScore: 24,
  pseudoMinPercent: 52,
  pseudoMaxPercent: 96,
};

const defaultExit: ExitRecoveryPluginConfig = {
  placements: ["landing", "between_questions", "contact"],
  idleMs: 28_000,
  onVisibilityHidden: true,
  maxPromptsPerSession: 2,
  saveAnswersInStorage: true,
  resumeTitle: "Hemos recuperado tu progreso",
  resumeBody: "Puedes continuar justo donde lo dejaste.",
  messages: [
    {
      id: "e_intro",
      phase: "intro",
      title: "Solo te llevará un minuto",
      body: "El análisis personalizado tarda menos de 60 segundos.",
    },
    {
      id: "e_early",
      phase: "question",
      minQuestionIndex: 0,
      maxQuestionIndex: 2,
      title: "Tu análisis tarda menos de 45 segundos",
      body: "Sigue con las preguntas para ver el resultado.",
    },
    {
      id: "e_late",
      phase: "question",
      minQuestionIndex: 3,
      maxQuestionIndex: 99,
      title: "Tu resultado ya está casi listo",
      body: "No abandones ahora: faltan pocos pasos.",
    },
    {
      id: "e_contact",
      phase: "contact",
      title: "Tu estrategia ya está generada",
      body: "Solo falta confirmar tus datos para desbloquearla.",
    },
  ],
};

export const DEFAULT_FUNNEL_PLUGINS: FunnelPluginsBundle = {
  version: 1,
  items: {
    live_activity: { enabled: false, config: { ...defaultLiveActivity } },
    ai_momentum: { enabled: false, config: { ...defaultAiMomentum, rules: [...defaultAiMomentum.rules] } },
    locked_preview: { enabled: false, config: { ...defaultLockedPreview, lockedLabels: { ...defaultLockedPreview.lockedLabels } } },
    qualification_score: { enabled: false, config: { ...defaultQualification } },
    exit_recovery: { enabled: false, config: { ...defaultExit, messages: defaultExit.messages.map((m) => ({ ...m })) } },
  },
};

export function cloneDefaultPlugins(): FunnelPluginsBundle {
  return JSON.parse(JSON.stringify(DEFAULT_FUNNEL_PLUGINS)) as FunnelPluginsBundle;
}

export function normalizeFunnelPlugins(raw: FunnelPluginsBundle | undefined | null): FunnelPluginsBundle {
  const base = cloneDefaultPlugins();
  if (!raw || raw.version !== 1 || !raw.items || typeof raw.items !== "object") return base;

  const out: FunnelPluginsBundle = { version: 1, items: { ...base.items } };
  (Object.keys(raw.items) as FunnelPluginId[]).forEach((id) => {
    const row = raw.items[id];
    if (!row || typeof row.enabled !== "boolean" || !row.config) return;
    const def = base.items[id];
    if (!def) return;
    out.items[id] = {
      enabled: row.enabled,
      config: deepMergePluginConfig(id, def.config as any, row.config as any),
    } as any;
  });
  return out;
}

function deepMergePluginConfig<T extends FunnelPluginId>(
  id: T,
  defaults: FunnelPluginConfigById[T],
  partial: Partial<FunnelPluginConfigById[T]>,
): FunnelPluginConfigById[T] {
  if (id === "ai_momentum" && partial && typeof partial === "object") {
    const d = defaults as AiMomentumPluginConfig;
    const p = partial as Partial<AiMomentumPluginConfig>;
    return {
      ...d,
      ...p,
      placements: p.placements ?? d.placements,
      rules: Array.isArray(p.rules) ? p.rules : d.rules,
    } as any;
  }
  if (id === "exit_recovery" && partial && typeof partial === "object") {
    const d = defaults as ExitRecoveryPluginConfig;
    const p = partial as Partial<ExitRecoveryPluginConfig>;
    return {
      ...d,
      ...p,
      placements: p.placements ?? d.placements,
      messages: Array.isArray(p.messages) ? p.messages : d.messages,
    } as any;
  }
  if (id === "live_activity" && partial && typeof partial === "object") {
    const d = defaults as LiveActivityPluginConfig;
    const p = partial as Partial<LiveActivityPluginConfig>;
    return {
      ...d,
      ...p,
      placements: p.placements ?? d.placements,
      templatesDefault: p.templatesDefault ?? d.templatesDefault,
      templatesBySegment: p.templatesBySegment
        ? { ...d.templatesBySegment, ...p.templatesBySegment }
        : d.templatesBySegment,
    } as any;
  }
  if (id === "locked_preview" && partial && typeof partial === "object") {
    const d = defaults as LockedPreviewPluginConfig;
    const p = partial as Partial<LockedPreviewPluginConfig>;
    return {
      ...d,
      ...p,
      unlockedFormulaNames: p.unlockedFormulaNames ?? d.unlockedFormulaNames,
      lockedFormulaKeys: p.lockedFormulaKeys ?? d.lockedFormulaKeys,
      lockedLabels: p.lockedLabels ? { ...d.lockedLabels, ...p.lockedLabels } : d.lockedLabels,
    } as any;
  }
  return { ...(defaults as any), ...(partial as any) };
}

export function mergeFunnelPluginsItem(
  prev: FunnelPluginsBundle | undefined,
  id: FunnelPluginId,
  patch: Partial<FunnelPluginEntry>,
): FunnelPluginsBundle {
  const base = normalizeFunnelPlugins(prev);
  const current = base.items[id];
  if (!current) return base;
  const nextConfig =
    patch.config !== undefined
      ? deepMergePluginConfig(id, current.config as any, patch.config as any)
      : current.config;
  return {
    ...base,
    items: {
      ...base.items,
      [id]: {
        enabled: patch.enabled !== undefined ? patch.enabled : current.enabled,
        config: nextConfig,
      } as FunnelPluginEntry,
    },
  };
}

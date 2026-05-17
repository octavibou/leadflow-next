import type { FunnelPluginsBundle } from "@/types/funnelPlugins";

export type { FunnelPluginsBundle, FunnelPluginId } from "@/types/funnelPlugins";

export type FunnelType = "blank" | "appointment" | "strategy_call" | "vsl" | "lead_magnet" | "recruiting" | "ai_secretary";

export type StepType = "intro" | "question" | "contact" | "results" | "booking" | "vsl" | "delivery" | "thankyou";

export type QuestionLayout = "opts-col" | "opts-2";

export type FieldType = "text" | "email" | "tel";

export type ResultType = "roi_calculator" | "score";

export type CtaAction = "redirect" | "booking" | "webhook" | "next_step";

export type ResultsPageLayout = "minimal" | "conversion";

export type MetricCardAccent = "success" | "primary" | "neutral";

/** Ítem con emoji en pantalla (`iconKey` solo legacy → mapeo a emoji). */
export interface ResultsIconLabelItem {
  id: string;
  label: string;
  emoji?: string;
  iconKey?: string;
}

export interface FunnelSettings {
  primaryColor: string;
  fontFamily: string;
  logoUrl: string;
  webhookUrl: string;
  bookingUrl: string;
  redirectUrlAfterBooking: string;
  vslVideoUrl: string;
  leadMagnetTitle: string;
  leadMagnetDescription: string;
  leadMagnetDownloadUrl: string;
  recruitingThankYouMessage: string;
  language: string;
  customDomain: string;
  metaPixelId: string;
  metaAccessToken: string;
  metaTestEventCode: string;
  /** Tamaño del texto de la pregunta (px). */
  questionFontSizeMobile?: number;
  /** Tamaño del texto de la pregunta en desktop (px). */
  questionFontSizeDesktop?: number;
  /** Espacio vertical entre pregunta y respuestas (px). */
  questionOptionsSpacingMobile?: number;
  /** Espacio vertical entre pregunta y respuestas en desktop (px). */
  questionOptionsSpacingDesktop?: number;
  /** Alineación del texto de la pregunta. */
  questionTextAlign?: "left" | "center" | "right";
  /** Si es false, la vista pública empieza en la primera pregunta y oculta el paso intro. undefined = true (compatibilidad). */
  useLanding?: boolean;
  /** Plugins de conversión (embeds globales landing/quiz/contacto). */
  plugins?: FunnelPluginsBundle;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  emoji: string;
  value: string;
  qualifies: boolean;
  score: number;
  /** Numeric value this option maps to when used as a variable */
  numericValue?: number;
}

export interface Question {
  id: string;
  step_id: string;
  text: string;
  layout: QuestionLayout;
  options: QuestionOption[];
  /** Variable name for this question — value comes from selected option's numericValue */
  variableName?: string;
}

export interface ContactField {
  id: string;
  step_id: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface IntroConfig {
  headline: string;
  description: string;
  cta: string;
  showVideo: boolean;
  videoUrl?: string;
  headlineFontSize?: number;
  descriptionFontSize?: number;
  ctaFontSize?: number;
  elementSpacing?: number;
  mobileHeadlineFontSize?: number;
  mobileDescriptionFontSize?: number;
  mobileCtaFontSize?: number;
  mobileElementSpacing?: number;
  /** Línea entre logo y contenido en vista previa y público. En constructor la zona divisor sigue disponible. */
  showLandingDivider?: boolean;
  /**
   * Bloques colocados desde “Bloques básicos” (arrastrados al lienzo).
   * `kind` coincide con los primitivos del constructor (text, button, divider, …).
   */
  landingBodyBlocks?: LandingIntroBodyBlock[];
}

/** Contenido persistido por fila para bloques arrastrados al canvas de la landing. */
export interface LandingIntroBodyBlock {
  id: string;
  kind: string;
  title?: string;
  subtitle?: string;
  body?: string;
  ctaLabel?: string;
}

export interface MetricCard {
  id: string;
  label: string;
  valueSource: string;
  suffix: string;
  /** Texto auxiliar bajo la métrica (layout minimal / legacy). */
  description?: string;
  accent?: MetricCardAccent;
  checklist?: string[];
  footerHighlight?: string;
  footerHighlightIconKey?: string;
  footerHighlightEmoji?: string;
  cardIconKey?: string;
  cardIconEmoji?: string;
}

export interface ResultFormula {
  id: string;
  name: string;
  expression: string;
}

export interface ResultCtaConfig {
  action: CtaAction;
  label: string;
  url: string;
}

export interface ResultsConfig {
  qualifiedHeadline: string;
  qualifiedSubheadline: string;
  qualifiedCta: string;
  disqualifiedHeadline: string;
  disqualifiedSubheadline: string;
  disqualifiedCta: string;
  qualifiedRoute: number;
  disqualifiedRoute: number;
  resultType?: ResultType;
  formulas?: ResultFormula[];
  headline?: string;
  metricCards?: MetricCard[];
  ctaConfig?: ResultCtaConfig;
  /** Default `minimal` para funnels existentes. */
  resultsPageLayout?: ResultsPageLayout;
  /** Título en dos tonos: parte en negro (interpolable). */
  headlineLead?: string;
  /** Parte destacada en color primario (interpolable). */
  headlineEmphasis?: string;
  resultsSubheadline?: string;
  /** Sin `logoUrl`, emoji mostrado arriba a la izquierda (plantilla conversión). Vacío → 📊. */
  conversionHeaderEmoji?: string;
  calloutText?: string;
  /** Emoji en círculo del callout superior derecho. Vacío → 🎁. */
  calloutEmoji?: string;
  calloutIconKey?: string;
  /** Viñeta de checklist en tarjetas de métrica. Vacío → ✅. */
  metricChecklistBulletEmoji?: string;
  painTitle?: string;
  /** Emoji grande bajo el título de “coste de no actuar”. Vacío → 😟. */
  painHeroEmoji?: string;
  /** Viñeta de cada bullet de dolor. Vacío → ❌. */
  painBulletEmoji?: string;
  /** Emoji junto al titular del aside naranja. Vacío → ⚠️. */
  painWarningEmoji?: string;
  painBullets?: string[];
  painAsideTitle?: string;
  painAsideBody?: string;
  solutionTitle?: string;
  solutionBody?: string;
  solutionImageUrl?: string;
  /** Plantilla conversión: si es false, oculta ilustración (URL) o robot por defecto. undefined/true = mostrar. */
  solutionShowVisual?: boolean;
  /** Sin imagen en solución: emoji en el recuadro blanco. Vacío → 🤖. */
  solutionPlaceholderEmoji?: string;
  solutionFeatures?: ResultsIconLabelItem[];
  trustSignals?: ResultsIconLabelItem[];
  closingQuoteLead?: string;
  closingQuoteAccent?: string;
}

export interface ThankYouNextStep {
  number: number;
  title: string;
  description: string;
}

export type ThankYouMode = "steps" | "button";

export interface ThankYouConfig {
  headline: string;
  subtitle: string;
  videoUrl?: string;
  mode?: ThankYouMode;
  showEmoji?: boolean;
  nextSteps: ThankYouNextStep[];
  buttonLabel?: string;
  buttonUrl?: string;
}

export interface DeliveryConfig {
  resourceTitle: string;
  resourceDescription: string;
  downloadButtonLabel: string;
  downloadUrl: string;
}

export interface VslConfig {
  videoUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface BookingConfig {
  bookingUrl: string;
}

export interface FunnelStep {
  id: string;
  funnel_id: string;
  order: number;
  type: StepType;
  introConfig?: IntroConfig;
  question?: Question;
  contactFields?: ContactField[];
  contactCta?: string;
  contactConsent?: string;
  /** Casilla «He leído y acepto». `false` la oculta. Por defecto true (compactación: undefined). */
  showContactConsentCheckbox?: boolean;
  /** Si no se define, se usa copy orientada a conversión (último paso antes del resultado). */
  contactHeadline?: string;
  contactSubheadline?: string;
  /** Solo relevante si `contactShowTrustBadge` no es false. */
  contactTrustLine?: string;
  /** Por defecto true: insignia de confianza bajo el subtítulo. */
  contactShowTrustBadge?: boolean;
  /** Por defecto true: barra ~90–95 % en la tarjeta y en el pie fijo. */
  contactShowNearCompleteProgress?: boolean;
  /** Porcentaje mostrado en el paso contacto (80–99). Por defecto 92. */
  contactProgressPercent?: number;
  /** Skip the contact form for disqualified leads */
  skipContactIfDisqualified?: boolean;
  /** Where qualified leads go after contact form */
  qualifiedRoute?: number;
  /** Where disqualified leads go (when skipping contact) */
  disqualifiedRoute?: number;
  resultsConfig?: ResultsConfig;
  thankYouConfig?: ThankYouConfig;
  deliveryConfig?: DeliveryConfig;
  vslConfig?: VslConfig;
  bookingConfig?: BookingConfig;
}

export type FunnelStatus = "draft" | "published";

export interface Funnel {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  type: FunnelType;
  settings: FunnelSettings;
  steps: FunnelStep[];
  created_at: string;
  updated_at: string;
  saved_at: string;
  workspace_id?: string;
}

export const FUNNEL_TYPE_LABELS: Record<FunnelType, string> = {
  blank: "Funnel en blanco",
  appointment: "Cita",
  strategy_call: "Llamada estratégica",
  vsl: "VSL",
  lead_magnet: "Lead Magnet",
  recruiting: "Reclutamiento",
  ai_secretary: "Secretaria IA",
};

export const FUNNEL_TYPE_TAGS: Record<FunnelType, string> = {
  blank: "Desde cero",
  appointment: "Agendar llamadas",
  strategy_call: "Agendar llamadas",
  vsl: "Ver video",
  lead_magnet: "Entregar recurso",
  recruiting: "Filtrar candidatos",
  ai_secretary: "Automatizar llamadas",
};

export const FUNNEL_TYPE_DESCRIPTIONS: Record<FunnelType, string> = {
  blank: "Empieza sin contenido predefinido: una landing mínima y una pregunta; tú añades el resto.",
  appointment: "Califica leads y envíalos directo a tu calendario.",
  strategy_call: "Califica prospectos con preguntas diagnósticas antes de una sesión estratégica.",
  vsl: "Califica leads y envíalos a ver tu video de ventas.",
  lead_magnet: "Califica y entrega un recurso gratuito a las personas correctas.",
  recruiting: "Filtra candidatos e identifica al mejor talento para tu equipo.",
  ai_secretary: "Califica leads interesados en automatizar sus llamadas con IA.",
};

export const DEFAULT_SETTINGS: FunnelSettings = {
  primaryColor: "#1877F2",
  fontFamily: "Inter",
  logoUrl: "",
  webhookUrl: "",
  bookingUrl: "",
  redirectUrlAfterBooking: "",
  vslVideoUrl: "",
  leadMagnetTitle: "",
  leadMagnetDescription: "",
  leadMagnetDownloadUrl: "",
  recruitingThankYouMessage: "Revisaremos tu aplicación y te contactaremos",
  language: "es",
  customDomain: "",
  metaPixelId: "",
  metaAccessToken: "",
  metaTestEventCode: "",
  questionFontSizeMobile: 16,
  questionFontSizeDesktop: 48,
  questionOptionsSpacingMobile: 24,
  questionOptionsSpacingDesktop: 24,
  questionTextAlign: "center",
  useLanding: true,
};

export type FunnelType = "appointment" | "strategy_call" | "vsl" | "lead_magnet" | "recruiting" | "ai_secretary";

export type StepType = "intro" | "question" | "contact" | "results" | "booking" | "vsl" | "delivery" | "thankyou";

export type QuestionLayout = "opts-col" | "opts-2";

export type FieldType = "text" | "email" | "tel";

export type ResultType = "roi_calculator" | "score";

export type CtaAction = "redirect" | "booking" | "webhook" | "next_step";

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
}

export interface MetricCard {
  id: string;
  label: string;
  valueSource: string;
  suffix: string;
  description: string;
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

export type FunnelStatus = "draft" | "published" | "archived";

export interface Funnel {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  type: FunnelType;
  settings: FunnelSettings;
  steps: FunnelStep[];
  status: FunnelStatus;
  published_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
  saved_at: string;
  workspace_id?: string;
}

export const FUNNEL_TYPE_LABELS: Record<FunnelType, string> = {
  appointment: "Cita",
  strategy_call: "Llamada estratégica",
  vsl: "VSL",
  lead_magnet: "Lead Magnet",
  recruiting: "Reclutamiento",
  ai_secretary: "Secretaria IA",
};

export const FUNNEL_TYPE_TAGS: Record<FunnelType, string> = {
  appointment: "Agendar llamadas",
  strategy_call: "Agendar llamadas",
  vsl: "Ver video",
  lead_magnet: "Entregar recurso",
  recruiting: "Filtrar candidatos",
  ai_secretary: "Automatizar llamadas",
};

export const FUNNEL_TYPE_DESCRIPTIONS: Record<FunnelType, string> = {
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
};

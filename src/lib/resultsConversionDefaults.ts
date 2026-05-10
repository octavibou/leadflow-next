import type { MetricCard, ResultsConfig, ResultsIconLabelItem } from "@/types/funnel";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}`;

function trustItem(emoji: string, label: string): ResultsIconLabelItem {
  return { id: uid(), emoji, label };
}

function featureItem(emoji: string, label: string): ResultsIconLabelItem {
  return { id: uid(), emoji, label };
}

/** Tarjetas de ejemplo al activar la plantilla conversión (fórmulas = responsabilidad del usuario). */
export function defaultConversionMetricCards(): MetricCard[] {
  return [
    {
      id: uid(),
      label: "Tiempo que recuperarías cada año",
      valueSource: "",
      suffix: " horas liberadas",
      accent: "success",
      cardIconEmoji: "⏰",
      checklist: [
        "Tu equipo deja de estar colgado del teléfono",
        "Reduces interrupciones y recuperas foco",
        "Atiendes cada llamada entrante sin contratar más gente",
      ],
      footerHighlight: "Equivale a más de {{semanas_trabajo}} semanas laborales de trabajo recuperable al año.",
      footerHighlightEmoji: "📅",
    },
    {
      id: uid(),
      label: "Clientes que podrías estar perdiendo",
      valueSource: "",
      suffix: " oportunidades recuperadas",
      accent: "primary",
      cardIconEmoji: "👥",
      checklist: [
        "La IA contesta al instante por teléfono",
        "Agenda citas automáticamente",
        "Califica y prioriza leads antes de que lleguen a ventas",
      ],
      footerHighlight: "Sin aumentar tu inversión en publicidad.",
      footerHighlightEmoji: "📣",
    },
  ];
}

/**
 * Rellena campos de conversión sin pisar fórmulas, CTA ni rutas ya definidos.
 */
export function mergeConversionTemplate(base: ResultsConfig): ResultsConfig {
  return {
    ...base,
    resultsPageLayout: "conversion",
    headlineLead:
      base.headlineLead ??
      "Según tus respuestas, estás perdiendo clientes todos los días por ",
    headlineEmphasis: base.headlineEmphasis ?? "no poder atender todas las llamadas.",
    headline: base.headline,
    resultsSubheadline:
      base.resultsSubheadline ?? "Hemos estimado el impacto usando los datos que nos has dado en el cuestionario.",
    calloutText:
      base.calloutText ??
      "Cada llamada no atendida es un cliente que probablemente termina en la competencia.",
    painTitle:
      base.painTitle ?? "Lo que te está costando no automatizar tus llamadas entrantes.",
    painBullets:
      base.painBullets?.length ?
        base.painBullets
      : [
          "Clientes que llaman y no reciben respuesta",
          "Tiempo del equipo en llamadas repetitivas",
          "Oportunidades que se enfrían mientras esperas devolver la llamada",
        ],
    painAsideTitle: base.painAsideTitle ?? "Y lo peor:",
    painAsideBody:
      base.painAsideBody ??
      "La mayoría de negocios no son conscientes del volumen real de oportunidades perdidas hasta que lo miden.",
    solutionTitle: base.solutionTitle ?? "Esto no reemplaza a tu equipo",
    solutionBody:
      base.solutionBody ??
      "Automatiza lo repetitivo (primer contacto, agendar, FAQs) para que tu equipo pueda centrarse en cerrar ventas y dar un servicio excelente.",
    solutionImageUrl: base.solutionImageUrl,
    solutionFeatures:
      base.solutionFeatures?.length ?
        base.solutionFeatures
      : [
          featureItem("📞", "Responde 24/7"),
          featureItem("📅", "Agenda citas"),
          featureItem("🎯", "Filtra y califica leads"),
          featureItem("💬", "Resuelve dudas frecuentes"),
        ],
    trustSignals:
      base.trustSignals?.length ?
        base.trustSignals
      : [
          trustItem("🎁", "Demo gratuita"),
          trustItem("🎛️", "Configuración personalizada"),
          trustItem("🤝", "Sin compromiso"),
        ],
    closingQuoteLead:
      base.closingQuoteLead ?? "La tecnología más inteligente es la que te ayuda a vender más sin trabajar más.",
    closingQuoteAccent: base.closingQuoteAccent ?? "Smart Business",
    metricCards: base.metricCards?.length ? base.metricCards : defaultConversionMetricCards(),
  };
}

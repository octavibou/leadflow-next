/**
 * Sistema de salud de métricas basado en benchmarks de conversión.
 * 
 * NO colorea números absolutos (ej: 20 leads = verde),
 * sino que evalúa RATIOS contra benchmarks de la industria.
 */

export type HealthStatus = "top1" | "excellent" | "good" | "average" | "weak" | "critical";

export type MetricType =
  | "quizStartRate"
  | "quizCompletionRate"
  | "qualificationRate"
  | "leadConversionRate"
  | "overallFunnelConversion"
  // Extensible para métricas futuras
  | "ctr"
  | "cpa"
  | "roas"
  | "appointmentRate"
  | "closeRate";

export type HealthResult = {
  status: HealthStatus;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  score: number;
};

const HEALTH_CONFIG: Record<HealthStatus, { label: string; color: string }> = {
  top1: {
    label: "Top 1%",
    color: "#7C3AED", // Purple
  },
  excellent: {
    label: "Excellent",
    color: "#2563EB", // Blue
  },
  good: {
    label: "Good",
    color: "#22C55E", // Green
  },
  average: {
    label: "Average",
    color: "#EAB308", // Yellow
  },
  weak: {
    label: "Weak",
    color: "#F97316", // Orange
  },
  critical: {
    label: "Critical",
    color: "#EF4444", // Red
  },
};

type BenchmarkRange = {
  min: number;
  max: number;
  status: HealthStatus;
  score: number;
};

type MetricBenchmark = {
  ranges: BenchmarkRange[];
  /** Si true, valores muy altos pueden ser sospechosos (ej: qualification >90% = filtros débiles) */
  highIsWarning?: boolean;
};

/**
 * Benchmarks por métrica.
 * Los rangos están en porcentaje (0-100), no en decimal (0-1).
 */
const BENCHMARKS: Record<string, MetricBenchmark> = {
  quizStartRate: {
    ranges: [
      { min: 70, max: 100, status: "top1", score: 100 },
      { min: 55, max: 70, status: "excellent", score: 88 },
      { min: 40, max: 55, status: "good", score: 72 },
      { min: 25, max: 40, status: "average", score: 55 },
      { min: 15, max: 25, status: "weak", score: 35 },
      { min: 0, max: 15, status: "critical", score: 15 },
    ],
  },
  quizCompletionRate: {
    ranges: [
      { min: 90, max: 100, status: "top1", score: 100 },
      { min: 80, max: 90, status: "excellent", score: 88 },
      { min: 65, max: 80, status: "good", score: 72 },
      { min: 45, max: 65, status: "average", score: 55 },
      { min: 30, max: 45, status: "weak", score: 35 },
      { min: 0, max: 30, status: "critical", score: 15 },
    ],
  },
  qualificationRate: {
    highIsWarning: true,
    ranges: [
      { min: 90, max: 100, status: "weak", score: 35 }, // Too high = weak filters
      { min: 80, max: 90, status: "excellent", score: 88 },
      { min: 50, max: 80, status: "good", score: 72 },
      { min: 35, max: 50, status: "average", score: 55 },
      { min: 20, max: 35, status: "weak", score: 35 },
      { min: 0, max: 20, status: "critical", score: 15 },
    ],
  },
  leadConversionRate: {
    ranges: [
      { min: 85, max: 100, status: "top1", score: 100 },
      { min: 70, max: 85, status: "excellent", score: 88 },
      { min: 50, max: 70, status: "good", score: 72 },
      { min: 30, max: 50, status: "average", score: 55 },
      { min: 15, max: 30, status: "weak", score: 35 },
      { min: 0, max: 15, status: "critical", score: 15 },
    ],
  },
  overallFunnelConversion: {
    ranges: [
      { min: 30, max: 100, status: "top1", score: 100 },
      { min: 20, max: 30, status: "excellent", score: 88 },
      { min: 12, max: 20, status: "good", score: 72 },
      { min: 6, max: 12, status: "average", score: 55 },
      { min: 2, max: 6, status: "weak", score: 35 },
      { min: 0, max: 2, status: "critical", score: 15 },
    ],
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Evalúa una métrica contra sus benchmarks y devuelve el estado de salud.
 * 
 * @param metricType - Tipo de métrica a evaluar
 * @param value - Valor en porcentaje (0-100), NO en decimal
 */
export function getMetricHealth(metricType: MetricType, value: number): HealthResult {
  const benchmark = BENCHMARKS[metricType];

  if (!benchmark) {
    return {
      status: "average",
      label: "Average",
      color: HEALTH_CONFIG.average.color,
      backgroundColor: hexToRgba(HEALTH_CONFIG.average.color, 0.12),
      borderColor: hexToRgba(HEALTH_CONFIG.average.color, 0.3),
      score: 50,
    };
  }

  const clampedValue = Math.max(0, Math.min(100, value));

  for (const range of benchmark.ranges) {
    if (clampedValue >= range.min && clampedValue < range.max) {
      const config = HEALTH_CONFIG[range.status];
      return {
        status: range.status,
        label: config.label,
        color: config.color,
        backgroundColor: hexToRgba(config.color, 0.12),
        borderColor: hexToRgba(config.color, 0.3),
        score: range.score,
      };
    }
  }

  // Edge case: value === max of last range (100%)
  const lastRange = benchmark.ranges[0];
  const config = HEALTH_CONFIG[lastRange.status];
  return {
    status: lastRange.status,
    label: config.label,
    color: config.color,
    backgroundColor: hexToRgba(config.color, 0.12),
    borderColor: hexToRgba(config.color, 0.3),
    score: lastRange.score,
  };
}

/**
 * Calcula el Funnel Health Score global (0-100).
 * Ponderación basada en impacto en el embudo.
 */
export function computeFunnelHealthScore(rates: {
  quizStartRate: number;
  quizCompletionRate: number;
  qualificationRate: number;
  leadConversionRate: number;
  overallFunnelConversion: number;
}): { score: number; status: HealthStatus; label: string; color: string; backgroundColor: string } {
  const weights = {
    quizStartRate: 0.20,
    quizCompletionRate: 0.15,
    qualificationRate: 0.15,
    leadConversionRate: 0.25,
    overallFunnelConversion: 0.25,
  };

  let totalScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const health = getMetricHealth(key as MetricType, rates[key as keyof typeof rates]);
    totalScore += health.score * weight;
  }

  const finalScore = Math.round(totalScore);

  let status: HealthStatus;
  if (finalScore >= 95) status = "top1";
  else if (finalScore >= 85) status = "excellent";
  else if (finalScore >= 70) status = "good";
  else if (finalScore >= 50) status = "average";
  else if (finalScore >= 30) status = "weak";
  else status = "critical";

  const config = HEALTH_CONFIG[status];
  return {
    score: finalScore,
    status,
    label: config.label,
    color: config.color,
    backgroundColor: hexToRgba(config.color, 0.12),
  };
}

/**
 * Helper para obtener la configuración de un status específico.
 */
export function getHealthConfig(status: HealthStatus) {
  return HEALTH_CONFIG[status];
}

/**
 * Todos los estados posibles, ordenados de mejor a peor.
 */
export const HEALTH_STATUSES: HealthStatus[] = [
  "top1",
  "excellent",
  "good",
  "average",
  "weak",
  "critical",
];

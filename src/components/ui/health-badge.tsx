"use client";

import { cn } from "@/lib/utils";
import type { HealthStatus, HealthResult } from "@/lib/metricHealth";
import { getHealthConfig } from "@/lib/metricHealth";

type HealthBadgeProps = {
  /** El resultado de getMetricHealth() o un status directo */
  health: HealthResult | HealthStatus;
  /** Tamaño del badge */
  size?: "sm" | "md" | "lg";
  /** Mostrar solo el indicador de color sin texto */
  dotOnly?: boolean;
  /** `minimal`: acento casi monocromo (solo un punto tenue). `default`: color completo. */
  variant?: "default" | "minimal";
  className?: string;
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Badge de salud de métricas. `variant="minimal"` para dashboards sobrios (Leadflow).
 */
export function HealthBadge({
  health,
  size = "sm",
  dotOnly = false,
  variant = "default",
  className,
}: HealthBadgeProps) {
  const isResult = typeof health === "object";
  const status: HealthStatus = isResult ? health.status : health;
  const config = getHealthConfig(status);

  const color = config.color;
  const label = config.label;
  const backgroundColor = hexToRgba(color, 0.08);
  const borderColor = hexToRgba(color, 0.15);

  if (dotOnly) {
    return (
      <span
        className={cn(
          "inline-block shrink-0 rounded-full",
          size === "sm" && "h-1.5 w-1.5",
          size === "md" && "h-2 w-2",
          size === "lg" && "h-2.5 w-2.5",
          variant === "minimal" ? "opacity-[0.38]" : size === "sm" && "opacity-70",
          className,
        )}
        style={{ backgroundColor: color }}
        title={label}
      />
    );
  }

  if (variant === "minimal") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border/50 bg-muted/15 px-1.5 py-[3px]",
          className,
        )}
        title={label}
      >
        <span
          className="size-[5px] shrink-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.42 }}
          aria-hidden
        />
        <span className="text-[7px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      </span>
    );
  }

  const textColor = size === "sm" ? hexToRgba(color, 0.85) : color;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full whitespace-nowrap",
        size === "sm" && "px-1.5 py-[3px] text-[7px] font-medium leading-none tracking-wide uppercase",
        size === "md" && "border px-2 py-0.5 text-[9px] font-semibold leading-none",
        size === "lg" && "border px-3 py-1.5 text-xs font-bold leading-none",
        className,
      )}
      style={{
        backgroundColor,
        borderColor: size === "sm" ? "transparent" : borderColor,
        color: textColor,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Indicador de salud más compacto para tablas y listas.
 */
export function HealthIndicator({
  health,
  showLabel = true,
  className,
}: {
  health: HealthResult | HealthStatus;
  showLabel?: boolean;
  className?: string;
}) {
  const isResult = typeof health === "object";
  const status: HealthStatus = isResult ? health.status : health;
  const config = getHealthConfig(status);
  const color = config.color;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {showLabel && (
        <span className="text-[10px] font-medium" style={{ color }}>
          {config.label}
        </span>
      )}
    </span>
  );
}

/**
 * Score visual con barra de progreso.
 */
export function HealthScoreBar({
  score,
  status,
  showLabel = true,
  className,
}: {
  score: number;
  status: HealthStatus;
  showLabel?: boolean;
  className?: string;
}) {
  const config = getHealthConfig(status);
  const color = config.color;
  const backgroundColor = hexToRgba(color, 0.15);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">
            Funnel Health
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>
            {score}/100
          </span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

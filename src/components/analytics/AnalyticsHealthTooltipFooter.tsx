"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { getAnalyticsGuideUrl } from "@/lib/analyticsGuideUrl";

/**
 * Bloque final para tooltips de métricas con salud por benchmarks (fondo oscuro: bg-foreground / texto background).
 */
export function AnalyticsHealthTooltipFooter() {
  const guideUrl = getAnalyticsGuideUrl();

  return (
    <div className="mt-2 border-t border-background/20 pt-2 text-[10px] leading-snug text-background/88">
      <p>
        Los estados de color comparan cada ratio con benchmarks del embudo (Top 1%, Excellent, Good, Average, Weak,
        Critical); no miden solo volumen de visitas o leads.
      </p>
      {guideUrl ? (
        <a
          href={guideUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 font-medium text-background underline decoration-background/40 underline-offset-2 hover:decoration-background"
        >
          Guía: métricas y colores
          <ArrowSquareOut className="h-3 w-3 shrink-0 opacity-90" weight="bold" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

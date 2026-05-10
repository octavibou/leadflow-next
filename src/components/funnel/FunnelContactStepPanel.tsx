import { cn } from "@/lib/utils";
import type { ResolvedContactStepCopy } from "@/lib/contactStepCopy";

/** Bloque único vista pública / preview: sensación de “último paso” antes del resultado. */
export function FunnelContactStepPanel({
  copy,
  isMobile,
  fields,
  consentSlot,
  ctaSlot,
}: {
  copy: ResolvedContactStepCopy;
  isMobile: boolean;
  fields: React.ReactNode;
  consentSlot: React.ReactNode;
  ctaSlot: React.ReactNode;
}) {
  const { headline, subheadline, trustLine, badgeLabel } = copy;

  return (
    <div className="animate-fade-in">
      <div
        className={cn(
          "mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm",
          isMobile ? "px-4 py-5" : "px-8 py-8",
        )}
      >
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <span aria-hidden>✓</span>
            {badgeLabel}
          </span>
        </div>

        <h2
          className={cn(
            "text-center font-extrabold tracking-tight text-gray-900",
            isMobile ? "text-xl leading-snug" : "text-3xl leading-[1.15] md:text-4xl",
          )}
        >
          {headline}
        </h2>
        <p
          className={cn(
            "mt-3 text-center leading-relaxed text-gray-600",
            isMobile ? "text-sm" : "text-base",
          )}
        >
          {subheadline}
        </p>
        {trustLine ? (
          <p
            className={cn(
              "mt-3 flex items-center justify-center gap-1.5 text-center text-gray-500",
              isMobile ? "text-xs" : "text-sm",
            )}
          >
            <span aria-hidden>🔒</span>
            {trustLine}
          </p>
        ) : null}

        <div className={cn("mt-6 space-y-4", !isMobile && "mx-auto w-full max-w-md")}>{fields}</div>

        {consentSlot}

        {ctaSlot}
      </div>
    </div>
  );
}

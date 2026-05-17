import { cn } from "@/lib/utils";

/** Tamaño de glifo unificado (los emojis dibujan distinto; la caja fija nivela el layout). */
const GLYPH_MD = "text-[1.1875rem] leading-none";
const GLYPH_LG_HEADER = "text-[1.25rem] leading-none";
const GLYPH_PAIN_HERO = "text-[1.35rem] leading-none";
const GLYPH_SOLUTION_MAIN = "text-[2.25rem] leading-none";

export function ConversionHeaderEmojiBadge({ emoji, className }: { emoji: string; className?: string }) {
  const text = emoji?.trim() || "📊";
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20",
        className,
      )}
      aria-hidden
    >
      <span className={cn(GLYPH_LG_HEADER, "block translate-y-[0.03em]", "font-normal")}>{text}</span>
    </span>
  );
}

/** Callout superior derecha (ej. 🎁). */
export function ConversionCalloutEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "🎁";
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm"
      aria-hidden
    >
      <span className={cn(GLYPH_MD, "block translate-y-[0.03em]", "font-normal")}>{text}</span>
    </span>
  );
}

/** Icono grande de tarjeta de métrica (círculo coloreado). */
export function ConversionMetricLeadingEmoji({
  emoji,
  circleClassName,
}: {
  emoji: string;
  circleClassName: string;
}) {
  const text = emoji?.trim() || "📊";
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full font-normal",
        circleClassName,
      )}
      aria-hidden
    >
      <span className={cn(GLYPH_MD, "block translate-y-[0.03em]")}>{text}</span>
    </span>
  );
}

/** Pie de tarjeta de métrica. */
export function ConversionMetricFootEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "📌";
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg" aria-hidden>
      <span className={cn(GLYPH_MD, "block translate-y-[0.03em]", "font-normal")}>{text}</span>
    </span>
  );
}

/** Viñeta de checklist (columna fija). */
export function ConversionChecklistGlyph({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "✅";
  return (
    <span className="flex h-[1.35rem] w-[1.35rem] shrink-0 flex-col items-center justify-center overflow-visible" aria-hidden>
      <span className={cn(GLYPH_MD, "flex h-full w-full flex-none items-center justify-center leading-none font-normal")}>{text}</span>
    </span>
  );
}

export function ConversionPainHeroEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "😟";
  return (
    <div className="flex justify-center md:justify-start" aria-hidden>
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-red-50 ring-1 ring-red-100/80">
        <span className={cn(GLYPH_PAIN_HERO, "block translate-y-[0.04em]", "font-normal")}>{text}</span>
      </span>
    </div>
  );
}

export function ConversionPainBulletGlyph({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "❌";
  return (
    <span className="flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center text-red-600" aria-hidden>
      <span className={cn(GLYPH_MD, "leading-none font-normal")}>{text}</span>
    </span>
  );
}

export function ConversionPainWarningGlyph({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "⚠️";
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden text-red-600" aria-hidden>
      <span className={cn(GLYPH_MD, "leading-none font-normal")}>{text}</span>
    </span>
  );
}

export function ConversionSolutionFallbackEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "🤖";
  return (
    <div className="flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
      <span className={cn(GLYPH_SOLUTION_MAIN, "block translate-y-[0.05em] font-normal")}>{text}</span>
    </div>
  );
}

export function ConversionFeatureEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "✨";
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/40" aria-hidden>
      <span className={cn(GLYPH_MD, "block translate-y-[0.03em]", "font-normal")}>{text}</span>
    </span>
  );
}

export function ConversionTrustEmoji({ emoji }: { emoji: string }) {
  const text = emoji?.trim() || "🎁";
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/30 text-gray-700" aria-hidden>
      <span className={cn(GLYPH_MD, "block translate-y-[0.03em]", "font-normal")}>{text}</span>
    </span>
  );
}

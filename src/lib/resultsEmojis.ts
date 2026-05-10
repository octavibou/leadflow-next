import type { MetricCard, ResultsConfig, ResultsIconLabelItem } from "@/types/funnel";

/** Mapeo de claves Phosphor legacy → emoji UTF-8. */
const LEGACY_ICON_KEY_TO_EMOJI: Record<string, string> = {
  Phone: "📞",
  Clock: "⏰",
  Users: "👥",
  User: "👤",
  Calendar: "📅",
  Megaphone: "📣",
  MegaphoneSimple: "📣",
  Warning: "⚠️",
  Check: "✅",
  X: "❌",
  ChartBar: "📊",
  Robot: "🤖",
  ChatCircle: "💬",
  Gift: "🎁",
  Handshake: "🤝",
  SlidersHorizontal: "🎛️",
  Funnel: "🎯",
  FunnelSimple: "🎯",
  DeviceMobile: "📱",
  SmileySad: "😟",
};

export function legacyIconKeyToEmoji(iconKey?: string): string {
  if (!iconKey) return "";
  return LEGACY_ICON_KEY_TO_EMOJI[iconKey] || "";
}

/** Emoji grande arriba a la izquierda (sin logo de marca). */
export function conversionHeaderEmoji(r: ResultsConfig): string {
  const raw = r.conversionHeaderEmoji?.trim();
  if (raw) return raw;
  return "📊";
}

export function conversionCalloutEmoji(r: ResultsConfig): string {
  return r.calloutEmoji?.trim() || "🎁";
}

export function conversionChecklistBulletEmoji(r: ResultsConfig): string {
  return r.metricChecklistBulletEmoji?.trim() || "✅";
}

export function conversionPainHeroEmoji(r: ResultsConfig): string {
  return r.painHeroEmoji?.trim() || "😟";
}

export function conversionPainBulletEmoji(r: ResultsConfig): string {
  return r.painBulletEmoji?.trim() || "❌";
}

export function conversionPainWarningEmoji(r: ResultsConfig): string {
  return r.painWarningEmoji?.trim() || "⚠️";
}

export function conversionSolutionPlaceholderEmoji(r: ResultsConfig): string {
  return r.solutionPlaceholderEmoji?.trim() || "🤖";
}

export function metricCardMainEmoji(card: MetricCard): string {
  const explicit = card.cardIconEmoji?.trim();
  if (explicit) return explicit;
  return legacyIconKeyToEmoji(card.cardIconKey) || "📊";
}

export function metricCardFooterEmoji(card: MetricCard): string {
  const explicit = card.footerHighlightEmoji?.trim();
  if (explicit) return explicit;
  return legacyIconKeyToEmoji(card.footerHighlightIconKey) || "📌";
}

export function resultsLabelItemEmoji(item: ResultsIconLabelItem): string {
  const explicit = item.emoji?.trim();
  if (explicit) return explicit;
  return legacyIconKeyToEmoji(item.iconKey) || "✨";
}

export function suggestedEmojiHintForLegacyKey(iconKey?: string): string {
  return legacyIconKeyToEmoji(iconKey) || "📎";
}

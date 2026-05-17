/**
 * URL de la guía pública (blog / docs) sobre métricas de analytics y significado de colores.
 * Definir en `.env.local`: `NEXT_PUBLIC_ANALYTICS_GUIDE_URL=https://…`
 */
export function getAnalyticsGuideUrl(): string {
  const v = process.env.NEXT_PUBLIC_ANALYTICS_GUIDE_URL;
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : "";
}

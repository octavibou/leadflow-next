/**
 * Tipografía del contenido del funnel: misma cadena CSS en editor, /f/[id] y export HTML.
 */

export function funnelContentFontFamily(fontFamily?: string | null): string {
  const raw = (fontFamily ?? "Inter").trim() || "Inter";
  if (raw === "System") {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }
  const escaped = raw.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `'${escaped}', system-ui, sans-serif`;
}

export function funnelLoadsGoogleFont(fontFamily?: string | null): boolean {
  const f = (fontFamily ?? "").trim();
  return Boolean(f && f !== "System");
}

export function funnelGoogleFontsStylesheetHref(fontFamily: string): string {
  const f = fontFamily.trim();
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@400;500;600;700&display=swap`;
}

/**
 * Convierte un código ISO 3166-1 alpha-2 (ej. "ES") al emoji de bandera correspondiente.
 * Devuelve null si el texto no son exactamente dos letras A–Z (p. ej. nombres completos como "Spain").
 */
export function isoAlpha2ToFlagEmoji(isoAlpha2: string): string | null {
  const c = isoAlpha2.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return null;
  const base = 0x1f1e6; // Regional Indicator Symbol Letter A
  const codePoints = [...c].map((ch) => base + ch.charCodeAt(0) - 0x41);
  return String.fromCodePoint(...codePoints);
}

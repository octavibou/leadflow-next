/** Evita redirects abiertos solo permitiendo rutas internas relativas. */
export function safeAppPath(nextParam: string | null | undefined, fallback = "/dashboard"): string {
  if (!nextParam || typeof nextParam !== "string") return fallback;
  const decoded = decodeURIComponent(nextParam.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  return decoded;
}

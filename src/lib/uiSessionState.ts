/**
 * Persistencia de UI en sessionStorage (pestaña actual).
 *
 * Convención de claves:
 * - `leadflow:v1:ui:path:<pathname>` — estado por ruta (p. ej. filtros de listas).
 * - `leadflow:v1:ui:editor:<funnelId>:<segment>` — fragmentos del editor (prefs, backup).
 * - `leadflow:v1:ui:shell:<name>` — shell global (p. ej. panel asistente).
 *
 * No guardar secretos, tokens ni PII innecesaria. sessionStorage se borra al cerrar la pestaña.
 */
export const UI_SESSION_VERSION = "v1" as const;
const PREFIX = `leadflow:${UI_SESSION_VERSION}:ui`;

const debouncers = new Map<string, ReturnType<typeof setTimeout>>();

/** Clave estable por pathname de la app (ej. `/dashboard`). */
export function uiPathSessionKey(pathname: string): string {
  return `${PREFIX}:path:${encodeURIComponent(pathname)}`;
}

/** Clave por funnel en el editor. `segment` ej. `prefs`, `dirtyBackup`. */
export function editorSessionKey(funnelId: string, segment: string): string {
  return `${PREFIX}:editor:${funnelId}:${segment}`;
}

/** Shell global (no ligado a una ruta concreta). */
export function shellSessionKey(name: string): string {
  return `${PREFIX}:shell:${name}`;
}

export function readUiSession<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw == null || raw === "") return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeUiSession<T>(storageKey: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // QuotaExceeded u origen opaco: ignorar
  }
}

export function removeUiSession(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* noop */
  }
}

/**
 * Escribe en sessionStorage tras `delayMs` de silencio. Cada nueva llamada reinicia el temporizador.
 */
export function writeUiSessionDebounced<T>(storageKey: string, value: T, delayMs = 200): void {
  const prev = debouncers.get(storageKey);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    debouncers.delete(storageKey);
    writeUiSession(storageKey, value);
  }, delayMs);
  debouncers.set(storageKey, t);
}

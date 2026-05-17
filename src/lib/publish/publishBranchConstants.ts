/** Rama por defecto: URL corta `/f/{funnelId}` (única `is_main` por funnel). */
export const FUNNEL_BRANCH_SLUG_MAIN = "main";

/**
 * Rama reservada “solo funnel”: URL `/f/{funnelId}/direct`.
 * No puede crearse manualmente con el mismo slug vía API.
 */
export const FUNNEL_BRANCH_SLUG_DIRECT = "direct";

const RESERVED = new Set([FUNNEL_BRANCH_SLUG_MAIN, FUNNEL_BRANCH_SLUG_DIRECT]);

export function isReservedFunnelBranchSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}

export function isDirectDefaultBranchSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === FUNNEL_BRANCH_SLUG_DIRECT;
}

export function isMainDefaultBranchSlug(slug: string): boolean {
  return slug.trim().toLowerCase() === FUNNEL_BRANCH_SLUG_MAIN;
}

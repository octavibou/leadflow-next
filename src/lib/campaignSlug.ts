/** Normaliza el fragmento público `?c=` (minúsculas, guiones, sin espacios). */
export function normalizeCampaignSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

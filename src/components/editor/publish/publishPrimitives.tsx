import type { Funnel } from "@/types/funnel";

/** Asegura `?landing=0` cuando el funnel no usa landing, para ver el quiz en el iframe de preview. */
export function mergeLandingFromFunnel(absoluteUrl: string, f: Funnel): string {
  try {
    const u = new URL(absoluteUrl);
    if (f.settings?.useLanding === false) {
      u.searchParams.set("landing", "0");
    }
    return u.toString();
  } catch {
    return absoluteUrl;
  }
}

export type PublishVariant = {
  key: string;
  label: string;
  url: string;
  embedCode: string;
};

export function buildEmbedSnippet(url: string) {
  return `<iframe src="${url}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
}

export function funnelIsLive(f: Funnel) {
  return !!f.saved_at && f.saved_at !== f.updated_at;
}

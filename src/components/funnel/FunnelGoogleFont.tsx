'use client';

import { useEffect } from "react";
import { funnelGoogleFontsStylesheetHref, funnelLoadsGoogleFont } from "@/lib/funnelTypography";

const loadedIds = new Set<string>();

/** Carga una vez la familia desde Google Fonts (no aplica si es "System" o vacío). */
export function FunnelGoogleFont({ fontFamily }: { fontFamily?: string | null }) {
  useEffect(() => {
    if (!funnelLoadsGoogleFont(fontFamily)) return;
    const family = fontFamily!.trim();
    const linkId = `qf-google-font-${family.replace(/\s+/g, "-")}`;
    if (typeof document === "undefined") return;
    if (loadedIds.has(linkId)) return;
    if (document.getElementById(linkId)) {
      loadedIds.add(linkId);
      return;
    }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = funnelGoogleFontsStylesheetHref(family);
    document.head.appendChild(link);
    loadedIds.add(linkId);
  }, [fontFamily]);

  return null;
}

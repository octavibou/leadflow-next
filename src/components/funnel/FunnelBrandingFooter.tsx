"use client";

import { cn } from "@/lib/utils";

/** Marca Leadflow en `/public` (fallback si el funnel no tiene logo propio). */
const DEFAULT_LEADFLOW_MARK = "/leadflow-mark.png";

/**
 * Pie de página de marca (enlaces legales placeholder + badge «Hecho con Leadflow»).
 * Los destinos se conectarán cuando haya URLs definitivas.
 */
export function FunnelBrandingFooter({
  className,
  brandLogoUrl,
}: {
  className?: string;
  brandLogoUrl?: string | null;
}) {
  const trimmedLogo = typeof brandLogoUrl === "string" ? brandLogoUrl.trim() : "";

  const linkButtonClass =
    "shrink-0 cursor-default whitespace-nowrap border-0 bg-transparent p-0 font-inherit text-inherit underline underline-offset-2 transition-colors hover:text-gray-700";

  return (
    <footer className={cn("flex flex-col items-center gap-8 md:gap-10", className)}>
      {/* flex-nowrap + nowrap + menor gap: cabe una sola línea en el marco ~375 del builder */}
      <div className="flex w-full max-w-full flex-nowrap items-center justify-center gap-1.5 text-[10px] leading-snug text-gray-500 opacity-35 transition-opacity hover:opacity-70 sm:gap-2.5 sm:text-[11px] md:gap-3 md:text-xs">
        <button type="button" className={linkButtonClass}>
          Terms of Use
        </button>
        <span aria-hidden className="shrink-0 text-gray-400">
          ·
        </span>
        <button type="button" className={linkButtonClass}>
          Privacy Policy
        </button>
        <span aria-hidden className="shrink-0 text-gray-400">
          ·
        </span>
        <button type="button" className={linkButtonClass}>
          Manage Cookies
        </button>
      </div>
      <div className="inline-flex max-w-full cursor-default items-center gap-2 rounded-full bg-[#f0f0f0] px-2.5 py-1.5 text-xs text-gray-600 opacity-100">
        <img
          src={trimmedLogo || DEFAULT_LEADFLOW_MARK}
          alt=""
          className="h-5 w-auto max-w-[5rem] shrink-0 rounded-md object-contain object-left"
        />
        <span className="truncate font-medium">Hecho con Leadflow</span>
      </div>
    </footer>
  );
}

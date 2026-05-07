"use client";

import { cn } from "@/lib/utils";

const DEFAULT_PLATFORM_URL = "https://leadflow.es";
const DEFAULT_COOKIES_URL = "https://leadflow.es";

function LeadflowMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-indigo-500 to-amber-400 text-[11px] font-bold leading-none text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      L
    </span>
  );
}

/**
 * Pie de página de marca (enlace cookies + badge “Hecho con Leadflow”), al estilo de la vista previa pública.
 */
export function FunnelBrandingFooter({ className }: { className?: string }) {
  const cookiesHref = process.env.NEXT_PUBLIC_LEADFLOW_COOKIES_URL ?? DEFAULT_COOKIES_URL;
  const platformHref = process.env.NEXT_PUBLIC_LEADFLOW_SITE_URL ?? DEFAULT_PLATFORM_URL;

  return (
    <footer className={cn("flex flex-col items-center gap-3", className)}>
      <a
        href={cookiesHref}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-700"
      >
        Gestionar cookies
      </a>
      <a
        href={platformHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#f0f0f0] px-2.5 py-1.5 text-xs text-gray-600 transition-opacity hover:opacity-90"
      >
        <LeadflowMark />
        <span className="truncate font-medium">Hecho con Leadflow</span>
      </a>
    </footer>
  );
}

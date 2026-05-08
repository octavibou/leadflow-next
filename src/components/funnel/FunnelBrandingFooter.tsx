"use client";

import { cn } from "@/lib/utils";

const DEFAULT_PLATFORM_URL = "https://leadflow.es";
const DEFAULT_TERMS_URL = "https://leadflow.es";
const DEFAULT_PRIVACY_URL = "https://leadflow.es";
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
export function FunnelBrandingFooter({
  className,
  onManageCookies,
}: {
  className?: string;
  onManageCookies?: () => void;
}) {
  const cookiesHref = process.env.NEXT_PUBLIC_LEADFLOW_COOKIES_URL ?? DEFAULT_COOKIES_URL;
  const platformHref = process.env.NEXT_PUBLIC_LEADFLOW_SITE_URL ?? DEFAULT_PLATFORM_URL;
  const termsHref = process.env.NEXT_PUBLIC_LEADFLOW_TERMS_URL ?? DEFAULT_TERMS_URL;
  const privacyHref = process.env.NEXT_PUBLIC_LEADFLOW_PRIVACY_URL ?? DEFAULT_PRIVACY_URL;

  return (
    <footer className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex items-center justify-center gap-4 text-center text-xs text-gray-500">
        <a
          href={termsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-gray-700"
        >
          Terms of Use
        </a>
        <span aria-hidden className="text-gray-400">·</span>
        <a
          href={privacyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-gray-700"
        >
          Privacy Policy
        </a>
        <span aria-hidden className="text-gray-400">·</span>
        {onManageCookies ? (
          <button
            type="button"
            onClick={onManageCookies}
            className="underline underline-offset-2 transition-colors hover:text-gray-700"
          >
            Manage Cookies
          </button>
        ) : (
          <a
            href={cookiesHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-gray-700"
          >
            Manage Cookies
          </a>
        )}
      </div>
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

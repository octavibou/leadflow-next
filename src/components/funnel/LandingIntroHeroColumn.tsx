"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { IntroConfig } from "@/types/funnel";

export function funnelVideoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const ytMatch = u.hostname.includes("youtube.com")
      ? u.searchParams.get("v")
      : u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : null;
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch}`;
    const vimeoMatch = u.hostname.includes("vimeo.com") && u.pathname.match(/\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    if (u.hostname.includes("loom.com")) return `https://www.loom.com/embed/${u.pathname.split("/").pop()}`;
    if (u.hostname.includes("wistia.com") || u.hostname.includes("wi.st"))
      return `https://fast.wistia.net/embed/iframe/${u.pathname.split("/").pop()}`;
    return url;
  } catch {
    return null;
  }
}

/** Mismo embed en /f y en el editor (Landing intro). */
export function FunnelVideoEmbed({ url }: { url: string }) {
  const embedUrl = useMemo(() => funnelVideoEmbedUrl(url), [url]);
  if (!embedUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        URL de video no válida
      </div>
    );
  }
  return (
    <iframe
      src={embedUrl}
      className="h-full w-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

export function introHeroMetrics(ic: IntroConfig | undefined, isMobile: boolean) {
  const hSize = isMobile ? (ic?.mobileHeadlineFontSize || 20) : (ic?.headlineFontSize || 30);
  const dSize = isMobile ? (ic?.mobileDescriptionFontSize || 14) : (ic?.descriptionFontSize || 18);
  const cSize = isMobile ? (ic?.mobileCtaFontSize || 14) : (ic?.ctaFontSize || 16);
  const spacing = isMobile ? (ic?.mobileElementSpacing || 12) : (ic?.elementSpacing || 16);
  return { hSize, dSize, cSize, spacing };
}

/**
 * Columna hero de la intro: mismas clases y estilos en preview público y builder.
 * Los envoltorios (p. ej. LandingPickZone) se inyectan con render props.
 */
export function LandingIntroHeroColumn({
  ic,
  primary,
  isMobile,
  renderHeadline,
  renderDescription,
  renderVideo,
  ctaSlot,
}: {
  ic: IntroConfig | undefined;
  primary: string;
  isMobile: boolean;
  renderHeadline: (node: ReactNode) => ReactNode;
  renderDescription: (node: ReactNode) => ReactNode;
  renderVideo: (node: ReactNode | null) => ReactNode | null;
  ctaSlot: ReactNode;
}) {
  const { hSize, dSize, spacing } = introHeroMetrics(ic, isMobile);

  const videoBlock =
    ic?.showVideo && ic?.videoUrl ? (
      <div
        className={cn(
          "aspect-video w-full shrink-0 overflow-hidden rounded-xl",
          /* max-w + mx-auto: el vídeo centrado igual que otros tipos de paso (VSL/thank-you). */
          !isMobile && "max-w-[640px] mx-auto",
          isMobile && "max-w-full",
        )}
      >
        <FunnelVideoEmbed url={ic.videoUrl} />
      </div>
    ) : null;

  const description = (
    <p
      className={cn("mx-auto w-full max-w-full leading-relaxed text-gray-500", !isMobile && "max-w-[600px]")}
      style={{ fontSize: `${dSize}px` }}
    >
      {ic?.description || "Descripción"}
    </p>
  );

  const headline = (
    <h1
      className="m-0 font-bold leading-tight antialiased"
      style={{ fontSize: `${hSize}px`, lineHeight: 1.2 }}
    >
      {ic?.headline || "Título"}
    </h1>
  );

  return (
    <div
      className="animate-fade-in text-center"
      style={{
        gap: `${spacing}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {renderHeadline(headline)}
      {renderVideo(videoBlock)}
      {renderDescription(description)}
      {ctaSlot}
    </div>
  );
}

/**
 * CTA de la intro: no usar breakpoints `md:` (el ancho del navegador no es el del mockup del builder).
 * Todo depende de la prop `isMobile` compartida entre /f y Editor.
 */
export function landingIntroCtaButtonClasses(isMobile: boolean): string {
  return cn(
    "rounded-xl border-0 px-8 py-4 text-center font-semibold leading-snug antialiased transition-opacity hover:opacity-90 outline-none",
    "font-sans tracking-normal",
    isMobile ? "block w-full max-w-full" : "inline-block w-auto max-w-full",
  );
}
export function landingIntroCtaButtonStyle(primary: string, cSize: number): CSSProperties {
  return { background: primary, color: "#fff", fontSize: `${cSize}px` };
}

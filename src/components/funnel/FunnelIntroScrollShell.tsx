"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FunnelBrandingFooter } from "@/components/funnel/FunnelBrandingFooter";
import { LandingCanvasSectionFrame } from "@/components/funnel/LandingCanvasIntroLayout";

/** Misma clase de contenedor del pie que en `PublicFunnel` (/f/[id]). */
export const funnelPublicFooterInnerClass =
  "mx-auto flex w-full max-w-[760px] justify-center px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-10 md:pt-5 md:pb-[max(1.25rem,env(safe-area-inset-bottom))]";

/**
 * Área tipo /f dentro del preview del editor: un solo scroll vertical; el pie va al final del contenido
 * (no pegado al borde inferior del viewport), igual que en la vista pública.
 */
export function FunnelIntroScrollShell({
  children,
  className,
  /** Solo constructor de landing: borde discontinuo + etiqueta “Pie” en hover. */
  showEditorChrome,
}: {
  children: ReactNode;
  className?: string;
  showEditorChrome?: boolean;
}) {
  const editorChrome = Boolean(showEditorChrome);

  const footerBlock = editorChrome ? (
    <LandingCanvasSectionFrame
      sectionKey="footer"
      showEditorChrome={true}
      className="w-full shrink-0 rounded-2xl"
      innerClassName="p-0"
    >
      <div className="overflow-hidden rounded-2xl bg-white">
        <div className={funnelPublicFooterInnerClass}>
          <FunnelBrandingFooter />
        </div>
      </div>
    </LandingCanvasSectionFrame>
  ) : (
    <div className="shrink-0 bg-white">
      <div className={funnelPublicFooterInnerClass}>
        <FunnelBrandingFooter />
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className={cn("flex w-full max-w-[760px] flex-col px-0 pb-0")}>{children}</div>
        {footerBlock}
      </div>
    </div>
  );
}

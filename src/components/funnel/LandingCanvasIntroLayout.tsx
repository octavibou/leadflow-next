"use client";

import { useState, type ReactNode } from "react";
import { Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { FunnelBrandingFooter } from "@/components/funnel/FunnelBrandingFooter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useLandingBuilderOptional } from "@/components/editor/landing/LandingBuilderContext";

type LandingCanvasSectionLabels = Record<string, string>;

const LABELS_ES: LandingCanvasSectionLabels = {
  header: "Cabecera",
  logo: "Logo",
  divider: "Divisor",
  main: "Contenido",
  footer: "Pie",
};

/** Marco de zona del canvas: borde discontinuo en hover y selección sólida tipo page builder (modo editor). */
export function LandingCanvasSectionFrame({
  sectionKey,
  selected,
  showEditorChrome,
  className,
  innerClassName,
  children,
  /** En constructor: la línea del divisor solo se pinta si la opción está activada (no al hacer hover). */
  dividerLineActive,
  /** Selección tipo builder: abre cabecera/divisor sin abrir inspector. */
  onChromeActivate,
  /** Botón flotante a la derecha (p. ej. eliminar), solo en constructor. */
  floatingDeleteSlot,
}: {
  sectionKey: keyof typeof LABELS_ES;
  selected?: boolean;
  /** En vista pública suele ir en false para no mostrar cromado de edición */
  showEditorChrome: boolean;
  className?: string;
  innerClassName?: string;
  children?: ReactNode;
  dividerLineActive?: boolean;
  onChromeActivate?: () => void;
  floatingDeleteSlot?: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const label = LABELS_ES[sectionKey];
  const showLabel = showEditorChrome && (hover || !!selected);
  const chromed = Boolean(onChromeActivate && showEditorChrome);

  const isDivider = sectionKey === "divider";
  const isLogoZone = sectionKey === "logo";
  /** El bloque Logo en constructor solo rodea la huella real del recurso (no toda la franja superior). */
  const logoFitChrome = isLogoZone && showEditorChrome;
  /** Etiqueta sobre el marco como en bloques básicos (no zona logo embebida sin cromado). */
  const showTopPillLabel = showLabel && !logoFitChrome;

  return (
    <section
      role={chromed ? "button" : undefined}
      tabIndex={chromed ? 0 : undefined}
      className={cn(
        "relative overflow-visible transition-colors",
        logoFitChrome ? "inline-block w-fit max-w-full align-top" : "w-full",
        showEditorChrome && "border-2",
        showEditorChrome &&
          (selected
            ? "cursor-pointer border-solid border-primary bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
            : chromed
              ? "cursor-pointer border-dashed border-transparent hover:border-muted-foreground/40"
              : "border-dashed border-transparent hover:border-muted-foreground/40"),
        !showEditorChrome && "border-0 border-transparent",
        className,
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={
        chromed
          ? (e) => {
              e.stopPropagation();
              onChromeActivate();
            }
          : undefined
      }
      onKeyDown={
        chromed
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChromeActivate();
              }
            }
          : undefined
      }
    >
      {showTopPillLabel && (
        <span
          className={cn(
            "pointer-events-none absolute z-[2] inline-flex select-none rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm max-sm:left-3 max-sm:text-[10px]",
            selected
              ? "left-4 top-0 -translate-y-1/2 bg-primary leading-none text-primary-foreground"
              : cn(
                  "bg-muted text-muted-foreground",
                  isDivider
                    ? "left-4 top-1 translate-y-0 max-sm:left-3"
                    : "left-4 top-2 translate-y-0 max-sm:top-1.5",
                ),
          )}
        >
          {label}
        </span>
      )}
      <div
        className={cn(
          logoFitChrome
            ? "p-0"
            : cn(
                "px-5 pb-5 max-sm:px-4 max-sm:pb-4",
                showEditorChrome ? "pt-6 max-sm:pt-5" : "pt-4 max-sm:pt-3.5",
              ),
          innerClassName,
        )}
      >
        {isDivider ? (
          <div
            className={cn(
              "min-h-px w-full transition-colors",
              !showEditorChrome && (dividerLineActive ? "bg-[#e5e5e5]" : "bg-transparent"),
              showEditorChrome && dividerLineActive && "bg-[#e5e5e5]",
            )}
          />
        ) : (
          children
        )}
      </div>
      {floatingDeleteSlot}
    </section>
  );
}

function LandingIntroLayoutFloatingDelete({
  ariaLabel,
  tooltip,
  onRemove,
}: {
  ariaLabel: string;
  tooltip: string;
  onRemove: () => void;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "pointer-events-auto absolute right-3 top-1/2 z-[8] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-background shadow-md transition-colors hover:bg-muted/80",
            )}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash className="h-5 w-5 text-muted-foreground" weight="bold" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type LandingCanvasIntroLayoutProps = {
  logoUrl?: string;
  showEditorChrome: boolean;
  /** Fuerza tipografía del funnel (si no se hereda del wrapper). */
  fontFamily?: string;
  /** Si true: se muestra la línea gris entre cabecera y contenido (preview/publico). Constructor siempre reserva hueco divisor. */
  showLandingDivider?: boolean;
  mainSelected?: boolean;
  footerClassName?: string;
  /** En /f/... el pie va fuera del scroll (como el resto del funnel); en el editor se mantiene dentro del canvas. */
  renderBrandingFooterInside?: boolean;
  children: ReactNode;
};

/**
 * Cabecera y fila divisor reservan siempre hueco vertical (preview/publico incluidos), aunque logo y línea estén ocultos.
 */
export function LandingCanvasIntroLayout({
  logoUrl,
  showEditorChrome,
  fontFamily,
  showLandingDivider,
  mainSelected,
  footerClassName,
  renderBrandingFooterInside = true,
  children,
}: LandingCanvasIntroLayoutProps) {
  const hasLogo = Boolean(logoUrl?.trim());

  const dividerLineActive = showLandingDivider === true;

  const introPick = useLandingBuilderOptional();
  const chromeEnabled = Boolean(showEditorChrome && introPick);
  const chromeSection = chromeEnabled && introPick ? (introPick.introLayoutChromeSection ?? null) : null;
  const introChromeActionsResolved = chromeEnabled ? (introPick?.introChromeActions ?? null) : null;

  /** Con cromado de editor todas las zonas hover tienen esquinas redondeadas. */
  const hoverSectionRadius = showEditorChrome ? "rounded-2xl" : null;

  const dividerInner = cn(
    // Mismo hueco vertical en constructor y público (el cromado no debe “hinchar” la intro).
    "py-2 pt-2 pb-2 max-sm:py-1",
    chromeSection === "divider" &&
      dividerLineActive &&
      introChromeActionsResolved &&
      "relative pr-12 max-sm:pr-10",
  );

  return (
    <div className="flex w-full flex-col gap-0" style={{ fontFamily }}>
      <div className={cn("flex w-full flex-col rounded-t-2xl rounded-b-none")}>
        {showEditorChrome ? (
          <LandingCanvasSectionFrame
            sectionKey="header"
            selected={chromeSection === "header"}
            showEditorChrome={true}
            className={cn(hoverSectionRadius, "w-full")}
            innerClassName="p-0"
            onChromeActivate={introPick ? () => introPick.selectIntroLayoutChromeSection("header") : undefined}
            floatingDeleteSlot={
              chromeSection === "header" && hasLogo && introChromeActionsResolved ? (
                <LandingIntroLayoutFloatingDelete
                  ariaLabel="Quitar logo"
                  tooltip="Quitar logo"
                  onRemove={() => introChromeActionsResolved.clearHeaderLogo()}
                />
              ) : null
            }
          >
            <div
              className={cn(
                "flex w-full items-start justify-start",
                // Alineado con la rama preview (showEditorChrome false): más bajo y pegado arriba.
                "min-h-[44px] px-5 pt-3 pb-2 max-sm:min-h-[40px] max-sm:px-4 max-sm:pt-2.5 max-sm:pb-1.5",
                chromeSection === "header" && hasLogo && introChromeActionsResolved && "pr-14 max-sm:pr-12",
              )}
            >
              {hasLogo ? (
                <span className="inline-flex shrink-0">
                  <img src={logoUrl} alt="" className="h-8 max-w-[200px] object-contain max-sm:h-7" />
                </span>
              ) : null}
            </div>
          </LandingCanvasSectionFrame>
        ) : (
          <div
            className={cn(
              "flex w-full items-start justify-start",
              "min-h-[44px] px-5 pt-3 pb-2 max-sm:min-h-[40px] max-sm:px-4 max-sm:pt-2.5 max-sm:pb-1.5",
            )}
          >
            {hasLogo ? (
              <img src={logoUrl} alt="" className="h-8 max-w-[200px] object-contain max-sm:h-7" />
            ) : null}
          </div>
        )}
      </div>

      <LandingCanvasSectionFrame
        sectionKey="divider"
        selected={chromeSection === "divider"}
        showEditorChrome={showEditorChrome}
        dividerLineActive={dividerLineActive}
        className={cn(hoverSectionRadius)}
        innerClassName={dividerInner}
        onChromeActivate={chromeEnabled && introPick ? () => introPick.selectIntroLayoutChromeSection("divider") : undefined}
        floatingDeleteSlot={
          chromeSection === "divider" && dividerLineActive && introChromeActionsResolved ? (
            <LandingIntroLayoutFloatingDelete
              ariaLabel="Ocultar línea divisoria"
              tooltip="Ocultar línea divisoria"
              onRemove={() => introChromeActionsResolved.hideLandingDivider()}
            />
          ) : null
        }
      />

      <LandingCanvasSectionFrame
        sectionKey="main"
        showEditorChrome={showEditorChrome}
        selected={mainSelected}
        className={cn(
          "text-center",
          hoverSectionRadius,
          !showEditorChrome && "rounded-none",
        )}
        innerClassName={
          showEditorChrome
            ? // Mismo padding superior que en preview (pt-4 / max-sm:pt-3.5), anulando el pt-6 del marco editor.
              "pb-8 max-sm:pb-7 max-sm:pt-3.5 sm:pt-4"
            : undefined
        }
      >
        {children}
      </LandingCanvasSectionFrame>

      {renderBrandingFooterInside ? (
        <LandingCanvasSectionFrame
          sectionKey="footer"
          showEditorChrome={showEditorChrome}
          className={cn(
            hoverSectionRadius,
            !showEditorChrome && "rounded-b-2xl rounded-t-none",
          )}
          innerClassName="pb-8 pt-4 max-sm:pb-6 max-sm:pt-3"
        >
          <FunnelBrandingFooter
            brandLogoUrl={hasLogo ? logoUrl : undefined}
            className={cn("mx-auto mt-0 w-full max-w-md shrink-0", footerClassName)}
          />
        </LandingCanvasSectionFrame>
      ) : null}
    </div>
  );
}

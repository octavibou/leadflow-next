"use client";

import { CaretDown, Copy } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  classifySessionSource,
  formatDurationMs,
  sessionSourceShortLabel,
  timelineEventTitle,
  type SessionDetail,
} from "@/lib/sessionAnalytics";
import { SessionTimelineEventDetails } from "@/components/session/SessionTimelineEventDetails";
import type { FunnelStep } from "@/types/funnel";
import { cn } from "@/lib/utils";

function helperTooltip(label: string, hint: string) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="cursor-help rounded-full border border-border px-1 text-[9px] text-muted-foreground">?</span>
      <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-[240px] rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
        {hint}
      </span>
    </span>
  );
}

function attributionNoviceSummary(d: SessionDetail): string {
  const ch = classifySessionSource(d);
  if (ch === "facebook") {
    return "Esta visita llegó desde Meta (Facebook o Instagram). Si ves fbclid, significa que entró desde un anuncio con ese clic medido.";
  }
  if (ch === "google") {
    return "Esta visita llegó desde Google (por ejemplo anuncios de búsqueda). El identificador gclid confirma el clic.";
  }
  if (ch === "direct") {
    return "Esta visita parece directa: escribieron la URL o no pudimos ver un referrer ni parámetros de anuncio.";
  }
  return "El origen está etiquetado como “otro”: puede ser otro sitio web, email, o datos incompletos en sesiones antiguas.";
}

export function FunnelSessionDetailSheet({
  open,
  onOpenChange,
  detail,
  stepsByFunnelId,
  leadAnswers,
  leadFormData,
  leadMetadataRaw,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  detail: SessionDetail | null;
  stepsByFunnelId: Map<string, FunnelStep[]>;
  leadAnswers: Record<string, string> | null;
  leadFormData: Record<string, string> | null;
  leadMetadataRaw: Record<string, unknown> | null;
}) {
  if (!detail) return null;

  const steps = stepsByFunnelId.get(detail.funnelId) || [];
  const answerLabels = (() => {
    if (!leadAnswers) return [] as { question: string; label: string; emoji?: string }[];
    const out: { question: string; label: string; emoji?: string }[] = [];
    for (const step of steps) {
      if (step.type !== "question" || !step.question) continue;
      const val = leadAnswers[step.id];
      if (!val) continue;
      const opt = step.question.options.find((o) => o.value === val);
      out.push({
        question: step.question.text,
        label: opt?.label || val,
        emoji: opt?.emoji,
      });
    }
    return out;
  })();

  const timelineSorted = [...detail.timeline].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const firstPageView = timelineSorted.find((t) => t.event_type === "page_view");
  const firstStep = timelineSorted.find((t) => t.event_type === "step_view");
  const qualEv = timelineSorted.find((t) => t.event_type === "qualification_evaluated");
  const formEv = timelineSorted.find((t) => t.event_type === "form_submit");
  const resultEv = timelineSorted.find((t) => t.event_type === "result_assigned");

  const stepper = [
    {
      key: "landing",
      label: "Vio la página de entrada",
      ok: !!firstPageView,
      at: firstPageView?.created_at,
    },
    {
      key: "quiz",
      label: "Respondió al menos una pregunta",
      ok: !!firstStep,
      at: firstStep?.created_at,
    },
    {
      key: "doneQuiz",
      label: "Terminó el quiz (cualificación)",
      ok: !!qualEv,
      at: qualEv?.created_at,
    },
    {
      key: "form",
      label: "Envió el formulario de contacto",
      ok: !!formEv || detail.hasLead,
      at: formEv?.created_at || detail.leadAt || undefined,
    },
    {
      key: "results",
      label: "Llegó a la pantalla de resultados",
      ok: !!resultEv,
      at: resultEv?.created_at,
    },
  ];

  const pageMeta = firstPageView?.metadata || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-l p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle className="text-base">Detalle de la sesión</SheetTitle>
          <SheetDescription className="text-xs leading-relaxed">
            Aquí ves paso a paso qué hizo esta persona en tu funnel y de dónde vino (si lo pudimos detectar).
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-4 pb-10">
            <section className="rounded-lg border bg-card p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Identificación</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-muted px-2 py-1 text-[11px]">{detail.sessionId}</code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-[11px]"
                  onClick={() => void navigator.clipboard.writeText(detail.sessionId)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar ID
                </Button>
              </div>
              <div className="mt-3 grid gap-2 text-[11px]">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{sessionSourceShortLabel(detail)}</Badge>
                  {detail.qualified === true && <Badge>Cualificado</Badge>}
                  {detail.qualified === false && <Badge variant="destructive">No cualificado</Badge>}
                  {detail.qualified === null && <Badge variant="secondary">Quiz sin evaluar</Badge>}
                  {detail.hasLead && (
                    <Badge variant="secondary">
                      Lead: {detail.leadResult === "qualified" ? "cualificado" : detail.leadResult === "disqualified" ? "no cualificado" : detail.leadResult || "—"}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Primera acción:{" "}
                  <span className="font-medium text-foreground">
                    {detail.firstSeen ? new Date(detail.firstSeen).toLocaleString("es-ES") : "—"}
                  </span>
                  {" · "}
                  Última acción:{" "}
                  <span className="font-medium text-foreground">
                    {detail.lastSeen ? new Date(detail.lastSeen).toLocaleString("es-ES") : "—"}
                  </span>
                  {" · "}
                  Duración aprox.:{" "}
                  <span className="font-medium text-foreground">{formatDurationMs(detail.firstSeen, detail.lastSeen)}</span>
                </p>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold">¿De dónde vino?</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{attributionNoviceSummary(detail)}</p>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2 gap-y-1 border-t pt-2">
                  <dt className="text-muted-foreground">{helperTooltip("Origen", "Etiqueta principal de la fuente (UTM o derivada del clic/referrer).")}</dt>
                  <dd className="font-medium">{detail.attribution?.resolvedSource || detail.utm.source || "—"}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">{helperTooltip("Medio", "Tipo de tráfico (por ejemplo paid social o referral).")}</dt>
                  <dd className="font-medium">{detail.attribution?.resolvedMedium || detail.utm.medium || "—"}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">{helperTooltip("Variante", "Si la URL tenía ?c=… apunta a una variante publicada.")}</dt>
                  <dd className="font-medium">{detail.campaignName || "—"}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">{helperTooltip("Landing URL", "Primera URL que registramos al entrar.")}</dt>
                  <dd className="break-all font-mono text-[10px]">{detail.attribution?.landing_url || "—"}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">{helperTooltip("Referrer", "Página anterior si el navegador la envió.")}</dt>
                  <dd className="break-all">{detail.attribution?.referrer_host || detail.attribution?.referrer || "—"}</dd>
                </div>
                <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">{helperTooltip("fbclid / gclid", "IDs de clic de anuncios (Meta / Google).")}</dt>
                  <dd className="break-all font-mono text-[10px]">
                    {[detail.attribution?.fbclid && `fbclid: ${detail.attribution.fbclid}`, detail.attribution?.gclid && `gclid: ${detail.attribution.gclid}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold">¿Qué hizo en el funnel?</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Estos pasos son orientativos: marcamos verde cuando detectamos el evento correspondiente.
              </p>
              <ol className="mt-4 space-y-3">
                {stepper.map((s) => (
                  <li key={s.key} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        s.ok ? "bg-green-500/15 text-green-700" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.ok ? "✓" : "…"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.at ? new Date(s.at).toLocaleString("es-ES") : "Aún no registrado"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-muted-foreground">Views</div>
                  <div className="text-lg font-semibold tabular-nums">{detail.pageViews}</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-muted-foreground">Steps</div>
                  <div className="text-lg font-semibold tabular-nums">{detail.stepViews}</div>
                </div>
                <div className="rounded-md bg-muted/40 py-2">
                  <div className="text-muted-foreground">Submit</div>
                  <div className="text-lg font-semibold tabular-nums">{detail.formSubmits}</div>
                </div>
              </div>
            </section>

            {detail.hasLead && (
              <section className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold">¿Es un lead?</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Datos guardados cuando envió el formulario (si tu funnel tiene ese paso).
                </p>
                {leadFormData && Object.keys(leadFormData).length > 0 ? (
                  <ul className="mt-3 space-y-2 text-[11px]">
                    {Object.entries(leadFormData).map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-4 border-b border-border/40 pb-2 last:border-0">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="max-w-[65%] break-words text-right font-medium">{String(v)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">No hay formData en metadata para esta sesión.</p>
                )}
                {answerLabels.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Respuestas del quiz</p>
                    <ul className="mt-2 space-y-2 text-[11px]">
                      {answerLabels.map((a, i) => (
                        <li key={i} className="rounded-md bg-muted/30 px-2 py-1.5">
                          <span className="font-medium">{a.question}</span>
                          <div className="text-muted-foreground">
                            {a.emoji && <span className="mr-1">{a.emoji}</span>}
                            {a.label}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <Collapsible className="rounded-lg border bg-muted/20">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                Timeline técnica (todos los eventos)
                <CaretDown className="h-4 w-4 shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t px-4 pb-4 pt-1">
                <ol className="space-y-3 border-l border-border pl-3">
                  {timelineSorted.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleString("es-ES")}</p>
                      <p className="text-[12px] font-medium">{timelineEventTitle(ev.event_type)}</p>
                      <SessionTimelineEventDetails
                        eventType={ev.event_type}
                        funnelId={ev.funnel_id}
                        metadata={ev.metadata || {}}
                        stepsByFunnelId={stepsByFunnelId}
                      />
                    </li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible className="rounded-lg border">
              <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                Datos técnicos (JSON)
                <CaretDown className="h-4 w-4 shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t px-4 pb-4">
                <p className="py-2 text-[10px] text-muted-foreground">
                  Primera metadata de página + metadata del lead (si existe).
                </p>
                <pre className="max-h-[220px] overflow-auto rounded-md bg-muted p-3 text-[10px] leading-relaxed">
                  {JSON.stringify(
                    {
                      first_page_view_metadata: pageMeta,
                      lead_metadata: detail.hasLead ? leadMetadataRaw : null,
                    },
                    null,
                    2,
                  )}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

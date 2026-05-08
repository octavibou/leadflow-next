"use client";

import type { ReactNode } from "react";
import { Copy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FunnelStep } from "@/types/funnel";
import {
  parseSessionAttribution,
  pickUtmsFromMetadata,
  type SessionUtm,
} from "@/lib/sessionAnalytics";

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-medium break-words text-foreground/95">{value}</span>
    </div>
  );
}

function UtmFieldBlock({ utm }: { utm: SessionUtm }) {
  const rows: { label: string; value: string }[] = [];
  if (utm.source) rows.push({ label: "Origen (UTM)", value: utm.source });
  if (utm.medium) rows.push({ label: "Medio (UTM)", value: utm.medium });
  if (utm.campaign) rows.push({ label: "Campaña (UTM)", value: utm.campaign });
  if (utm.term) rows.push({ label: "Término (UTM)", value: utm.term });
  if (utm.content) rows.push({ label: "Contenido (UTM)", value: utm.content });
  if (rows.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
      {rows.map((r) => (
        <FieldRow key={r.label} label={r.label} value={r.value} />
      ))}
    </div>
  );
}

function CopyIconButton({ text, label }: { text: string; label?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 shrink-0 p-0"
      title={label || "Copiar"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void navigator.clipboard.writeText(text);
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function AttributionFirstTouchBlock({ meta }: { meta: Record<string, unknown> }) {
  const att = parseSessionAttribution(meta);
  if (!att) return null;
  const clickRows: { k: string; label: string; v: string }[] = [];
  if (att.fbclid) clickRows.push({ k: "fb", label: "fbclid", v: att.fbclid });
  if (att.gclid) clickRows.push({ k: "gc", label: "gclid", v: att.gclid });
  if (att.ttclid) clickRows.push({ k: "tt", label: "ttclid", v: att.ttclid });
  if (att.msclkid) clickRows.push({ k: "ms", label: "msclkid", v: att.msclkid });

  return (
    <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
      {(att.resolvedSource || att.resolvedMedium) && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {att.resolvedSource ? <FieldRow label="Origen (derivado)" value={att.resolvedSource} /> : null}
          {att.resolvedMedium ? <FieldRow label="Medio (derivado)" value={att.resolvedMedium} /> : null}
        </div>
      )}
      {att.landing_url ? (
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <FieldRow label="Landing URL" value={att.landing_url} />
          </div>
          <CopyIconButton text={att.landing_url} label="Copiar URL" />
        </div>
      ) : null}
      {att.referrer_host || att.referrer ? (
        <FieldRow label="Referrer" value={att.referrer_host || att.referrer || "—"} />
      ) : null}
      {clickRows.map((r) => (
        <div key={r.k} className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <FieldRow label={r.label} value={r.v} />
          </div>
          <CopyIconButton text={r.v} />
        </div>
      ))}
    </div>
  );
}

export function SessionTimelineEventDetails({
  eventType,
  funnelId,
  metadata,
  stepsByFunnelId,
}: {
  eventType: string;
  funnelId: string;
  metadata: Record<string, unknown>;
  stepsByFunnelId: Map<string, FunnelStep[]>;
}): ReactNode {
  const m = metadata;

  if (eventType === "step_view") {
    const stepId = typeof m.step_id === "string" ? m.step_id : "";
    const answerVal = typeof m.answer === "string" ? m.answer : "";
    const steps = stepsByFunnelId.get(funnelId) || [];
    const step = steps.find((s) => s.id === stepId);
    const q = step?.type === "question" ? step.question : undefined;
    const opt = q?.options.find((o) => o.value === answerVal);
    const questionText = q?.text || "Paso del funnel";
    const answerLabel = opt?.label || answerVal || "—";
    const qualifies = opt ? opt.qualifies : m.qualifies;

    return (
      <div className="mt-1.5 space-y-1.5 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Pregunta" value={questionText} />
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2">
          <span className="text-[10px] text-muted-foreground">Respuesta</span>
          <span className="text-[11px] font-medium text-foreground/95">
            {opt?.emoji && <span className="mr-1">{opt.emoji}</span>}
            {answerLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-2 sm:items-center">
          <span className="text-[10px] text-muted-foreground">Impacto cualificación</span>
          <span>
            {qualifies === true && (
              <Badge variant="secondary" className="text-[9px] font-normal">Cualifica</Badge>
            )}
            {qualifies === false && (
              <Badge variant="destructive" className="text-[9px] font-normal">Descualifica</Badge>
            )}
            {qualifies == null && <span className="text-[11px] text-muted-foreground">—</span>}
          </span>
        </div>
      </div>
    );
  }

  if (eventType === "session_started" || eventType === "page_view") {
    const utm = pickUtmsFromMetadata(m);
    const hasUtm = Object.keys(utm).length > 0;
    const hasAtt = parseSessionAttribution(m) !== null;
    if (!hasUtm && !hasAtt) {
      return (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {eventType === "page_view" ? "Vista de la página de entrada" : "Seguimiento de la visita iniciado"}
        </p>
      );
    }
    return (
      <div className="space-y-1">
        <AttributionFirstTouchBlock meta={m} />
        {hasUtm ? <UtmFieldBlock utm={utm} /> : null}
      </div>
    );
  }

  if (eventType === "qualification_evaluated") {
    const ok = m.qualified === true;
    const no = m.qualified === false;
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow
          label="Resultado del quiz"
          value={ok ? "Cualificado" : no ? "No cualificado" : "—"}
        />
        {typeof m.evaluated_questions === "number" && (
          <FieldRow label="Preguntas evaluadas" value={String(m.evaluated_questions)} />
        )}
      </div>
    );
  }

  if (eventType === "form_submit") {
    return (
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Se enviaron los datos del paso de contacto (creación de lead).
      </p>
    );
  }

  if (eventType === "result_assigned") {
    const r = typeof m.result === "string" ? m.result : "—";
    const steps = stepsByFunnelId.get(funnelId) || [];
    const stepId = typeof m.step_id === "string" ? m.step_id : "";
    const step = steps.find((s) => s.id === stepId);
    const stepName =
      step?.type === "results" && step.resultsConfig
        ? "Pantalla de resultados"
        : step
          ? `Paso (${step.type})`
          : stepId
            ? `Paso ${stepId.slice(0, 8)}…`
            : "—";
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Paso" value={stepName} />
        <FieldRow label="Resultado" value={r} />
      </div>
    );
  }

  if (eventType === "lead_saved") {
    const r = typeof m.result === "string" ? m.result : "—";
    const note = typeof m.note === "string" ? m.note : "";
    return (
      <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-background/50 p-2">
        <FieldRow label="Estado" value={r} />
        {note && <p className="text-[10px] text-muted-foreground">{note}</p>}
      </div>
    );
  }

  const keys = Object.keys(m).filter((k) => k !== "session_id");
  if (keys.length === 0) return null;

  return (
    <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-muted/30 p-2">
      {keys.map((k) => (
        <FieldRow key={k} label={k} value={String(m[k])} />
      ))}
    </div>
  );
}

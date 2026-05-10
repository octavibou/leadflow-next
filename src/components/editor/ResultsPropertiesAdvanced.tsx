import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash, Plus, Eye, Calculator, Rows, Layout } from "@phosphor-icons/react";
import { BarChart } from "lucide-react";
import type { Funnel, FunnelStep, ResultFormula, MetricCard, ResultCtaConfig, CtaAction } from "@/types/funnel";
import { evaluateFormulas, generateSampleContext, interpolate, formatNumber, collectVariables } from "@/lib/resultsEngine";
import { mergeConversionTemplate } from "@/lib/resultsConversionDefaults";
import { suggestedEmojiHintForLegacyKey } from "@/lib/resultsEmojis";
import { appendToken, type FormulaExprToken } from "@/lib/formulaTokens";
import { cn } from "@/lib/utils";
import { FormulaChipEditor } from "@/components/editor/FormulaChipEditor";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

/** Badges en panel estrecho: variables con texto largo deben partir línea, no recortarse. */
const variableBadgeClass =
  "max-w-full min-w-0 whitespace-normal h-auto min-h-5 shrink items-start justify-start gap-1 py-1 text-left break-words overflow-visible";

interface Props {
  step: FunnelStep;
  funnel: Funnel;
  onUpdateStep: (stepId: string, updates: Partial<FunnelStep>) => void;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
    </div>
  );
}

function InterpTokenBar({
  formulaNames,
  variables,
  variableBadgeClass,
  onInsert,
}: {
  formulaNames: string[];
  variables: { name: string; label: string }[];
  variableBadgeClass: string;
  onInsert: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {formulaNames.map((name) => (
        <Badge key={name} variant="default" className="text-[10px] cursor-pointer" onClick={() => onInsert(name)}>
          {name}
        </Badge>
      ))}
      {variables.map((v) => (
        <Badge
          key={v.name}
          variant="outline"
          title={v.label}
          className={cn("text-[10px] cursor-pointer hover:bg-primary/10 transition-colors", variableBadgeClass)}
          onClick={() => onInsert(v.name)}
        >
          {v.label}
        </Badge>
      ))}
    </div>
  );
}

export function ResultsPropertiesAdvanced({ step, funnel, onUpdateStep }: Props) {
  const r = step.resultsConfig!;
  const set = (k: string, v: any) => onUpdateStep(step.id, { resultsConfig: { ...r, [k]: v } });

  const resultType = r.resultType || "roi_calculator";
  const formulas = r.formulas || [];
  const headline = r.headline || "";
  const metricCards = r.metricCards || [];
  const ctaConfig = r.ctaConfig || { action: "next_step" as CtaAction, label: "Continuar", url: "" };
  const pageLayout = r.resultsPageLayout ?? "minimal";

  const pushInterp = (current: string, name: string) => current + `{{${name}}}`;

  // Gather all variables from question options
  const variables = collectVariables(funnel.steps);
  const varNames = variables.map((v) => v.name);
  const formulaNames = formulas.map((f) => f.name);
  const allNames = [...varNames, ...formulaNames];

  const [showPreview, setShowPreview] = useState(false);
  const [activeFormulaId, setActiveFormulaId] = useState<string | null>(null);

  // --- Formulas ---
  const addFormula = () => {
    const f: ResultFormula = { id: crypto.randomUUID(), name: `resultado_${formulas.length + 1}`, expression: "" };
    set("formulas", [...formulas, f]);
    setActiveFormulaId(f.id);
  };
  const updateFormula = (id: string, updates: Partial<ResultFormula>) => {
    set("formulas", formulas.map((f) => f.id === id ? { ...f, ...updates } : f));
  };
  const deleteFormula = (id: string) => set("formulas", formulas.filter((f) => f.id !== id));

  const knownIdentifiersForFormula = (formulaId: string) => {
    const others = formulas.filter((x) => x.id !== formulaId).map((x) => x.name);
    return [...varNames, ...others];
  };

  const insertFormulaToken = (formulaId: string, token: FormulaExprToken) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    updateFormula(formulaId, { expression: appendToken(f.expression, knownIdentifiersForFormula(formulaId), token) });
  };

  // --- Metric Cards ---
  const addMetricCard = () => {
    const card: MetricCard = {
      id: crypto.randomUUID(),
      label: "Métrica",
      valueSource: "",
      suffix: "",
      description: "",
      accent: "primary",
      checklist: [],
      footerHighlight: "",
      cardIconEmoji: "",
      footerHighlightEmoji: "",
    };
    set("metricCards", [...metricCards, card]);
  };
  const updateMetricCard = (id: string, updates: Partial<MetricCard>) => {
    set("metricCards", metricCards.map((c) => c.id === id ? { ...c, ...updates } : c));
  };
  const deleteMetricCard = (id: string) => set("metricCards", metricCards.filter((c) => c.id !== id));

  // --- CTA ---
  const setCta = (updates: Partial<ResultCtaConfig>) => set("ctaConfig", { ...ctaConfig, ...updates });

  // --- Preview ---
  const previewCtx = (() => {
    if (!showPreview) return {};
    const sampleVars = generateSampleContext(funnel.steps);
    return evaluateFormulas(formulas, sampleVars);
  })();

  return (
    <div className="space-y-4">
      {/* Type Selector */}
      <div>
        <Label className="text-xs mb-1.5 block">Tipo de resultado</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => set("resultType", "roi_calculator")}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-colors ${resultType === "roi_calculator" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <Calculator className="h-4 w-4" />
            <span className="font-medium">ROI Calculator</span>
          </button>
          <button
            onClick={() => set("resultType", "score")}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs transition-colors ${resultType === "score" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <BarChart className="h-4 w-4" />
            <span className="font-medium">Score</span>
          </button>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs mb-1.5 block">Plantilla de página</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set("resultsPageLayout", "minimal")}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors ${pageLayout === "minimal" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <Layout className="h-4 w-4" />
            <span className="font-medium">Minimal</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateStep(step.id, { resultsConfig: mergeConversionTemplate(r) })}
            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs transition-colors ${pageLayout === "conversion" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <Rows className="h-4 w-4" />
            <span className="font-medium">Conversión</span>
          </button>
        </div>
        {pageLayout === "conversion" && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Rellena fórmulas y variables enlazadas a las tarjetas. Primera vez: se cargan textos de ejemplo editables.
          </p>
        )}
      </div>

      <Separator />

      {/* Variables info */}
      <div>
        <Label className="text-xs mb-1.5 block">Variables disponibles</Label>
        {variables.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Asigna un nombre de variable a tus respuestas en sus propiedades.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {variables.map((v) => (
              <Badge
                key={v.name}
                variant="secondary"
                title={`${v.label} (${v.name})`}
                className={cn("text-[10px]", variableBadgeClass)}
              >
                <span>{v.label}</span>
                <span className="text-muted-foreground font-mono shrink-0">({v.name})</span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Formulas */}
      <div>
        <Label className="text-xs mb-2 block font-semibold">Fórmulas</Label>
        <div className="space-y-3">
          {formulas.map((f) => {
            const isActive = activeFormulaId === f.id;
            return (
              <div key={f.id} className={`border rounded-lg p-3 space-y-2 transition-colors ${isActive ? "border-primary" : ""}`}>
                <div className="flex items-center gap-2">
                  <Input
                    className="h-7 text-sm flex-1 font-mono"
                    value={f.name}
                    onChange={(e) => updateFormula(f.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                    placeholder="nombre_resultado"
                  />
                  <span className="text-muted-foreground text-xs">=</span>
                  <button onClick={() => deleteFormula(f.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>

                <FormulaChipEditor
                  value={f.expression}
                  onChange={(expr) => updateFormula(f.id, { expression: expr })}
                  variables={variables}
                  formulaNames={formulas.filter((x) => x.id !== f.id).map((x) => x.name)}
                  onFocus={() => setActiveFormulaId(f.id)}
                />

                {/* Clickable variable + operator chips */}
                {isActive && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {variables.map((v) => (
                        <Badge
                          key={v.name}
                          variant="outline"
                          title={v.label}
                          className={cn("text-[10px] cursor-pointer hover:bg-primary/10 transition-colors", variableBadgeClass)}
                          onClick={() => insertFormulaToken(f.id, { type: "ident", name: v.name })}
                        >
                          {v.label}
                        </Badge>
                      ))}
                      {formulaNames.filter((n) => n !== f.name).map((name) => (
                        <Badge
                          key={name}
                          variant="default"
                          className="text-[10px] font-mono cursor-pointer"
                          onClick={() => insertFormulaToken(f.id, { type: "ident", name })}
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {(
                        [
                          ["+", "+"],
                          ["−", "-"],
                          ["×", "*"],
                          ["÷", "/"],
                          ["(", "("],
                          [")", ")"],
                        ] as const
                      ).map(([label, op]) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => insertFormulaToken(f.id, { type: "op", op })}
                          className="h-7 w-8 rounded border text-xs font-semibold hover:bg-accent transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={addFormula} className="w-full mt-2">
          <Plus className="h-4 w-4 mr-1" /> Añadir fórmula
        </Button>
      </div>

      <Separator />

      {pageLayout === "minimal" && (
        <div>
          <Label className="text-xs mb-1.5 block">Headline dinámico</Label>
          <textarea
            className="min-h-[50px] w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Estás perdiendo €/mes"
          />
          <InterpTokenBar
            formulaNames={formulaNames}
            variables={variables}
            variableBadgeClass={variableBadgeClass}
            onInsert={(name) => set("headline", pushInterp(headline, name))}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Pulsa en un resultado o variable para insertarlo</p>
        </div>
      )}

      {pageLayout === "conversion" && (
        <details open className="rounded-lg border text-xs">
          <summary className="cursor-pointer px-3 py-2 font-semibold">Contenido plantilla conversión</summary>
          <div className="space-y-4 border-t p-3">
            <div>
              <Label className="mb-1.5 block text-[11px]">Título — parte oscura</Label>
              <Textarea
                className="min-h-[52px] text-xs"
                value={r.headlineLead || ""}
                onChange={(e) => set("headlineLead", e.target.value)}
                placeholder="Según tus respuestas..."
              />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("headlineLead", pushInterp(r.headlineLead || "", name))}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-[11px]">Título — parte destacada (color primario)</Label>
              <Textarea
                className="min-h-[52px] text-xs"
                value={r.headlineEmphasis || ""}
                onChange={(e) => set("headlineEmphasis", e.target.value)}
              />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("headlineEmphasis", pushInterp(r.headlineEmphasis || "", name))}
              />
            </div>
            <Field
              label="Subtítulo bajo el título"
              value={r.resultsSubheadline || ""}
              onChange={(v) => set("resultsSubheadline", v)}
            />
            <InterpTokenBar
              formulaNames={formulaNames}
              variables={variables}
              variableBadgeClass={variableBadgeClass}
              onInsert={(name) => set("resultsSubheadline", pushInterp(r.resultsSubheadline || "", name))}
            />
            <Field
              label="Emoji cabecera (sin logo)"
              value={r.conversionHeaderEmoji || ""}
              onChange={(v) => set("conversionHeaderEmoji", v)}
              placeholder="📊"
            />
            <p className="text-[10px] text-muted-foreground">
              Solo si no hay logo en ajustes del funnel: aparece este emoji arriba a la izquierda. Vacío → 📊.
            </p>

            <Separator />
            <p className="font-semibold text-[11px] text-foreground">Emojis globales (mismo tamaño en pantalla)</p>
            <p className="text-[10px] text-muted-foreground">
              Todos usan una cuadrícula uniforme para que ninguno se vea enorme junto al resto.
            </p>
            <Field label="Emoji callout (derecha)" value={r.calloutEmoji || ""} onChange={(v) => set("calloutEmoji", v)} placeholder="🎁" />
            <Field
              label="Emoji viñeta checklist (tarjetas métrica)"
              value={r.metricChecklistBulletEmoji || ""}
              onChange={(v) => set("metricChecklistBulletEmoji", v)}
              placeholder="✅"
            />
            <Field label="Emoji grande bloque dolor" value={r.painHeroEmoji || ""} onChange={(v) => set("painHeroEmoji", v)} placeholder="😟" />
            <Field label="Emoji lista de dolores" value={r.painBulletEmoji || ""} onChange={(v) => set("painBulletEmoji", v)} placeholder="❌" />
            <Field
              label="Emoji aviso (&quot;Y lo peor&quot;)"
              value={r.painWarningEmoji || ""}
              onChange={(v) => set("painWarningEmoji", v)}
              placeholder="⚠️"
            />
            <Field
              label="Emoji solución (sin imagen URL)"
              value={r.solutionPlaceholderEmoji || ""}
              onChange={(v) => set("solutionPlaceholderEmoji", v)}
              placeholder="🤖"
            />

            <div>
              <Label className="mb-1 block text-[11px]">Caja lateral (callout)</Label>
              <Textarea className="min-h-[48px] text-xs" value={r.calloutText || ""} onChange={(e) => set("calloutText", e.target.value)} />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("calloutText", pushInterp(r.calloutText || "", name))}
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground">El emoji del círculo lo eliges arriba en «Emoji callout».</p>
            </div>

            <Separator />

            <p className="font-semibold text-[11px] text-foreground">Coste de no actuar</p>
            <Field label="Titular sección" value={r.painTitle || ""} onChange={(v) => set("painTitle", v)} />
            <InterpTokenBar
              formulaNames={formulaNames}
              variables={variables}
              variableBadgeClass={variableBadgeClass}
              onInsert={(name) => set("painTitle", pushInterp(r.painTitle || "", name))}
            />
            <div>
              <Label className="mb-1 block text-[11px]">Lista de dolores</Label>
              <div className="space-y-1.5">
                {(r.painBullets || []).map((line, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      className="h-8 text-xs"
                      value={line}
                      onChange={(e) => {
                        const next = [...(r.painBullets || [])];
                        next[idx] = e.target.value;
                        set("painBullets", next);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0 px-2"
                      onClick={() => set("painBullets", (r.painBullets || []).filter((_, i) => i !== idx))}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => set("painBullets", [...(r.painBullets || []), "Nuevo punto"])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Añadir bullet
                </Button>
              </div>
            </div>
            <Field label="Aside — titular (&quot;Y lo peor:&quot;)" value={r.painAsideTitle || ""} onChange={(v) => set("painAsideTitle", v)} />
            <div>
              <Label className="mb-1 block text-[11px]">Aside — texto</Label>
              <Textarea className="min-h-[52px] text-xs" value={r.painAsideBody || ""} onChange={(e) => set("painAsideBody", e.target.value)} />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("painAsideBody", pushInterp(r.painAsideBody || "", name))}
              />
            </div>

            <Separator />

            <p className="font-semibold text-[11px] text-foreground">Bloque solución</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
              <div className="min-w-0">
                <Label className="text-[11px] font-medium leading-tight">Mostrar imagen o robot</Label>
                <p className="text-[10px] text-muted-foreground">Desactiva para ocultar la ilustración y dejar solo texto e iconos.</p>
              </div>
              <Switch
                size="sm"
                checked={r.solutionShowVisual !== false}
                onCheckedChange={(on) => set("solutionShowVisual", on ? true : false)}
                aria-label="Mostrar imagen o robot en bloque solución"
              />
            </div>
            <Field label="Titular" value={r.solutionTitle || ""} onChange={(v) => set("solutionTitle", v)} />
            <div>
              <Label className="mb-1 block text-[11px]">Párrafo</Label>
              <Textarea className="min-h-[56px] text-xs" value={r.solutionBody || ""} onChange={(e) => set("solutionBody", e.target.value)} />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("solutionBody", pushInterp(r.solutionBody || "", name))}
              />
            </div>
            <Field
              label="URL imagen (opcional)"
              value={r.solutionImageUrl || ""}
              onChange={(v) => set("solutionImageUrl", v)}
              placeholder="https://..."
            />
            <div>
              <Label className="mb-1 block text-[11px]">Emoji + beneficio</Label>
              {(r.solutionFeatures || []).map((f) => (
                <div key={f.id} className="mb-2 flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
                  <div>
                    <Label className="text-[10px]">Emoji</Label>
                    <Input
                      className="mt-1 h-8 font-mono text-lg"
                      value={f.emoji ?? ""}
                      onChange={(e) =>
                        set(
                          "solutionFeatures",
                          (r.solutionFeatures || []).map((x) =>
                            x.id === f.id ? { ...x, emoji: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder={suggestedEmojiHintForLegacyKey(f.iconKey) || "📞"}
                    />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    value={f.label}
                    onChange={(e) =>
                      set(
                        "solutionFeatures",
                        (r.solutionFeatures || []).map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => set("solutionFeatures", (r.solutionFeatures || []).filter((x) => x.id !== f.id))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() =>
                  set("solutionFeatures", [
                    ...(r.solutionFeatures || []),
                    { id: crypto.randomUUID(), emoji: "✨", label: "Etiqueta" },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Añadir beneficio
              </Button>
            </div>

            <Separator />

            <p className="font-semibold text-[11px] text-foreground">Cierre</p>
            <div>
              <Label className="mb-1 block text-[11px]">Señales de confianza</Label>
              {(r.trustSignals || []).map((t) => (
                <div key={t.id} className="mb-2 flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
                  <div>
                    <Label className="text-[10px]">Emoji</Label>
                    <Input
                      className="mt-1 h-8 font-mono text-lg"
                      value={t.emoji ?? ""}
                      onChange={(e) =>
                        set(
                          "trustSignals",
                          (r.trustSignals || []).map((x) =>
                            x.id === t.id ? { ...x, emoji: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder={suggestedEmojiHintForLegacyKey(t.iconKey) || "🎁"}
                    />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    value={t.label}
                    onChange={(e) =>
                      set(
                        "trustSignals",
                        (r.trustSignals || []).map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => set("trustSignals", (r.trustSignals || []).filter((x) => x.id !== t.id))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={() =>
                  set("trustSignals", [
                    ...(r.trustSignals || []),
                    { id: crypto.randomUUID(), emoji: "🎁", label: "Texto" },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Añadir señal
              </Button>
            </div>
            <Field label="Cita — parte normal" value={r.closingQuoteLead || ""} onChange={(v) => set("closingQuoteLead", v)} />
            <InterpTokenBar
              formulaNames={formulaNames}
              variables={variables}
              variableBadgeClass={variableBadgeClass}
              onInsert={(name) => set("closingQuoteLead", pushInterp(r.closingQuoteLead || "", name))}
            />
            <Field label="Cita — parte destacada" value={r.closingQuoteAccent || ""} onChange={(v) => set("closingQuoteAccent", v)} />
            <InterpTokenBar
              formulaNames={formulaNames}
              variables={variables}
              variableBadgeClass={variableBadgeClass}
              onInsert={(name) => set("closingQuoteAccent", pushInterp(r.closingQuoteAccent || "", name))}
            />

            <div>
              <Label className="mb-1 block text-[11px]">Headline único (alternativa)</Label>
              <Textarea
                className="min-h-[40px] text-xs"
                value={headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="Si dejas vacíos título oscuro/claro arriba, se usa este"
              />
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) => set("headline", pushInterp(headline, name))}
              />
            </div>
          </div>
        </details>
      )}

      <Separator />

      {/* Metric Cards */}
      <div>
        <Label className="text-xs mb-2 block font-semibold">Tarjetas de métricas</Label>
        {metricCards.map((card) => (
          <div key={card.id} className="mb-2 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                className="h-7 flex-1 text-sm"
                value={card.label}
                onChange={(e) => updateMetricCard(card.id, { label: e.target.value })}
                placeholder="Título tarjeta"
              />
              <button type="button" onClick={() => deleteMetricCard(card.id)} className="text-muted-foreground hover:text-destructive">
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Acento (plantilla conversión)</Label>
                <select
                  className="h-7 w-full rounded border bg-background px-2 text-xs"
                  value={card.accent || "primary"}
                  onChange={(e) =>
                    updateMetricCard(card.id, {
                      accent: e.target.value as MetricCard["accent"],
                    })
                  }
                >
                  <option value="primary">Primario (azul)</option>
                  <option value="success">Éxito (verde)</option>
                  <option value="neutral">Neutro</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Emoji tarjeta</Label>
                <Input
                  className="h-8 font-mono text-lg"
                  value={card.cardIconEmoji ?? ""}
                  onChange={(e) => updateMetricCard(card.id, { cardIconEmoji: e.target.value })}
                  placeholder={suggestedEmojiHintForLegacyKey(card.cardIconKey) || "📊"}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-[10px]">Variable/Fórmula valor</Label>
                <select
                  className="h-7 w-full rounded border bg-background px-2 text-xs"
                  value={card.valueSource}
                  onChange={(e) => updateMetricCard(card.id, { valueSource: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  {allNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-[10px]">Sufijo (tras el número)</Label>
                <Input
                  className="h-7 text-xs"
                  value={card.suffix}
                  onChange={(e) => updateMetricCard(card.id, { suffix: e.target.value })}
                  placeholder="horas liberadas"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Checklist beneficio</Label>
              <div className="mt-1 space-y-1">
                {(card.checklist || []).map((line, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      className="h-8 text-xs"
                      value={line}
                      onChange={(e) => {
                        const next = [...(card.checklist || [])];
                        next[idx] = e.target.value;
                        updateMetricCard(card.id, { checklist: next });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      onClick={() =>
                        updateMetricCard(card.id, {
                          checklist: (card.checklist || []).filter((_, i) => i !== idx),
                        })
                      }
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <InterpTokenBar
                  formulaNames={formulaNames}
                  variables={variables}
                  variableBadgeClass={variableBadgeClass}
                  onInsert={(name) => {
                    const cl = [...(card.checklist || [])];
                    cl.push(`{{${name}}}`);
                    updateMetricCard(card.id, { checklist: cl });
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 h-7 w-full text-[10px]"
                  onClick={() =>
                    updateMetricCard(card.id, { checklist: [...(card.checklist || []), "Nuevo beneficio"] })
                  }
                >
                  <Plus className="mr-1 h-3 w-3.5" /> Añadir ítem checklist
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Pie de tarjeta (caja inferior)</Label>
              <Textarea
                className="mt-1 min-h-[44px] text-xs"
                value={card.footerHighlight || ""}
                onChange={(e) => updateMetricCard(card.id, { footerHighlight: e.target.value })}
              />
              <div className="mt-1">
                <Label className="text-[10px]">Emoji pie de tarjeta</Label>
                <Input
                  className="mt-1 h-8 font-mono text-lg"
                  value={card.footerHighlightEmoji ?? ""}
                  onChange={(e) => updateMetricCard(card.id, { footerHighlightEmoji: e.target.value })}
                  placeholder={suggestedEmojiHintForLegacyKey(card.footerHighlightIconKey) || "📌"}
                />
              </div>
              <InterpTokenBar
                formulaNames={formulaNames}
                variables={variables}
                variableBadgeClass={variableBadgeClass}
                onInsert={(name) =>
                  updateMetricCard(card.id, {
                    footerHighlight: pushInterp(card.footerHighlight || "", name),
                  })
                }
              />
            </div>
            <Input
              className="h-7 text-xs"
              value={card.description ?? ""}
              onChange={(e) => updateMetricCard(card.id, { description: e.target.value })}
              placeholder="Descripción extra (minimal)"
            />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addMetricCard} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Añadir tarjeta
        </Button>
      </div>

      <Separator />

      {/* CTA */}
      <div>
        <Label className="text-xs mb-1.5 block font-semibold">CTA</Label>
        <div className="space-y-2">
          <select className="w-full h-9 border rounded-md px-3 text-sm bg-background" value={ctaConfig.action} onChange={(e) => setCta({ action: e.target.value as CtaAction })}>
            <option value="next_step">Ir a siguiente paso</option>
            <option value="redirect">Redirección (URL)</option>
            <option value="booking">Abrir booking</option>
            <option value="webhook">Enviar webhook</option>
          </select>
          <Field label="Texto del botón" value={ctaConfig.label} onChange={(v) => setCta({ label: v })} />
          {(ctaConfig.action === "redirect" || ctaConfig.action === "webhook") && (
            <Field label="URL" value={ctaConfig.url} onChange={(v) => setCta({ url: v })} placeholder="https://..." />
          )}
        </div>
      </div>

      <Separator />

      {/* Legacy text config */}
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer">Textos de calificación</summary>
        <div className="space-y-2 mt-2">
          <Field label="Título calificado" value={r.qualifiedHeadline} onChange={(v) => onUpdateStep(step.id, { resultsConfig: { ...r, qualifiedHeadline: v } })} />
          <Field label="CTA calificado" value={r.qualifiedCta} onChange={(v) => onUpdateStep(step.id, { resultsConfig: { ...r, qualifiedCta: v } })} />
          <Field label="Título descalificado" value={r.disqualifiedHeadline} onChange={(v) => onUpdateStep(step.id, { resultsConfig: { ...r, disqualifiedHeadline: v } })} />
          <Field label="CTA descalificado" value={r.disqualifiedCta} onChange={(v) => onUpdateStep(step.id, { resultsConfig: { ...r, disqualifiedCta: v } })} />
        </div>
      </details>

      <Separator />

      {/* Preview */}
      <Button size="sm" variant={showPreview ? "default" : "outline"} onClick={() => setShowPreview(!showPreview)} className="w-full">
        <Eye className="h-4 w-4 mr-1" /> {showPreview ? "Ocultar preview" : "Previsualizar resultados"}
      </Button>

      {showPreview && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <p className="text-[10px] text-muted-foreground">Simulación con valores de ejemplo:</p>
          {pageLayout === "conversion" && (r.headlineLead || r.headlineEmphasis) ? (
            <h3 className="text-sm font-bold leading-snug">
              {r.headlineLead ? <span>{interpolate(r.headlineLead, previewCtx)}</span> : null}
              {r.headlineEmphasis ? <span className="text-primary"> {interpolate(r.headlineEmphasis, previewCtx)}</span> : null}
            </h3>
          ) : (
            headline && <h3 className="font-bold text-sm">{interpolate(headline, previewCtx)}</h3>
          )}
          {pageLayout === "conversion" && r.resultsSubheadline ? (
            <p className="text-[11px] text-muted-foreground">{interpolate(r.resultsSubheadline, previewCtx)}</p>
          ) : null}
          {metricCards.map((card) => (
            <div key={card.id} className="bg-background rounded-lg p-3 border">
              <div className="text-[10px] text-muted-foreground">{card.label}</div>
              <div className="text-lg font-bold">
                {card.valueSource && previewCtx[card.valueSource] !== undefined ? formatNumber(previewCtx[card.valueSource]) : "—"}
                {card.suffix}
              </div>
              {card.description ? <div className="text-[10px] text-muted-foreground mt-1">{interpolate(card.description, previewCtx)}</div> : null}
              {(card.checklist?.length ?? 0) > 0 ? (
                <ul className="mt-2 list-inside list-disc text-[10px] text-muted-foreground">
                  {card.checklist!.map((line, i) => (
                    <li key={i}>{interpolate(line, previewCtx)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <Separator />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold">Contexto:</p>
            {Object.entries(previewCtx).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px] font-mono">
                <span>{k}</span><span>{formatNumber(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

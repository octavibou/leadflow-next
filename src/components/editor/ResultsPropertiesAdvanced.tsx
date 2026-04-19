import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash, Plus, Eye, Calculator, BarChart } from "@phosphor-icons/react";
import type { Funnel, FunnelStep, ResultFormula, MetricCard, ResultCtaConfig, CtaAction } from "@/types/funnel";
import { evaluateFormulas, generateSampleContext, interpolate, formatNumber, collectVariables } from "@/lib/resultsEngine";

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

export function ResultsPropertiesAdvanced({ step, funnel, onUpdateStep }: Props) {
  const r = step.resultsConfig!;
  const set = (k: string, v: any) => onUpdateStep(step.id, { resultsConfig: { ...r, [k]: v } });

  const resultType = r.resultType || "roi_calculator";
  const formulas = r.formulas || [];
  const headline = r.headline || "";
  const metricCards = r.metricCards || [];
  const ctaConfig = r.ctaConfig || { action: "next_step" as CtaAction, label: "Continuar", url: "" };

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

  const insertIntoFormula = (formulaId: string, text: string) => {
    const f = formulas.find((f) => f.id === formulaId);
    if (!f) return;
    updateFormula(formulaId, { expression: f.expression + text });
  };

  // --- Metric Cards ---
  const addMetricCard = () => {
    const card: MetricCard = { id: crypto.randomUUID(), label: "Métrica", valueSource: "", suffix: "", description: "" };
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

      {/* Variables info */}
      <div>
        <Label className="text-xs mb-1.5 block">Variables disponibles</Label>
        {variables.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Asigna un nombre de variable a tus respuestas en sus propiedades.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {variables.map((v) => (
              <Badge key={v.name} variant="secondary" className="text-[10px]">
                <span>{v.label}</span>
                <span className="text-muted-foreground font-mono ml-1">({v.name})</span>
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

                {/* Formula input - large field */}
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background min-h-[60px]"
                  value={f.expression}
                  onChange={(e) => updateFormula(f.id, { expression: e.target.value })}
                  onFocus={() => setActiveFormulaId(f.id)}
                  placeholder="Haz clic en las variables y operadores abajo"
                />

                {/* Clickable variable + operator chips */}
                {isActive && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {variables.map((v) => (
                        <Badge
                          key={v.name}
                          variant="outline"
                          className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => insertIntoFormula(f.id, ` ${v.name} `)}
                        >
                          {v.label}
                        </Badge>
                      ))}
                      {formulaNames.filter((n) => n !== f.name).map((name) => (
                        <Badge
                          key={name}
                          variant="default"
                          className="text-[10px] font-mono cursor-pointer"
                          onClick={() => insertIntoFormula(f.id, ` ${name} `)}
                        >
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {["+", "-", "*", "/", "(", ")"].map((op) => (
                        <button
                          key={op}
                          onClick={() => insertIntoFormula(f.id, ` ${op} `)}
                          className="h-7 w-8 rounded border text-xs font-mono font-bold hover:bg-accent transition-colors"
                        >
                          {op}
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

      {/* Headline */}
      <div>
        <Label className="text-xs mb-1.5 block">Headline dinámico</Label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background min-h-[50px]"
          value={headline}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="Estás perdiendo €/mes"
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {formulaNames.map((name) => (
            <Badge
              key={name}
              variant="default"
              className="text-[10px] cursor-pointer"
              onClick={() => set("headline", headline + `{{${name}}}`)}
            >
              {name}
            </Badge>
          ))}
          {variables.map((v) => (
            <Badge
              key={v.name}
              variant="outline"
              className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => set("headline", headline + `{{${v.name}}}`)}
            >
              {v.label.substring(0, 25)}{v.label.length > 25 ? "…" : ""}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Pulsa en un resultado o variable para insertarlo</p>
      </div>

      <Separator />

      {/* Metric Cards */}
      <div>
        <Label className="text-xs mb-2 block font-semibold">Tarjetas de métricas</Label>
        {metricCards.map((card) => (
          <div key={card.id} className="border rounded-lg p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <Input className="h-7 text-sm flex-1" value={card.label} onChange={(e) => updateMetricCard(card.id, { label: e.target.value })} placeholder="Label" />
              <button onClick={() => deleteMetricCard(card.id)} className="ml-2 text-muted-foreground hover:text-destructive"><Trash className="h-3.5 w-3.5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Variable/Fórmula</Label>
                <select className="w-full h-7 border rounded text-xs px-2 bg-background" value={card.valueSource} onChange={(e) => updateMetricCard(card.id, { valueSource: e.target.value })}>
                  <option value="">Seleccionar</option>
                  {allNames.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Sufijo</Label>
                <Input className="h-7 text-xs" value={card.suffix} onChange={(e) => updateMetricCard(card.id, { suffix: e.target.value })} placeholder="€, %, h" />
              </div>
            </div>
            <Input className="h-7 text-xs" value={card.description} onChange={(e) => updateMetricCard(card.id, { description: e.target.value })} placeholder="Descripción" />
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
          {headline && <h3 className="font-bold text-sm">{interpolate(headline, previewCtx)}</h3>}
          {metricCards.map((card) => (
            <div key={card.id} className="bg-background rounded-lg p-3 border">
              <div className="text-[10px] text-muted-foreground">{card.label}</div>
              <div className="text-lg font-bold">
                {card.valueSource && previewCtx[card.valueSource] !== undefined ? formatNumber(previewCtx[card.valueSource]) : "—"}{card.suffix}
              </div>
              {card.description && <div className="text-[10px] text-muted-foreground mt-1">{card.description}</div>}
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

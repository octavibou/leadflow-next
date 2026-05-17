import type { ResultFormula, FunnelStep } from "@/types/funnel";

/**
 * Results engine.
 * Each question has ONE variable name (question.variableName).
 * The value comes from the selected option's numericValue.
 */

export function resolveVariablesFromAnswers(
  steps: FunnelStep[],
  answers: Record<string, string> // stepId → optionValue
): Record<string, number> {
  const ctx: Record<string, number> = {};

  for (const step of steps) {
    if (step.type !== "question" || !step.question?.variableName) continue;
    const varName = step.question.variableName;
    const answerValue = answers[step.id];
    if (!answerValue) { ctx[varName] = 0; continue; }

    const opt = step.question.options.find((o) => o.value === answerValue);
    ctx[varName] = opt?.numericValue ?? 0;
  }

  return ctx;
}

export function evaluateFormulas(
  formulas: ResultFormula[],
  variables: Record<string, number>
): Record<string, number> {
  const ctx = { ...variables };

  for (const f of formulas) {
    try {
      let expr = f.expression;
      const names = Object.keys(ctx).sort((a, b) => b.length - a.length);
      for (const name of names) {
        expr = expr.replace(new RegExp(`\\b${escapeRegex(name)}\\b`, "g"), String(ctx[name]));
      }
      if (/^[\d\s+\-*/().]+$/.test(expr)) {
        const result = Function(`"use strict"; return (${expr})`)();
        ctx[f.name] = typeof result === "number" && isFinite(result) ? result : 0;
      } else {
        ctx[f.name] = 0;
      }
    } catch {
      ctx[f.name] = 0;
    }
  }

  return ctx;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function interpolate(template: string, ctx: Record<string, number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const val = ctx[name];
    if (val === undefined) return `{{${name}}}`;
    return formatNumber(val);
  });
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("es-ES");
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function computeResults(
  formulas: ResultFormula[],
  answers: Record<string, string>,
  steps: FunnelStep[]
): Record<string, number> {
  const resolved = resolveVariablesFromAnswers(steps, answers);
  return evaluateFormulas(formulas, resolved);
}

/** Collect variables: one per question that has a variableName, label = question text */
export function collectVariables(steps: FunnelStep[]): { name: string; label: string }[] {
  const result: { name: string; label: string }[] = [];
  for (const step of steps) {
    if (step.type !== "question" || !step.question?.variableName) continue;
    result.push({ name: step.question.variableName, label: step.question.text });
  }
  return result;
}

/** Generate sample context for preview */
export function generateSampleContext(steps: FunnelStep[]): Record<string, number> {
  const ctx: Record<string, number> = {};
  for (const step of steps) {
    if (step.type !== "question" || !step.question?.variableName) continue;
    const opts = step.question.options;
    const midOpt = opts[Math.floor(opts.length / 2)];
    ctx[step.question.variableName] = midOpt?.numericValue ?? 10;
  }
  return ctx;
}

/** Respuestas de ejemplo (valor de opción central) por `step.id` para preview / plugins. */
export function generateSampleAnswers(steps: FunnelStep[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const step of steps) {
    if (step.type !== "question" || !step.question?.options?.length) continue;
    const opts = step.question.options;
    const mid = opts[Math.floor(opts.length / 2)];
    if (mid) out[step.id] = mid.value;
  }
  return out;
}

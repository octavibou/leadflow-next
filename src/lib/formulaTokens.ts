/**
 * Tokenización visual para fórmulas de resultados (misma sintaxis que evaluateFormulas).
 * Identificadores conocidos deben pasarse ordenados por longitud descendente (ya aplicado aquí).
 */

export type FormulaExprToken =
  | { type: "ident"; name: string }
  | { type: "number"; raw: string }
  | { type: "op"; op: "(" | ")" | "+" | "-" | "*" | "/" };

function sortIdentifiersLongestFirst(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort((a, b) => b.length - a.length);
}

function isWordChar(c: string): boolean {
  return /[A-Za-z0-9_]/.test(c);
}

/** Menos unario solo al inicio o tras ( u operador; no tras ) ni identificador (p. ej. `a - 5`). */
function isUnaryMinusContext(s: string, i: number): boolean {
  if (s[i] !== "-") return false;
  let j = i - 1;
  while (j >= 0 && /\s/.test(s[j])) j--;
  if (j < 0) return true;
  const c = s[j];
  return "([+-*/".includes(c);
}

/** Lee un número (decimales; menos solo en contexto unario). */
function readNumber(s: string, i: number): { raw: string; next: number } | null {
  let pos = i;
  if (s[pos] === "-") {
    if (!isUnaryMinusContext(s, pos)) return null;
    if (pos + 1 >= s.length) return null;
    if (!/\d/.test(s[pos + 1]) && s[pos + 1] !== ".") return null;
    pos++;
  }

  const start = i;
  if (pos >= s.length) return null;

  if (s[pos] === ".") {
    if (pos + 1 >= s.length || !/\d/.test(s[pos + 1])) return null;
    pos++;
    while (pos < s.length && /\d/.test(s[pos])) pos++;
    return { raw: s.slice(start, pos), next: pos };
  }

  if (!/\d/.test(s[pos])) return null;
  while (pos < s.length && /\d/.test(s[pos])) pos++;
  if (pos < s.length && s[pos] === ".") {
    pos++;
    while (pos < s.length && /\d/.test(s[pos])) pos++;
  }
  return { raw: s.slice(start, pos), next: pos };
}

/**
 * Convierte la expresión guardada en tokens para mostrar como chips.
 */
export function tokenizeFormulaExpression(expression: string, knownIdentifiers: string[]): FormulaExprToken[] {
  const sorted = sortIdentifiersLongestFirst(knownIdentifiers);
  const s = expression.trim();
  if (!s) return [];

  let i = 0;
  const out: FormulaExprToken[] = [];

  const skipWs = (): void => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };

  while (i < s.length) {
    skipWs();
    if (i >= s.length) break;

    const num = readNumber(s, i);
    if (num) {
      out.push({ type: "number", raw: num.raw });
      i = num.next;
      continue;
    }

    let matched = false;
    const before = i > 0 ? s[i - 1] : "";
    for (const id of sorted) {
      if (s.slice(i, i + id.length) !== id) continue;
      const after = i + id.length < s.length ? s[i + id.length] : "";
      if (isWordChar(before)) continue;
      if (isWordChar(after)) continue;
      out.push({ type: "ident", name: id });
      i += id.length;
      matched = true;
      break;
    }
    if (matched) continue;

    const ch = s[i];
    if (ch === "(" || ch === ")" || ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      out.push({ type: "op", op: ch });
      i++;
      continue;
    }

    if (isWordChar(ch)) {
      let start = i;
      while (i < s.length && isWordChar(s[i])) i++;
      out.push({ type: "ident", name: s.slice(start, i) });
      continue;
    }

    i++;
  }

  return out;
}

export function expressionFromTokens(tokens: FormulaExprToken[]): string {
  const parts: string[] = [];
  for (const t of tokens) {
    if (t.type === "ident") parts.push(t.name);
    else if (t.type === "number") parts.push(t.raw);
    else if (t.type === "op") parts.push(t.op);
  }
  return parts.join(" ");
}

export function appendToken(
  expression: string,
  knownIdentifiers: string[],
  token: FormulaExprToken
): string {
  const cur = tokenizeFormulaExpression(expression, knownIdentifiers);
  return expressionFromTokens([...cur, token]);
}

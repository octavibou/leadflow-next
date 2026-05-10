import { useMemo, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  tokenizeFormulaExpression,
  expressionFromTokens,
  appendToken,
  type FormulaExprToken,
} from "@/lib/formulaTokens";

const OP_DISPLAY: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
  "(": "(",
  ")": ")",
};

const variableBadgeClass =
  "max-w-full min-w-0 whitespace-normal h-auto min-h-5 shrink items-start justify-start gap-1 py-1 text-left break-words overflow-visible";

interface Props {
  value: string;
  onChange: (expression: string) => void;
  /** Variables de preguntas (nombre → etiqueta legible). */
  variables: { name: string; label: string }[];
  /** Nombres de otras fórmulas referenciables (excl. la actual). */
  formulaNames: string[];
  onFocus?: () => void;
}

export function FormulaChipEditor({ value, onChange, variables, formulaNames, onFocus }: Props) {
  const labelByName = useMemo(() => Object.fromEntries(variables.map((v) => [v.name, v.label])), [variables]);
  const formulaSet = useMemo(() => new Set(formulaNames), [formulaNames]);

  const knownIdentifiers = useMemo(
    () => [...variables.map((v) => v.name), ...formulaNames],
    [variables, formulaNames]
  );

  const tokens = useMemo(
    () => tokenizeFormulaExpression(value, knownIdentifiers),
    [value, knownIdentifiers]
  );

  const [numDraft, setNumDraft] = useState("");

  const removeAt = (index: number) => {
    const next = tokens.filter((_, i) => i !== index);
    onChange(expressionFromTokens(next));
  };

  const commitNumberDraft = () => {
    const t = numDraft.trim();
    if (!t) return;
    if (!Number.isFinite(Number(t))) return;
    onChange(appendToken(value, knownIdentifiers, { type: "number", raw: t }));
    setNumDraft("");
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain").trim();
    if (!text) return;
    e.preventDefault();
    const pastedTokens = tokenizeFormulaExpression(text, knownIdentifiers);
    if (pastedTokens.length === 0) return;
    onChange(expressionFromTokens([...tokens, ...pastedTokens]));
  };

  const onNumberKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitNumberDraft();
    }
    if (e.key === "Backspace" && !numDraft && tokens.length > 0) {
      e.preventDefault();
      removeAt(tokens.length - 1);
    }
  };

  const renderToken = (t: FormulaExprToken, index: number) => {
    if (t.type === "number") {
      return (
        <span
          key={`tok-${index}`}
          className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-md border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] leading-snug text-foreground"
        >
          <span className="min-w-0 break-all">{t.raw}</span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Quitar número"
            onClick={() => removeAt(index)}
          >
            <X className="h-3 w-3" weight="bold" />
          </button>
        </span>
      );
    }

    if (t.type === "op") {
      const sym = OP_DISPLAY[t.op] ?? t.op;
      return (
        <span
          key={`tok-${index}`}
          className="inline-flex items-center gap-0.5 rounded-md bg-muted pl-1.5 pr-0.5 py-0.5 text-xs font-medium tabular-nums text-foreground"
        >
          {sym}
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-background/80 hover:text-foreground"
            aria-label="Quitar operador"
            onClick={() => removeAt(index)}
          >
            <X className="h-3 w-3" weight="bold" />
          </button>
        </span>
      );
    }

    const label = labelByName[t.name] ?? t.name;
    const isFormulaRef = formulaSet.has(t.name) && !labelByName[t.name];

    return (
      <span key={`tok-${index}`} className="inline-flex max-w-full min-w-0 items-start gap-0.5">
        <Badge
          variant={isFormulaRef ? "default" : "outline"}
          title={isFormulaRef ? t.name : `${label} (${t.name})`}
          className={cn(
            isFormulaRef ? "text-[10px] font-mono" : "text-[10px]",
            variableBadgeClass,
            "pr-0.5"
          )}
        >
          <span>{isFormulaRef ? t.name : label}</span>
          <button
            type="button"
            className={cn(
              "ml-0.5 shrink-0 rounded p-0.5 hover:bg-primary/15",
              isFormulaRef ? "text-primary-foreground/90 hover:text-primary-foreground" : ""
            )}
            aria-label="Quitar variable"
            onClick={(e) => {
              e.preventDefault();
              removeAt(index);
            }}
          >
            <X className="h-3 w-3" weight="bold" />
          </button>
        </Badge>
      </span>
    );
  };

  return (
    <div
      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm shadow-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
      onPaste={onPaste}
    >
      <div
        className="flex min-h-[44px] flex-wrap items-center gap-1.5"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button, [role='textbox'], input")) return;
          onFocus?.();
        }}
      >
        {tokens.map((t, i) => renderToken(t, i))}

        <Input
          type="text"
          inputMode="decimal"
          placeholder={tokens.length === 0 ? "Añade chips abajo o escribe un número aquí" : "Número"}
          value={numDraft}
          onChange={(e) => setNumDraft(e.target.value)}
          onKeyDown={onNumberKeyDown}
          onBlur={() => commitNumberDraft()}
          onFocus={onFocus}
          className="h-7 min-w-[4.5rem] flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 md:max-w-[8rem]"
        />
      </div>
    </div>
  );
}

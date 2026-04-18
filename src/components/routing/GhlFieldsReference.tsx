import { useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Funnel } from "@/types/funnel";

interface GhlFieldsReferenceProps {
  funnel: Funnel;
}

export function GhlFieldsReference({ funnel }: GhlFieldsReferenceProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const questionSteps = funnel.steps.filter((s) => s.type === "question" && s.question);

  if (questionSteps.length === 0) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(text);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {funnel.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium">{funnel.name}</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pl-4">
        <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5">
          <p className="text-[11px] text-muted-foreground mb-3">
            Estos son los nombres que recibirás en el webhook. Cópialos para crear los custom fields en GHL.
          </p>

          {/* Contact fields */}
          {["firstName", "lastName", "email", "phone"].map((field) => (
            <div key={field} className="flex items-center gap-2 text-[11px]">
              <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">{field}</span>
              <button onClick={() => copyToClipboard(field)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
          ))}

          {/* Qualified field */}
          <div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                onClick={() => setExpandedQuestion(expandedQuestion === "__qualified" ? null : "__qualified")}
                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expandedQuestion === "__qualified" ? "rotate-180" : ""}`} />
              </button>
              <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">qualified</span>
              <button onClick={() => copyToClipboard("qualified")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                {copiedField === "qualified" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            </div>
            {expandedQuestion === "__qualified" && (
              <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                {["true", "false"].map((val) => (
                  <div key={val} className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono bg-background border rounded px-1.5 py-0.5 flex-1 truncate">{val}</span>
                    <button onClick={() => copyToClipboard(val)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                      {copiedField === val ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary field */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate">summary</span>
            <button onClick={() => copyToClipboard("summary")} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
              {copiedField === "summary" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 mb-2">
            Texto formateado con todas las respuestas, ideal para crear una nota en GHL.
          </p>

          <Separator className="my-2" />
          <p className="text-[10px] text-muted-foreground mb-1">Respuestas (dentro de "answers"):</p>

          {/* Question fields */}
          {questionSteps.map((step) => {
            const label = step.question!.text;
            const options = step.question!.options || [];
            const isExpanded = expandedQuestion === step.id;
            return (
              <div key={step.id}>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => setExpandedQuestion(isExpanded ? null : step.id)}
                    className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  <span className="font-mono bg-background border rounded px-2 py-1 flex-1 truncate" title={label}>{label}</span>
                  <button onClick={() => copyToClipboard(label)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                    {copiedField === label ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                {isExpanded && options.length > 0 && (
                  <div className="ml-6 mt-1 mb-2 space-y-1 border-l-2 border-muted pl-2">
                    <p className="text-[10px] text-muted-foreground">Posibles valores:</p>
                    {options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2 text-[10px]">
                        <span className="font-mono bg-background border rounded px-1.5 py-0.5 flex-1 truncate" title={opt.label}>{opt.label}</span>
                        <button onClick={() => copyToClipboard(opt.label)} className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors">
                          {copiedField === opt.label ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

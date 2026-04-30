"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowsOutSimple,
  CaretDown,
  Eye,
  Microphone,
  Plus,
  Sparkle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppAssistant } from "@/contexts/AppAssistantContext";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

function greetingLabel() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const QUICK_SUGGESTION = "¿Qué hay de nuevo?";

const ASSISTANT_FALLBACK =
  "Soy el asistente de Leadflow (versión de interfaz). Pronto podremos conectar respuestas con IA. Mientras tanto, la comunidad y la formación están en la academia de Skool, y el soporte en soporte@leadflow.es.";

/**
 * Carriles laterales bajo el TopNav: el contenido principal se estrecha;
 * el asistente no usa overlay ni tapa la barra superior.
 */
export function AppAssistantPanel() {
  const { open } = useAppAssistant();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const pushAssistant = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: "assistant", text },
    ]);
  }, []);

  const sendText = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}-${Math.random().toString(36).slice(2)}`, role: "user", text },
    ]);
    setInput("");
    setTimeout(() => {
      if (
        /nuevo|novedad|novedades|qué hay|que hay|actualización/i.test(text)
      ) {
        pushAssistant(
          "Vamos añadiendo mejoras a embudos, analítica y facturación. Revisa el changelog en GitHub o pregunta a soporte para detalles de tu plan."
        );
      } else {
        pushAssistant(ASSISTANT_FALLBACK);
      }
    }, 500);
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col min-h-0 h-full bg-background text-foreground",
        "overflow-hidden transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        open
          ? "w-[min(100vw,420px)] rounded-t-lg"
          : "w-0 pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full min-h-0 w-[min(100vw,420px)] min-w-[min(100vw,420px)] max-w-full flex-col">
        <h2 className="sr-only">Asistente Leadflow</h2>
        <div className="relative flex h-full min-h-0 max-h-full flex-col">
          <header className="relative flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
            <button
              type="button"
              className="flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted/80"
            >
              Iniciar conversación
              <CaretDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" weight="bold" />
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Vista"
              >
                <Eye className="h-4 w-4" weight="bold" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Ampliar"
              >
                <ArrowsOutSimple className="h-4 w-4" weight="bold" />
              </Button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/20">
                  <Sparkle className="h-6 w-6 text-violet-600 dark:text-violet-300" weight="fill" />
                </div>
                <p className="text-balance text-xl font-medium tracking-tight text-foreground">
                  {greetingLabel()}, ¿cómo puedo ayudarte?
                </p>
                <button
                  type="button"
                  onClick={() => sendText(QUICK_SUGGESTION)}
                  className="mt-4 rounded-full border border-border bg-muted/60 px-4 py-2 text-sm text-foreground transition hover:bg-muted hover:border-border"
                >
                  {QUICK_SUGGESTION}
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[95%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto border border-border bg-muted/50 text-foreground"
                    )}
                  >
                    {m.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            className="shrink-0 border-t border-border bg-background p-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendText(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring/40">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Adjuntar"
              >
                <Plus className="h-5 w-5" weight="bold" />
              </Button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta lo que quieras…"
                className="min-h-9 min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Entrada de voz"
              >
                <Microphone className="h-5 w-5" weight="bold" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Las respuestas son orientativas; revisa la documentación y tu workspace.
            </p>
          </form>
        </div>
      </div>
    </aside>
  );
}

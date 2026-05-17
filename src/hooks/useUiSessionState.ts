"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { readUiSession, writeUiSessionDebounced, uiPathSessionKey } from "@/lib/uiSessionState";

type Options = {
  /** Debounce al persistir (ms). */
  debounceMs?: number;
  /** Path lógico para la clave session (p. ej. `/analytics` vs embed en editor). */
  sessionPathOverride?: string;
};

/**
 * Estado ligado a la ruta actual: se hidrata desde sessionStorage y se persiste con debounce.
 * Pasar `defaultValue` estable (p. ej. constante fuera del componente) si incluye objetos anidados.
 */
export function useUiSessionState<T extends Record<string, unknown>>(
  partialKey: string,
  defaultValue: T,
  options: Options = {},
): [T, (next: T | ((prev: T) => T)) => void] {
  const pathname = usePathname();
  const debounceMs = options.debounceMs ?? 250;
  const sessionPathOverride = options.sessionPathOverride;
  const basePath = sessionPathOverride ?? pathname;
  const key = useMemo(
    () => `${uiPathSessionKey(basePath)}:${partialKey}`,
    [basePath, partialKey],
  );

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    const k = `${uiPathSessionKey(basePath)}:${partialKey}`;
    const stored = readUiSession<T>(k);
    if (stored && typeof stored === "object") return { ...defaultValue, ...stored };
    return defaultValue;
  });

  useEffect(() => {
    const stored = readUiSession<T>(key);
    setState(stored && typeof stored === "object" ? { ...defaultValue, ...stored } : defaultValue);
  }, [key, defaultValue]);

  const setMerged = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        writeUiSessionDebounced(key, resolved, debounceMs);
        return resolved;
      });
    },
    [key, debounceMs],
  );

  return [state, setMerged];
}

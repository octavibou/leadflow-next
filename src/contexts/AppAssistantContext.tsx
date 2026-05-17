"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readUiSession, shellSessionKey, writeUiSessionDebounced } from "@/lib/uiSessionState";

type AppAssistantContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AppAssistantContext = createContext<AppAssistantContextValue | null>(
  null
);

const ASSISTANT_OPEN_KEY = shellSessionKey("assistantOpen");

export function AppAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const v = readUiSession<boolean>(ASSISTANT_OPEN_KEY);
    if (typeof v === "boolean") setOpen(v);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen: (next: boolean) => {
        setOpen(next);
        writeUiSessionDebounced(ASSISTANT_OPEN_KEY, next, 150);
      },
    }),
    [open],
  );
  return (
    <AppAssistantContext.Provider value={value}>
      {children}
    </AppAssistantContext.Provider>
  );
}

export function useAppAssistant() {
  const ctx = useContext(AppAssistantContext);
  if (!ctx) {
    throw new Error("useAppAssistant must be used within AppAssistantProvider");
  }
  return ctx;
}

"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppAssistantContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AppAssistantContext = createContext<AppAssistantContextValue | null>(
  null
);

export function AppAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
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

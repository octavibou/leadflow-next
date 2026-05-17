'use client';

import { TopNav } from "@/components/TopNav";
import { AppAssistantPanel } from "@/components/AppAssistantPanel";
import { AppAssistantProvider, useAppAssistant } from "@/contexts/AppAssistantContext";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

/** Área bajo el TopNav: con asistente abierto, separador visible al color del cromado (chrome). */
function AppWorkspace({ children }: { children: React.ReactNode }) {
  const { open: assistantOpen } = useAppAssistant();

  return (
    <div
      className={cn(
        // Mismo tono que el TopNav: así el rounded-t del main se ve en las dos esquinas (abierto o cerrado).
        "flex min-h-0 flex-1 overflow-hidden bg-chrome",
        assistantOpen && "gap-2"
      )}
    >
      <main className="min-h-0 min-w-0 flex-1 overflow-auto rounded-t-lg bg-background">
        {children}
      </main>
      <AppAssistantPanel />
    </div>
  );
}

export default function TopNavLayout({ children }: { children: React.ReactNode }) {
  const { fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <AppAssistantProvider>
      <div className="flex min-h-screen min-h-0 h-dvh flex-col bg-chrome">
        <TopNav />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppWorkspace>{children}</AppWorkspace>
        </div>
      </div>
    </AppAssistantProvider>
  );
}

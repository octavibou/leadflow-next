'use client';

import { TopNav } from "@/components/TopNav";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useEffect } from "react";

export default function TopNavLayout({ children }: { children: React.ReactNode }) {
  const { fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

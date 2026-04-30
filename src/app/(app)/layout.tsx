'use client';

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import TopNavLayout from "@/components/TopNavLayout";
import { useWorkspaceStore } from "@/store/workspaceStore";

const APP_PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analytics": "Analytics",
  "/routing": "Routing",
  "/profile": "Profile",
  "/workspace-settings": "Workspace Settings",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
  const currentWorkspaceName = currentWorkspace?.name;

  useEffect(() => {
    const pageTitle = APP_PAGE_TITLES[pathname];
    if (!pageTitle) return;

    if (currentWorkspaceName) {
      document.title = `${pageTitle}: (${currentWorkspaceName})`;
      return;
    }

    document.title = pageTitle;
  }, [pathname, currentWorkspaceName]);

  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <TopNavLayout>
          {children}
        </TopNavLayout>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

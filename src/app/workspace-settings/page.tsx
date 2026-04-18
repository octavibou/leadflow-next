'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import TopNavLayout from "@/components/TopNavLayout";
import WorkspaceSettings from "@/views/WorkspaceSettings";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <TopNavLayout>
          <WorkspaceSettings />
        </TopNavLayout>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

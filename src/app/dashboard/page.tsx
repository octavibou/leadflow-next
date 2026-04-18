'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import TopNavLayout from "@/components/TopNavLayout";
import Dashboard from "@/views/Dashboard";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <TopNavLayout>
          <Dashboard />
        </TopNavLayout>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

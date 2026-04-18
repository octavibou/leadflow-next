'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import TopNavLayout from "@/components/TopNavLayout";
import Analytics from "@/views/Analytics";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <TopNavLayout>
          <Analytics />
        </TopNavLayout>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

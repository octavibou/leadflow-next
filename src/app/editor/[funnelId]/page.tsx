'use client';

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import FunnelEditor from "@/views/FunnelEditor";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <Suspense>
          <FunnelEditor />
        </Suspense>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

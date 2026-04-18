'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import TopNavLayout from "@/components/TopNavLayout";
import LeadRouting from "@/views/LeadRouting";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <TopNavLayout>
          <LeadRouting />
        </TopNavLayout>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

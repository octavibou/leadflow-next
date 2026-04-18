'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import CampaignLandingEditor from "@/views/CampaignLandingEditor";

export default function Page() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <CampaignLandingEditor />
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

'use client';

import { ProtectedRoute } from "@/components/ProtectedRoute";
import TopNavLayout from "@/components/TopNavLayout";
import Profile from "@/views/Profile";

export default function Page() {
  return (
    <ProtectedRoute>
      <TopNavLayout>
        <Profile />
      </TopNavLayout>
    </ProtectedRoute>
  );
}

import { Suspense } from "react";
import Dashboard from "@/views/Dashboard";
import { DashboardSkeleton } from "@/views/DashboardSkeleton";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-[50vh] max-w-6xl bg-background p-6">
          <DashboardSkeleton />
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}

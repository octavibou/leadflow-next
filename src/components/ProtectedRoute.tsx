'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthReady } from "@/hooks/useAuthReady";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuthReady();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/login");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

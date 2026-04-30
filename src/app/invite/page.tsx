import { Suspense } from "react";
import Invite from "@/views/Invite";

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <Invite />
    </Suspense>
  );
}

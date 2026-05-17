"use client";

import { EditorChromeSkeletonHeader } from "@/components/editor/EditorChromeSkeletonHeader";
import { LandingTabSkeleton } from "@/components/editor/LandingTabSkeleton";

/** Pantalla completa mientras el store aún no tiene el funnel (`?tab=landing`). */
export function LandingEditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-chrome">
      <EditorChromeSkeletonHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg bg-background">
        <LandingTabSkeleton />
      </div>
    </div>
  );
}

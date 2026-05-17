"use client";

import { EditorChromeSkeletonHeader } from "@/components/editor/EditorChromeSkeletonHeader";
import { Skeleton } from "@/components/ui/skeleton";

export function QuizEditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-chrome">
      <EditorChromeSkeletonHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg bg-background">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r border-border bg-background">
            <div className="shrink-0 border-b px-3 py-2">
              <Skeleton className="mx-auto h-9 w-full max-w-[calc(100%-0.5rem)] rounded-md" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
            <div className="shrink-0 border-t p-3">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </aside>

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-muted/30 p-6">
            <Skeleton className="h-[min(520px,72vh)] w-full max-w-[min(360px,90vw)] rounded-[2rem] shadow-lg" />
            <Skeleton className="absolute bottom-6 right-6 h-10 w-10 rounded-full md:h-11 md:w-11" />
          </div>

          <aside className="flex min-h-0 w-80 shrink-0 flex-col border-l bg-background">
            <div className="shrink-0 border-b px-4 py-3">
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

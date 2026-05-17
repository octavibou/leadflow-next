"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Contenido bajo la barra del editor mientras carga el chunk de `LandingTab`. */
export function LandingTabSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r border-border bg-background">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex w-full gap-1 rounded-lg bg-muted/40 p-1">
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
              <Skeleton className="h-8 flex-1 rounded-md" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden bg-muted/30 p-6">
          <Skeleton className="h-[min(520px,72vh)] w-full max-w-[min(360px,90vw)] rounded-[2rem] shadow-lg" />
          <Skeleton className="absolute bottom-6 right-6 h-10 w-10 rounded-full md:h-11 md:w-11" />
        </div>

        <aside className="flex min-h-0 w-80 shrink-0 flex-col border-l bg-background">
          <div className="shrink-0 border-b px-4 py-3">
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}

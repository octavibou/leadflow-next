"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function EditorChromeSkeletonHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-6 bg-chrome px-4 text-chrome-fg">
      <div className="flex min-w-0 items-center gap-2">
        <Skeleton className="h-8 w-8 shrink-0 rounded-md bg-chrome-hover/80" />
        <Skeleton className="h-5 w-36 max-w-[180px] rounded-md bg-chrome-hover/80" />
      </div>
      <nav className="flex flex-1 items-center justify-center gap-1.5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton
            key={i}
            className="h-8 w-[5.5rem] shrink-0 rounded-full bg-chrome-hover/60 sm:w-24"
          />
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md bg-chrome-hover/80" />
        <Skeleton className="h-8 w-20 rounded-md bg-chrome-hover/80" />
        <Skeleton className="h-8 w-8 rounded-md bg-chrome-hover/80" />
      </div>
    </header>
  );
}

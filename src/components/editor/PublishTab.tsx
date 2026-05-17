"use client";

import type { Funnel } from "@/types/funnel";
import { PublishStudio } from "@/components/editor/publish/PublishStudio";

export function PublishTab({ funnel }: { funnel: Funnel }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <PublishStudio funnel={funnel} />
    </div>
  );
}

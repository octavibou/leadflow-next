"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";

export function PlatformAnalytics() {
  const pathname = usePathname();
  if (pathname?.startsWith("/f/")) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

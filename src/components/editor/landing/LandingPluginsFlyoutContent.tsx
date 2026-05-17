"use client";

import { useParams } from "next/navigation";
import { useFunnelStore } from "@/store/funnelStore";
import { EditorPluginsPanel } from "@/components/editor/EditorPluginsPanel";

export function LandingPluginsFlyoutContent() {
  const params = useParams();
  const funnelId = params?.funnelId as string | undefined;
  const funnel = useFunnelStore((s) => (funnelId ? s.getFunnel(funnelId) : undefined));
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);

  if (!funnelId || !funnel) {
    return <p className="text-xs text-muted-foreground">Cargando funnel…</p>;
  }

  return (
    <EditorPluginsPanel
      settings={funnel.settings}
      steps={funnel.steps}
      onUpdateSettings={(u) => updateFunnel(funnel.id, { settings: { ...funnel.settings, ...u } })}
    />
  );
}

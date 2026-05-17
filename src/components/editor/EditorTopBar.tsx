'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { House, Gear, FloppyDisk, Eye, Lightning, PaperPlaneTilt, Rocket, Layout } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlasticButton } from "@/components/ui/plastic-button";
import { Input } from "@/components/ui/input";
import type { Funnel } from "@/types/funnel";
import type { EditorTab } from "@/views/FunnelEditor";
import { useFunnelStore } from "@/store/funnelStore";
import { appendLfPreviewQueryParam } from "@/lib/tracking";

const editorTabs = [
  { id: "landing" as const, label: "Landing" },
  { id: "funnel" as const, label: "Quiz" },
  { id: "webhook" as const, label: "Send" },
  { id: "publish" as const, label: "Publish" },
];

const getTabIcon = (tabId: string) => {
  switch (tabId) {
    case "landing": return Layout;
    case "funnel": return Lightning;
    case "webhook": return PaperPlaneTilt;
    case "publish": return Rocket;
    default: return null;
  }
};

interface EditorTopBarProps {
  funnel: Funnel;
  onOpenSettings: () => void;
  campaignId?: string;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}

export function EditorTopBar({ funnel, onOpenSettings, activeTab, onTabChange }: EditorTopBarProps) {
  const router = useRouter();
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(funnel.name);

  const hasUnsavedChanges = !funnel.saved_at || funnel.updated_at > funnel.saved_at;

  const handleSave = () => {
    saveFunnel(funnel.id);
    toast.success("Cambios guardados correctamente");
  };

  const handlePreview = () => {
    const url = `${window.location.origin}/f/${funnel.id}`;
    window.open(appendLfPreviewQueryParam(url), "_blank", "noopener,noreferrer");
  };

  const saveName = () => {
    setEditing(false);
    if (name.trim()) updateFunnel(funnel.id, { name: name.trim() });
  };

  const handleTabClick = (tabId: EditorTab) => {
    onTabChange(tabId);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 bg-chrome px-4 text-chrome-fg">
      {/* Left: Home + Name */}
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
          onClick={() => router.push("/dashboard")}
        >
          <House className="h-4 w-4" weight="bold" />
        </Button>
        {editing ? (
          <Input
            className="h-8 w-48 border-chrome-border bg-chrome-hover text-sm text-chrome-fg placeholder:text-chrome-fg-muted"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            autoFocus
          />
        ) : (
          <span
            className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-chrome-fg transition-colors hover:text-white"
            onClick={() => setEditing(true)}
          >
            {funnel.name}
          </span>
        )}
      </div>

      {/* Center: Tabs (mismo criterio visual que TopNav) */}
      <nav className="flex flex-1 items-center justify-center gap-1.5">
        {editorTabs.map((tab) => {
          const Icon = getTabIcon(tab.id);
          const isActive = activeTab === tab.id;
          if (isActive && Icon) {
            return (
              <PlasticButton
                key={tab.id}
                variant="brand-lime"
                onClick={() => handleTabClick(tab.id)}
                className="h-8 px-3"
              >
                <Icon className="h-3.5 w-3.5" weight="fill" />
                {tab.label}
              </PlasticButton>
            );
          }
          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => handleTabClick(tab.id)}
              className="h-8 gap-2 px-3 text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
            >
              {Icon && <Icon className="h-3.5 w-3.5" weight="bold" />}
              {tab.label}
            </Button>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
          onClick={handlePreview}
          title="Vista previa sin métricas (lf_preview)"
        >
          <Eye className="h-4 w-4" weight="bold" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-chrome-fg-muted hover:bg-chrome-hover hover:text-white"
          onClick={onOpenSettings}
        >
          <Gear className="h-4 w-4" weight="bold" />
        </Button>

        <span className="relative inline-flex">
          <PlasticButton variant="brand-lime" onClick={handleSave} className="h-8 px-3">
            <FloppyDisk className="mr-2 h-4 w-4" weight="bold" /> Guardar
          </PlasticButton>
          {hasUnsavedChanges && (
            <span
              className="pointer-events-none absolute -right-0.5 -top-0.5 z-30 h-2.5 w-2.5 rounded-full border-2 border-chrome bg-destructive"
              aria-hidden
            />
          )}
        </span>
      </div>
    </header>
  );
}

'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Home, Settings, Save, Monitor, Smartphone, Eye, Zap, BarChart3, Webhook, Activity, Rocket, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Funnel } from "@/types/funnel";
import type { EditorTab } from "@/views/FunnelEditor";
import { useFunnelStore } from "@/store/funnelStore";
import { cn } from "@/lib/utils";

const editorTabs: { id: EditorTab; label: string; icon: typeof Zap }[] = [
  { id: "funnel", label: "Funnel", icon: Zap },
  { id: "webhook", label: "Webhook", icon: Webhook },
  { id: "tracking", label: "Tracking", icon: Activity },
  { id: "publish", label: "Publish", icon: Rocket },
  { id: "ab_test", label: "A/B Test", icon: FlaskConical },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
];

interface EditorTopBarProps {
  funnel: Funnel;
  onOpenSettings: () => void;
  viewMode: "desktop" | "mobile";
  onToggleView: () => void;
  campaignId?: string;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}

export function EditorTopBar({ funnel, onOpenSettings, viewMode, onToggleView, campaignId, activeTab, onTabChange }: EditorTopBarProps) {
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
    window.open(url, "_blank");
  };

  const saveName = () => {
    setEditing(false);
    if (name.trim()) updateFunnel(funnel.id, { name: name.trim() });
  };

  const handleTabClick = (tabId: EditorTab) => {
    onTabChange(tabId);
  };

  return (
    <div className="h-14 border-b bg-background flex items-center px-4 shrink-0">
      {/* Left: Home + Name */}
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/dashboard")}>
          <Home className="h-4 w-4" />
        </Button>
        {editing ? (
          <Input
            className="h-8 w-48"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            autoFocus
          />
        ) : (
          <span
            className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors truncate max-w-[180px]"
            onClick={() => setEditing(true)}
          >
            {funnel.name}
          </span>
        )}
      </div>

      {/* Center: Tabs */}
      <nav className="flex-1 flex items-center justify-center gap-1">
        {editorTabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "gap-2 rounded-lg px-4",
              activeTab === tab.id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View mode toggle */}
        <div className="flex items-center border rounded-lg p-0.5 gap-0.5">
          <Button
            variant={viewMode === "mobile" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={viewMode === "desktop" ? onToggleView : undefined}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "desktop" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={viewMode === "mobile" ? onToggleView : undefined}
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Preview */}
        <Button variant="ghost" size="icon" onClick={handlePreview} title="Preview">
          <Eye className="h-4 w-4" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>

        {/* Save */}
        <Button onClick={handleSave} className="relative">
          <Save className="h-4 w-4 mr-2" /> Guardar
          {hasUnsavedChanges && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </div>
    </div>
  );
}

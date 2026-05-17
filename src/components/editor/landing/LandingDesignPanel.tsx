"use client";

import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFunnelStore } from "@/store/funnelStore";
import type { Funnel, FunnelSettings } from "@/types/funnel";

const FONTS = ["Inter", "System", "Poppins", "Montserrat"];

/**
 * Ajustes visuales compartidos entre landing pública y quiz (mismo funnel).
 */
export function LandingDesignPanel({ funnel }: { funnel: Funnel }) {
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const [settings, setSettings] = useState<FunnelSettings>(funnel.settings);

  useEffect(() => {
    setSettings(funnel.settings);
  }, [funnel.id, funnel.settings]);

  const set = <K extends keyof FunnelSettings>(k: K, v: FunnelSettings[K]) => {
    const updated: FunnelSettings = { ...settings, [k]: v };
    setSettings(updated);
    updateFunnel(funnel.id, { settings: updated });
  };

  return (
    <div className="space-y-5 p-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Color y tipografía se aplican a la landing y al quiz de este funnel.
      </p>

      <div>
        <Label className="mb-1.5 block text-xs">Color primario</Label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm"
            >
              <div className="h-5 w-5 shrink-0 rounded" style={{ background: settings.primaryColor }} />
              <span className="truncate font-mono text-xs">{settings.primaryColor}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={settings.primaryColor} onChange={(c) => set("primaryColor", c)} />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">Tipografía</Label>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={settings.fontFamily}
          onChange={(e) => set("fontFamily", e.target.value)}
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">URL del logo</Label>
        <Input
          className="h-9 text-sm"
          value={settings.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

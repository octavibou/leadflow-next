"use client";

import { useMemo } from "react";
import type { FunnelSettings, FunnelStep } from "@/types/funnel";
import { FUNNEL_PLUGIN_REGISTRY } from "@/lib/plugins/registry";
import {
  mergeFunnelPluginsItem,
  normalizeFunnelPlugins,
  type FunnelPluginEntry,
  type FunnelPluginId,
} from "@/types/funnelPlugins";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function EditorPluginsPanel({
  settings,
  steps,
  onUpdateSettings,
  className,
}: {
  settings: FunnelSettings;
  steps: FunnelStep[];
  onUpdateSettings: (updates: Partial<FunnelSettings>) => void;
  className?: string;
}) {
  const plugins = normalizeFunnelPlugins(settings.plugins);

  const formulaNames = useMemo(() => {
    const rs = steps.find((s) => s.type === "results" && s.resultsConfig?.formulas?.length);
    return (rs?.resultsConfig?.formulas ?? []).map((f) => f.name);
  }, [steps]);

  const patchPlugin = (id: FunnelPluginId, patch: Parameters<typeof mergeFunnelPluginsItem>[2]) => {
    const next = mergeFunnelPluginsItem(settings.plugins, id, patch);
    onUpdateSettings({ plugins: next });
  };

  /** Superficie de tarjeta siempre legible sobre fondos claros u oscuros del editor. */
  const pluginCardClass =
    "rounded-xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-sm space-y-3 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <div className={cn("space-y-4 p-4", className)}>
      <div className="space-y-1">
        <p className="text-sm font-semibold">Plugins de conversión</p>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Activa embeds tipo Shopify en la landing pública, entre preguntas y en contacto. La configuración se guarda con el funnel.
        </p>
      </div>

      {FUNNEL_PLUGIN_REGISTRY.map((meta) => {
        const row = plugins.items[meta.id];
        if (!row) return null;
        const enabled = row.enabled;

        return (
          <div key={meta.id} className={pluginCardClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-semibold leading-tight text-zinc-950 dark:text-zinc-50">{meta.title}</div>
                <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">{meta.description}</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(v) => patchPlugin(meta.id, { enabled: Boolean(v) })}
                aria-label={`Activar ${meta.title}`}
              />
            </div>

            {enabled && meta.id === "live_activity" ? (() => {
              const la = row as FunnelPluginEntry<"live_activity">;
              return (
              <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                <div className="flex items-center gap-2">
                  <Switch
                    id="la-synth"
                    checked={la.config.useSyntheticNames}
                    onCheckedChange={(v) =>
                      patchPlugin("live_activity", { config: { ...la.config, useSyntheticNames: Boolean(v) } })
                    }
                  />
                  <Label htmlFor="la-synth" className="text-xs font-normal text-zinc-800 dark:text-zinc-200">
                    Nombres de demostración en plantillas
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="la-step"
                    checked={la.config.showStepActivity}
                    onCheckedChange={(v) =>
                      patchPlugin("live_activity", { config: { ...la.config, showStepActivity: Boolean(v) } })
                    }
                  />
                  <Label htmlFor="la-step" className="text-xs font-normal text-zinc-800 dark:text-zinc-200">
                    Mostrar actividad en el paso actual
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-800 dark:text-zinc-200">Intervalo de actualización (segundos)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={600}
                    className="h-8 text-xs"
                    value={Math.round((la.config.pollIntervalMs || 45000) / 1000)}
                    onChange={(e) => {
                      const sec = Number(e.target.value);
                      patchPlugin("live_activity", {
                        config: { ...la.config, pollIntervalMs: Math.max(15, Math.min(600, sec)) * 1000 },
                      });
                    }}
                  />
                </div>
              </div>
              );
            })() : null}

            {enabled && meta.id === "locked_preview" && formulaNames.length > 0 ? (() => {
              const lp = row as FunnelPluginEntry<"locked_preview">;
              return (
              <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-600">
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Fórmulas visibles (check)</p>
                <div className="flex flex-wrap gap-2">
                  {formulaNames.map((name) => {
                    const on = (lp.config.unlockedFormulaNames || []).includes(name);
                    return (
                      <label key={name} className="flex items-center gap-1.5 text-xs cursor-pointer text-zinc-800 dark:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            const cur = lp.config.unlockedFormulaNames || [];
                            const next = on ? cur.filter((n) => n !== name) : [...cur, name];
                            patchPlugin("locked_preview", { config: { ...lp.config, unlockedFormulaNames: next } });
                          }}
                        />
                        {name}
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-800 dark:text-zinc-200">
                    Texto snippet (usa {"{{nombreFormula}}"} o {"{{hint}}"})
                  </Label>
                  <Input
                    className="h-8 text-xs"
                    value={lp.config.snippetTemplate}
                    onChange={(e) =>
                      patchPlugin("locked_preview", { config: { ...lp.config, snippetTemplate: e.target.value } })
                    }
                  />
                </div>
              </div>
              );
            })() : null}

            {enabled && meta.id === "locked_preview" && formulaNames.length === 0 ? (
              <p className="text-[11px] text-amber-700 border-t pt-2">
                Añade un paso Resultados con fórmulas para usar la vista bloqueada.
              </p>
            ) : null}

            {enabled && meta.id === "exit_recovery" ? (() => {
              const er = row as FunnelPluginEntry<"exit_recovery">;
              return (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="er-vis"
                    checked={er.config.onVisibilityHidden}
                    onCheckedChange={(v) =>
                      patchPlugin("exit_recovery", { config: { ...er.config, onVisibilityHidden: Boolean(v) } })
                    }
                  />
                  <Label htmlFor="er-vis" className="text-xs font-normal">
                    Disparar al cambiar de pestaña
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="er-ans"
                    checked={er.config.saveAnswersInStorage}
                    onCheckedChange={(v) =>
                      patchPlugin("exit_recovery", { config: { ...er.config, saveAnswersInStorage: Boolean(v) } })
                    }
                  />
                  <Label htmlFor="er-ans" className="text-xs font-normal">
                    Guardar respuestas del quiz al recuperar
                  </Label>
                </div>
              </div>
              );
            })() : null}
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground leading-snug">
        Export HTML estático: los plugins no se incluyen en el ZIP exportado (solo en la app y URL pública).
      </p>
    </div>
  );
}

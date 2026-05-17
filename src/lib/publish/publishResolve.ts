/**
 * Publish System — precedencia en runtime (público)
 *
 * 1. `?landing=0` en `/f/{id}` (sin slug de rama): compat; si existe rama `direct`, redirige a `/f/{id}/direct`.
 * 2. `?c=` con campaña publicada válida → flujo legacy; si la campaña trae `steps` no vacíos,
 *    sustituyen el funnel completo (incl. intro).
 * 3. Ruta `/f/{id}/{branchSlug}` con flag activo → fusionar landing del deployment activo de esa rama; si el
 *    snapshot incluye `source_variant_id` (UUID de campaña publicada), el quiz público usa los `steps` de esa campaña
 *    (mismo criterio que `?c=`) salvo que la URL lleve `?c=` explícito, que gana.
 * 4. `/f/{id}` sin query de campaña → fusionar deployment activo de la rama `main` si flag activo.
 *
 * Fallback: sin flag, sin deployment o error → datos tal cual en `funnels` (comportamiento histórico).
 */

import type { Funnel, FunnelSettings, FunnelStep } from "@/types/funnel";

export const PUBLISH_BRANCHES_FLAG_ENV = "NEXT_PUBLIC_PUBLISH_BRANCHES_V1";

export function isPublishBranchesV1Enabled(): boolean {
  return process.env[PUBLISH_BRANCHES_FLAG_ENV] === "1";
}

/** Claves de `FunnelSettings` permitidas en `settings_patch` de un deployment (V1). */
export const LANDING_SETTINGS_PATCH_KEYS = [
  "primaryColor",
  "fontFamily",
  "logoUrl",
  "language",
] as const satisfies readonly (keyof FunnelSettings)[];

export type LandingSettingsPatchKey = (typeof LANDING_SETTINGS_PATCH_KEYS)[number];

export type LandingSnapshotV1 = {
  snapshot_version: 1;
  /** Step `intro` completo o null si no hay intro en el snapshot. */
  introStep: FunnelStep | null;
  /** Si se define, sobrescribe `settings.useLanding` al fusionar. */
  useLanding?: boolean;
  /**
   * UUID de campaña cuyo quiz debe mostrarse en público para este deployment (Publish v1).
   * Solo se escribe en push cuando la variante origen es una campaña publicada.
   */
  source_variant_id?: string | null;
  /**
   * Steps completos de la variante (campaña) desplegada, embebidos en el snapshot para que el
   * deployment sea autocontenido y no dependa de una query a `campaigns` (evita bloqueos de RLS).
   */
  source_variant_steps?: FunnelStep[] | null;
};

const CAMPAIGN_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Devuelve el id de campaña ligado al snapshot, o null si es funnel base / sin landing / valor inválido. */
export function getDeploymentSourceCampaignId(landingSnapshot: unknown): string | null {
  if (!landingSnapshot || typeof landingSnapshot !== "object") return null;
  const raw = (landingSnapshot as Record<string, unknown>)["source_variant_id"];
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id === "default" || id === "no-landing") return null;
  return CAMPAIGN_UUID_RE.test(id) ? id : null;
}

export function isLandingSnapshotV1(x: unknown): x is LandingSnapshotV1 {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.snapshot_version === 1;
}

export function pickLandingSettingsPatch(raw: unknown): Partial<Pick<FunnelSettings, LandingSettingsPatchKey>> {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Partial<Pick<FunnelSettings, LandingSettingsPatchKey>> = {};
  for (const k of LANDING_SETTINGS_PATCH_KEYS) {
    const v = src[k as string];
    if (v === undefined) continue;
    if (k === "language" && typeof v === "string") {
      (out as Record<string, string>)[k] = v;
      continue;
    }
    if ((k === "primaryColor" || k === "fontFamily" || k === "logoUrl") && typeof v === "string") {
      (out as Record<string, string>)[k] = v;
    }
  }
  return out;
}

/**
 * Límite V1 del push a rama (`pushLandingToBranch` / API push):
 * solo versiona **landing/intro** (+ `settings_patch` acotado en `LANDING_SETTINGS_PATCH_KEYS`).
 * El quiz y el resto de pasos siguen leyéndose de la fila `funnels` hasta un “full funnel snapshot”.
 *
 * Roadmap: si hace falta A/B de pasos del quiz con la misma URL de rama, persistir `steps` (o variantes)
 * en el deployment o en una tabla auxiliar y fusionar en `PublicFunnel` con precedencia clara respecto a `?c=`.
 *
 * Extrae snapshot V1 desde el funnel del editor (solo intro + useLanding).
 */
export function extractLandingSnapshotFromFunnel(funnel: Funnel): LandingSnapshotV1 {
  const steps = [...(funnel.steps || [])].sort((a, b) => a.order - b.order);
  const intro = steps.find((s) => s.type === "intro") ?? null;
  return {
    snapshot_version: 1,
    introStep: intro ? (JSON.parse(JSON.stringify(intro)) as FunnelStep) : null,
    useLanding: funnel.settings?.useLanding,
  };
}

/** Snapshot para la rama reservada `direct`: mismo intro versionable, entrada directa al quiz. */
export function extractDirectDefaultLandingSnapshotFromFunnel(funnel: Funnel): LandingSnapshotV1 {
  const base = extractLandingSnapshotFromFunnel(funnel);
  return {
    ...base,
    useLanding: false,
  };
}

/**
 * Fusiona landing deployment en una copia del funnel (quiz compartido: resto de steps intacto).
 */
export function applyLandingDeploymentToFunnel(
  funnel: Funnel,
  landingSnapshot: unknown,
  settingsPatch: unknown,
): Funnel {
  if (!isLandingSnapshotV1(landingSnapshot)) {
    return funnel;
  }
  const patch = pickLandingSettingsPatch(settingsPatch);
  const nextSettings: FunnelSettings = {
    ...funnel.settings,
    ...patch,
  };
  if (landingSnapshot.useLanding !== undefined) {
    nextSettings.useLanding = landingSnapshot.useLanding;
  }

  const steps = [...funnel.steps].map((s) => ({ ...s } as FunnelStep));
  const introIdx = steps.findIndex((s) => s.type === "intro");
  const snapIntro = landingSnapshot.introStep;

  if (snapIntro === null) {
    if (introIdx >= 0) steps.splice(introIdx, 1);
  } else if (introIdx >= 0) {
    steps[introIdx] = JSON.parse(JSON.stringify(snapIntro)) as FunnelStep;
  } else {
    const minOrder = steps.length ? Math.min(...steps.map((s) => s.order)) : 0;
    const introClone = JSON.parse(JSON.stringify(snapIntro)) as FunnelStep;
    introClone.order = minOrder - 1;
    steps.push(introClone);
    steps.sort((a, b) => a.order - b.order);
  }

  const finalSteps =
    Array.isArray(landingSnapshot.source_variant_steps) &&
    landingSnapshot.source_variant_steps.length > 0
      ? (landingSnapshot.source_variant_steps as FunnelStep[])
      : steps;

  return {
    ...funnel,
    settings: nextSettings,
    steps: finalSteps,
  };
}

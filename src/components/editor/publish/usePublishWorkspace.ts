import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useFunnelStore } from "@/store/funnelStore";
import { useCampaignStore } from "@/store/campaignStore";
import type { Funnel, FunnelStep } from "@/types/funnel";
import type { Campaign } from "@/store/campaignStore";
import { appendLfPreviewQueryParam, isLeadflowPreviewMode } from "@/lib/tracking";
import {
  publishBootstrapMain,
  fetchPublishBranches,
  pushLandingToBranch,
  rollbackBranchDeployment,
  fetchBranchDeployments,
  fetchPublishActivity,
  createPublishBranch,
  deletePublishBranch,
  updatePublishBranch,
  type PublishBranchRow,
  type PublishDeploymentListItem,
  type PublishActivityEvent,
} from "@/lib/publish/publishApi";
import { isDirectDefaultBranchSlug, isReservedFunnelBranchSlug } from "@/lib/publish/publishBranchConstants";
import {
  buildEmbedSnippet,
} from "@/components/editor/publish/publishPrimitives";

/** Identificador unificado de una variante editable (steps base, sin landing o una campana). */
export type PublishVariantId = "default" | "no-landing" | string;

export type PublishVariantOption = {
  id: PublishVariantId;
  label: string;
  /** Indica si la variante esta basada en una campana (vs. los steps por defecto del funnel). */
  isCampaign: boolean;
  campaign?: Campaign;
};

export function usePublishWorkspace(funnel: Funnel) {
  const saveFunnel = useFunnelStore((s) => s.saveFunnel);
  const unpublishFunnel = useFunnelStore((s) => s.unpublishFunnel);
  const liveFunnel = useFunnelStore((s) => s.getFunnel(funnel.id)) ?? funnel;

  const campaigns = useCampaignStore((s) => s.campaigns);
  const fetchCampaigns = useCampaignStore((s) => s.fetchCampaigns);

  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const publishBranchesEnvOn = process.env.NEXT_PUBLIC_PUBLISH_BRANCHES_V1 === "1";

  const [pubBranches, setPubBranches] = useState<PublishBranchRow[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slotDeployments, setSlotDeployments] = useState<Record<string, PublishDeploymentListItem[]>>({});
  const [pubActivity, setPubActivity] = useState<PublishActivityEvent[]>([]);
  const [pubRefreshing, setPubRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pushingSlotId, setPushingSlotId] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const [testMode, setTestModeState] = useState(() =>
    typeof window !== "undefined" ? isLeadflowPreviewMode() : false,
  );

  const setTestMode = useCallback((on: boolean) => {
    try {
      if (on) {
        sessionStorage.setItem("leadflow_lf_preview_s", "1");
      } else {
        sessionStorage.removeItem("leadflow_lf_preview_s");
        localStorage.removeItem("leadflow_lf_preview_p");
      }
    } catch { /* private mode */ }
    setTestModeState(on);
    toast.success(on ? "Modo test activado — sin tracking ni leads" : "Modo test desactivado");
  }, []);

  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchSlug, setNewBranchSlug] = useState("");
  const [createBranchBusy, setCreateBranchBusy] = useState(false);

  useEffect(() => {
    void fetchCampaigns(funnel.id);
  }, [funnel.id, fetchCampaigns]);

  const refreshPublish = useCallback(async () => {
    if (!publishBranchesEnvOn) {
      setInitialLoading(false);
      return;
    }
    setPubRefreshing(true);
    try {
      await publishBootstrapMain(funnel.id);
      const list = await fetchPublishBranches(funnel.id);
      setPubBranches(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar el sistema de URLs");
    } finally {
      setPubRefreshing(false);
      setInitialLoading(false);
    }
  }, [publishBranchesEnvOn, funnel.id]);

  useEffect(() => {
    void refreshPublish();
  }, [refreshPublish]);

  /** Activity de TODO el funnel: necesario para derivar la variante activa de cada slot. */
  useEffect(() => {
    if (!publishBranchesEnvOn) {
      setPubActivity([]);
      return;
    }
    void fetchPublishActivity(funnel.id, { limit: 200 })
      .then(setPubActivity)
      .catch(() => setPubActivity([]));
  }, [publishBranchesEnvOn, funnel.id, pubRefreshing]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const basePath = `/f/${funnel.id}`;

  const slots = useMemo(() => {
    const main = pubBranches.find((b) => b.is_main) ?? null;
    const direct = pubBranches.find((b) => isDirectDefaultBranchSlug(b.slug)) ?? null;
    const rest = pubBranches
      .filter((b) => !b.is_main && !isDirectDefaultBranchSlug(b.slug))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [...(main ? [main] : []), ...(direct ? [direct] : []), ...rest];
  }, [pubBranches]);

  /** Listado de variantes editables: steps por defecto + sin landing + cada campana del funnel. */
  const variantOptions = useMemo<PublishVariantOption[]>(() => {
    const opts: PublishVariantOption[] = [
      { id: "default", label: "Por defecto", isCampaign: false },
      { id: "no-landing", label: "Sin landing", isCampaign: false },
    ];
    for (const c of campaigns.filter((c) => c.funnel_id === funnel.id)) {
      opts.push({ id: c.id, label: c.name, isCampaign: true, campaign: c });
    }
    return opts;
  }, [campaigns, funnel.id]);

  const slotPath = useCallback(
    (slot: PublishBranchRow): string => {
      if (slot.is_main) return basePath;
      return `${basePath}/${slot.slug}`;
    },
    [basePath],
  );

  const slotShareUrl = useCallback(
    (slot: PublishBranchRow): string => `${origin}${slotPath(slot)}`,
    [origin, slotPath],
  );

  const slotIsSystem = (slot: PublishBranchRow) => slot.is_main || isDirectDefaultBranchSlug(slot.slug);
  const slotIsLanding = (slot: PublishBranchRow) => !isDirectDefaultBranchSlug(slot.slug);

  /** Variante actualmente desplegada en el slot, derivada del activity event mas reciente. */
  const slotActiveVariantId = useCallback(
    (slot: PublishBranchRow): PublishVariantId | null => {
      const activeId = slot.activeDeployment?.id ?? null;
      if (!activeId) return null;
      const ev = pubActivity.find(
        (e) => e.event_type === "deployment.pushed" && e.deployment_id === activeId && e.branch_id === slot.id,
      );
      const v = (ev?.payload?.["variant_id"] as string | null | undefined) ?? null;
      if (v == null || v === "") return "default";
      return v;
    },
    [pubActivity],
  );

  const variantLabel = useCallback(
    (id: PublishVariantId | null) => {
      if (!id) return "—";
      if (id === "default") return "Por defecto";
      if (id === "no-landing") return "Sin landing";
      return campaigns.find((c) => c.id === id)?.name ?? "Variante eliminada";
    },
    [campaigns],
  );

  /** Resuelve el funnel a desplegar segun la variante origen. */
  const resolveFunnelForVariant = useCallback(
    (variantId: PublishVariantId): Funnel => {
      if (variantId === "default") return liveFunnel;
      const c = campaigns.find((x) => x.id === variantId);
      if (!c) return liveFunnel;
      const stepsFromCampaign =
        Array.isArray(c.steps) && c.steps.length > 0 ? (c.steps as FunnelStep[]) : null;
      return stepsFromCampaign != null ? { ...liveFunnel, steps: stepsFromCampaign } : liveFunnel;
    },
    [campaigns, liveFunnel],
  );

  const refreshSlotDeployments = useCallback(
    async (slotId: string) => {
      try {
        const d = await fetchBranchDeployments(funnel.id, slotId, 20);
        setSlotDeployments((m) => ({ ...m, [slotId]: d.deployments }));
        return d;
      } catch {
        return null;
      }
    },
    [funnel.id],
  );

  /** Push de una variante (default, no-landing o campaign) a un slot concreto. */
  const pushVariantToSlot = useCallback(
    async (slotId: string, variantId: PublishVariantId) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) {
        toast.error("URL no encontrada");
        return;
      }
      setPushingSlotId(slotId);
      try {
        const isNoLanding = variantId === "no-landing";
        const isCampaign = variantId !== "default" && variantId !== "no-landing";
        const funnelForDeploy = resolveFunnelForVariant(isNoLanding ? "default" : variantId);
        const campaignSteps = isCampaign ? (funnelForDeploy.steps as FunnelStep[]) : null;
        await pushLandingToBranch(
          funnel.id,
          slotId,
          funnelForDeploy,
          undefined,
          slot.slug ?? null,
          variantId,
          isNoLanding,
          campaignSteps,
        );
        toast.success(
          variantId === "default"
            ? `Publicado en ${slotLabel(slot)}`
            : `Variante "${variantLabel(variantId)}" publicada en ${slotLabel(slot)}`,
        );
        await refreshPublish();
        await refreshSlotDeployments(slotId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo publicar");
      } finally {
        setPushingSlotId(null);
      }
    },
    [funnel.id, slots, resolveFunnelForVariant, refreshPublish, refreshSlotDeployments, variantLabel],
  );

  const rollbackSlotDeployment = useCallback(
    async (slotId: string, toDeploymentId: string) => {
      setPushingSlotId(slotId);
      try {
        await rollbackBranchDeployment(funnel.id, slotId, toDeploymentId);
        toast.success("Version restaurada");
        await refreshPublish();
        await refreshSlotDeployments(slotId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rollback fallido");
      } finally {
        setPushingSlotId(null);
      }
    },
    [funnel.id, refreshPublish, refreshSlotDeployments],
  );

  const deleteSlot = useCallback(
    async (slotId: string): Promise<boolean> => {
      setDeletingSlotId(slotId);
      try {
        await deletePublishBranch(funnel.id, slotId);
        toast.success("URL eliminada");
        setSlotDeployments((m) => {
          const next = { ...m };
          delete next[slotId];
          return next;
        });
        setSelectedSlotId((cur) => (cur === slotId ? null : cur));
        await refreshPublish();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo eliminar la URL");
        return false;
      } finally {
        setDeletingSlotId(null);
      }
    },
    [funnel.id, refreshPublish],
  );

  const updateSlot = useCallback(
    async (slotId: string, updates: { name?: string; slug?: string }): Promise<boolean> => {
      try {
        await updatePublishBranch(funnel.id, slotId, updates);
        toast.success("URL actualizada");
        await refreshPublish();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar la URL");
        return false;
      }
    },
    [funnel.id, refreshPublish],
  );

  const createSlot = useCallback(async (opts?: { name?: string; slug?: string }) => {
    const name = (opts?.name ?? newBranchName).trim();
    let slug = (opts?.slug ?? newBranchSlug).trim().toLowerCase();
    slug = slug
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!name || !slug) {
      toast.error("Indica nombre y slug (solo letras, numeros y guiones)");
      return;
    }
    if (isReservedFunnelBranchSlug(slug)) {
      toast.error(`El slug «${slug}» esta reservado`);
      return;
    }
    setCreateBranchBusy(true);
    try {
      const row = await createPublishBranch(funnel.id, { name, slug });
      toast.success("URL creada");
      setNewBranchOpen(false);
      setNewBranchName("");
      setNewBranchSlug("");
      await refreshPublish();
      setSelectedSlotId(row.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la URL");
    } finally {
      setCreateBranchBusy(false);
    }
  }, [funnel.id, newBranchName, newBranchSlug, refreshPublish]);

  const handleFunnelPublishToggle = useCallback(
    async (action: "publish" | "unpublish") => {
      setBusy(true);
      try {
        if (action === "publish") {
          await saveFunnel(funnel.id);
          toast.success("Funnel publicado");
        } else {
          await unpublishFunnel(funnel.id);
          toast.success("Funnel despublicado");
        }
      } catch {
        toast.error("No se pudo actualizar el funnel");
      } finally {
        setBusy(false);
      }
    },
    [funnel.id, saveFunnel, unpublishFunnel],
  );

  const copy = (text: string, kind: "url" | "embed") => {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(null), 2000);
  };

  const openPreview = useCallback(
    (slot: PublishBranchRow | null) => {
      if (!slot) return;
      window.open(appendLfPreviewQueryParam(slotShareUrl(slot)), "_blank", "noopener,noreferrer");
    },
    [slotShareUrl],
  );

  /** Pre-carga deployments de cada slot (mejor UX para abrir historial sin esperar). */
  useEffect(() => {
    if (!publishBranchesEnvOn) return;
    for (const s of slots) {
      if (slotDeployments[s.id]) continue;
      void refreshSlotDeployments(s.id);
    }
  }, [publishBranchesEnvOn, slots, slotDeployments, refreshSlotDeployments]);

  return {
    funnel,
    liveFunnel,
    campaigns,

    publishBranchesEnvOn,
    pubRefreshing,
    initialLoading,

    /** URLs publicas (slots): main + direct + custom. */
    slots,
    slotPath,
    slotShareUrl,
    slotIsLanding,
    slotIsSystem,
    slotLabel,
    slotActiveVariantId,
    slotDeployments,
    pushingSlotId,
    deletingSlotId,
    deleteSlot,
    updateSlot,
    refreshSlotDeployments,

    /** Variantes editables (default + campanas). */
    variantOptions,
    variantLabel,

    /** Acciones principales. */
    pushVariantToSlot,
    rollbackSlotDeployment,
    handleFunnelPublishToggle,
    openPreview,

    /** Modo test (sin tracking / leads). */
    testMode,
    setTestMode,

    /** Selección lateral / detalle. */
    selectedSlotId,
    setSelectedSlotId,

    /** Embed snippet a partir de URL absoluta. */
    buildEmbedSnippet,

    /** Crear slot. */
    newBranchOpen,
    setNewBranchOpen,
    newBranchName,
    setNewBranchName,
    newBranchSlug,
    setNewBranchSlug,
    createBranchBusy,
    createSlot,

    /** Editor de campanas (variantes). */
    editingCampaign,
    setEditingCampaign,

    /** Origen + base del funnel. */
    origin,
    basePath,

    busy,
    copied,
    copy,
  };
}

export type PublishWorkspace = ReturnType<typeof usePublishWorkspace>;

function slotLabel(slot: PublishBranchRow): string {
  if (slot.is_main) return "Principal";
  if (isDirectDefaultBranchSlug(slot.slug)) return "Solo quiz";
  return slot.name;
}

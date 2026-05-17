import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel, FunnelType, FunnelStep } from "@/types/funnel";
import { DEFAULT_SETTINGS } from "@/types/funnel";
import { createTemplateSteps } from "@/lib/templates";
import { publishBootstrapMain } from "@/lib/publish/publishApi";

interface FunnelStore {
  funnels: Funnel[];
  loading: boolean;
  loaded: boolean;
  currentWorkspaceId: string | null;
  fetchFunnels: (workspaceId?: string) => Promise<void>;
  createFunnel: (
    name: string,
    type: FunnelType,
    workspaceId?: string,
    options?: { useLanding?: boolean },
  ) => Promise<Funnel | null>;
  updateFunnel: (id: string, updates: Partial<Funnel>) => void;
  saveFunnel: (id: string) => Promise<void>;
  unpublishFunnel: (id: string) => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
  duplicateFunnel: (id: string) => Promise<Funnel | null>;
  getFunnel: (id: string) => Funnel | undefined;
}

const genId = () => crypto.randomUUID();

function dbToFunnel(row: any): Funnel {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    settings: row.settings as Funnel["settings"],
    steps: (row.steps as FunnelStep[]) || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    saved_at: row.saved_at || row.updated_at,
    workspace_id: row.workspace_id,
  };
}

export const useFunnelStore = create<FunnelStore>()((set, get) => ({
  funnels: [],
  loading: false,
  loaded: false,
  currentWorkspaceId: null,

  fetchFunnels: async (workspaceId?: string) => {
    if (!supabase) {
      set({ loading: false, loaded: true });
      return;
    }
    const nextWorkspaceId = workspaceId || null;
    // Re-fetch if workspace changed
    if (get().loaded && get().currentWorkspaceId === nextWorkspaceId && !get().loading) return;
    const workspaceChanged = get().currentWorkspaceId !== nextWorkspaceId;
    set({
      loading: true,
      currentWorkspaceId: nextWorkspaceId,
      ...(workspaceChanged ? { funnels: [] } : {}),
    });

    let query = supabase
      .from("funnels")
      .select("*")
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (get().currentWorkspaceId !== nextWorkspaceId) return;
    if (error) {
      console.error("[funnelStore] fetchFunnels:", error);
    }
    if (!error && data) {
      set({ funnels: data.map(dbToFunnel), loaded: true, loading: false });
    } else {
      set({ funnels: [], loaded: true, loading: false });
    }
  },

  createFunnel: async (name, type, workspaceId, options) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const id = genId();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const steps = createTemplateSteps(id, type);
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(options?.useLanding !== undefined ? { useLanding: options.useLanding } : {}),
    };

    const insertData: any = {
      id,
      user_id: user.id,
      name,
      slug,
      type,
      settings: settings as any,
      steps: steps as any,
    };

    if (workspaceId) {
      insertData.workspace_id = workspaceId;
    }

    const { data, error } = await supabase
      .from("funnels")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) return null;
    const funnel = dbToFunnel(data);
    set((s) => ({ funnels: [funnel, ...s.funnels] }));
    void publishBootstrapMain(funnel.id).catch(() => {
      /* ramas publish por defecto: no bloquear creación */
    });
    return funnel;
  },

  updateFunnel: (id, updates) => {
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f
      ),
    }));
  },

  saveFunnel: async (id) => {
    const funnel = get().funnels.find((f) => f.id === id);
    if (!funnel) return;
    const now = new Date().toISOString();
    await supabase
      .from("funnels")
      .update({
        name: funnel.name,
        slug: funnel.slug,
        type: funnel.type,
        settings: funnel.settings as any,
        steps: funnel.steps as any,
        saved_at: now,
      })
      .eq("id", id);
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, saved_at: now } : f
      ),
    }));
  },

  deleteFunnel: async (id) => {
    await supabase.from("funnels").delete().eq("id", id);
    set((s) => ({ funnels: s.funnels.filter((f) => f.id !== id) }));
  },

  duplicateFunnel: async (id) => {
    const original = get().funnels.find((f) => f.id === id);
    if (!original) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const newId = genId();
    const steps = original.steps.map((s) => ({ ...JSON.parse(JSON.stringify(s)), id: genId(), funnel_id: newId }));

    const insertData: any = {
      id: newId,
      user_id: user.id,
      name: `${original.name} (copia)`,
      slug: `${original.slug}-copy-${Date.now()}`,
      type: original.type,
      settings: original.settings as any,
      steps: steps as any,
    };

    if (original.workspace_id) {
      insertData.workspace_id = original.workspace_id;
    }

    const { data, error } = await supabase
      .from("funnels")
      .insert(insertData)
      .select()
      .single();

    if (error || !data) return null;
    const funnel = dbToFunnel(data);
    set((s) => ({ funnels: [funnel, ...s.funnels] }));
    void publishBootstrapMain(funnel.id).catch(() => {});
    return funnel;
  },

  unpublishFunnel: async (id) => {
    const funnel = get().funnels.find((f) => f.id === id);
    if (!funnel) return;
    // Set saved_at equal to updated_at so isLive becomes false
    await supabase
      .from("funnels")
      .update({ saved_at: funnel.updated_at })
      .eq("id", id);
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, saved_at: f.updated_at } : f
      ),
    }));
  },

  getFunnel: (id) => get().funnels.find((f) => f.id === id),
}));

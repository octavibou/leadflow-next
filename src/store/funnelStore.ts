import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Funnel, FunnelType, FunnelStep } from "@/types/funnel";
import { DEFAULT_SETTINGS } from "@/types/funnel";
import { createTemplateSteps } from "@/lib/templates";

interface FunnelStore {
  funnels: Funnel[];
  loading: boolean;
  loaded: boolean;
  currentWorkspaceId: string | null;
  fetchFunnels: (workspaceId?: string) => Promise<void>;
  createFunnel: (name: string, type: FunnelType, workspaceId?: string) => Promise<Funnel | null>;
  updateFunnel: (id: string, updates: Partial<Funnel>) => void;
  saveFunnel: (id: string) => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
  duplicateFunnel: (id: string) => Promise<Funnel | null>;
  publishFunnel: (id: string) => Promise<void>;
  archiveFunnel: (id: string) => Promise<void>;
  unarchiveFunnel: (id: string) => Promise<void>;
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
    status: row.status || "draft",
    published_at: row.published_at,
    archived_at: row.archived_at,
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
    // Re-fetch if workspace changed
    if (get().loaded && get().currentWorkspaceId === (workspaceId || null)) return;
    set({ loading: true, currentWorkspaceId: workspaceId || null });

    let query = supabase
      .from("funnels")
      .select("*")
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;
    if (!error && data) {
      set({ funnels: data.map(dbToFunnel), loaded: true });
    }
    set({ loading: false });
  },

  createFunnel: async (name, type, workspaceId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const id = genId();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const steps = createTemplateSteps(id, type);
    const settings = { ...DEFAULT_SETTINGS };

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
    return funnel;
  },

  getFunnel: (id) => get().funnels.find((f) => f.id === id),

  publishFunnel: async (id) => {
    const now = new Date().toISOString();
    await supabase
      .from("funnels")
      .update({ status: "published", published_at: now })
      .eq("id", id);
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, status: "published", published_at: now } : f
      ),
    }));
  },

  archiveFunnel: async (id) => {
    const now = new Date().toISOString();
    await supabase
      .from("funnels")
      .update({ status: "archived", archived_at: now })
      .eq("id", id);
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, status: "archived", archived_at: now } : f
      ),
    }));
  },

  unarchiveFunnel: async (id) => {
    const funnel = get().funnels.find((f) => f.id === id);
    const newStatus = funnel?.published_at ? "published" : "draft";
    await supabase
      .from("funnels")
      .update({ status: newStatus, archived_at: null })
      .eq("id", id);
    set((s) => ({
      funnels: s.funnels.map((f) =>
        f.id === id ? { ...f, status: newStatus as any, archived_at: null } : f
      ),
    }));
  },
}

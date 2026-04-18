import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  funnel_id: string;
  name: string;
  slug: string;
  settings: {
    metaPixelId?: string;
    googleTagId?: string;
    trackingEnabled?: boolean;
  };
  steps: any[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface CampaignStore {
  campaigns: Campaign[];
  loading: boolean;
  fetchCampaigns: (funnelId: string) => Promise<void>;
  createCampaign: (funnelId: string, name: string, steps?: any[]) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  duplicateCampaign: (id: string) => Promise<Campaign | null>;
}

function rowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    funnel_id: row.funnel_id,
    name: row.name,
    slug: row.slug,
    settings: (row.settings || {}) as Campaign["settings"],
    steps: (row.steps as any[]) || [],
    is_default: row.is_default,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const useCampaignStore = create<CampaignStore>()((set, get) => ({
  campaigns: [],
  loading: false,

  fetchCampaigns: async (funnelId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("funnel_id", funnelId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      set({ campaigns: data.map(rowToCampaign) });
    }
    set({ loading: false });
  },

  createCampaign: async (funnelId, name, steps: any[] = []) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        funnel_id: funnelId,
        name,
        slug,
        settings: {} as any,
        steps: steps as any,
      })
      .select()
      .single();
    if (error || !data) return null;
    const campaign = rowToCampaign(data);
    set((s) => ({ campaigns: [...s.campaigns, campaign] }));
    return campaign;
  },

  updateCampaign: async (id, updates) => {
    const { error } = await supabase
      .from("campaigns")
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.slug !== undefined && { slug: updates.slug }),
        ...(updates.settings !== undefined && { settings: updates.settings as any }),
        ...(updates.steps !== undefined && { steps: updates.steps as any }),
        ...(updates.is_default !== undefined && { is_default: updates.is_default }),
      })
      .eq("id", id);
    if (!error) {
      set((s) => ({
        campaigns: s.campaigns.map((c) =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        ),
      }));
    }
  },

  deleteCampaign: async (id) => {
    await supabase.from("campaigns").delete().eq("id", id);
    set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) }));
  },

  duplicateCampaign: async (id) => {
    const original = get().campaigns.find((c) => c.id === id);
    if (!original) return null;
    const slug = original.slug + "-copy-" + Date.now().toString(36);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        funnel_id: original.funnel_id,
        name: `${original.name} (copia)`,
        slug,
        settings: original.settings as any,
      })
      .select()
      .single();
    if (error || !data) return null;
    const campaign = rowToCampaign(data);
    set((s) => ({ campaigns: [...s.campaigns, campaign] }));
    return campaign;
  },
}));

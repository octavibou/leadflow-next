import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

interface WorkspaceStore {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  members: WorkspaceMember[];
  loading: boolean;
  loaded: boolean;

  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  getCurrentWorkspace: () => Workspace | undefined;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  updateWorkspace: (id: string, updates: Partial<Pick<Workspace, "name" | "logo_url">>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  fetchMembers: (workspaceId: string) => Promise<void>;
}

const STORAGE_KEY = "quizzflow_current_workspace";

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  workspaces: [],
  currentWorkspaceId: typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  members: [],
  loading: false,
  loaded: false,

  fetchWorkspaces: async () => {
    if (get().loaded) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: true });

      const workspaces = (!error && data ? data : []) as Workspace[];
      set({ workspaces, loaded: true });

      const currentId = get().currentWorkspaceId;
      if (!currentId || !workspaces.find((w) => w.id === currentId)) {
        const first = workspaces[0];
        if (first) {
          set({ currentWorkspaceId: first.id });
          localStorage.setItem(STORAGE_KEY, first.id);
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  setCurrentWorkspace: (id) => {
    set({ currentWorkspaceId: id });
    localStorage.setItem(STORAGE_KEY, id);
  },

  getCurrentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId);
  },

  createWorkspace: async (name) => {
    const { data, error } = await supabase.rpc("create_workspace_with_owner", {
      ws_name: name,
    });

    if (error || !data) return null;
    const wsId = data as string;

    // Fetch the created workspace
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", wsId)
      .single();

    if (!wsData) return null;
    const workspace = wsData as Workspace;

    set((s) => ({ workspaces: [...s.workspaces, workspace] }));
    return workspace;
  },

  updateWorkspace: async (id, updates) => {
    await supabase.from("workspaces").update(updates as any).eq("id", id);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  },

  deleteWorkspace: async (id) => {
    const { error } = await supabase.from("workspaces").delete().eq("id", id);
    if (error) return false;
    const remaining = get().workspaces.filter((w) => w.id !== id);
    set({ workspaces: remaining });
    if (get().currentWorkspaceId === id) {
      const next = remaining[0];
      if (next) {
        set({ currentWorkspaceId: next.id });
        localStorage.setItem(STORAGE_KEY, next.id);
      } else {
        set({ currentWorkspaceId: null });
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return true;
  },

  fetchMembers: async (workspaceId) => {
    const { data } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId);
    if (data) {
      set({ members: data as WorkspaceMember[] });
    }
  },
}));

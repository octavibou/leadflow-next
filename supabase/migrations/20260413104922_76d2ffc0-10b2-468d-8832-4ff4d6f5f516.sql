
-- Table for persisting lead routing configs (one row per workspace)
CREATE TABLE public.route_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.route_configs ENABLE ROW LEVEL SECURITY;

-- Workspace members can view
CREATE POLICY "Members can view route config"
  ON public.route_configs FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Owners/admins can insert
CREATE POLICY "Owners and admins can create route config"
  ON public.route_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

-- Owners/admins can update
CREATE POLICY "Owners and admins can update route config"
  ON public.route_configs FOR UPDATE
  TO authenticated
  USING (
    has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

-- Owners/admins can delete
CREATE POLICY "Owners and admins can delete route config"
  ON public.route_configs FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

-- Anon can read (needed by edge function for public funnel routing)
CREATE POLICY "Anon can read route configs"
  ON public.route_configs FOR SELECT
  TO anon
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_route_configs_updated_at
  BEFORE UPDATE ON public.route_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

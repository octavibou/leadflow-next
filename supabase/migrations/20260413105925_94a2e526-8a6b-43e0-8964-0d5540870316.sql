
CREATE TABLE public.route_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  client_webhook_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_invitations ENABLE ROW LEVEL SECURITY;

-- Workspace members can view
CREATE POLICY "Members can view invitations"
  ON public.route_invitations FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Owners/admins can create
CREATE POLICY "Owners and admins can create invitations"
  ON public.route_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

-- Owners/admins can delete
CREATE POLICY "Owners and admins can delete invitations"
  ON public.route_invitations FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role)
    OR has_workspace_role(auth.uid(), workspace_id, 'admin'::workspace_role)
  );

-- Anon can read by token (public onboarding page)
CREATE POLICY "Anon can read invitations"
  ON public.route_invitations FOR SELECT
  TO anon
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_route_invitations_updated_at
  BEFORE UPDATE ON public.route_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

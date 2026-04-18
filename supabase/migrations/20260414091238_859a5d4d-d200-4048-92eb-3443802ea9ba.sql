
-- Create workspace invitations table
CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role workspace_role NOT NULL DEFAULT 'editor',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Members can view invitations for their workspace
CREATE POLICY "Members can view workspace invitations"
  ON public.workspace_invitations FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Users can see invitations sent to their email
CREATE POLICY "Users can view their own invitations"
  ON public.workspace_invitations FOR SELECT
  TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Owners and admins can create invitations
CREATE POLICY "Owners and admins can create invitations"
  ON public.workspace_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    has_workspace_role(auth.uid(), workspace_id, 'owner') 
    OR has_workspace_role(auth.uid(), workspace_id, 'admin')
  );

-- Owners and admins can delete invitations
CREATE POLICY "Owners and admins can delete invitations"
  ON public.workspace_invitations FOR DELETE
  TO authenticated
  USING (
    has_workspace_role(auth.uid(), workspace_id, 'owner') 
    OR has_workspace_role(auth.uid(), workspace_id, 'admin')
  );

-- Users can update invitations sent to them (accept/decline)
CREATE POLICY "Invited users can update their invitations"
  ON public.workspace_invitations FOR UPDATE
  TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  caller_email text;
BEGIN
  SELECT email FROM auth.users WHERE id = auth.uid() INTO caller_email;
  
  SELECT * FROM public.workspace_invitations 
  WHERE id = invitation_id AND status = 'pending'
  INTO inv;
  
  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  IF lower(inv.email) != lower(caller_email) THEN
    RAISE EXCEPTION 'This invitation is not for you';
  END IF;
  
  -- Add user as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE public.workspace_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;
END;
$$;

-- Add unique constraint on workspace_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workspace_members_workspace_id_user_id_key'
  ) THEN
    ALTER TABLE public.workspace_members 
    ADD CONSTRAINT workspace_members_workspace_id_user_id_key 
    UNIQUE (workspace_id, user_id);
  END IF;
END $$;

-- Trigger for updated_at
CREATE TRIGGER update_workspace_invitations_updated_at
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

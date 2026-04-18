
-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the old policies that reference auth.users directly
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitations" ON public.workspace_invitations;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view their own invitations"
  ON public.workspace_invitations FOR SELECT
  TO authenticated
  USING (lower(email) = lower(public.get_auth_email()));

CREATE POLICY "Invited users can update their invitations"
  ON public.workspace_invitations FOR UPDATE
  TO authenticated
  USING (lower(email) = lower(public.get_auth_email()))
  WITH CHECK (lower(email) = lower(public.get_auth_email()));

-- Also fix the accept function to use the helper
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
  caller_email := public.get_auth_email();
  
  SELECT * FROM public.workspace_invitations 
  WHERE id = invitation_id AND status = 'pending'
  INTO inv;
  
  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;
  
  IF lower(inv.email) != lower(caller_email) THEN
    RAISE EXCEPTION 'This invitation is not for you';
  END IF;
  
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  
  UPDATE public.workspace_invitations 
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;
END;
$$;

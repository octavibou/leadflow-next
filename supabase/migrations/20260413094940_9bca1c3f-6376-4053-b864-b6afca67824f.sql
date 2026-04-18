
-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Create workspace_members table
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Add workspace_id to funnels (nullable for existing data)
ALTER TABLE public.funnels ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Helper function: check if user is member of workspace (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Helper function: check workspace role
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role
  )
$$;

-- RLS for workspaces: members can view
CREATE POLICY "Members can view their workspaces"
ON public.workspaces FOR SELECT
TO authenticated
USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create workspaces"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
ON public.workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- RLS for workspace_members
CREATE POLICY "Members can view other members"
ON public.workspace_members FOR SELECT
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Owners and admins can add members"
ON public.workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  public.has_workspace_role(auth.uid(), workspace_id, 'owner')
  OR public.has_workspace_role(auth.uid(), workspace_id, 'admin')
);

CREATE POLICY "Owners and admins can remove members"
ON public.workspace_members FOR DELETE
TO authenticated
USING (
  public.has_workspace_role(auth.uid(), workspace_id, 'owner')
  OR public.has_workspace_role(auth.uid(), workspace_id, 'admin')
);

CREATE POLICY "Owners can update member roles"
ON public.workspace_members FOR UPDATE
TO authenticated
USING (public.has_workspace_role(auth.uid(), workspace_id, 'owner'));

-- Function to create default workspace on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES ('Mi Workspace', NEW.id)
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_workspace
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_workspace();

-- Trigger for updated_at on workspaces
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for funnel thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('funnel-thumbnails', 'funnel-thumbnails', true);

CREATE POLICY "Anyone can view funnel thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'funnel-thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'funnel-thumbnails');

CREATE POLICY "Authenticated users can update their thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'funnel-thumbnails');

CREATE POLICY "Authenticated users can delete their thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'funnel-thumbnails');

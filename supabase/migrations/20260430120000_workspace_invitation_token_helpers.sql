-- Leer datos mínimos de una invitación pendiente solo con el token (enlace del correo).
-- El token es opaco y actúa como secreto frente al ID en la URL.

CREATE OR REPLACE FUNCTION public.peek_workspace_invitation_by_token(_token text)
RETURNS TABLE (workspace_name text, role workspace_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.name AS workspace_name, i.role
  FROM public.workspace_invitations i
  JOIN public.workspaces w ON w.id = i.workspace_id
  WHERE i.token = _token
    AND i.status = 'pending'
  LIMIT 1;
$$;

-- Invitado ya autenticado: obtener el ID de fila cuando el email coincide.
CREATE OR REPLACE FUNCTION public.resolve_workspace_invitation_id_for_token(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id
  FROM public.workspace_invitations i
  WHERE i.token = _token
    AND i.status = 'pending'
    AND lower(i.email) = lower(public.get_auth_email())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.peek_workspace_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_workspace_invitation_id_for_token(text) TO authenticated;

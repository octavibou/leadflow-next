-- Uso de asientos del plan del dueño de los workspaces (miembros + invitaciones pendientes),
-- consultable por cualquier miembro del workspace indicado (evita leer subscriptions con RLS del cliente).

CREATE OR REPLACE FUNCTION public.workspace_seat_usage_snapshot(_workspace_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  ws_ids uuid[];
  lim int;
  mcount bigint;
  icount bigint;
  total bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_workspace_member(auth.uid(), _workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT w.owner_id INTO owner_id FROM public.workspaces w WHERE w.id = _workspace_id;
  IF owner_id IS NULL THEN
    RETURN jsonb_build_object('used', 0, 'seat_limit', 1);
  END IF;

  SELECT COALESCE((s.plan_limits->>'seats')::int, 1)
  INTO lim
  FROM public.subscriptions s
  WHERE s.user_id = owner_id;

  IF lim IS NULL OR lim < 1 THEN
    lim := 1;
  END IF;

  SELECT COALESCE(array_agg(w.id), ARRAY[]::uuid[])
  INTO ws_ids
  FROM public.workspaces w
  WHERE w.owner_id = owner_id;

  IF ws_ids IS NULL OR cardinality(ws_ids) = 0 THEN
    RETURN jsonb_build_object('used', 0, 'seat_limit', lim);
  END IF;

  SELECT COUNT(*)::bigint INTO mcount
  FROM (
    SELECT DISTINCT wm.user_id
    FROM public.workspace_members wm
    WHERE wm.workspace_id = ANY (ws_ids)
  ) memb;

  SELECT COUNT(*)::bigint INTO icount
  FROM (
    SELECT DISTINCT lower(i.email)
    FROM public.workspace_invitations i
    WHERE i.workspace_id = ANY (ws_ids)
      AND i.status = 'pending'
  ) inv;

  total := COALESCE(mcount, 0) + COALESCE(icount, 0);

  RETURN jsonb_build_object('used', total, 'seat_limit', lim);
END;
$$;

GRANT EXECUTE ON FUNCTION public.workspace_seat_usage_snapshot(uuid) TO authenticated;

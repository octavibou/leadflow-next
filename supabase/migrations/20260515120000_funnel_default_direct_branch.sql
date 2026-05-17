-- Segunda rama por defecto `direct` (solo funnel) para funnels que solo tenían `main`.
-- Idempotente.

INSERT INTO public.funnel_branches (funnel_id, name, slug, is_main)
SELECT b.funnel_id, 'Solo funnel', 'direct', false
FROM public.funnel_branches b
WHERE b.is_main = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.funnel_branches x
    WHERE x.funnel_id = b.funnel_id
      AND lower(x.slug) = 'direct'
  );

-- Deployment inicial en ramas `direct` sin deployment (puntero vacío).
INSERT INTO public.funnel_deployments (branch_id, version, landing_snapshot, settings_patch, status)
SELECT
  b.id,
  1,
  jsonb_build_object(
    'snapshot_version', 1,
    'introStep', (
      SELECT elem
      FROM jsonb_array_elements(COALESCE(f.steps, '[]'::jsonb)) AS elem
      WHERE elem->>'type' = 'intro'
      LIMIT 1
    ),
    'useLanding', false
  ),
  '{}'::jsonb,
  'ready'
FROM public.funnel_branches b
JOIN public.funnels f ON f.id = b.funnel_id
JOIN public.funnel_branch_pointers p ON p.branch_id = b.id
WHERE lower(b.slug) = 'direct'
  AND p.active_deployment_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.funnel_deployments d WHERE d.branch_id = b.id);

-- Activar puntero en ramas `direct` si sigue vacío (p. ej. tras insert anterior).
UPDATE public.funnel_branch_pointers p
SET active_deployment_id = x.dep_id, updated_at = now()
FROM (
  SELECT DISTINCT ON (d.branch_id) d.branch_id, d.id AS dep_id
  FROM public.funnel_deployments d
  JOIN public.funnel_branches b ON b.id = d.branch_id AND lower(b.slug) = 'direct'
  ORDER BY d.branch_id, d.version DESC
) x
WHERE p.branch_id = x.branch_id
  AND p.active_deployment_id IS NULL;

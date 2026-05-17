-- Publish System: branches, immutable deployments, active pointer, activity log.
-- Backwards-compatible: existing funnels/campaigns unchanged; new tables only.

-- ---------------------------------------------------------------------------
-- funnel_branches
-- ---------------------------------------------------------------------------
CREATE TABLE public.funnel_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, slug)
);

CREATE UNIQUE INDEX funnel_branches_one_main_per_funnel
  ON public.funnel_branches (funnel_id)
  WHERE is_main = true;

CREATE INDEX idx_funnel_branches_funnel_id ON public.funnel_branches (funnel_id);

-- ---------------------------------------------------------------------------
-- funnel_deployments (immutable rows; rollback = move pointer)
-- ---------------------------------------------------------------------------
CREATE TABLE public.funnel_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.funnel_branches(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  landing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings_patch JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ready',
  UNIQUE (branch_id, version)
);

CREATE INDEX idx_funnel_deployments_branch_id ON public.funnel_deployments (branch_id);

-- ---------------------------------------------------------------------------
-- funnel_branch_pointers (active production deployment per branch)
-- ---------------------------------------------------------------------------
CREATE TABLE public.funnel_branch_pointers (
  branch_id UUID NOT NULL PRIMARY KEY REFERENCES public.funnel_branches(id) ON DELETE CASCADE,
  active_deployment_id UUID REFERENCES public.funnel_deployments(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- funnel_activity_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.funnel_activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.funnel_branches(id) ON DELETE SET NULL,
  deployment_id UUID REFERENCES public.funnel_deployments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_activity_funnel_created ON public.funnel_activity_events (funnel_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.funnel_branch_pointers_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER funnel_branch_pointers_updated_at
  BEFORE UPDATE ON public.funnel_branch_pointers
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_branch_pointers_touch_updated_at();

CREATE OR REPLACE FUNCTION public.funnel_branches_create_pointer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.funnel_branch_pointers (branch_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER funnel_branches_after_insert_pointer
  AFTER INSERT ON public.funnel_branches
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_branches_create_pointer();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.funnel_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_branch_pointers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_activity_events ENABLE ROW LEVEL SECURITY;

-- funnel_branches: owners
CREATE POLICY "Users manage branches of own funnels"
  ON public.funnel_branches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_branches.funnel_id AND f.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_branches.funnel_id AND f.user_id = auth.uid())
  );

-- Public read branches for published funnels (needed for /f/{id}/{slug})
CREATE POLICY "Public can view branches of published funnels"
  ON public.funnel_branches
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.funnels f
      WHERE f.id = funnel_branches.funnel_id
        AND f.saved_at IS NOT NULL
        AND f.saved_at <> f.updated_at
    )
  );

-- funnel_deployments: owners full access
CREATE POLICY "Users manage deployments of own funnel branches"
  ON public.funnel_deployments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_branches b
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE b.id = funnel_deployments.branch_id AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_branches b
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE b.id = funnel_deployments.branch_id AND f.user_id = auth.uid()
    )
  );

-- Anon: only rows that are the active deployment of some published funnel branch
CREATE POLICY "Public can view active deployments for published funnels"
  ON public.funnel_deployments
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_branch_pointers p
      JOIN public.funnel_branches b ON b.id = p.branch_id
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE p.active_deployment_id = funnel_deployments.id
        AND f.saved_at IS NOT NULL
        AND f.saved_at <> f.updated_at
    )
  );

-- funnel_branch_pointers: owners
CREATE POLICY "Users manage branch pointers of own funnels"
  ON public.funnel_branch_pointers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_branches b
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE b.id = funnel_branch_pointers.branch_id AND f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.funnel_branches b
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE b.id = funnel_branch_pointers.branch_id AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view branch pointers for published funnels"
  ON public.funnel_branch_pointers
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.funnel_branches b
      JOIN public.funnels f ON f.id = b.funnel_id
      WHERE b.id = funnel_branch_pointers.branch_id
        AND f.saved_at IS NOT NULL
        AND f.saved_at <> f.updated_at
    )
  );

-- Activity: owners only
CREATE POLICY "Users view activity of own funnels"
  ON public.funnel_activity_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_activity_events.funnel_id AND f.user_id = auth.uid())
  );

CREATE POLICY "Users insert activity for own funnels"
  ON public.funnel_activity_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.funnels f WHERE f.id = funnel_activity_events.funnel_id AND f.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Seed: main branch + deployment v1 (intro from steps) for published funnels
-- ---------------------------------------------------------------------------
INSERT INTO public.funnel_branches (funnel_id, name, slug, is_main)
SELECT f.id, 'main', 'main', true
FROM public.funnels f
WHERE f.saved_at IS NOT NULL
  AND f.saved_at <> f.updated_at
  AND NOT EXISTS (
    SELECT 1 FROM public.funnel_branches b WHERE b.funnel_id = f.id AND b.is_main = true
  );

DO $$
DECLARE
  r RECORD;
  v_branch_id UUID;
  v_intro JSONB;
  v_dep_id UUID;
BEGIN
  FOR r IN
    SELECT f.id AS fid, f.steps AS steps
    FROM public.funnels f
    WHERE f.saved_at IS NOT NULL
      AND f.saved_at <> f.updated_at
  LOOP
    SELECT b.id INTO v_branch_id
    FROM public.funnel_branches b
    WHERE b.funnel_id = r.fid AND b.is_main = true
    LIMIT 1;

    IF v_branch_id IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.funnel_branch_pointers p
      WHERE p.branch_id = v_branch_id AND p.active_deployment_id IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    SELECT elem INTO v_intro
    FROM jsonb_array_elements(COALESCE(r.steps, '[]'::jsonb)) AS elem
    WHERE elem->>'type' = 'intro'
    LIMIT 1;

    INSERT INTO public.funnel_deployments (branch_id, version, landing_snapshot, status)
    VALUES (
      v_branch_id,
      1,
      jsonb_build_object(
        'snapshot_version', 1,
        'introStep', v_intro
      ),
      'ready'
    )
    RETURNING id INTO v_dep_id;

    UPDATE public.funnel_branch_pointers
    SET active_deployment_id = v_dep_id, updated_at = now()
    WHERE branch_id = v_branch_id;
  END LOOP;
END $$;

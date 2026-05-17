-- Analytics por versión: índices JSONB (Fase A) + columnas denormalizadas (Fase B) para consultas SQL.

-- ---------------------------------------------------------------------------
-- Columnas opcionales (copiadas desde metadata en insert API/cliente)
-- ---------------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.funnel_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deployment_id uuid REFERENCES public.funnel_deployments(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.funnel_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deployment_id uuid REFERENCES public.funnel_deployments(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Índices JSONB (metadata sigue siendo fuente de verdad para histórico)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_metadata_deployment_id
  ON public.events ((metadata->>'deployment_id'))
  WHERE metadata ? 'deployment_id';

CREATE INDEX IF NOT EXISTS idx_events_metadata_branch_id
  ON public.events ((metadata->>'branch_id'))
  WHERE metadata ? 'branch_id';

CREATE INDEX IF NOT EXISTS idx_events_funnel_deployment_created
  ON public.events (funnel_id, ((metadata->>'deployment_id')), created_at DESC)
  WHERE metadata ? 'deployment_id';

CREATE INDEX IF NOT EXISTS idx_events_branch_id_col
  ON public.events (branch_id)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_deployment_id_col
  ON public.events (deployment_id)
  WHERE deployment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_funnel_deployment_col_created
  ON public.events (funnel_id, deployment_id, created_at DESC)
  WHERE deployment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_branch_id_col
  ON public.leads (branch_id)
  WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_deployment_id_col
  ON public.leads (deployment_id)
  WHERE deployment_id IS NOT NULL;

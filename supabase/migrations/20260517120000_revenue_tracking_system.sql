-- Revenue Tracking System Migration
-- Enables closed-loop tracking between LeadFlow and CRMs (GHL)

-- 1) Extend leads with stage and revenue columns
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenue_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS revenue_currency text DEFAULT 'EUR';

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(funnel_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON leads(external_id) WHERE external_id IS NOT NULL;

-- 2) Table lead_deals: source of truth for revenue
CREATE TABLE IF NOT EXISTS lead_deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES leads(id) ON DELETE CASCADE,
  funnel_id       uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  branch_id       uuid REFERENCES funnel_branches(id) ON DELETE SET NULL,
  deployment_id   uuid REFERENCES funnel_deployments(id) ON DELETE SET NULL,

  external_provider text NOT NULL,
  external_deal_id  text NOT NULL,
  external_pipeline_id  text,
  external_stage_id     text,
  external_stage_name   text,

  status        text NOT NULL DEFAULT 'open',
  amount        numeric(12,2),
  currency      text DEFAULT 'EUR',
  closed_at     timestamptz,
  raw_payload   jsonb NOT NULL DEFAULT '{}',
  metadata      jsonb NOT NULL DEFAULT '{}',

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (external_provider, external_deal_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_deals_funnel_status ON lead_deals(funnel_id, status, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_deals_campaign ON lead_deals(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_deals_branch ON lead_deals(branch_id, deployment_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_lead ON lead_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_deals_workspace ON lead_deals(workspace_id, created_at DESC);

-- 3) Table webhook_events_in: inbound webhook event log
CREATE TABLE IF NOT EXISTS webhook_events_in (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider      text NOT NULL,
  event_type    text NOT NULL,
  external_event_id text,
  signature     text,
  raw_payload   jsonb NOT NULL,
  processed_at  timestamptz,
  result        text,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_in_ws ON webhook_events_in(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_in_dedup ON webhook_events_in(provider, external_event_id) 
  WHERE external_event_id IS NOT NULL;

-- 4) Table workspace_integrations: per-workspace integration config
CREATE TABLE IF NOT EXISTS workspace_integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  config          jsonb NOT NULL DEFAULT '{}',
  inbound_secret  text,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_workspace_integrations_ws ON workspace_integrations(workspace_id);

-- 5) RLS policies
ALTER TABLE lead_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;

-- lead_deals: access via workspace membership
CREATE POLICY lead_deals_select ON lead_deals FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY lead_deals_insert ON lead_deals FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY lead_deals_update ON lead_deals FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- webhook_events_in: read-only for workspace members
CREATE POLICY webhook_events_in_select ON webhook_events_in FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- workspace_integrations: admin/owner only for all operations
CREATE POLICY workspace_integrations_select ON workspace_integrations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY workspace_integrations_insert ON workspace_integrations FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY workspace_integrations_update ON workspace_integrations FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY workspace_integrations_delete ON workspace_integrations FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

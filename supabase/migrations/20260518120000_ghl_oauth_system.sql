-- GHL OAuth System Migration
-- Enables native GoHighLevel integration with OAuth, field sync, and lead sending

-- 1) Table ghl_field_mappings: maps Leadflow funnel fields to GHL custom fields
CREATE TABLE ghl_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  funnel_id uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  
  leadflow_field_slug text NOT NULL,
  leadflow_field_label text NOT NULL,
  leadflow_field_type text NOT NULL,
  
  ghl_field_id text,
  ghl_field_name text,
  
  created_in_ghl boolean NOT NULL DEFAULT false,
  sync_status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (funnel_id, leadflow_field_slug)
);

CREATE INDEX idx_ghl_field_mappings_workspace ON ghl_field_mappings(workspace_id);
CREATE INDEX idx_ghl_field_mappings_funnel ON ghl_field_mappings(funnel_id);
CREATE INDEX idx_ghl_field_mappings_sync_status ON ghl_field_mappings(funnel_id, sync_status);

-- 2) Table ghl_sync_events: audit trail for all GHL integration events
CREATE TABLE ghl_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  funnel_id uuid REFERENCES funnels(id) ON DELETE SET NULL,
  
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ghl_sync_events_workspace ON ghl_sync_events(workspace_id, created_at DESC);
CREATE INDEX idx_ghl_sync_events_funnel ON ghl_sync_events(funnel_id, created_at DESC);
CREATE INDEX idx_ghl_sync_events_type ON ghl_sync_events(event_type, created_at DESC);

-- 3) Add ghl_send_status to leads for tracking send attempts
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS ghl_send_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ghl_send_error text,
  ADD COLUMN IF NOT EXISTS ghl_sent_at timestamptz;

CREATE INDEX idx_leads_ghl_status ON leads(funnel_id, ghl_send_status) 
  WHERE ghl_send_status IS NOT NULL AND ghl_send_status != 'pending';

-- 4) RLS policies for ghl_field_mappings
ALTER TABLE ghl_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ghl_field_mappings_select ON ghl_field_mappings FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY ghl_field_mappings_insert ON ghl_field_mappings FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY ghl_field_mappings_update ON ghl_field_mappings FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY ghl_field_mappings_delete ON ghl_field_mappings FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- 5) RLS policies for ghl_sync_events
ALTER TABLE ghl_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ghl_sync_events_select ON ghl_sync_events FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY ghl_sync_events_insert ON ghl_sync_events FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

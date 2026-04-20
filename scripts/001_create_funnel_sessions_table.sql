-- Create funnel_sessions table to track funnel submissions and qualification scores
CREATE TABLE IF NOT EXISTS funnel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  is_qualified BOOLEAN DEFAULT FALSE,
  became_lead BOOLEAN DEFAULT FALSE,
  qualification_score INTEGER DEFAULT 0, -- 0-100 based on form responses
  user_answers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for funnel_sessions
ALTER TABLE funnel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view funnel sessions in their workspace"
  ON funnel_sessions FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM workspace_members WHERE workspace_id = funnel_sessions.workspace_id
  ));

CREATE POLICY "Users can insert funnel sessions in their workspace"
  ON funnel_sessions FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM workspace_members WHERE workspace_id = funnel_sessions.workspace_id
  ));

CREATE POLICY "Users can update funnel sessions in their workspace"
  ON funnel_sessions FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM workspace_members WHERE workspace_id = funnel_sessions.workspace_id
  ));

-- Create index for faster queries
CREATE INDEX idx_funnel_sessions_funnel_id ON funnel_sessions(funnel_id);
CREATE INDEX idx_funnel_sessions_workspace_id ON funnel_sessions(workspace_id);
CREATE INDEX idx_funnel_sessions_created_at ON funnel_sessions(created_at);
CREATE INDEX idx_funnel_sessions_is_qualified ON funnel_sessions(is_qualified);

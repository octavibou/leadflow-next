-- Create funnel_sessions table to track funnel submissions and qualification scores
CREATE TABLE IF NOT EXISTS funnel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  is_qualified BOOLEAN DEFAULT FALSE,
  became_lead BOOLEAN DEFAULT FALSE,
  qualification_score INTEGER DEFAULT 0,
  user_answers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_funnel_id ON funnel_sessions(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_created_at ON funnel_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_is_qualified ON funnel_sessions(is_qualified);

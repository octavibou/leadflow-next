-- Add status column to funnels table for publish/archive system
-- Status: 'draft' (building/testing), 'published' (active, generates leads), 'archived' (inactive, doesn't count against quota)

-- Add the status column with default 'draft'
ALTER TABLE funnels 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

-- Add published_at timestamp to track when funnel was first published
ALTER TABLE funnels 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add archived_at timestamp to track when funnel was archived
ALTER TABLE funnels 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_funnels_status ON funnels(status);

-- Update existing funnels to have 'draft' status (already handled by DEFAULT, but explicit for clarity)
UPDATE funnels SET status = 'draft' WHERE status IS NULL;

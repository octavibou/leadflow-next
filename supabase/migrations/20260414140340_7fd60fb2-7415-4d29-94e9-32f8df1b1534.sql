ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'start',
  ADD COLUMN IF NOT EXISTS plan_limits jsonb NOT NULL DEFAULT '{"funnels":2,"seats":1,"leads":100}'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'eur';
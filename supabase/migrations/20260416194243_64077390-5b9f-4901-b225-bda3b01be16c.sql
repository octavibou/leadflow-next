
-- 1. Add metered tracking columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS leads_used_current_period integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metered_subscription_item_id text,
  ADD COLUMN IF NOT EXISTS period_start timestamp with time zone;

-- 2. Update default plan_limits to new structure
ALTER TABLE public.subscriptions
  ALTER COLUMN plan_limits SET DEFAULT '{"funnels": 2, "workspaces": 1, "seats": 1, "leads": 200}'::jsonb;

-- 3. Lead usage queue with retry
CREATE TABLE IF NOT EXISTS public.lead_usage_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_usage_queue_status ON public.lead_usage_queue(status, created_at);

ALTER TABLE public.lead_usage_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages lead usage queue"
  ON public.lead_usage_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_lead_usage_queue_updated
  BEFORE UPDATE ON public.lead_usage_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger on leads: increment counter + enqueue overage
CREATE OR REPLACE FUNCTION public.handle_lead_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  funnel_owner uuid;
  sub_record RECORD;
  included integer;
  new_count integer;
BEGIN
  SELECT user_id INTO funnel_owner FROM public.funnels WHERE id = NEW.funnel_id;
  IF funnel_owner IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, plan_limits, metered_subscription_item_id, leads_used_current_period
    INTO sub_record
    FROM public.subscriptions
    WHERE user_id = funnel_owner
    LIMIT 1;

  IF sub_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  included := COALESCE((sub_record.plan_limits->>'leads')::integer, 0);

  UPDATE public.subscriptions
    SET leads_used_current_period = leads_used_current_period + 1,
        updated_at = now()
    WHERE id = sub_record.id
    RETURNING leads_used_current_period INTO new_count;

  -- Enqueue overage if past included AND we have a metered item
  IF new_count > included AND sub_record.metered_subscription_item_id IS NOT NULL THEN
    INSERT INTO public.lead_usage_queue (subscription_id, user_id, lead_id)
    VALUES (sub_record.id, funnel_owner, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_lead_usage ON public.leads;
CREATE TRIGGER trg_handle_lead_usage
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_usage();

-- 5. Reset helper used by stripe webhook
CREATE OR REPLACE FUNCTION public.reset_leads_usage_for_subscription(_stripe_subscription_id text, _period_start timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
    SET leads_used_current_period = 0,
        period_start = _period_start,
        updated_at = now()
    WHERE stripe_subscription_id = _stripe_subscription_id;
END;
$$;

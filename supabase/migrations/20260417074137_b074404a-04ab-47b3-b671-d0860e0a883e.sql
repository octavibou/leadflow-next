
CREATE OR REPLACE FUNCTION public.handle_lead_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  funnel_owner uuid;
  sub_record RECORD;
  included integer;
  prev_count integer;
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
  prev_count := sub_record.leads_used_current_period;

  UPDATE public.subscriptions
    SET leads_used_current_period = leads_used_current_period + 1,
        updated_at = now()
    WHERE id = sub_record.id
    RETURNING leads_used_current_period INTO new_count;

  -- Only enqueue if THIS lead pushed the counter past the included limit.
  -- prev_count >= included means we were already over, so this lead is overage.
  -- Avoids double-counting when manual adjustments inflate leads_used_current_period.
  IF prev_count >= included AND sub_record.metered_subscription_item_id IS NOT NULL THEN
    INSERT INTO public.lead_usage_queue (subscription_id, user_id, lead_id)
    VALUES (sub_record.id, funnel_owner, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

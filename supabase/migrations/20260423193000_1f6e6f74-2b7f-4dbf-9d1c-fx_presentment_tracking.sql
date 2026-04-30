ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS presentment_currency text,
  ADD COLUMN IF NOT EXISTS presentment_amount integer;

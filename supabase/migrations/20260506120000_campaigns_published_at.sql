-- Variantes (campaigns): publicación independiente del funnel base
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.campaigns.published_at IS 'Si no es NULL, la variante es accesible en la URL pública con ?c=slug';

-- Solo campañas publicadas exponen datos al rol anónimo (evita filtrar borradores)
DROP POLICY IF EXISTS "Public can view campaigns by slug" ON public.campaigns;

CREATE POLICY "Public can view published campaigns by slug"
  ON public.campaigns FOR SELECT
  TO anon
  USING (
    published_at IS NOT NULL
    AND updated_at <= published_at
  );

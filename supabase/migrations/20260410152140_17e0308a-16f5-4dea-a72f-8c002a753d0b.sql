
-- =============================================
-- CAMPAIGNS TABLE
-- =============================================
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, slug)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can view campaigns of their funnels"
  ON public.campaigns FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = campaigns.funnel_id AND funnels.user_id = auth.uid())
  );

-- Public read for loading tracking config
CREATE POLICY "Public can view campaigns by slug"
  ON public.campaigns FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create campaigns for their funnels"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = campaigns.funnel_id AND funnels.user_id = auth.uid())
  );

CREATE POLICY "Users can update campaigns of their funnels"
  ON public.campaigns FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = campaigns.funnel_id AND funnels.user_id = auth.uid())
  );

CREATE POLICY "Users can delete campaigns of their funnels"
  ON public.campaigns FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = campaigns.funnel_id AND funnels.user_id = auth.uid())
  );

-- Timestamp trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- LEADS TABLE
-- =============================================
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  result TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert leads (public funnel visitors)
CREATE POLICY "Anyone can create leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only funnel owner can view leads
CREATE POLICY "Users can view leads of their funnels"
  ON public.leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = leads.funnel_id AND funnels.user_id = auth.uid())
  );

-- =============================================
-- EVENTS TABLE
-- =============================================
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (tracking from public funnel)
CREATE POLICY "Anyone can create events"
  ON public.events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only funnel owner can view events
CREATE POLICY "Users can view events of their funnels"
  ON public.events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.funnels WHERE funnels.id = events.funnel_id AND funnels.user_id = auth.uid())
  );

-- Index for analytics queries
CREATE INDEX idx_events_funnel_campaign ON public.events(funnel_id, campaign_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_leads_funnel_campaign ON public.leads(funnel_id, campaign_id);

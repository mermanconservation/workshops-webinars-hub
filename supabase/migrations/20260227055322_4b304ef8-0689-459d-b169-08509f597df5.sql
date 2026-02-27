
-- Junction table for multiple presenters per workshop
CREATE TABLE public.workshop_presenters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  presenter_id UUID NOT NULL REFERENCES public.presenters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workshop_id, presenter_id)
);

-- Enable RLS
ALTER TABLE public.workshop_presenters ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view workshop presenters" ON public.workshop_presenters FOR SELECT USING (true);

-- Migrate existing presenter_id data to junction table
INSERT INTO public.workshop_presenters (workshop_id, presenter_id)
SELECT id, presenter_id FROM public.workshops WHERE presenter_id IS NOT NULL
ON CONFLICT DO NOTHING;

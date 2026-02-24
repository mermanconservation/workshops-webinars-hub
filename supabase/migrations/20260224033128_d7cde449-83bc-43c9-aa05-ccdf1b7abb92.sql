
-- Company settings (singleton)
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Wildlife UK',
  logo_url TEXT,
  director_name TEXT,
  director_signature_url TEXT,
  additional_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "No direct insert/update/delete" ON public.company_settings FOR ALL USING (false);

-- Insert default row
INSERT INTO public.company_settings (company_name) VALUES ('Wildlife UK');

-- Presenters
CREATE TABLE public.presenters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  signature_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.presenters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view presenters" ON public.presenters FOR SELECT USING (true);

-- Workshops
CREATE TABLE public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  presenter_id UUID REFERENCES public.presenters(id),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  max_participants INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT USING (true);

-- Workshop participants
CREATE TABLE public.workshop_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workshop_id, email)
);

ALTER TABLE public.workshop_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view participants" ON public.workshop_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON public.workshop_participants FOR INSERT WITH CHECK (true);

-- Workshop videos (YouTube)
CREATE TABLE public.workshop_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view videos" ON public.workshop_videos FOR SELECT USING (true);

-- Workshop materials
CREATE TABLE public.workshop_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view materials" ON public.workshop_materials FOR SELECT USING (true);

-- Storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('workshop-assets', 'workshop-assets', true);

CREATE POLICY "Anyone can view workshop assets" ON storage.objects FOR SELECT USING (bucket_id = 'workshop-assets');
CREATE POLICY "Anyone can upload workshop assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workshop-assets');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

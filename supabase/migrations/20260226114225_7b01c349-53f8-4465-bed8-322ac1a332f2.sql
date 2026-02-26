
-- Add event_type and timeline columns to workshops
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'workshop';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS timeline text;

-- Fix ALL RLS policies to be PERMISSIVE (they are currently RESTRICTIVE which blocks access)

-- workshops
DROP POLICY IF EXISTS "Anyone can view workshops" ON public.workshops;
CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT USING (true);

-- presenters
DROP POLICY IF EXISTS "Anyone can view presenters" ON public.presenters;
CREATE POLICY "Anyone can view presenters" ON public.presenters FOR SELECT USING (true);

-- workshop_videos
DROP POLICY IF EXISTS "Anyone can view videos" ON public.workshop_videos;
CREATE POLICY "Anyone can view videos" ON public.workshop_videos FOR SELECT USING (true);

-- workshop_materials
DROP POLICY IF EXISTS "Anyone can view materials" ON public.workshop_materials;
CREATE POLICY "Anyone can view materials" ON public.workshop_materials FOR SELECT USING (true);

-- workshop_participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.workshop_participants;
CREATE POLICY "Anyone can view participants" ON public.workshop_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can register" ON public.workshop_participants;
CREATE POLICY "Anyone can register" ON public.workshop_participants FOR INSERT WITH CHECK (true);

-- company_settings
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);

-- certificate_verifications
DROP POLICY IF EXISTS "Anyone can verify certificates" ON public.certificate_verifications;
CREATE POLICY "Anyone can verify certificates" ON public.certificate_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert verifications" ON public.certificate_verifications;
CREATE POLICY "Anyone can insert verifications" ON public.certificate_verifications FOR INSERT WITH CHECK (true);

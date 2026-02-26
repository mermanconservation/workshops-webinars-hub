
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- certificate_verifications
DROP POLICY IF EXISTS "Anyone can verify certificates" ON public.certificate_verifications;
CREATE POLICY "Anyone can verify certificates" ON public.certificate_verifications FOR SELECT USING (true);

-- company_settings
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "No direct insert/update/delete" ON public.company_settings;
CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);

-- presenters
DROP POLICY IF EXISTS "Anyone can view presenters" ON public.presenters;
CREATE POLICY "Anyone can view presenters" ON public.presenters FOR SELECT USING (true);

-- workshop_materials
DROP POLICY IF EXISTS "Anyone can view materials" ON public.workshop_materials;
CREATE POLICY "Anyone can view materials" ON public.workshop_materials FOR SELECT USING (true);

-- workshop_participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.workshop_participants;
DROP POLICY IF EXISTS "Anyone can register" ON public.workshop_participants;
CREATE POLICY "Anyone can view participants" ON public.workshop_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON public.workshop_participants FOR INSERT WITH CHECK (true);

-- workshop_videos
DROP POLICY IF EXISTS "Anyone can view videos" ON public.workshop_videos;
CREATE POLICY "Anyone can view videos" ON public.workshop_videos FOR SELECT USING (true);

-- workshops
DROP POLICY IF EXISTS "Anyone can view workshops" ON public.workshops;
CREATE POLICY "Anyone can view workshops" ON public.workshops FOR SELECT USING (true);

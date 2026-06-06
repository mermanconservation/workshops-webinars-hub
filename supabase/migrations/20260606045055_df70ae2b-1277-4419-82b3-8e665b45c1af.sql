
CREATE TABLE public.workshop_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workshop_lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_lessons TO authenticated;
GRANT ALL ON public.workshop_lessons TO service_role;

ALTER TABLE public.workshop_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
ON public.workshop_lessons FOR SELECT
USING (true);

CREATE TRIGGER update_workshop_lessons_updated_at
BEFORE UPDATE ON public.workshop_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workshop_lessons_workshop_id ON public.workshop_lessons(workshop_id);

CREATE TABLE public.lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.workshop_lessons(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_completions TO anon, authenticated;
GRANT ALL ON public.lesson_completions TO service_role;

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lesson completions"
  ON public.lesson_completions FOR SELECT USING (true);

CREATE POLICY "Anyone can mark lesson completions"
  ON public.lesson_completions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can remove lesson completions"
  ON public.lesson_completions FOR DELETE USING (true);

CREATE INDEX idx_lesson_completions_workshop_email
  ON public.lesson_completions (workshop_id, email);
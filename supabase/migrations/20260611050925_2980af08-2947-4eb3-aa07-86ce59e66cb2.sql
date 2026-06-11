
ALTER TABLE public.workshop_lessons ALTER COLUMN workshop_id DROP NOT NULL;
ALTER TABLE public.workshop_lessons ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS workshop_lessons_course_id_idx ON public.workshop_lessons(course_id);

ALTER TABLE public.lesson_completions ALTER COLUMN workshop_id DROP NOT NULL;
ALTER TABLE public.lesson_completions ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS lesson_completions_course_id_idx ON public.lesson_completions(course_id);


-- Quizzes and exams for courses
CREATE TABLE public.course_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.workshop_lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('lesson','final')),
  title TEXT NOT NULL,
  pass_score INT NOT NULL DEFAULT 70,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_quizzes TO authenticated;
GRANT ALL ON public.course_quizzes TO service_role;
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read course quizzes"
  ON public.course_quizzes FOR SELECT USING (true);
CREATE POLICY "Service role manages quizzes"
  ON public.course_quizzes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_course_quizzes_course ON public.course_quizzes(course_id);
CREATE INDEX idx_course_quizzes_lesson ON public.course_quizzes(lesson_id);

CREATE TRIGGER trg_course_quizzes_updated
  BEFORE UPDATE ON public.course_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read attempts (cooldown check)"
  ON public.quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert attempts"
  ON public.quiz_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role manages attempts"
  ON public.quiz_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_quiz_attempts_lookup ON public.quiz_attempts(quiz_id, email, created_at DESC);

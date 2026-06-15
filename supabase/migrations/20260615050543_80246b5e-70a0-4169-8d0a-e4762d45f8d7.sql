
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS final_pass_score INT NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS lesson_quiz_weight INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS require_all_lesson_quizzes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_final_exam BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS certificate_template_url TEXT;

import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

// ============ Question schema ============
export const QuestionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('single'),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(8),
    answer: z.number().int().min(0),
    points: z.number().int().min(1).default(1),
  }),
  z.object({
    id: z.string(),
    type: z.literal('multiple'),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(8),
    answer: z.array(z.number().int().min(0)).min(1),
    points: z.number().int().min(1).default(1),
  }),
  z.object({
    id: z.string(),
    type: z.literal('truefalse'),
    prompt: z.string().min(1),
    answer: z.boolean(),
    points: z.number().int().min(1).default(1),
  }),
  z.object({
    id: z.string(),
    type: z.literal('short'),
    prompt: z.string().min(1),
    answer: z.string().min(1),
    caseSensitive: z.boolean().default(false),
    points: z.number().int().min(1).default(1),
  }),
]);
export type Question = z.infer<typeof QuestionSchema>;

export const QuizSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  lesson_id: z.string().uuid().nullable(),
  kind: z.enum(['lesson', 'final']),
  title: z.string(),
  pass_score: z.number().int().min(0).max(100),
  questions: z.array(QuestionSchema),
});
export type Quiz = z.infer<typeof QuizSchema>;

// ============ Course import/export schema (versioned) ============
const MaterialSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  type: z.string().optional().default(''),
});

const LessonImportSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  materials: z.array(MaterialSchema).optional().default([]),
  order_index: z.number().int().optional(),
});
export const LessonImportArraySchema = z.union([
  LessonImportSchema,
  z.array(LessonImportSchema).min(1),
]);

export const CourseExportSchema = z.object({
  schemaVersion: z.string().regex(/^1\.\d+$/, 'Unsupported schema version (expected 1.x)'),
  course: z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    materials: z.array(MaterialSchema).optional().default([]),
  }),
  lessons: z.array(LessonImportSchema).optional().default([]),
});
export type CourseExport = z.infer<typeof CourseExportSchema>;

export const CURRENT_SCHEMA_VERSION = '1.0';

export function formatZodErrors(err: z.ZodError, max = 4): string {
  const issues = err.issues.slice(0, max).map(i => {
    const path = i.path.join('.') || '(root)';
    return `• ${path}: ${i.message}`;
  });
  const more = err.issues.length > max ? `\n…and ${err.issues.length - max} more issue(s)` : '';
  return issues.join('\n') + more;
}

// ============ Scoring ============
export function scoreQuiz(questions: Question[], answers: Record<string, any>) {
  let earned = 0;
  let total = 0;
  const breakdown: Record<string, boolean> = {};
  for (const q of questions) {
    total += q.points;
    const a = answers[q.id];
    let correct = false;
    if (q.type === 'single') correct = typeof a === 'number' && a === q.answer;
    else if (q.type === 'truefalse') correct = typeof a === 'boolean' && a === q.answer;
    else if (q.type === 'multiple') {
      const arr = Array.isArray(a) ? [...a].sort() : [];
      const expected = [...q.answer].sort();
      correct = arr.length === expected.length && arr.every((v, i) => v === expected[i]);
    } else if (q.type === 'short') {
      const expected = q.answer.trim();
      const given = typeof a === 'string' ? a.trim() : '';
      correct = q.caseSensitive ? given === expected : given.toLowerCase() === expected.toLowerCase();
    }
    if (correct) earned += q.points;
    breakdown[q.id] = correct;
  }
  const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
  return { earned, total, percent, breakdown };
}

// ============ Cooldown ============
export const FAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function cooldownRemaining(lastFailedAt: string | null): number {
  if (!lastFailedAt) return 0;
  const t = new Date(lastFailedAt).getTime();
  const elapsed = Date.now() - t;
  return Math.max(0, FAIL_COOLDOWN_MS - elapsed);
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return '';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ============ Data access ============
export async function getCourseQuizzes(courseId: string) {
  const { data, error } = await supabase
    .from('course_quizzes')
    .select('*')
    .eq('course_id', courseId);
  if (error) throw error;
  return data || [];
}

export async function getLatestAttempt(quizId: string, email: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBestAttempt(quizId: string, email: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('email', email.toLowerCase())
    .eq('passed', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitAttempt(params: {
  quizId: string;
  email: string;
  score: number;
  maxScore: number;
  passed: boolean;
  answers: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: params.quizId,
      email: params.email.toLowerCase(),
      score: params.score,
      max_score: params.maxScore,
      passed: params.passed,
      answers: params.answers,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function newQuestionId() {
  return 'q_' + Math.random().toString(36).slice(2, 10);
}

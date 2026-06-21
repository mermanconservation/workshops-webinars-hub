import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Award, ClipboardList } from 'lucide-react';
import { Question, QuestionSchema, getAllAttempts, scoreQuiz } from '@/lib/quiz';
import { z } from 'zod';

interface QuizLite {
  id: string;
  title: string;
  kind: 'lesson' | 'final';
  pass_score: number;
  questions: any;
  lesson_id: string | null;
}

interface Props {
  email: string;
  lessonQuizzes: QuizLite[];
  finalQuiz: QuizLite | null;
  lessons: { id: string; title: string }[];
}

interface AttemptRow {
  id: string;
  score: number;
  max_score: number;
  passed: boolean;
  answers: Record<string, any>;
  created_at: string;
}

/**
 * Learner-facing review of every quiz attempt: per-lesson quizzes and the
 * final exam. Lets the learner inspect their selected answers, the correct
 * answers, and the per-question score breakdown before they download the
 * certificate.
 */
export function LearnerQuizSummary({ email, lessonQuizzes, finalQuiz, lessons }: Props) {
  const [attempts, setAttempts] = useState<Record<string, AttemptRow[]>>({});
  const [openQuiz, setOpenQuiz] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  const allQuizzes = [...lessonQuizzes, ...(finalQuiz ? [finalQuiz] : [])];

  useEffect(() => {
    if (!email.trim() || allQuizzes.length === 0) return;
    setLoading(true);
    Promise.all(allQuizzes.map(q => getAllAttempts(q.id, email).then(a => [q.id, a] as const).catch(() => [q.id, []] as const)))
      .then(pairs => setAttempts(Object.fromEntries(pairs)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, lessonQuizzes.length, finalQuiz?.id]);

  if (!email.trim() || allQuizzes.length === 0) return null;

  const renderAnswer = (q: Question, given: any): string => {
    if (given === undefined || given === null || given === '') return '— no answer —';
    if (q.type === 'single') return q.options[given as number] ?? `Option #${given}`;
    if (q.type === 'multiple') return Array.isArray(given) ? given.map(i => q.options[i] ?? `#${i}`).join(', ') : '—';
    if (q.type === 'truefalse') return given ? 'True' : 'False';
    return String(given);
  };

  const renderCorrect = (q: Question): string => {
    if (q.type === 'single') return q.options[q.answer] ?? '';
    if (q.type === 'multiple') return q.answer.map(i => q.options[i] ?? `#${i}`).join(', ');
    if (q.type === 'truefalse') return q.answer ? 'True' : 'False';
    return q.answer;
  };

  return (
    <section className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-accent" />
        <h3 className="font-display font-bold text-foreground">Your quiz history</h3>
        {loading && <span className="text-xs text-muted-foreground">loading…</span>}
      </div>
      <p className="text-xs text-muted-foreground">Review your attempts, scores, and selected answers before downloading the certificate.</p>

      <div className="space-y-2">
        {allQuizzes.map(q => {
          const parsed = z.array(QuestionSchema).safeParse(q.questions);
          if (!parsed.success) return null;
          const questions = parsed.data;
          const list = attempts[q.id] || [];
          const best = list.find(a => a.passed);
          const last = list[0];
          const lessonTitle = q.lesson_id ? lessons.find(l => l.id === q.lesson_id)?.title : null;
          const isOpen = openQuiz === q.id;

          return (
            <div key={q.id} className="bg-background border border-border rounded-md">
              <button
                onClick={() => setOpenQuiz(isOpen ? null : q.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${q.kind === 'final' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {q.kind === 'final' ? 'Final' : 'Lesson'}
                </span>
                <span className="text-sm font-medium text-foreground truncate">{q.title}</span>
                {lessonTitle && <span className="text-xs text-muted-foreground truncate">· {lessonTitle}</span>}
                <span className="ml-auto text-xs flex items-center gap-2">
                  {best ? (
                    <span className="inline-flex items-center gap-1 text-accent"><Award className="w-3.5 h-3.5" /> Passed {Math.round((best.score / best.max_score) * 100)}%</span>
                  ) : last ? (
                    <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-3.5 h-3.5" /> {Math.round((last.score / last.max_score) * 100)}%</span>
                  ) : (
                    <span className="text-muted-foreground">No attempts</span>
                  )}
                  <span className="text-muted-foreground">· pass {q.pass_score}%</span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border px-3 py-3 space-y-3">
                  {list.length === 0 && <p className="text-xs text-muted-foreground">No attempts yet.</p>}

                  {list.map(a => {
                    const aOpen = openAttempt[q.id] === a.id;
                    const percent = Math.round((a.score / a.max_score) * 100);
                    const breakdown = scoreQuiz(questions, a.answers).breakdown;
                    return (
                      <div key={a.id} className="bg-card border border-border rounded">
                        <button
                          onClick={() => setOpenAttempt(s => ({ ...s, [q.id]: aOpen ? null : a.id }))}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/30"
                        >
                          {aOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('en-GB')}</span>
                          <span className={`text-xs font-semibold ml-auto inline-flex items-center gap-1 ${a.passed ? 'text-accent' : 'text-destructive'}`}>
                            {a.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {a.score}/{a.max_score} pts ({percent}%)
                          </span>
                        </button>

                        {aOpen && (
                          <ol className="border-t border-border px-3 py-2 space-y-2 list-decimal pl-7">
                            {questions.map(qq => {
                              const ok = breakdown[qq.id];
                              const points = (qq as any).points ?? 1;
                              return (
                                <li key={qq.id} className="text-xs space-y-0.5">
                                  <div className="flex items-start gap-1.5">
                                    {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />}
                                    <span className="text-foreground flex-1">{qq.prompt}</span>
                                    <span className="text-muted-foreground">{ok ? points : 0}/{points} pt</span>
                                  </div>
                                  <div className="pl-5 text-muted-foreground">
                                    <span className="font-semibold">Your answer:</span> {renderAnswer(qq, a.answers[qq.id])}
                                  </div>
                                  {!ok && (
                                    <div className="pl-5 text-accent">
                                      <span className="font-semibold">Correct:</span> {renderCorrect(qq)}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

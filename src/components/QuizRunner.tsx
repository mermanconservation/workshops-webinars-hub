import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';
import {
  Question, scoreQuiz, submitAttempt, getLatestAttempt, getBestAttempt,
  cooldownRemaining, formatCooldown, FAIL_COOLDOWN_MS,
} from '@/lib/quiz';

interface Props {
  quiz: {
    id: string;
    title: string;
    pass_score: number;
    questions: Question[];
    kind: 'lesson' | 'final';
  };
  email: string;
  /** if true, blocks retake when failed within 24h and surfaces cooldown UI */
  enforceCooldown?: boolean;
  /** notify parent when pass status changes (used by course page to unlock certificate) */
  onPassed?: (passed: boolean) => void;
}

export function QuizRunner({ quiz, email, enforceCooldown, onPassed }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ percent: number; passed: boolean; breakdown: Record<string, boolean> } | null>(null);
  const [latest, setLatest] = useState<any>(null);
  const [best, setBest] = useState<any>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!email.trim()) return;
    Promise.all([getLatestAttempt(quiz.id, email), getBestAttempt(quiz.id, email)])
      .then(([l, b]) => { setLatest(l); setBest(b); onPassed?.(!!b); })
      .catch(console.error);
  }, [quiz.id, email]); // eslint-disable-line

  // tick for cooldown timer
  useEffect(() => {
    if (!enforceCooldown) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [enforceCooldown, latest]);

  const totalPoints = useMemo(() => quiz.questions.reduce((s, q) => s + (q as any).points, 0), [quiz.questions]);

  const cooldown = enforceCooldown && latest && !latest.passed && !best
    ? cooldownRemaining(latest.created_at)
    : 0;
  const blocked = cooldown > 0 && !result;

  const setAns = (qid: string, value: any) => setAnswers(a => ({ ...a, [qid]: value }));

  const submit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { earned, total, percent, breakdown } = scoreQuiz(quiz.questions, answers);
      const passed = percent >= quiz.pass_score;
      await submitAttempt({ quizId: quiz.id, email, score: earned, maxScore: total, passed, answers });
      setResult({ percent, passed, breakdown });
      if (passed) { setBest({ created_at: new Date().toISOString() }); onPassed?.(true); }
      else { setLatest({ created_at: new Date().toISOString(), passed: false }); }
    } catch (e: any) {
      alert('Could not submit: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setAnswers({}); setResult(null); };

  // already-passed view
  if (best && !result) {
    return (
      <div className="bg-card border border-accent/40 rounded-lg p-4 flex items-center gap-3">
        <Award className="w-6 h-6 text-accent" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{quiz.title} — passed</p>
          <p className="text-xs text-muted-foreground">You already passed this {quiz.kind === 'final' ? 'exam' : 'quiz'}. {quiz.kind === 'final' ? 'Certificate unlocked.' : ''}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1"><RotateCcw className="w-3.5 h-3.5" /> Retake</Button>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="bg-card border border-destructive/40 rounded-lg p-4 flex items-center gap-3">
        <Clock className="w-6 h-6 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Retake locked</p>
          <p className="text-xs text-muted-foreground">
            You can retake this exam in <strong>{formatCooldown(cooldown)}</strong> (24h cooldown after a failed attempt).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-foreground">{quiz.title}</h3>
          <p className="text-xs text-muted-foreground">
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · {totalPoints} point{totalPoints === 1 ? '' : 's'} · Pass mark {quiz.pass_score}%
          </p>
        </div>
        {result && (
          <div className={`text-sm font-semibold inline-flex items-center gap-1.5 ${result.passed ? 'text-accent' : 'text-destructive'}`}>
            {result.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {result.percent}% — {result.passed ? 'Passed' : 'Did not pass'}
          </div>
        )}
      </div>

      <ol className="space-y-4 list-decimal pl-5">
        {quiz.questions.map((q) => {
          const correct = result?.breakdown[q.id];
          const ans = answers[q.id];
          return (
            <li key={q.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <p className="text-sm text-foreground flex-1">{q.prompt}</p>
                {result && (
                  correct
                    ? <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                )}
              </div>

              {q.type === 'single' && (
                <div className="space-y-1.5">
                  {q.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={q.id} disabled={!!result} checked={ans === i} onChange={() => setAns(q.id, i)} />
                      <span className="text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiple' && (
                <div className="space-y-1.5">
                  {q.options.map((opt, i) => {
                    const arr: number[] = Array.isArray(ans) ? ans : [];
                    const checked = arr.includes(i);
                    return (
                      <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" disabled={!!result} checked={checked} onChange={() => {
                          const next = checked ? arr.filter(v => v !== i) : [...arr, i];
                          setAns(q.id, next);
                        }} />
                        <span className="text-foreground">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'truefalse' && (
                <div className="flex gap-3">
                  {[true, false].map(v => (
                    <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={q.id} disabled={!!result} checked={ans === v} onChange={() => setAns(q.id, v)} />
                      <span className="text-foreground">{v ? 'True' : 'False'}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'short' && (
                <Input
                  placeholder="Your answer"
                  value={typeof ans === 'string' ? ans : ''}
                  disabled={!!result}
                  onChange={e => setAns(q.id, e.target.value)}
                  className="max-w-md"
                />
              )}
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {!email.trim() && <span className="text-xs text-destructive mr-auto">Enter your email above to submit.</span>}
          <Button onClick={submit} disabled={submitting || !email.trim()} className="bg-accent text-accent-foreground gap-1">
            {submitting ? 'Submitting…' : 'Submit answers'}
          </Button>
        </div>
      )}
      {result && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {result.passed ? 'Great work!' : `You need at least ${quiz.pass_score}% to pass.`}
            {!result.passed && enforceCooldown && ` You can retake in ${formatCooldown(FAIL_COOLDOWN_MS)}.`}
          </p>
          {(result.passed || !enforceCooldown) && (
            <Button size="sm" variant="outline" onClick={reset} className="gap-1"><RotateCcw className="w-3.5 h-3.5" /> Try again</Button>
          )}
        </div>
      )}
    </div>
  );
}

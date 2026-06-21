import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, X } from 'lucide-react';
import { Question, newQuestionId } from '@/lib/quiz';

interface Props {
  initial?: {
    title: string;
    kind: 'lesson' | 'final';
    lesson_id: string | null;
    pass_score: number;
    questions: Question[];
  };
  lessons: { id: string; title: string }[];
  onSave: (q: { title: string; kind: 'lesson' | 'final'; lesson_id: string | null; pass_score: number; questions: Question[] }) => Promise<void> | void;
  onCancel: () => void;
}

function emptyQuestion(type: Question['type']): Question {
  const id = newQuestionId();
  if (type === 'single') return { id, type, prompt: '', options: ['', ''], answer: 0, points: 1 };
  if (type === 'multiple') return { id, type, prompt: '', options: ['', ''], answer: [0], points: 1 };
  if (type === 'truefalse') return { id, type, prompt: '', answer: true, points: 1 };
  return { id, type: 'short', prompt: '', answer: '', caseSensitive: false, points: 1 };
}

export function QuizEditor({ initial, lessons, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [kind, setKind] = useState<'lesson' | 'final'>(initial?.kind || 'lesson');
  const [lessonId, setLessonId] = useState<string | null>(
    initial?.lesson_id ?? (initial?.kind !== 'final' && lessons.length > 0 ? lessons[0].id : null)
  );
  const [passScore, setPassScore] = useState<number>(initial?.pass_score ?? 70);
  const [questions, setQuestions] = useState<Question[]>(initial?.questions || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPoints = questions.reduce((s, q) => s + (q.points || 1), 0);
  const passPoints = Math.ceil((totalPoints * passScore) / 100);

  const update = (idx: number, patch: Partial<Question>) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? ({ ...q, ...patch } as Question) : q));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const swap = idx + dir;
    if (swap < 0 || swap >= questions.length) return;
    const copy = [...questions];
    [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
    setQuestions(copy);
  };
  const remove = (idx: number) => setQuestions(qs => qs.filter((_, i) => i !== idx));
  const add = (type: Question['type']) => setQuestions(qs => [...qs, emptyQuestion(type)]);

  const setType = (idx: number, type: Question['type']) => {
    setQuestions(qs => qs.map((q, i) => i === idx ? emptyQuestion(type) : q));
  };

  const save = async () => {
    setError(null);
    if (!title.trim()) { setError('Quiz title is required.'); return; }
    if (questions.length === 0) { setError('Add at least one question.'); return; }
    if (kind === 'lesson' && !lessonId) { setError('Pick a lesson for this quiz, or change the type to Final exam.'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) { setError(`Question ${i + 1}: prompt is required.`); return; }
      if ((q.type === 'single' || q.type === 'multiple') && q.options.some(o => !o.trim())) {
        setError(`Question ${i + 1}: every answer option must be filled.`); return;
      }
      if (q.type === 'multiple' && (q.answer.length === 0)) {
        setError(`Question ${i + 1}: select at least one correct option.`); return;
      }
      if (q.type === 'short' && !q.answer.trim()) { setError(`Question ${i + 1}: short answer needs an expected value.`); return; }
      if (!q.points || q.points < 1) { setError(`Question ${i + 1}: points must be at least 1.`); return; }
    }
    setBusy(true);
    try {
      await onSave({
        title: title.trim(),
        kind,
        lesson_id: kind === 'final' ? null : lessonId,
        pass_score: Math.max(0, Math.min(100, passScore)),
        questions,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save quiz.');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-background border border-accent rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold">{initial ? 'Edit quiz' : 'New quiz'}</h5>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input placeholder="Quiz title" value={title} onChange={e => setTitle(e.target.value)} className="text-sm" />
        <div className="flex gap-2">
          <select value={kind} onChange={e => setKind(e.target.value as any)} className="text-sm border border-input rounded-md bg-background px-2 flex-1">
            <option value="lesson">Lesson knowledge check</option>
            <option value="final">Final exam (gates certificate)</option>
          </select>
          <Input type="number" min={0} max={100} value={passScore} onChange={e => setPassScore(parseInt(e.target.value) || 0)} className="text-sm w-20" title="Pass mark %" />
        </div>
        {kind === 'lesson' && (
          <select value={lessonId || ''} onChange={e => setLessonId(e.target.value || null)} className="text-sm border border-input rounded-md bg-background px-2 py-1.5 sm:col-span-2">
            <option value="">Select lesson…</option>
            {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-card border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-accent">Q{idx + 1}</span>
              <select value={q.type} onChange={e => setType(idx, e.target.value as any)} className="text-xs border border-input rounded bg-background px-1.5 py-0.5">
                <option value="single">Single choice</option>
                <option value="multiple">Multiple answers</option>
                <option value="truefalse">True / False</option>
                <option value="short">Short answer</option>
              </select>
              <Input type="number" min={1} value={q.points} onChange={e => update(idx, { points: Math.max(1, parseInt(e.target.value) || 1) } as any)} className="text-xs w-16 h-7" title="Points" />
              <div className="ml-auto flex gap-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === questions.length - 1} className="disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => remove(idx)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
              </div>
            </div>

            <Textarea placeholder="Question prompt" value={q.prompt} onChange={e => update(idx, { prompt: e.target.value })} rows={2} className="text-sm" />

            {(q.type === 'single' || q.type === 'multiple') && (
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = q.type === 'single' ? q.answer === oi : (q.answer as number[]).includes(oi);
                  return (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type={q.type === 'single' ? 'radio' : 'checkbox'}
                        checked={isCorrect}
                        onChange={() => {
                          if (q.type === 'single') update(idx, { answer: oi } as any);
                          else {
                            const cur = q.answer as number[];
                            const next = cur.includes(oi) ? cur.filter(v => v !== oi) : [...cur, oi];
                            update(idx, { answer: next } as any);
                          }
                        }}
                        title="Mark correct"
                      />
                      <Input
                        value={opt}
                        onChange={e => {
                          const opts = [...q.options];
                          opts[oi] = e.target.value;
                          update(idx, { options: opts } as any);
                        }}
                        placeholder={`Option ${oi + 1}`}
                        className="text-sm flex-1 h-8"
                      />
                      <button
                        onClick={() => {
                          if (q.options.length <= 2) return;
                          const opts = q.options.filter((_, i) => i !== oi);
                          let answer: any = q.answer;
                          if (q.type === 'single') answer = Math.max(0, (q.answer as number) - (oi <= (q.answer as number) ? 1 : 0));
                          else answer = (q.answer as number[]).filter(v => v !== oi).map(v => v > oi ? v - 1 : v);
                          update(idx, { options: opts, answer } as any);
                        }}
                        disabled={q.options.length <= 2}
                        className="disabled:opacity-30"
                        title="Remove option"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => update(idx, { options: [...q.options, ''] } as any)}
                  disabled={q.options.length >= 8}
                  className="text-xs text-accent hover:underline disabled:opacity-30 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add option
                </button>
              </div>
            )}

            {q.type === 'truefalse' && (
              <div className="flex gap-3 text-sm">
                {[true, false].map(v => (
                  <label key={String(v)} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name={`tf-${q.id}`} checked={q.answer === v} onChange={() => update(idx, { answer: v } as any)} />
                    <span>{v ? 'True' : 'False'}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'short' && (
              <div className="space-y-1.5">
                <Input
                  placeholder="Expected answer"
                  value={q.answer}
                  onChange={e => update(idx, { answer: e.target.value } as any)}
                  className="text-sm"
                />
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <input type="checkbox" checked={q.caseSensitive} onChange={e => update(idx, { caseSensitive: e.target.checked } as any)} />
                  Case-sensitive match
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground mr-auto self-center">Add question:</span>
        <Button size="sm" variant="outline" onClick={() => add('single')} className="text-xs gap-1"><Plus className="w-3 h-3" /> Single</Button>
        <Button size="sm" variant="outline" onClick={() => add('multiple')} className="text-xs gap-1"><Plus className="w-3 h-3" /> Multiple</Button>
        <Button size="sm" variant="outline" onClick={() => add('truefalse')} className="text-xs gap-1"><Plus className="w-3 h-3" /> True/False</Button>
        <Button size="sm" variant="outline" onClick={() => add('short')} className="text-xs gap-1"><Plus className="w-3 h-3" /> Short</Button>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={busy} className="bg-accent text-accent-foreground gap-1">
          <Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Save quiz'}
        </Button>
      </div>
    </div>
  );
}

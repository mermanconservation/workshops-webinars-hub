import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ChevronLeft, CheckCircle2, Circle, Download, FileText, Image as ImageIcon, File, Presentation, Award, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  getCourse, getCourseLessons, getCourseLessonCompletions,
  markCourseLessonComplete, unmarkLessonComplete,
} from '@/lib/api';
import { getCourseQuizzes, QuestionSchema } from '@/lib/quiz';
import { QuizRunner } from '@/components/QuizRunner';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

function materialIcon(type: string = '') {
  if (type.startsWith('image')) return ImageIcon;
  if (type.includes('pdf')) return FileText;
  if (type.includes('presentation') || type.includes('powerpoint') || type.includes('keynote')) return Presentation;
  if (type.includes('word') || type.includes('document') || type.includes('text')) return FileText;
  return File;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
}

const CourseLesson = () => {
  const { courseId, lessonIndex } = useParams<{ courseId: string; lessonIndex: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const idx = Math.max(0, parseInt(lessonIndex || '0', 10));

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(() => localStorage.getItem('lesson_progress_email') || '');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');

  useEffect(() => {
    if (!courseId) return;
    Promise.all([getCourse(courseId), getCourseLessons(courseId)])
      .then(([c, l]) => { setCourse(c); setLessons(l || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const loadProgress = async (e: string) => {
    if (!courseId || !e.trim()) return;
    try {
      const list = await getCourseLessonCompletions(courseId, e);
      setCompleted(new Set(list.map((c: any) => c.lesson_id)));
      localStorage.setItem('lesson_progress_email', e.toLowerCase());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!courseId || lessons.length === 0) return;
    if (email) loadProgress(email);
    else setEmailOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessons.length]);

  const lesson = lessons[idx];
  const isComplete = lesson ? completed.has(lesson.id) : false;
  const isLast = idx >= lessons.length - 1;
  const videoId = useMemo(() => lesson?.video_url ? extractYoutubeId(lesson.video_url) : null, [lesson?.video_url]);
  const materials = Array.isArray(lesson?.materials) ? lesson.materials : [];

  const submitEmail = async () => {
    const v = emailValue.trim();
    if (!v) return;
    setEmail(v); setEmailOpen(false);
    await loadProgress(v);
  };

  const ensureComplete = async () => {
    if (!lesson || !email.trim() || completed.has(lesson.id)) return;
    try {
      await markCourseLessonComplete(lesson.id, courseId!, email);
      setCompleted(prev => new Set(prev).add(lesson.id));
    } catch (e) { /* ignore duplicate insert */ }
  };

  const toggleComplete = async () => {
    if (!email.trim()) {
      toast({ title: 'Enter your email to track progress', variant: 'destructive' });
      setEmailOpen(true);
      return;
    }
    try {
      if (isComplete) {
        await unmarkLessonComplete(lesson.id, email);
        setCompleted(prev => { const n = new Set(prev); n.delete(lesson.id); return n; });
      } else {
        await markCourseLessonComplete(lesson.id, courseId!, email);
        setCompleted(prev => new Set(prev).add(lesson.id));
      }
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const goNext = async () => {
    await ensureComplete();
    if (isLast) navigate(`/course/${courseId}`);
    else navigate(`/course/${courseId}/lesson/${idx + 1}`);
  };

  const goPrev = () => {
    if (idx === 0) navigate(`/course/${courseId}`);
    else navigate(`/course/${courseId}/lesson/${idx - 1}`);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!course || !lesson) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Lesson not found</div>;

  const progressPct = lessons.length ? (completed.size / lessons.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-forest px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <Link to={`/course/${courseId}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-3 text-sm">
            <ChevronLeft className="w-4 h-4" /> Back to course
          </Link>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-primary-foreground/70 uppercase tracking-wide">{course.title}</p>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-display font-bold text-primary-foreground">
                Lesson {idx + 1}: {lesson.title}
              </motion.h1>
            </div>
            <div className="text-xs text-primary-foreground/80">
              {completed.size} / {lessons.length} complete
            </div>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {videoId && (
          <div className="aspect-video rounded-lg overflow-hidden border border-border">
            <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title={lesson.title} />
          </div>
        )}

        {lesson.description && (
          <article
            className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-a:text-accent"
            dangerouslySetInnerHTML={{ __html: lesson.description }}
          />
        )}

        {materials.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-accent" /> Lesson materials
            </h2>
            <div className="grid gap-2">
              {materials.map((m: any, i: number) => {
                const Icon = materialIcon(m.type);
                return (
                  <a key={i} href={m.url} target="_blank" rel="noopener" download className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:shadow-forest transition-shadow">
                    <Icon className="w-4 h-4 text-accent" />
                    <span className="text-sm text-foreground truncate">{m.title}</span>
                    <Download className="w-4 h-4 ml-auto text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center gap-3">
          <button onClick={toggleComplete} className="inline-flex items-center gap-2 text-sm">
            {isComplete
              ? <><CheckCircle2 className="w-5 h-5 text-accent" /> <span className="text-foreground font-medium">Completed</span></>
              : <><Circle className="w-5 h-5 text-muted-foreground" /> <span className="text-muted-foreground">Mark as complete</span></>}
          </button>
          {!email && (
            <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>Set email to save progress</Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={goPrev} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> {idx === 0 ? 'Course home' : 'Previous lesson'}
          </Button>
          <Button onClick={goNext} className="bg-accent text-accent-foreground gap-1">
            {isLast ? <><Award className="w-4 h-4" /> Finish course</> : <>Next lesson <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </div>
      </main>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your progress</DialogTitle>
            <DialogDescription>
              Enter your email to load saved progress and have completed lessons remembered as you advance.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="your@email.com" type="email" value={emailValue} onChange={e => setEmailValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEmail()} autoFocus />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Skip</Button>
            <Button onClick={submitEmail} disabled={!emailValue.trim()} className="bg-accent text-accent-foreground">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseLesson;

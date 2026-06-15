import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileText, BookOpen, CheckCircle2, Circle, Award, PlayCircle, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  getCourse,
  getCourseLessons,
  getCourseLessonCompletions,
  markCourseLessonComplete,
  unmarkLessonComplete,
  getCompanySettings,
  generateCertificateText,
  saveCertificateVerification,
} from '@/lib/api';
import { getCourseQuizzes, QuestionSchema, getBestAttempt } from '@/lib/quiz';
import { z } from 'zod';
import { MaterialPreviewGrid } from '@/components/MaterialPreview';
import { QuizRunner } from '@/components/QuizRunner';
import { generateCertificatePDF } from '@/lib/certificate';
import { useToast } from '@/hooks/use-toast';

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progressEmail, setProgressEmail] = useState(() => localStorage.getItem('lesson_progress_email') || '');
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalValue, setEmailModalValue] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [finalQuiz, setFinalQuiz] = useState<any>(null);
  const [finalPassed, setFinalPassed] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getCourse(id), getCourseLessons(id), getCompanySettings(), getCourseQuizzes(id)])
      .then(([c, l, cs, quizzes]) => {
        setCourse(c);
        setLessons(l || []);
        setCompany(cs);
        const fq = (quizzes || []).find((q: any) => q.kind === 'final');
        if (fq) {
          const parsed = z.array(QuestionSchema).safeParse(fq.questions);
          if (parsed.success) setFinalQuiz({ ...fq, questions: parsed.data });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const loadProgress = async (email: string) => {
    if (!id || !email.trim()) return;
    try {
      const completions = await getCourseLessonCompletions(id, email);
      setCompletedLessonIds(new Set(completions.map((c: any) => c.lesson_id)));
      localStorage.setItem('lesson_progress_email', email.toLowerCase());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!id || lessons.length === 0) return;
    if (progressEmail) loadProgress(progressEmail);
    else setEmailModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lessons.length]);

  const submitEmailModal = async () => {
    const e = emailModalValue.trim();
    if (!e) return;
    setProgressEmail(e);
    setEmailModalOpen(false);
    await loadProgress(e);
  };

  const toggleLessonComplete = async (lessonId: string, currentlyComplete: boolean) => {
    if (!progressEmail.trim()) {
      toast({ title: 'Enter your email to track progress', variant: 'destructive' });
      return;
    }
    try {
      if (currentlyComplete) {
        await unmarkLessonComplete(lessonId, progressEmail);
        setCompletedLessonIds(prev => { const n = new Set(prev); n.delete(lessonId); return n; });
      } else {
        await markCourseLessonComplete(lessonId, id!, progressEmail);
        setCompletedLessonIds(prev => new Set(prev).add(lessonId));
      }
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const allLessonsComplete = lessons.length > 0 && lessons.every(l => completedLessonIds.has(l.id));

  function generateVerificationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'CR-';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  const downloadCourseCertificate = async () => {
    if (!progressEmail.trim() || !participantName.trim()) {
      toast({ title: 'Please enter your full name', variant: 'destructive' });
      return;
    }
    setCertLoading(true);
    try {
      const verificationCode = generateVerificationCode();
      const today = new Date().toISOString();
      const { certificateText } = await generateCertificateText({
        participantName,
        workshopTitle: course.title,
        workshopDate: today,
        workshopDescription: `Successfully completed all ${lessons.length} lessons of the course "${course.title}". ${course.description || ''}`,
        presenterName: company?.director_name || 'Course Instructor',
        signerName: company?.director_name || 'Director',
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        type: 'participant',
      });
      try {
        await saveCertificateVerification({
          verificationCode,
          participantName,
          workshopId: course.id,
          workshopTitle: course.title,
          workshopDate: today,
          certificateType: 'course_completion',
          companyName: company?.company_name || 'Wildlife UK',
        });
      } catch (e) { console.warn('Verification save failed'); }
      await generateCertificatePDF({
        certificateText,
        participantName,
        workshopTitle: course.title,
        workshopDate: today,
        signerName: company?.director_name || 'Director',
        signatureUrl: company?.director_signature_url,
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        type: 'course_completion',
        verificationCode,
        templateUrl: course.certificate_template_url || undefined,
      });
      setIssuedCode(verificationCode);
      toast({ title: 'Certificate downloaded!', description: `Verification code: ${verificationCode}` });
    } catch (e: any) {
      toast({ title: 'Certificate failed', description: e.message, variant: 'destructive' });
    }
    setCertLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!course) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Course not found</div>;

  const courseMaterials = Array.isArray(course.materials) ? course.materials : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-forest py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-primary-foreground font-semibold">Course</span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-3">
            {course.title}
          </motion.h1>
          {course.description && (
            <p className="text-primary-foreground/80 max-w-2xl whitespace-pre-wrap">{course.description}</p>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {courseMaterials.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Course Materials
            </h2>
            <MaterialPreviewGrid materials={courseMaterials} />
          </section>
        )}

        {lessons.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" /> Lessons
                <span className="text-xs font-normal text-muted-foreground">
                  ({completedLessonIds.size}/{lessons.length} complete)
                </span>
              </h2>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted-foreground">Your email:</label>
                <Input placeholder="Your email" type="email" value={progressEmail} onChange={e => setProgressEmail(e.target.value)} className="flex-1 min-w-[200px] max-w-sm h-9" />
                <Button size="sm" variant="outline" onClick={() => loadProgress(progressEmail)} disabled={!progressEmail.trim()}>Load progress</Button>
              </div>
              <p className="text-xs text-muted-foreground">Lesson completion is saved per email. Tick or untick the circle on any lesson to update progress.</p>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${lessons.length ? (completedLessonIds.size / lessons.length) * 100 : 0}%` }} />
              </div>
            </div>

            <div className="space-y-3">
              {lessons.map((l, idx) => {
                const isComplete = completedLessonIds.has(l.id);
                const matCount = Array.isArray(l.materials) ? l.materials.length : 0;
                return (
                  <div key={l.id} className={`bg-card border rounded-lg p-4 flex items-center gap-3 transition-colors ${isComplete ? 'border-accent/60' : 'border-border'}`}>
                    <button onClick={() => toggleLessonComplete(l.id, isComplete)} className="hover:scale-110 transition-transform" title={isComplete ? 'Mark incomplete' : 'Mark complete'}>
                      {isComplete ? <CheckCircle2 className="w-5 h-5 text-accent" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <Link to={`/course/${id}/lesson/${idx}`} className="flex-1 min-w-0 group">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-accent">Lesson {idx + 1}</span>
                        {l.video_url && <PlayCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                        {matCount > 0 && <span className="text-[10px] text-muted-foreground">· {matCount} file{matCount > 1 ? 's' : ''}</span>}
                      </div>
                      <h3 className={`font-display font-semibold text-foreground group-hover:text-accent transition-colors ${isComplete ? 'line-through opacity-70' : ''}`}>{l.title}</h3>
                    </Link>
                    <Link to={`/course/${id}/lesson/${idx}`} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground font-medium hover:opacity-90">
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>

            {allLessonsComplete && finalQuiz && (
              <div className="mt-6 bg-card border border-border rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground">Final exam — required for your certificate</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  You must pass with at least {finalQuiz.pass_score}% to unlock your Certificate of Course Completion.
                  A failed attempt locks retake for 24 hours.
                </p>
                <QuizRunner quiz={finalQuiz} email={progressEmail} enforceCooldown onPassed={setFinalPassed} />
              </div>
            )}

            {allLessonsComplete && (!finalQuiz || finalPassed) && (
              <div className="mt-6 bg-gradient-forest text-primary-foreground rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8" />
                  <div>
                    <h3 className="font-display font-bold">Course completed!</h3>
                    <p className="text-sm opacity-90">Enter your full name and download your Certificate of Course Completion.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Input placeholder="Your full name" value={participantName} onChange={e => setParticipantName(e.target.value)} className="flex-1 min-w-[200px] bg-background text-foreground" />
                  <Button onClick={downloadCourseCertificate} disabled={certLoading} className="bg-accent text-accent-foreground hover:opacity-90 gap-2">
                    <Download className="w-4 h-4" /> {certLoading ? 'Generating...' : 'Download Certificate'}
                  </Button>
                </div>
                {issuedCode && (
                  <div className="text-xs bg-black/20 rounded-md px-3 py-2 flex flex-wrap items-center gap-2">
                    <span className="opacity-80">Verification code:</span>
                    <code className="font-mono">{issuedCode}</code>
                    <Link to={`/verify?code=${issuedCode}`} className="underline ml-auto">Verify online</Link>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {lessons.length === 0 && courseMaterials.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No content yet for this course. Check back soon!</p>
        )}
      </main>

      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track your lesson progress</DialogTitle>
            <DialogDescription>
              Enter your email and we'll automatically load your saved progress for this course.
            </DialogDescription>
          </DialogHeader>
          <Input placeholder="your@email.com" type="email" value={emailModalValue} onChange={e => setEmailModalValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitEmailModal()} autoFocus />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEmailModalOpen(false)}>Skip for now</Button>
            <Button onClick={submitEmailModal} disabled={!emailModalValue.trim()} className="bg-accent text-accent-foreground hover:opacity-90">Load my progress</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export default CourseDetail;

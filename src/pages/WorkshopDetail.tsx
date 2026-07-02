import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Download, ExternalLink, Play, FileText, Image, Award, ListOrdered, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { getWorkshop, getWorkshopVideos, getWorkshopMaterials, getWorkshopParticipants, getCompanySettings, saveCertificateVerification, getWorkshopLessons, getLessonCompletions, markLessonComplete, unmarkLessonComplete } from '@/lib/api';
import { generateGoogleCalendarUrl, generateICSFile } from '@/lib/calendar';
import { generateCertificateText } from '@/lib/api';
import { generateCertificatePDF } from '@/lib/certificate';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { registerForWorkshop } from '@/lib/api';

const WorkshopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [workshop, setWorkshop] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [registering, setRegistering] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [certEmail, setCertEmail] = useState('');
  const [progressEmail, setProgressEmail] = useState(() => localStorage.getItem('lesson_progress_email') || '');
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [progressLoading, setProgressLoading] = useState(false);
  const [courseCertLoading, setCourseCertLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalValue, setEmailModalValue] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getWorkshop(id),
      getWorkshopVideos(id),
      getWorkshopMaterials(id),
      getWorkshopParticipants(id),
      getCompanySettings(),
      getWorkshopLessons(id),
    ])
      .then(([w, v, m, p, c, l]) => {
        setWorkshop(w);
        setVideos(v || []);
        setMaterials(m || []);
        setParticipants(p || []);
        setCompany(c);
        setLessons(l || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const loadProgress = async (email: string) => {
    if (!id || !email.trim()) return;
    setProgressLoading(true);
    try {
      const completions = await getLessonCompletions(id, email);
      setCompletedLessonIds(new Set(completions.map((c: any) => c.lesson_id)));
      localStorage.setItem('lesson_progress_email', email.toLowerCase());
    } catch (e) {
      console.error(e);
    }
    setProgressLoading(false);
  };

  useEffect(() => {
    if (!id || lessons.length === 0) return;
    if (progressEmail) {
      loadProgress(progressEmail);
    } else {
      setEmailModalOpen(true);
    }
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
      toast({ title: 'Enter your email above to track progress', variant: 'destructive' });
      return;
    }
    try {
      if (currentlyComplete) {
        await unmarkLessonComplete(lessonId, progressEmail);
        setCompletedLessonIds(prev => {
          const n = new Set(prev);
          n.delete(lessonId);
          return n;
        });
      } else {
        await markLessonComplete(lessonId, id!, progressEmail);
        setCompletedLessonIds(prev => new Set(prev).add(lessonId));
      }
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const allLessonsComplete = lessons.length > 0 && lessons.every(l => completedLessonIds.has(l.id));

  const downloadCourseCompletionCertificate = async () => {
    if (!progressEmail.trim()) {
      toast({ title: 'Enter your email first', variant: 'destructive' });
      return;
    }
    const participant = participants.find(p => p.email.toLowerCase() === progressEmail.toLowerCase());
    const name = participant?.full_name || progressEmail;
    setCourseCertLoading(true);
    try {
      const verificationCode = generateVerificationCode();
      const { certificateText } = await generateCertificateText({
        participantName: name,
        workshopTitle: workshop.title,
        workshopDate: workshop.date,
        workshopDescription: `Successfully completed all ${lessons.length} lessons of this course. ${workshop.description || ''}`,
        presenterName: presenterNames || 'Presenter',
        presenterNames: presenterNamesArray,
        signerName: company?.director_name || presenterNames || 'Director',
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        type: 'participant',
      });
      try {
        await saveCertificateVerification({
          verificationCode,
          participantName: name,
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          workshopDate: workshop.date,
          certificateType: 'course_completion',
          companyName: company?.company_name || 'Wildlife UK',
        });
      } catch (e) { console.warn('Verification save failed'); }
      await generateCertificatePDF({
        certificateText,
        participantName: name,
        presenterNames: presenterNamesArray,
        workshopTitle: workshop.title,
        workshopDate: workshop.date,
        signerName: company?.director_name || presenterNames || 'Director',
        signatureUrl: company?.director_signature_url || presenters[0]?.signature_url,
        companyName: company?.company_name || 'Wildlife UK',
        companyLogoUrl: company?.logo_url,
        partnerLogos: workshop.partner_logos || [],
        type: 'course_completion',
        verificationCode,
      });
      toast({ title: 'Course completion certificate downloaded!' });
    } catch (e: any) {
      toast({ title: 'Certificate failed', description: e.message, variant: 'destructive' });
    }
    setCourseCertLoading(false);
  };


  const linkedPresenters = (workshop?.workshop_presenters || [])
    .map((wp: any) => wp.presenters)
    .filter(Boolean);
  const legacyPresenter = workshop?.presenters;
  const presenters = linkedPresenters.length > 0 ? linkedPresenters : (legacyPresenter ? [legacyPresenter] : []);
  const presenterNamesArray = presenters.map((p: any) => p.name).filter(Boolean);
  const presenterNames = presenterNamesArray.join(', ');

  const handleRegister = async (opts?: { addToCalendar?: boolean }) => {
    if (!regName.trim() || !regEmail.trim()) {
      toast({ title: 'Please fill in your name and email', variant: 'destructive' });
      return;
    }
    setRegistering(true);
    try {
      await registerForWorkshop(id!, regName, regEmail);
      toast({ title: 'Registered successfully!' });
      setRegName('');
      setRegEmail('');
      const p = await getWorkshopParticipants(id!);
      setParticipants(p || []);
      if (opts?.addToCalendar && workshop) {
        window.open(generateGoogleCalendarUrl(workshop), '_blank', 'noopener,noreferrer');
        generateICSFile(workshop);
      }
    } catch (e: any) {
      const isDup = e.message?.includes('duplicate');
      toast({ title: isDup ? 'Already registered!' : 'Registration failed', variant: isDup ? 'default' : 'destructive' });
      if (isDup && opts?.addToCalendar && workshop) {
        window.open(generateGoogleCalendarUrl(workshop), '_blank', 'noopener,noreferrer');
        generateICSFile(workshop);
      }
    }
    setRegistering(false);
  };

  const downloadCertificate = async (name: string, type: 'participant' | 'presenter') => {
    const verificationCode = generateVerificationCode();
    const params: any = {
      workshopTitle: workshop.title,
      workshopDate: workshop.date,
      workshopDescription: workshop.description || '',
      presenterName: presenterNames || 'Presenter',
      presenterNames: presenterNamesArray,
      signerName: company?.director_name || presenterNames || 'Director',
      companyName: company?.company_name || 'Wildlife UK',
      companyLogoUrl: company?.logo_url,
      type,
    };
    if (type === 'participant') params.participantName = name;
    else params.presenterName = name;

    const { certificateText } = await generateCertificateText(params);
    try {
      await saveCertificateVerification({
        verificationCode,
        participantName: name,
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        workshopDate: workshop.date,
        certificateType: type,
        companyName: company?.company_name || 'Wildlife UK',
      });
    } catch (e) {
      console.warn('Verification save failed, continuing with certificate');
    }
    await generateCertificatePDF({
      certificateText,
      participantName: type === 'participant' ? name : undefined,
      presenterName: type === 'presenter' ? name : undefined,
      presenterNames: presenterNamesArray,
      workshopTitle: workshop.title,
      workshopDate: workshop.date,
      signerName: company?.director_name || presenterNames || 'Director',
      signatureUrl: company?.director_signature_url || presenters[0]?.signature_url,
      companyName: company?.company_name || 'Wildlife UK',
      companyLogoUrl: company?.logo_url,
      partnerLogos: workshop.partner_logos || [],
      type,
      verificationCode,
    });
  };

  const handleCertificate = async () => {
    if (!certEmail.trim()) {
      toast({ title: 'Enter your email to get certificate', variant: 'destructive' });
      return;
    }
    const email = certEmail.toLowerCase();
    const participant = participants.find(p => p.email.toLowerCase() === email);
    const isPresenter = presenters.some((p: any) => p.name && participants.find((pp: any) => pp.email.toLowerCase() === email));
    // Check if this email belongs to a presenter too (by matching presenter name to participant name)
    const matchedPresenter = presenters.find((p: any) => {
      const part = participants.find((pp: any) => pp.email.toLowerCase() === email);
      return part && p.name.toLowerCase() === part.full_name.toLowerCase();
    });

    if (!participant) {
      toast({ title: 'Email not found in participants list', variant: 'destructive' });
      return;
    }
    setCertLoading(true);
    try {
      // Download participant certificate
      await downloadCertificate(participant.full_name, 'participant');
      toast({ title: 'Participant certificate downloaded!' });

      // If also a presenter, download presenter certificate too
      if (matchedPresenter) {
        await downloadCertificate(matchedPresenter.name, 'presenter');
        toast({ title: 'Presenter certificate also downloaded!' });
      }
    } catch (e: any) {
      toast({ title: 'Certificate generation failed', description: e.message, variant: 'destructive' });
    }
    setCertLoading(false);
  };

  function generateVerificationCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'WK-';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!workshop) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Event not found</div>;

  const isPast = workshop.is_completed || new Date(workshop.date) < new Date();
  const isUpcoming = !isPast;
  const isWebinar = workshop.event_type === 'webinar';
  const eventLabel = isWebinar ? 'Webinar' : 'Workshop';

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-forest py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-primary-foreground font-semibold">{eventLabel}</span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-3">
            {workshop.title}
          </motion.h1>
          <div className="flex flex-wrap gap-4 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{format(new Date(workshop.date), 'EEEE, dd MMMM yyyy · HH:mm')}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{workshop.duration_minutes} min</span>
            {workshop.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{workshop.location}</span>}
            {presenterNames && <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{presenterNames}</span>}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {workshop.description && (
          <section>
            <div className="text-foreground leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatDescription(workshop.description) }} />
          </section>
        )}

        {workshop.timeline && (
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-accent" /> Programme / Timeline
            </h2>
            <div className="text-foreground leading-relaxed whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: formatDescription(workshop.timeline) }} />
          </section>
        )}

        {isUpcoming && (
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Add to Calendar</h3>
              <div className="flex gap-3">
                <a href={generateGoogleCalendarUrl(workshop)} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                  <ExternalLink className="w-4 h-4" /> Google Calendar
                </a>
                <Button variant="outline" size="sm" onClick={() => generateICSFile(workshop)} className="gap-2">
                  <Download className="w-4 h-4" /> Download .ics
                </Button>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Register</h3>
              <div className="space-y-3">
                <Input placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} />
                <Input placeholder="Email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                <Button onClick={() => handleRegister()} disabled={registering} className="w-full bg-accent text-accent-foreground hover:opacity-90">
                  {registering ? 'Registering...' : `Join ${eventLabel}`}
                </Button>
                <Button onClick={() => handleRegister({ addToCalendar: true })} disabled={registering} variant="outline" className="w-full gap-2">
                  <Calendar className="w-4 h-4" /> Join & Add to Calendar
                </Button>
              </div>
            </div>
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

            <div className="bg-card border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs text-muted-foreground">Track your progress:</label>
              <Input
                placeholder="Your email"
                type="email"
                value={progressEmail}
                onChange={e => setProgressEmail(e.target.value)}
                className="flex-1 min-w-[200px] max-w-sm h-9"
              />
              <Button size="sm" variant="outline" onClick={() => loadProgress(progressEmail)} disabled={progressLoading || !progressEmail.trim()}>
                {progressLoading ? 'Loading...' : 'Load progress'}
              </Button>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${lessons.length ? (completedLessonIds.size / lessons.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {lessons.map((l, idx) => {
                const videoId = l.video_url ? extractYoutubeId(l.video_url) : null;
                const mats = Array.isArray(l.materials) ? l.materials : [];
                const isComplete = completedLessonIds.has(l.id);
                return (
                  <div key={l.id} className={`bg-card border rounded-lg p-5 transition-colors ${isComplete ? 'border-accent/60' : 'border-border'}`}>
                    <div className="flex items-start gap-3 mb-2">
                      <button
                        onClick={() => toggleLessonComplete(l.id, isComplete)}
                        className="mt-0.5 hover:scale-110 transition-transform"
                        title={isComplete ? 'Mark as not completed' : 'Mark as completed'}
                      >
                        {isComplete
                          ? <CheckCircle2 className="w-5 h-5 text-accent" />
                          : <Circle className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 flex items-baseline gap-3">
                        <span className="text-xs font-bold text-accent">Lesson {idx + 1}</span>
                        <h3 className={`font-display font-semibold text-foreground ${isComplete ? 'line-through opacity-70' : ''}`}>{l.title}</h3>
                      </div>
                    </div>
                    {l.description && (
                      <div className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatDescription(l.description) }} />
                    )}
                    {videoId && (
                      <div className="aspect-video rounded-md overflow-hidden mb-3">
                        <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title={l.title} />
                      </div>
                    )}
                    {mats.length > 0 && (
                      <div className="grid gap-2 mt-3">
                        {mats.map((m: any, i: number) => {
                          const t = (m.type || '').toString();
                          const isImg = t.startsWith('image');
                          return (
                            <a key={i} href={m.url} target="_blank" rel="noopener" download className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-2 text-sm hover:shadow-forest transition-shadow">
                              {isImg ? <Image className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-accent" />}
                              <span className="text-foreground truncate">{m.title}</span>
                              <Download className="w-3.5 h-3.5 ml-auto text-muted-foreground flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allLessonsComplete && (
              <div className="mt-6 bg-gradient-forest text-primary-foreground rounded-lg p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8" />
                  <div>
                    <h3 className="font-display font-bold">Course completed!</h3>
                    <p className="text-sm opacity-90">Download your Certificate of Course Completion.</p>
                  </div>
                </div>
                <Button onClick={downloadCourseCompletionCertificate} disabled={courseCertLoading} className="bg-accent text-accent-foreground hover:opacity-90 gap-2">
                  <Download className="w-4 h-4" /> {courseCertLoading ? 'Generating...' : 'Download Certificate'}
                </Button>
              </div>
            )}
          </section>
        )}


        {videos.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-accent" /> Recordings
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {videos.map(v => {
                const videoId = extractYoutubeId(v.youtube_url);
                return (
                  <div key={v.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    {videoId && (
                      <div className="aspect-video">
                        <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title={v.title || 'Video'} />
                      </div>
                    )}
                    {v.title && <p className="p-3 text-sm font-medium text-foreground">{v.title}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {materials.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Materials
            </h2>
            <div className="grid gap-3">
              {materials.map(m => (
                <a key={m.id} href={m.file_url} target="_blank" rel="noopener" className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:shadow-forest transition-shadow">
                  {m.file_type?.startsWith('image') ? <Image className="w-5 h-5 text-accent" /> : <FileText className="w-5 h-5 text-accent" />}
                  <span className="text-sm font-medium text-foreground">{m.title}</span>
                  <Download className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        )}

        {participants.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" /> Participants ({participants.length})
            </h2>
            <div className="grid gap-1">
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                  <span className="text-sm text-foreground">{p.full_name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certificate download for completed events - handles both participant and presenter */}
        {isPast && participants.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" /> Download Your Certificate
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the email you registered with to download your certificate. If you were also a presenter, both certificates will be generated.
            </p>
            <div className="flex gap-3 max-w-md">
              <Input placeholder="Your registered email" type="email" value={certEmail} onChange={e => setCertEmail(e.target.value)} />
              <Button onClick={handleCertificate} disabled={certLoading} className="bg-accent text-accent-foreground hover:opacity-90 whitespace-nowrap">
                {certLoading ? 'Generating...' : 'Get Certificate'}
              </Button>
            </div>
          </section>
        )}
      </main>

      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track your lesson progress</DialogTitle>
            <DialogDescription>
              Enter your email and we'll automatically load your saved progress for this course. Your progress will sync across devices.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="your@email.com"
            type="email"
            value={emailModalValue}
            onChange={e => setEmailModalValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitEmailModal()}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEmailModalOpen(false)}>Skip for now</Button>
            <Button onClick={submitEmailModal} disabled={!emailModalValue.trim()} className="bg-accent text-accent-foreground hover:opacity-90">
              Load my progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function formatDescription(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export default WorkshopDetail;

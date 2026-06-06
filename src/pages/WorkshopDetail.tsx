import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Download, ExternalLink, Play, FileText, Image, Award, ListOrdered, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkshop, getWorkshopVideos, getWorkshopMaterials, getWorkshopParticipants, getCompanySettings, saveCertificateVerification, getWorkshopLessons } from '@/lib/api';
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

  const linkedPresenters = (workshop?.workshop_presenters || [])
    .map((wp: any) => wp.presenters)
    .filter(Boolean);
  const legacyPresenter = workshop?.presenters;
  const presenters = linkedPresenters.length > 0 ? linkedPresenters : (legacyPresenter ? [legacyPresenter] : []);
  const presenterNamesArray = presenters.map((p: any) => p.name).filter(Boolean);
  const presenterNames = presenterNamesArray.join(', ');

  const handleRegister = async () => {
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
    } catch (e: any) {
      toast({ title: e.message?.includes('duplicate') ? 'Already registered!' : 'Registration failed', variant: 'destructive' });
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
                <Button onClick={handleRegister} disabled={registering} className="w-full bg-accent text-accent-foreground hover:opacity-90">
                  {registering ? 'Registering...' : `Join ${eventLabel}`}
                </Button>
              </div>
            </div>
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

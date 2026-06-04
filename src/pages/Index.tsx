import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowRight, ShieldCheck, Monitor, Wrench, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getWorkshops, getCompanySettings } from '@/lib/api';
import { format } from 'date-fns';

const Index = () => {
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkshops(), getCompanySettings()])
      .then(([ws, cs]) => {
        setWorkshops(ws || []);
        setCompany(cs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = workshops.filter((w) => !w.is_completed && new Date(w.date) >= new Date());
  const past = workshops.filter((w) => w.is_completed || new Date(w.date) < new Date());

  const upcomingWorkshops = upcoming.filter(w => w.event_type !== 'webinar');
  const upcomingWebinars = upcoming.filter(w => w.event_type === 'webinar');
  const pastWorkshops = past.filter(w => w.event_type !== 'webinar');
  const pastWebinars = past.filter(w => w.event_type === 'webinar');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-card border-b border-border py-16 px-6">
        <div className="max-w-5xl mx-auto relative">
          <Link
            to="/verify"
            aria-label="Verify certificate"
            title="Verify certificate"
            className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShieldCheck className="w-4 h-4" />
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3 text-foreground">
              Workshop & Webinars Hub
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm md:text-base leading-relaxed">
              Explore our upcoming sessions or browse past events with recordings, materials and certificates.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading events...</div>
        ) : (
          <>
            {/* Upcoming Workshops */}
            {upcomingWorkshops.length > 0 && (
              <EventSection title="Upcoming Workshops" icon={<Wrench className="w-6 h-6 text-accent" />} events={upcomingWorkshops} />
            )}

            {/* Upcoming Webinars */}
            {upcomingWebinars.length > 0 && (
              <EventSection title="Upcoming Webinars" icon={<Monitor className="w-6 h-6 text-accent" />} events={upcomingWebinars} />
            )}

            {upcoming.length === 0 && (
              <section className="mb-16">
                <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-accent" /> Upcoming Events
                </h2>
                <p className="text-muted-foreground bg-muted rounded-lg p-8 text-center">
                  No upcoming events at the moment. Check back soon!
                </p>
              </section>
            )}

            {/* Past Workshops */}
            {pastWorkshops.length > 0 && (
              <EventSection title="Past Workshops" icon={<Wrench className="w-6 h-6 text-accent" />} events={pastWorkshops} isPast />
            )}

            {/* Past Webinars */}
            {pastWebinars.length > 0 && (
              <EventSection title="Past Webinars" icon={<Monitor className="w-6 h-6 text-accent" />} events={pastWebinars} isPast />
            )}

          </>
        )}
      </main>
    </div>
  );
};

function EventSection({ title, icon, events, isPast }: { title: string; icon: React.ReactNode; events: any[]; isPast?: boolean }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {events.map((w, i) => (
          <WorkshopCard key={w.id} workshop={w} index={i} isPast={isPast} />
        ))}
      </div>
    </section>
  );
}

function WorkshopCard({ workshop, index, isPast }: { workshop: any; index: number; isPast?: boolean }) {
  const isWebinar = workshop.event_type === 'webinar';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        to={`/workshop/${workshop.id}`}
        className="block bg-card border border-border rounded-lg p-6 hover:shadow-forest transition-all duration-300 group"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isPast ? 'bg-muted text-muted-foreground' : 'bg-accent/20 text-accent-foreground'
            }`}>
              {isPast ? 'Completed' : 'Upcoming'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {isWebinar ? 'Webinar' : 'Workshop'}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2 group-hover:text-forest-light transition-colors">
          {workshop.title}
        </h3>
        {workshop.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{workshop.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(workshop.date), 'dd MMM yyyy, HH:mm')}
          </span>
          {workshop.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {workshop.location}
            </span>
          )}
          {(() => {
            const presenterNames = (workshop.workshop_presenters || [])
              .map((wp: any) => wp.presenters?.name)
              .filter(Boolean)
              .join(', ');
            return presenterNames ? (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {presenterNames}
              </span>
            ) : null;
          })()}
        </div>
      </Link>
    </motion.div>
  );
}

export default Index;

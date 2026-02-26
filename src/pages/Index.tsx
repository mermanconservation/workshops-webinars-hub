import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowRight, ShieldCheck, Waves } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-forest text-primary-foreground py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {company?.logo_url && (
              <img src={company.logo_url} alt={company.company_name} className="w-16 h-16 object-contain mb-4 rounded-lg bg-white/10 p-1" />
            )}
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              {company?.company_name || 'Workshop Hub'}
            </h1>
            <p className="text-primary-foreground/75 max-w-xl text-sm md:text-base leading-relaxed">
              {company?.additional_details || 'Professional workshops and training programmes. Explore our upcoming sessions or browse past workshops with recordings and materials.'}
            </p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading workshops...</div>
        ) : (
          <>
            {/* Upcoming */}
            <section className="mb-16">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-accent" />
                Upcoming Workshops
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground bg-muted rounded-lg p-8 text-center">
                  No upcoming workshops at the moment. Check back soon!
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {upcoming.map((w, i) => (
                    <WorkshopCard key={w.id} workshop={w} index={i} />
                  ))}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-2xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-accent" />
                  Past Workshops
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {past.map((w, i) => (
                    <WorkshopCard key={w.id} workshop={w} index={i} isPast />
                  ))}
                </div>
              </section>
            )}

            {/* Verify link */}
            <section className="mt-12 text-center">
              <Link to="/verify" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-5 py-3 hover:bg-card">
                <ShieldCheck className="w-4 h-4" /> Verify a certificate
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

function WorkshopCard({ workshop, index, isPast }: { workshop: any; index: number; isPast?: boolean }) {
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
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isPast
              ? 'bg-muted text-muted-foreground'
              : 'bg-accent/20 text-accent-foreground'
          }`}>
            {isPast ? 'Completed' : 'Upcoming'}
          </span>
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
          {workshop.presenters?.name && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {workshop.presenters.name}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export default Index;
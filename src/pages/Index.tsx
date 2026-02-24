import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowRight } from 'lucide-react';
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

  const upcoming = workshops.filter(w => !w.is_completed && new Date(w.date) >= new Date());
  const past = workshops.filter(w => w.is_completed || new Date(w.date) < new Date());

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="bg-gradient-forest py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {company?.logo_url && (
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              src={company.logo_url}
              alt="Logo"
              className="w-20 h-20 mx-auto mb-6 rounded-xl object-contain bg-primary-foreground/10 p-2"
            />
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4"
          >
            {company?.company_name || 'Wildlife UK'} Workshops
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-primary-foreground/80 max-w-2xl mx-auto"
          >
            Join our expert-led workshops, access recordings & materials, and receive certificates of participation.
          </motion.p>
        </div>
      </header>

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
          </>
        )}
      </main>

      <footer className="bg-primary text-primary-foreground py-8 px-6 text-center text-sm">
        <p>© {new Date().getFullYear()} {company?.company_name || 'Wildlife UK'}. All rights reserved.</p>
      </footer>
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

export function generateGoogleCalendarUrl(workshop: {
  title: string;
  description?: string;
  date: string;
  duration_minutes: number;
  location?: string;
}) {
  const start = new Date(workshop.date);
  const end = new Date(start.getTime() + workshop.duration_minutes * 60000);
  
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: workshop.title,
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details: workshop.description || '',
    location: workshop.location || '',
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateICSFile(workshop: {
  title: string;
  description?: string;
  date: string;
  duration_minutes: number;
  location?: string;
}) {
  const start = new Date(workshop.date);
  const end = new Date(start.getTime() + workshop.duration_minutes * 60000);
  
  const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Workshop Dashboard//EN
BEGIN:VEVENT
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${workshop.title}
DESCRIPTION:${(workshop.description || '').replace(/\n/g, '\\n')}
LOCATION:${workshop.location || ''}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workshop.title.replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, CheckSquare, CalendarDays } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import RecentActivity from '@/components/dashboard/RecentActivity';
import FilingStatusChart from '@/components/dashboard/FilingStatusChart';
import { format, parseISO, isToday, isFuture, startOfDay } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays as CalIcon, Clock } from 'lucide-react';

function UpcomingAppointments({ appointments }) {
  const upcoming = [...appointments]
    .filter(a => {
      if (!a.date || a.status === 'cancelled') return false;
      const d = parseISO(a.date);
      return isToday(d) || isFuture(startOfDay(d));
    })
    .sort((a, b) => {
      const da = a.date + (a.time || '');
      const db = b.date + (b.time || '');
      return da.localeCompare(db);
    })
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalIcon className="w-4 h-4 text-accent" /> Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No upcoming appointments</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  {a.client_name && <p className="text-xs text-muted-foreground">{a.client_name}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium">{format(parseISO(a.date), 'MMM d')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />{a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: filings = [] } = useQuery({
    queryKey: ['filings'],
    queryFn: () => base44.entities.TaxFiling.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list(),
  });

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingFilings = filings.filter(f => f.status !== 'filed' && f.status !== 'assessed').length;
  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  const todayAppts = appointments.filter(a => a.date && isToday(parseISO(a.date)) && a.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your practice at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Clients" value={activeClients} icon={Users} subtitle={`${clients.length} total clients`} />
        <StatCard title="Pending Filings" value={pendingFilings} icon={FileText} subtitle={`${filings.length} total filings`} />
        <StatCard title="Open Tasks" value={openTasks} icon={CheckSquare} subtitle={`${tasks.filter(t => t.status === 'completed').length} completed`} />
        <StatCard title="Today's Appointments" value={todayAppts} icon={CalendarDays} subtitle={`${appointments.length} total scheduled`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlines filings={filings} />
        <FilingStatusChart filings={filings} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivity tasks={tasks} />
        <UpcomingAppointments appointments={appointments} />
      </div>
    </div>
  );
}
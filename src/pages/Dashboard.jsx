import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, FileText, CheckSquare, DollarSign } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import RecentActivity from '@/components/dashboard/RecentActivity';
import FilingStatusChart from '@/components/dashboard/FilingStatusChart';

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

  const activeClients = clients.filter(c => c.status === 'active').length;
  const pendingFilings = filings.filter(f => f.status !== 'filed' && f.status !== 'assessed').length;
  const openTasks = tasks.filter(t => t.status !== 'completed').length;
  const totalRevenue = clients.reduce((sum, c) => sum + (c.annual_revenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your practice at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Clients" value={activeClients} icon={Users} subtitle={`${clients.length} total clients`} />
        <StatCard title="Pending Filings" value={pendingFilings} icon={FileText} subtitle={`${filings.length} total filings`} />
        <StatCard title="Open Tasks" value={openTasks} icon={CheckSquare} subtitle={`${tasks.filter(t => t.status === 'completed').length} completed`} />
        <StatCard title="Client Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} icon={DollarSign} subtitle="Aggregate estimated" />
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingDeadlines filings={filings} />
        <FilingStatusChart filings={filings} />
      </div>

      <div className="grid grid-cols-1">
        <RecentActivity tasks={tasks} />
      </div>
    </div>
  );
}
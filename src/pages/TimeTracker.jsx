import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, DollarSign, Trash2, Play, Square, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const categories = ['tax_prep', 'bookkeeping', 'audit', 'advisory', 'client_meeting', 'admin', 'other'];
const categoryLabels = {
  tax_prep: 'Tax Prep', bookkeeping: 'Bookkeeping', audit: 'Audit',
  advisory: 'Advisory', client_meeting: 'Client Meeting', admin: 'Admin', other: 'Other'
};

const defaultEntry = {
  client_id: '', client_name: '', description: '', category: 'tax_prep',
  date: format(new Date(), 'yyyy-MM-dd'), hours: 1, minutes: 0, billable: true, rate_per_hour: 150
};

export default function TimeTracker() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultEntry);
  const [filterClient, setFilterClient] = useState('all');
  const [stopwatchActive, setStopwatchActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: entries = [], isLoading } = useQuery({ queryKey: ['time-entries'], queryFn: () => base44.entities.TimeEntry.list('-date') });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['time-entries'] }); setOpen(false); setForm(defaultEntry); toast({ title: 'Time entry saved' }); }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] })
  });

  const startStopwatch = () => {
    setElapsed(0);
    setStopwatchActive(true);
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopStopwatch = () => {
    clearInterval(intervalRef.current);
    setStopwatchActive(false);
    const totalMins = Math.floor(elapsed / 60);
    setForm(f => ({ ...f, hours: Math.floor(totalMins / 60), minutes: totalMins % 60 }));
    setOpen(true);
  };

  const fmtElapsed = (s) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleClientChange = (id) => {
    const client = clients.find(c => c.id === id);
    setForm(f => ({ ...f, client_id: id, client_name: client?.name || '' }));
  };

  const filtered = filterClient === 'all' ? entries : entries.filter(e => e.client_id === filterClient);

  const totalBillable = filtered.filter(e => e.billable).reduce((sum, e) => sum + (e.hours + (e.minutes || 0) / 60), 0);
  const totalRevenue = filtered.filter(e => e.billable).reduce((sum, e) => sum + ((e.hours + (e.minutes || 0) / 60) * (e.rate_per_hour || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Time Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Track billable hours per client</p>
        </div>
        <div className="flex gap-2">
          {stopwatchActive ? (
            <Button variant="destructive" onClick={stopStopwatch}>
              <Square className="w-4 h-4 mr-2" /> Stop ({fmtElapsed(elapsed)})
            </Button>
          ) : (
            <Button variant="outline" onClick={startStopwatch}>
              <Play className="w-4 h-4 mr-2" /> Start Timer
            </Button>
          )}
          <Button onClick={() => { setForm(defaultEntry); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Entries</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Billable Hours</p>
          <p className="text-2xl font-bold">{totalBillable.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Estimated Revenue</p>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filter by client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Entries list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No time entries yet. Add one or start the timer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <Card key={entry.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{entry.client_name}</span>
                    <Badge variant="outline" className="text-xs">{categoryLabels[entry.category] || entry.category}</Badge>
                    {entry.billable && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Billable</Badge>}
                  </div>
                  {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-bold">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {entry.hours}h {entry.minutes ? `${entry.minutes}m` : ''}
                    </div>
                    {entry.billable && entry.rate_per_hour && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <DollarSign className="w-3 h-3" />
                        {((entry.hours + (entry.minutes || 0) / 60) * entry.rate_per_hour).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(entry.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log Time Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{categoryLabels[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Hours *</Label>
                <Input type="number" min={0} value={form.hours} onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Minutes</Label>
                <Input type="number" min={0} max={59} value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate/hr ($)</Label>
                <Input type="number" min={0} value={form.rate_per_hour} onChange={e => setForm(f => ({ ...f, rate_per_hour: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="What work was done?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-20" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="billable" checked={form.billable} onCheckedChange={v => setForm(f => ({ ...f, billable: v }))} />
              <Label htmlFor="billable" className="cursor-pointer">Billable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.client_id || createMut.isPending}>Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarDays, Plus, MoreHorizontal, Trash2, Clock, User, MapPin, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'review', label: 'Review' },
  { value: 'planning', label: 'Tax Planning' },
  { value: 'audit', label: 'Audit' },
  { value: 'other', label: 'Other' },
];

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-amber-100 text-amber-700',
};

const DURATIONS = [30, 45, 60, 90, 120];

const emptyForm = {
  title: '', client_id: '', client_name: '', date: '', time: '10:00',
  duration_minutes: 60, type: 'consultation', location: '', notes: '', status: 'scheduled', assigned_to: ''
};

export default function Appointments() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [draggingAppt, setDraggingAppt] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm(f => ({ ...f, client_id: clientId, client_name: client?.name || '' }));
  };

  const openNew = (date) => {
    setForm({ ...emptyForm, date: format(date, 'yyyy-MM-dd') });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (appt) => {
    setForm({ ...appt });
    setEditingId(appt.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateMut.mutateAsync({ id: editingId, data: form });
    } else {
      await createMut.mutateAsync(form);
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleStatusChange = (appt, status) => {
    updateMut.mutate({ id: appt.id, data: { ...appt, status } });
  };

  const handleDragStart = (e, appt) => {
    setDraggingAppt(appt);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, d) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(format(d, 'yyyy-MM-dd'));
  };

  const handleDrop = (e, d) => {
    e.preventDefault();
    if (draggingAppt) {
      const newDate = format(d, 'yyyy-MM-dd');
      if (newDate !== draggingAppt.date) {
        updateMut.mutate({ id: draggingAppt.id, data: { ...draggingAppt, date: newDate } });
      }
    }
    setDraggingAppt(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggingAppt(null);
    setDragOverDate(null);
  };

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getApptsForDay = (d) =>
    appointments.filter(a => a.date && isSameDay(parseISO(a.date), d));

  const selectedDayAppts = getApptsForDay(selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-accent" /> Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule and manage client appointments</p>
        </div>
        <Button onClick={() => openNew(selectedDate)}>
          <Plus className="w-4 h-4 mr-2" /> New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            {/* Month Nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-base">{format(currentMonth, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {days.map((d, i) => {
                const dayAppts = getApptsForDay(d);
                const isSelected = isSameDay(d, selectedDate);
                const isCurrentMonth = isSameMonth(d, currentMonth);
                const todayDay = isToday(d);
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    onDragOver={(e) => handleDragOver(e, d)}
                    onDrop={(e) => handleDrop(e, d)}
                    onDragLeave={() => setDragOverDate(null)}
                    className={cn(
                      "bg-card min-h-[64px] p-1.5 cursor-pointer transition-colors hover:bg-muted/50",
                      isSelected && "ring-2 ring-inset ring-accent",
                      !isCurrentMonth && "opacity-40",
                      dragOverDate === format(d, 'yyyy-MM-dd') && draggingAppt && "bg-accent/10 ring-2 ring-inset ring-accent/50"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      todayDay && "bg-primary text-primary-foreground",
                      isSelected && !todayDay && "text-accent font-bold"
                    )}>
                      {format(d, 'd')}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayAppts.slice(0, 2).map((a, ai) => (
                        <div
                          key={ai}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, a); }}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => { e.stopPropagation(); openEdit(a); }}
                          className={cn(
                            "text-[9px] leading-tight px-1 py-0.5 rounded bg-accent/20 text-accent-foreground truncate font-medium cursor-grab active:cursor-grabbing hover:bg-accent/40 transition-colors",
                            draggingAppt?.id === a.id && "opacity-40"
                          )}
                        >
                          {a.time} {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <div className="text-[9px] text-muted-foreground pl-1">+{dayAppts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Day Panel */}
        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">{format(selectedDate, 'EEEE')}</h3>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openNew(selectedDate)}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : selectedDayAppts.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAppts
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map(appt => (
                    <div key={appt.id} className="border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{appt.title}</p>
                          {appt.client_name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" /> {appt.client_name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {appt.time} · {appt.duration_minutes}min
                            </span>
                          </div>
                          {appt.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" /> {appt.location}
                            </p>
                          )}
                          <Badge className={`${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled} text-[10px] px-1.5 py-0 border-0 mt-1.5`}>
                            {appt.status}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(appt)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(appt, 'completed')}>
                              <CheckCircle2 className="w-3 h-3 mr-2 text-green-600" /> Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(appt, 'cancelled')}>
                              <XCircle className="w-3 h-3 mr-2 text-red-500" /> Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMut.mutate(appt.id)} className="text-destructive">
                              <Trash2 className="w-3 h-3 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Tax Review Meeting" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Time *</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration</Label>
                <Select value={String(form.duration_minutes)} onValueChange={v => setForm(f => ({ ...f, duration_minutes: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Location / Video Link</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Office, Zoom link, etc." />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Agenda or preparation notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.date || !form.time}>
              {editingId ? 'Save Changes' : 'Create Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
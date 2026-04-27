import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, NotebookPen, Trash2, Pencil, Mail, Phone, Users, Calendar, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const typeConfig = {
  call: { label: 'Phone Call', color: 'bg-blue-100 text-blue-700', icon: Phone },
  email: { label: 'Email', color: 'bg-purple-100 text-purple-700', icon: Mail },
  meeting: { label: 'Meeting', color: 'bg-green-100 text-green-700', icon: Users },
  internal: { label: 'Internal', color: 'bg-gray-100 text-gray-700', icon: NotebookPen },
  cra_correspondence: { label: 'CRA', color: 'bg-orange-100 text-orange-700', icon: Mail },
  other: { label: 'Other', color: 'bg-yellow-100 text-yellow-700', icon: NotebookPen },
};

const defaultNote = {
  client_id: '', client_name: '', title: '', content: '',
  type: 'internal', date: format(new Date(), 'yyyy-MM-dd'),
  follow_up_date: '', send_reminder: false
};

export default function ClientNotes() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultNote);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: notes = [], isLoading } = useQuery({ queryKey: ['client-notes'], queryFn: () => base44.entities.ClientNote.list('-date') });

  const saveMut = useMutation({
    mutationFn: (data) => editing ? base44.entities.ClientNote.update(editing.id, data) : base44.entities.ClientNote.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['client-notes'] }); setOpen(false); setEditing(null); setForm(defaultNote); toast({ title: editing ? 'Note updated' : 'Note saved' }); }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.ClientNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-notes'] })
  });

  const sendReminder = async (note) => {
    const client = clients.find(c => c.id === note.client_id);
    if (!client?.email) { toast({ title: 'No client email on file', variant: 'destructive' }); return; }
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: client.email,
      subject: `Follow-up: ${note.title}`,
      body: `Hello ${client.name},\n\nThis is a follow-up regarding: "${note.title}".\n\n${note.content}\n\nPlease feel free to contact our office if you have any questions.\n\nBest regards,\nYour CPA Team`
    });
    await base44.entities.ClientNote.update(note.id, { reminder_sent: true });
    queryClient.invalidateQueries({ queryKey: ['client-notes'] });
    setSending(false);
    toast({ title: 'Reminder email sent', description: `Sent to ${client.email}` });
  };

  const handleClientChange = (id) => {
    const client = clients.find(c => c.id === id);
    setForm(f => ({ ...f, client_id: id, client_name: client?.name || '' }));
  };

  const openEdit = (note) => { setEditing(note); setForm({ ...note }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm(defaultNote); setOpen(true); };

  const filtered = notes.filter(n => {
    const matchClient = filterClient === 'all' || n.client_id === filterClient;
    const matchType = filterType === 'all' || n.type === filterType;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()) || n.client_name?.toLowerCase().includes(search.toLowerCase());
    return matchClient && matchType && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Client Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Correspondence & internal notes</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Note</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <NotebookPen className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No notes found. Add your first note.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => {
            const tc = typeConfig[note.type] || typeConfig.other;
            const Icon = tc.icon;
            return (
              <Card key={note.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-semibold text-sm">{note.title}</span>
                      <Badge className={`${tc.color} border-0 text-xs flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />{tc.label}
                      </Badge>
                      {note.reminder_sent && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Reminder Sent</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{note.client_name} · {note.date}</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">{note.content}</p>
                    {note.follow_up_date && (
                      <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Follow-up: {note.follow_up_date}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {note.send_reminder && !note.reminder_sent && (
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => sendReminder(note)} disabled={sending}>
                        <Mail className="w-3 h-3 mr-1" /> Send Reminder
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(note)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(note.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title / Subject *</Label>
              <Input placeholder="Brief subject or title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Note Content *</Label>
              <Textarea placeholder="Full details of the correspondence or note..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="h-32" />
            </div>
            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.follow_up_date || ''} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="send_reminder" checked={form.send_reminder} onCheckedChange={v => setForm(f => ({ ...f, send_reminder: v }))} />
              <Label htmlFor="send_reminder" className="cursor-pointer">Enable email reminder to client on follow-up date</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={!form.client_id || !form.title || !form.content || saveMut.isPending}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
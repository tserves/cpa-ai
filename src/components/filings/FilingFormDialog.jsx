import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const FILING_TYPES = ['T1', 'T2', 'T3', 'T4', 'T4A', 'T5', 'GST/HST', 'T2125', 'NR4', 'T5013', 'RC59'];
const STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'filed', label: 'Filed' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'reassessed', label: 'Reassessed' },
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const emptyFiling = {
  client_id: '', client_name: '', filing_type: 'T1', tax_year: new Date().getFullYear().toString(),
  due_date: '', status: 'not_started', assigned_to: '', amount_owing: '', notes: '', priority: 'medium'
};

export default function FilingFormDialog({ open, onOpenChange, filing, clients, onSave }) {
  const [form, setForm] = useState(emptyFiling);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (filing) {
      setForm({ ...emptyFiling, ...filing, amount_owing: filing.amount_owing || '' });
    } else {
      setForm(emptyFiling);
    }
  }, [filing, open]);

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client?.name || '' });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, amount_owing: form.amount_owing ? Number(form.amount_owing) : undefined };
    await onSave(data);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{filing ? 'Edit Filing' : 'New Tax Filing'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filing Type *</Label>
              <Select value={form.filing_type} onValueChange={v => setForm({...form, filing_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax Year *</Label>
              <Input value={form.tax_year} onChange={e => setForm({...form, tax_year: e.target.value})} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount Owing ($)</Label>
              <Input value={form.amount_owing} onChange={e => setForm({...form, amount_owing: e.target.value})} type="number" placeholder="Negative = refund" />
            </div>
            <div className="col-span-2">
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} placeholder="Team member" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.client_id || !form.filing_type}>
            {saving ? 'Saving...' : 'Save Filing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
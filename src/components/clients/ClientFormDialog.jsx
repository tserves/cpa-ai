import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const CLIENT_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'trust', label: 'Trust' },
  { value: 'non_profit', label: 'Non-Profit' },
];

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
];

const emptyClient = {
  name: '', type: 'individual', email: '', phone: '', address: '',
  province: '', sin_or_bn: '', fiscal_year_end: '', gst_hst_registered: false,
  status: 'active', notes: '', annual_revenue: '', payment_status: 'paid',
  last_payment_date: '', outstanding_balance: ''
};

export default function ClientFormDialog({ open, onOpenChange, client, onSave }) {
  const [form, setForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({ ...emptyClient, ...client, annual_revenue: client.annual_revenue || '' });
    } else {
      setForm(emptyClient);
    }
  }, [client, open]);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : undefined,
      outstanding_balance: form.outstanding_balance ? Number(form.outstanding_balance) : undefined,
    };
    await onSave(data);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{client ? 'Edit Client' : 'New Client'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name or business name" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Province</Label>
              <Select value={form.province} onValueChange={v => setForm({...form, province: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label>SIN / BN</Label>
              <Input value={form.sin_or_bn} onChange={e => setForm({...form, sin_or_bn: e.target.value})} />
            </div>
            <div>
              <Label>Annual Revenue ($)</Label>
              <Input value={form.annual_revenue} onChange={e => setForm({...form, annual_revenue: e.target.value})} type="number" />
            </div>
            <div>
              <Label>Fiscal Year End</Label>
              <Input value={form.fiscal_year_end} onChange={e => setForm({...form, fiscal_year_end: e.target.value})} placeholder="e.g. December" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.gst_hst_registered} onCheckedChange={v => setForm({...form, gst_hst_registered: v})} />
              <Label>GST/HST Registered</Label>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={form.payment_status || 'paid'} onValueChange={v => setForm({...form, payment_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Outstanding Balance ($)</Label>
              <Input value={form.outstanding_balance} onChange={e => setForm({...form, outstanding_balance: e.target.value})} type="number" placeholder="0.00" />
            </div>
            <div>
              <Label>Last Payment Date</Label>
              <Input value={form.last_payment_date} onChange={e => setForm({...form, last_payment_date: e.target.value})} type="date" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save Client'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
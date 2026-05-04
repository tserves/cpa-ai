import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Send, Trash2, Search, FilePlus, Edit2, Copy, CheckCircle2,
  XCircle, Clock, FileText, DollarSign, Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'bg-gray-100 text-gray-600',   icon: FileText },
  sent:     { label: 'Sent',     color: 'bg-blue-100 text-blue-700',   icon: Send },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700',     icon: XCircle },
  expired:  { label: 'Expired',  color: 'bg-amber-100 text-amber-700', icon: Clock },
};

const DEFAULT_LINE = { description: '', quantity: 1, unit_price: 0, amount: 0 };

function statusBadge(status) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = s.icon;
  return (
    <Badge className={`${s.color} border-0 text-xs flex items-center gap-1`}>
      <Icon className="w-3 h-3" /> {s.label}
    </Badge>
  );
}

function generateNumber() {
  return `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function buildEmailHtml(quote, emailNote = '') {
  const lineItems = quote.line_items
    ? (typeof quote.line_items === 'string' ? JSON.parse(quote.line_items) : quote.line_items)
    : [];
  const lineHtml = lineItems.map(l =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${l.description}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">$${Number(l.unit_price).toFixed(2)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">$${Number(l.amount).toFixed(2)}</td></tr>`
  ).join('');

  return `
<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;color:#1e293b">
  <div style="background:#1e2d4a;padding:28px 32px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;color:#f8fafc;font-size:22px">Quote ${quote.quote_number || ''}</h1>
    <p style="margin:6px 0 0;color:#94a3b8;font-size:14px">${quote.title || ''}</p>
  </div>
  <div style="background:#fff;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 20px">Dear ${quote.client_name || 'Client'},</p>
    ${emailNote ? `<p style="margin:0 0 20px;white-space:pre-line">${emailNote}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px"/>` : '<p style="margin:0 0 20px">Please find your quote details below:</p>'}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:8px;text-align:left">Description</th>
        <th style="padding:8px;text-align:center">Qty</th>
        <th style="padding:8px;text-align:right">Rate</th>
        <th style="padding:8px;text-align:right">Amount</th>
      </tr></thead>
      <tbody>${lineHtml}</tbody>
    </table>
    <div style="text-align:right;margin-top:12px;font-size:14px">
      <p style="margin:4px 0">Subtotal: <strong>$${(quote.subtotal || 0).toFixed(2)}</strong></p>
      <p style="margin:4px 0">Tax (${quote.tax_rate || 0}%): <strong>$${(quote.tax_amount || 0).toFixed(2)}</strong></p>
      <p style="margin:4px 0;font-size:18px">Total: <strong>$${(quote.total || 0).toFixed(2)}</strong></p>
    </div>
    ${quote.expiry_date ? `<p style="margin-top:20px;color:#64748b;font-size:13px">This quote is valid until ${quote.expiry_date}.</p>` : ''}
    ${quote.notes ? `<p style="margin-top:12px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;padding-top:12px">${quote.notes}</p>` : ''}
  </div>
</div>`;
}

function PreviewQuoteDialog({ open, onOpenChange, quote }) {
  const html = quote ? buildEmailHtml(quote) : '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quote Preview — {quote?.quote_number}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 p-2">
          <iframe
            srcDoc={`<!DOCTYPE html><html><body style="margin:16px;background:#f1f5f9">${html}</body></html>`}
            className="w-full rounded"
            style={{ minHeight: '500px', border: 'none' }}
            title="Quote Preview"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LineItemRow({ item, onChange, onRemove }) {
  const update = (field, val) => {
    const updated = { ...item, [field]: val };
    updated.amount = parseFloat((updated.quantity * updated.unit_price).toFixed(2));
    onChange(updated);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-5">
        <Input
          placeholder="Description"
          value={item.description}
          onChange={e => update('description', e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number" min="0" step="1"
          placeholder="Qty"
          value={item.quantity}
          onChange={e => update('quantity', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2">
        <Input
          type="number" min="0" step="0.01"
          placeholder="Rate"
          value={item.unit_price}
          onChange={e => update('unit_price', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
      </div>
      <div className="col-span-2 text-right text-sm font-medium text-muted-foreground">
        ${item.amount.toFixed(2)}
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuoteFormDialog({ open, onOpenChange, editQuote, clients }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const blank = {
    client_id: '', client_name: '', client_email: '',
    quote_number: generateNumber(), title: '',
    status: 'draft',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: '',
    tax_rate: 13,
    notes: '',
    line_items: [],
  };

  const [form, setForm] = useState(editQuote ? {
    ...editQuote,
    line_items: editQuote.line_items ? JSON.parse(editQuote.line_items) : [],
    tax_rate: editQuote.tax_rate ?? 13,
  } : blank);

  React.useEffect(() => {
    if (editQuote) {
      setForm({
        ...editQuote,
        line_items: editQuote.line_items ? JSON.parse(editQuote.line_items) : [],
        tax_rate: editQuote.tax_rate ?? 13,
      });
    } else {
      setForm({ ...blank, quote_number: generateNumber() });
    }
  }, [editQuote, open]);

  const subtotal = form.line_items.reduce((s, l) => s + (l.amount || 0), 0);
  const taxAmount = parseFloat(((subtotal * (form.tax_rate || 0)) / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));

  const handleClientChange = (id) => {
    const c = clients.find(c => c.id === id);
    setForm(f => ({ ...f, client_id: id, client_name: c?.name || '', client_email: c?.email || '' }));
  };

  const addLine = () => setForm(f => ({ ...f, line_items: [...f.line_items, { ...DEFAULT_LINE }] }));
  const updateLine = (i, updated) => setForm(f => ({ ...f, line_items: f.line_items.map((l, idx) => idx === i ? updated : l) }));
  const removeLine = (i) => setForm(f => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        line_items: JSON.stringify(form.line_items),
        subtotal, tax_amount: taxAmount, total,
      };
      if (editQuote) return base44.entities.Quote.update(editQuote.id, payload);
      return base44.entities.Quote.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      onOpenChange(false);
      toast({ title: editQuote ? 'Quote updated' : 'Quote created' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editQuote ? 'Edit Quote' : 'New Quote'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Top row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Client Email</Label>
              <Input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="billing@client.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quote Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. T1 Tax Preparation 2025" />
            </div>
            <div className="space-y-1.5">
              <Label>Quote #</Label>
              <Input value={form.quote_number} onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-2 mb-1 text-xs text-muted-foreground px-0">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Rate ($)</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>
            <div className="space-y-2">
              {form.line_items.map((item, i) => (
                <LineItemRow key={i} item={item} onChange={u => updateLine(i, u)} onRemove={() => removeLine(i)} />
              ))}
              {form.line_items.length === 0 && (
                <p className="text-xs text-muted-foreground py-3 text-center border rounded-lg">No line items — click "Add Line"</p>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground">Tax</span>
                <div className="flex items-center gap-1">
                  <Input type="number" min="0" max="100" className="h-6 w-14 text-xs px-1.5" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))} />
                  <span className="text-muted-foreground text-xs">%</span>
                  <span className="ml-1">${taxAmount.toFixed(2)}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes / Terms</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, scope notes…" className="h-20" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : editQuote ? 'Save Changes' : 'Create Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendQuoteDialog({ open, onOpenChange, quote }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [to, setTo] = useState(quote?.client_email || '');
  const [emailNote, setEmailNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTo(quote?.client_email || '');
    setEmailNote('');
  }, [quote, open]);

  const handleSend = async () => {
    if (!to) return;
    setSending(true);
    const body = buildEmailHtml(quote, emailNote);
    await base44.integrations.Core.SendEmail({ to, subject: `Quote ${quote.quote_number} — ${quote.title}`, body });
    await base44.entities.Quote.update(quote.id, { status: 'sent', sent_at: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    setSending(false);
    onOpenChange(false);
    toast({ title: '✅ Quote sent!', description: `Emailed to ${to}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Send Quote via Email</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Quote summary */}
          <div className="rounded-lg bg-muted/40 border p-3 text-sm space-y-1">
            <p className="font-semibold">{quote?.title}</p>
            <p className="text-xs text-muted-foreground">{quote?.quote_number} · {quote?.client_name}</p>
            <p className="text-base font-bold">${(quote?.total || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Recipient Email</Label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="client@email.com" type="email" />
          </div>

          <div className="space-y-1.5">
            <Label>Message / Note <span className="text-muted-foreground text-xs font-normal">(optional — appears at top of email)</span></Label>
            <Textarea
              value={emailNote}
              onChange={e => setEmailNote(e.target.value)}
              placeholder={`e.g. Hi ${quote?.client_name || 'there'}, please find your quote attached. Let us know if you have any questions!`}
              className="h-28 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!to || sending}>
            <Send className="w-4 h-4 mr-2" />{sending ? 'Sending…' : 'Send Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Quotes() {
  const [formOpen, setFormOpen] = useState(false);
  const [editQuote, setEditQuote] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendQuote, setSendQuote] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date'),
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Quote.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast({ title: 'Quote deleted' }); },
  });

  const duplicateMut = useMutation({
    mutationFn: async (quote) => {
      const { id, created_date, updated_date, created_by, sent_at, ...rest } = quote;
      return base44.entities.Quote.create({ ...rest, quote_number: generateNumber(), status: 'draft', sent_at: '' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const openEdit = (q) => { setEditQuote(q); setFormOpen(true); };
  const openSend = (q) => { setSendQuote(q); setSendOpen(true); };
  const openPreview = (q) => { setPreviewQuote(q); setPreviewOpen(true); };

  const filtered = quotes.filter(q => {
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchSearch = !search || q.title?.toLowerCase().includes(search.toLowerCase()) || q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.quote_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalAccepted = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0);
  const totalSent = quotes.filter(q => q.status === 'sent').reduce((s, q) => s + (q.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FilePlus className="w-6 h-6 text-primary" /> Quotes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and send professional quotes to clients</p>
        </div>
        <Button onClick={() => { setEditQuote(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Quotes', value: quotes.length, color: 'text-foreground' },
          { label: 'Sent / Pending', value: quotes.filter(q => q.status === 'sent').length, color: 'text-blue-600' },
          { label: 'Accepted Value', value: `$${totalAccepted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`, color: 'text-green-600' },
          { label: 'Outstanding Value', value: `$${totalSent.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search quotes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Quote list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No quotes yet. Create your first quote to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <Card key={q.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">{q.title}</p>
                      <span className="text-xs text-muted-foreground">{q.quote_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.client_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {statusBadge(q.status)}
                      {q.issue_date && <span className="text-xs text-muted-foreground">Issued {q.issue_date}</span>}
                      {q.expiry_date && <span className="text-xs text-muted-foreground">Expires {q.expiry_date}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lg font-bold">${(q.total || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Preview" onClick={() => openPreview(q)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openSend(q)}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Send
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(q)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateMut.mutate(q)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(q.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {formOpen && (
        <QuoteFormDialog
          open={formOpen}
          onOpenChange={(v) => { setFormOpen(v); if (!v) setEditQuote(null); }}
          editQuote={editQuote}
          clients={clients}
        />
      )}
      {sendOpen && sendQuote && (
        <SendQuoteDialog open={sendOpen} onOpenChange={setSendOpen} quote={sendQuote} />
      )}
      {previewOpen && previewQuote && (
        <PreviewQuoteDialog open={previewOpen} onOpenChange={setPreviewOpen} quote={previewQuote} />
      )}
    </div>
  );
}
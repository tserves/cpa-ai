import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Check, X } from 'lucide-react';

const CATEGORIES = [
  'revenue','other_income','cogs','bank_fees','rent','payroll','insurance','utilities',
  'software','advertising','telecom','fuel','vehicle','travel','meals','professional_fees',
  'office_supplies','repairs','interest_expense','misc_expense',
  'owner_draw','owner_contribution','transfer','cc_payment','loan_payment','cash_withdrawal',
  'cheque','tax_remittance','asset_purchase','unclassified'
];

const CAT_COLORS = {
  revenue: 'bg-green-100 text-green-700', other_income: 'bg-emerald-100 text-emerald-700',
  cogs: 'bg-orange-100 text-orange-700', bank_fees: 'bg-gray-100 text-gray-700',
  transfer: 'bg-blue-100 text-blue-700', cc_payment: 'bg-purple-100 text-purple-700',
  loan_payment: 'bg-orange-100 text-orange-700', owner_draw: 'bg-pink-100 text-pink-700',
  unclassified: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 50;

function EditRow({ tx, onSave, onCancel }) {
  const [cat, setCat] = useState(tx.category || 'unclassified');
  const [desc, setDesc] = useState(tx.description || '');
  const [notes, setNotes] = useState(tx.user_notes || '');
  return (
    <tr className="bg-primary/5 border-t">
      <td className="px-3 py-2 text-xs">{tx.transaction_date || '—'}</td>
      <td className="px-3 py-2"><Input value={desc} onChange={e => setDesc(e.target.value)} className="h-7 text-xs" /></td>
      <td className="px-3 py-2 text-xs">{tx.vendor_or_customer || '—'}</td>
      <td className="px-3 py-2 text-xs font-mono text-red-600">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
      <td className="px-3 py-2 text-xs font-mono text-green-600">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
      <td className="px-3 py-2">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-7 text-[10px] w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" className="h-7 text-xs" /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onSave({ ...tx, description: desc, category: cat, user_notes: notes, needs_review: false, review_reason: null })}><Check className="w-3 h-3 text-green-600" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel}><X className="w-3 h-3 text-muted-foreground" /></Button>
        </div>
      </td>
    </tr>
  );
}

export default function FRTransactionTable({ transactions, onUpdate, showOnlyReview = false }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [editIdx, setEditIdx] = useState(null);

  const base = showOnlyReview ? transactions.filter(t => t.needs_review) : transactions;
  const filtered = base.filter(t => {
    if (catFilter !== 'all' && t.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [t.description, t.vendor_or_customer, t.cheque_number, t.source_file].some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const globalIdx = (localIdx) => transactions.indexOf(filtered[page * PAGE_SIZE + localIdx]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search transactions…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={catFilter} onValueChange={v => { setCatFilter(v); setPage(0); }}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} transactions</span>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-muted/50">
            <tr>
              {['Date','Description','Payee','Debit','Credit','Category','Notes',''].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((tx, i) => {
              const gi = globalIdx(i);
              if (editIdx === gi) return <EditRow key={gi} tx={tx} onSave={u => { onUpdate(gi, u); setEditIdx(null); }} onCancel={() => setEditIdx(null)} />;
              return (
                <tr key={i} className={`border-t hover:bg-muted/10 ${tx.needs_review ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{tx.transaction_date || '—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px]">
                    <div className="truncate">{tx.description || '—'}</div>
                    {tx.needs_review && <div className="flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3 text-amber-500" /><span className="text-[9px] text-amber-600 truncate">{tx.review_reason}</span></div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">{tx.vendor_or_customer || '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-red-600 whitespace-nowrap">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-2 text-xs font-mono text-green-600 whitespace-nowrap">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-2">
                    <Badge className={`text-[9px] border-0 ${CAT_COLORS[tx.category] || 'bg-gray-100 text-gray-600'}`}>
                      {(tx.account_name || tx.category || 'unclassified').replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[100px] truncate">{tx.user_notes || ''}</td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditIdx(gi)}><Edit2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-muted-foreground">No transactions match your filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="w-3.5 h-3.5" /></Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {pages}</span>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}><ChevronRight className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </div>
  );
}
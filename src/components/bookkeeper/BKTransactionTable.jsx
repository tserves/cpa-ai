import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Edit2, Check, X, AlertTriangle, Copy } from 'lucide-react';

const CATEGORIES = [
  'revenue', 'other_income', 'cogs', 'bank_charges', 'rent', 'payroll', 'insurance',
  'utilities', 'advertising', 'telecom', 'vehicle', 'travel', 'meals', 'professional_fees',
  'office_expenses', 'repairs', 'interest_expense', 'taxes', 'owner_drawings',
  'transfer', 'cc_payment', 'loan_payment', 'cash_withdrawal', 'uncategorized'
];

const CAT_LABELS = {
  revenue: 'Revenue', other_income: 'Other Income', cogs: 'Cost of Goods Sold',
  bank_charges: 'Bank Charges', rent: 'Rent', payroll: 'Payroll', insurance: 'Insurance',
  utilities: 'Utilities', advertising: 'Advertising & Marketing', telecom: 'Telecommunications',
  vehicle: 'Vehicle Expenses', travel: 'Travel', meals: 'Meals & Entertainment',
  professional_fees: 'Professional Fees', office_expenses: 'Office Expenses', repairs: 'Repairs & Maintenance',
  interest_expense: 'Interest Expense', taxes: 'Taxes', owner_drawings: 'Owner Drawings',
  transfer: 'Transfer', cc_payment: 'CC Payment', loan_payment: 'Loan Payment',
  cash_withdrawal: 'Cash Withdrawal', uncategorized: 'Uncategorized'
};

const CAT_COLORS = {
  revenue: 'bg-green-100 text-green-700', other_income: 'bg-emerald-100 text-emerald-700',
  cogs: 'bg-orange-100 text-orange-700', bank_charges: 'bg-slate-100 text-slate-700',
  rent: 'bg-purple-100 text-purple-700', payroll: 'bg-blue-100 text-blue-700',
  advertising: 'bg-pink-100 text-pink-700', professional_fees: 'bg-indigo-100 text-indigo-700',
  uncategorized: 'bg-red-100 text-red-700', transfer: 'bg-gray-100 text-gray-700',
  cc_payment: 'bg-gray-100 text-gray-700', loan_payment: 'bg-gray-100 text-gray-700',
};

function EditRow({ tx, onSave, onCancel }) {
  const [cat, setCat] = useState(tx.category || 'uncategorized');
  const [desc, setDesc] = useState(tx.description || '');
  const [notes, setNotes] = useState(tx.user_notes || '');
  return (
    <tr className="bg-primary/5 border-t">
      <td colSpan={2} className="px-3 py-2"><Input value={desc} onChange={e => setDesc(e.target.value)} className="h-7 text-xs" /></td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2" />
      <td className="px-3 py-2">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" className="h-7 text-xs" /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="icon" className="h-6 w-6" onClick={() => onSave({ ...tx, category: cat, description: desc, user_notes: notes, account_name: CAT_LABELS[cat] || cat })}><Check className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

const PAGE_SIZE = 50;

export default function BKTransactionTable({ transactions, onUpdate, showOnlyReview }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editIdx, setEditIdx] = useState(null);
  const [page, setPage] = useState(1);

  const displayTxs = (showOnlyReview ? transactions.filter(t => t.needs_review) : transactions)
    .filter(t => {
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (t.description || '').toLowerCase().includes(q) || (t.vendor_or_customer || '').toLowerCase().includes(q) || (t.source_file || '').toLowerCase().includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(displayTxs.length / PAGE_SIZE));
  const pageTxs = displayTxs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = (globalIdx, updated) => { onUpdate(globalIdx, updated); setEditIdx(null); };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search transactions…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={catFilter} onValueChange={v => { setCatFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{CAT_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-muted/50">
            <tr>{['Date','Description / Vendor','Debit','Credit','Category','Notes','Actions'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {pageTxs.map((tx, i) => {
              const globalIdx = transactions.indexOf(tx);
              const isEdit = editIdx === globalIdx;
              const catColor = CAT_COLORS[tx.category] || 'bg-muted text-muted-foreground';
              if (isEdit) return <EditRow key={globalIdx} tx={tx} onSave={u => handleSave(globalIdx, u)} onCancel={() => setEditIdx(null)} />;
              return (
                <tr key={globalIdx} className={`border-t hover:bg-muted/10 ${tx.is_duplicate ? 'bg-red-50/50' : tx.needs_review ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date || '—'}</td>
                  <td className="px-3 py-2 max-w-[220px]">
                    <p className="text-xs font-medium truncate">{tx.description || '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{tx.vendor_or_customer}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {tx.needs_review && !tx.is_duplicate && <span className="text-[9px] text-amber-600 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{tx.review_reason?.substring(0, 30)}</span>}
                      {tx.is_duplicate && <span className="text-[9px] text-red-600 flex items-center gap-0.5"><Copy className="w-2.5 h-2.5" /> Possible duplicate</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-red-600 whitespace-nowrap">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-2 text-xs font-mono text-green-600 whitespace-nowrap">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-2">
                    <Badge className={`${catColor} border-0 text-[9px]`}>{CAT_LABELS[tx.category] || tx.category || '—'}</Badge>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[120px] truncate">{tx.user_notes || tx.source_file || ''}</td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditIdx(globalIdx)}><Edit2 className="w-3 h-3" /></Button>
                  </td>
                </tr>
              );
            })}
            {pageTxs.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">No transactions match your filter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{displayTxs.length} transactions</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="px-2 py-1">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { CheckCircle2, Edit2, Save, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['assets','liabilities','equity','revenue','cogs','operating_expenses','other_income','other_expenses','unclassified'];
const CAT_COLORS = {
  revenue: 'bg-green-100 text-green-700',
  cogs: 'bg-orange-100 text-orange-700',
  operating_expenses: 'bg-red-100 text-red-700',
  assets: 'bg-blue-100 text-blue-700',
  liabilities: 'bg-purple-100 text-purple-700',
  other_income: 'bg-teal-100 text-teal-700',
  other_expenses: 'bg-rose-100 text-rose-700',
  equity: 'bg-indigo-100 text-indigo-700',
  unclassified: 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

function EditableRow({ tx, idx, onUpdate, onApprove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tx);

  const handleSave = () => {
    onUpdate(idx, { ...draft, needs_review: false, review_reason: null });
    setEditing(false);
  };

  const handleApprove = () => {
    onUpdate(idx, { ...tx, needs_review: false, review_reason: null });
  };

  if (editing) {
    return (
      <tr className="bg-amber-50/50">
        <td className="px-3 py-2"><Input className="h-7 text-xs w-28" value={draft.transaction_date || ''} onChange={e => setDraft(d => ({ ...d, transaction_date: e.target.value }))} placeholder="YYYY-MM-DD" /></td>
        <td className="px-3 py-2"><Input className="h-7 text-xs" value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></td>
        <td className="px-3 py-2"><Input className="h-7 text-xs" value={draft.vendor_or_customer || ''} onChange={e => setDraft(d => ({ ...d, vendor_or_customer: e.target.value }))} /></td>
        <td className="px-3 py-2"><Input className="h-7 text-xs w-24" type="number" value={draft.debit_amount || ''} onChange={e => setDraft(d => ({ ...d, debit_amount: parseFloat(e.target.value) || null }))} /></td>
        <td className="px-3 py-2"><Input className="h-7 text-xs w-24" type="number" value={draft.credit_amount || ''} onChange={e => setDraft(d => ({ ...d, credit_amount: parseFloat(e.target.value) || null }))} /></td>
        <td className="px-3 py-2">
          <Select value={draft.category || 'unclassified'} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Button size="icon" className="h-6 w-6" onClick={handleSave}><Save className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-amber-50/30 border-b last:border-0">
      <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">{tx.transaction_date || <span className="text-red-500 font-semibold">Missing</span>}</td>
      <td className="px-3 py-2 text-xs max-w-[180px]">
        <p className="truncate">{tx.description || '—'}</p>
        {tx.review_reason && <p className="text-[10px] text-amber-600 mt-0.5 truncate">{tx.review_reason}</p>}
        {tx.source_file && <p className="text-[10px] text-muted-foreground">{tx.source_file}</p>}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[120px]">{tx.vendor_or_customer || '—'}</td>
      <td className="px-3 py-2 text-xs font-mono text-right">{tx.debit_amount ? <span className="text-red-600">${tx.debit_amount.toFixed(2)}</span> : '—'}</td>
      <td className="px-3 py-2 text-xs font-mono text-right">{tx.credit_amount ? <span className="text-green-600">${tx.credit_amount.toFixed(2)}</span> : '—'}</td>
      <td className="px-3 py-2">
        <Badge className={`text-[10px] border-0 ${CAT_COLORS[tx.category] || CAT_COLORS.unclassified}`}>
          {(tx.category || 'unclassified').replace(/_/g, ' ')}
        </Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleApprove} title="Approve">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function ExceptionReviewTable({ transactions, onUpdate, showOnlyReview = false }) {
  const [page, setPage] = useState(0);

  const displayed = showOnlyReview ? transactions.filter(t => t.needs_review) : transactions;
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
  const pageItems = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleApproveAll = () => {
    transactions.forEach((tx, i) => {
      if (tx.needs_review) onUpdate(i, { ...tx, needs_review: false, review_reason: null });
    });
  };

  if (displayed.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-60" />
        <p className="text-sm font-medium">No exceptions — all transactions auto-approved</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showOnlyReview && displayed.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {displayed.length} exception{displayed.length !== 1 ? 's' : ''} need your attention
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleApproveAll}>
            <CheckCircle2 className="w-3 h-3 text-green-600" /> Approve All
          </Button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vendor</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Debit</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Credit</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((tx, i) => {
                const realIdx = transactions.indexOf(displayed[page * PAGE_SIZE + i]);
                return <EditableRow key={realIdx} tx={tx} idx={realIdx} onUpdate={onUpdate} />;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{displayed.length} rows · Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
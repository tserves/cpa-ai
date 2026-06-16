import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'assets', label: 'Assets' },
  { value: 'liabilities', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'cogs', label: 'Cost of Goods Sold' },
  { value: 'operating_expenses', label: 'Operating Expenses' },
  { value: 'other_income', label: 'Other Income' },
  { value: 'other_expenses', label: 'Other Expenses' },
  { value: 'unclassified', label: 'Unclassified' },
];

function EditableRow({ tx, idx, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...tx });

  const handleSave = () => {
    onSave(idx, { ...draft, needs_review: false, confidence: 1 });
    setEditing(false);
  };

  const needsReview = tx.needs_review;

  if (editing) {
    return (
      <tr className="bg-amber-50">
        <td className="px-3 py-2 text-xs"><Input className="h-7 text-xs w-28" value={draft.transaction_date || ''} onChange={e => setDraft(d => ({ ...d, transaction_date: e.target.value }))} type="date" /></td>
        <td className="px-3 py-2 text-xs"><Input className="h-7 text-xs w-32" value={draft.account_name || ''} onChange={e => setDraft(d => ({ ...d, account_name: e.target.value }))} /></td>
        <td className="px-3 py-2 text-xs"><Input className="h-7 text-xs" value={draft.description || ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></td>
        <td className="px-3 py-2 text-xs">
          <Select value={draft.category || 'unclassified'} onValueChange={v => setDraft(d => ({ ...d, category: v }))}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </td>
        <td className="px-3 py-2 text-xs text-right"><Input className="h-7 text-xs w-20 text-right" value={draft.debit_amount || ''} onChange={e => setDraft(d => ({ ...d, debit_amount: parseFloat(e.target.value) || null }))} type="number" /></td>
        <td className="px-3 py-2 text-xs text-right"><Input className="h-7 text-xs w-20 text-right" value={draft.credit_amount || ''} onChange={e => setDraft(d => ({ ...d, credit_amount: parseFloat(e.target.value) || null }))} type="number" /></td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <Button size="icon" className="h-6 w-6 bg-green-600 hover:bg-green-700" onClick={handleSave}><Check className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-muted/30 transition-colors ${needsReview ? 'bg-amber-50/50' : ''}`}>
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date || <span className="text-red-500 font-medium">Missing</span>}</td>
      <td className="px-3 py-2 text-xs font-medium max-w-[140px] truncate">{tx.account_name || <span className="text-red-500">Unset</span>}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={tx.description}>{tx.description || '—'}</td>
      <td className="px-3 py-2 text-xs">
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
          tx.category === 'revenue' ? 'bg-green-100 text-green-700' :
          tx.category === 'operating_expenses' || tx.category === 'cogs' ? 'bg-red-100 text-red-700' :
          tx.category === 'assets' ? 'bg-blue-100 text-blue-700' :
          tx.category === 'liabilities' ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-600'
        }`}>{CATEGORIES.find(c => c.value === tx.category)?.label || tx.category || 'Unclassified'}</span>
      </td>
      <td className="px-3 py-2 text-xs text-right font-mono">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : '—'}</td>
      <td className="px-3 py-2 text-xs text-right font-mono">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : '—'}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {needsReview
            ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title={tx.review_reason} />
            : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}><Edit2 className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

export default function TransactionReviewTable({ transactions, onUpdate, showOnlyReview = false }) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const display = transactions.filter(t => {
    if (showOnlyReview && !t.needs_review) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.description || '').toLowerCase().includes(q) ||
      (t.account_name || '').toLowerCase().includes(q) ||
      (t.vendor_or_customer || '').toLowerCase().includes(q);
  });

  const visible = showAll ? display : display.slice(0, 50);

  const handleSave = (idx, updated) => {
    const globalIdx = transactions.indexOf(transactions.filter(t => {
      if (showOnlyReview && !t.needs_review) return false;
      return true;
    })[idx]);
    onUpdate(globalIdx < 0 ? idx : globalIdx, updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search transactions…"
          className="h-8 text-xs max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">{display.length} transaction{display.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/50 border-b">
              {['Date', 'Account', 'Description', 'Category', 'Debit', 'Credit', ''].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">No transactions found</td></tr>
            ) : visible.map((tx, i) => (
              <EditableRow key={i} tx={tx} idx={i} onSave={handleSave} />
            ))}
          </tbody>
        </table>
      </div>
      {display.length > 50 && !showAll && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowAll(true)}>
          Show all {display.length} transactions <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
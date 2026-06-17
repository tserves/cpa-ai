import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Search, AlertTriangle, Copy, Edit2, Check, X } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CAT_LABELS = {
  revenue: 'Revenue', other_income: 'Other Income', cogs: 'Cost of Goods Sold',
  bank_charges: 'Bank Charges', rent: 'Rent', payroll: 'Payroll', insurance: 'Insurance',
  utilities: 'Utilities', software: 'Software & Subscriptions', advertising: 'Advertising & Marketing',
  telecom: 'Telecommunications', vehicle: 'Vehicle Expenses', travel: 'Travel',
  meals: 'Meals & Entertainment', professional_fees: 'Professional Fees',
  office_expenses: 'Office Expenses', repairs: 'Repairs & Maintenance',
  interest_expense: 'Interest Expense', taxes: 'Taxes', owner_drawings: 'Owner Drawings',
  transfer: 'Transfer', cc_payment: 'CC Payment', loan_payment: 'Loan Payment',
  cash_withdrawal: 'Cash Withdrawal', uncategorized: 'Uncategorized',
};

const CATEGORIES = Object.keys(CAT_LABELS);

const CAT_COLORS = {
  revenue: '#22c55e', other_income: '#10b981', cogs: '#f97316',
  bank_charges: '#94a3b8', rent: '#a855f7', payroll: '#3b82f6',
  insurance: '#06b6d4', utilities: '#f59e0b', software: '#8b5cf6',
  advertising: '#ec4899', telecom: '#0ea5e9', vehicle: '#84cc16',
  travel: '#14b8a6', meals: '#f43f5e', professional_fees: '#6366f1',
  office_expenses: '#64748b', repairs: '#78716c', interest_expense: '#ef4444',
  taxes: '#dc2626', owner_drawings: '#9ca3af', transfer: '#d1d5db',
  cc_payment: '#e5e7eb', loan_payment: '#cbd5e1', cash_withdrawal: '#fca5a5',
  uncategorized: '#fca5a5',
};

const BADGE_COLORS = {
  revenue: 'bg-green-100 text-green-700', other_income: 'bg-emerald-100 text-emerald-700',
  cogs: 'bg-orange-100 text-orange-700', bank_charges: 'bg-slate-100 text-slate-700',
  rent: 'bg-purple-100 text-purple-700', payroll: 'bg-blue-100 text-blue-700',
  insurance: 'bg-cyan-100 text-cyan-700', utilities: 'bg-amber-100 text-amber-700',
  software: 'bg-violet-100 text-violet-700', advertising: 'bg-pink-100 text-pink-700',
  telecom: 'bg-sky-100 text-sky-700', vehicle: 'bg-lime-100 text-lime-700',
  travel: 'bg-teal-100 text-teal-700', meals: 'bg-rose-100 text-rose-700',
  professional_fees: 'bg-indigo-100 text-indigo-700', office_expenses: 'bg-gray-100 text-gray-700',
  repairs: 'bg-stone-100 text-stone-700', interest_expense: 'bg-red-100 text-red-700',
  taxes: 'bg-red-100 text-red-800', owner_drawings: 'bg-gray-100 text-gray-600',
  transfer: 'bg-gray-100 text-gray-600', cc_payment: 'bg-gray-100 text-gray-600',
  loan_payment: 'bg-slate-100 text-slate-600', cash_withdrawal: 'bg-red-50 text-red-600',
  uncategorized: 'bg-red-100 text-red-700',
};

const fmt = n => n != null && n !== 0 ? `$${Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function EditRow({ tx, onSave, onCancel }) {
  const [cat, setCat] = useState(tx.category || 'uncategorized');
  const [notes, setNotes] = useState(tx.user_notes || '');
  return (
    <tr className="bg-primary/5 border-t">
      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date || '—'}</td>
      <td className="px-3 py-2 text-xs max-w-[200px]">
        <p className="font-medium truncate">{tx.description || '—'}</p>
        <p className="text-[10px] text-muted-foreground">{tx.vendor_or_customer}</p>
      </td>
      <td className="px-3 py-2 text-xs font-mono text-red-600">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
      <td className="px-3 py-2 text-xs font-mono text-green-600">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
      <td className="px-3 py-2">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="h-7 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{CAT_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" className="h-7 text-xs w-32" /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="icon" className="h-6 w-6" onClick={() => onSave({ ...tx, category: cat, account_name: CAT_LABELS[cat] || cat, user_notes: notes, needs_review: false })}><Check className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel}><X className="w-3 h-3" /></Button>
        </div>
      </td>
    </tr>
  );
}

function CategoryGroup({ cat, txList, onUpdate, allTransactions }) {
  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);

  const totalDebit = txList.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const totalCredit = txList.reduce((s, t) => s + (t.credit_amount || 0), 0);
  const reviewCount = txList.filter(t => t.needs_review).length;
  const dupeCount = txList.filter(t => t.is_duplicate).length;
  const badgeColor = BADGE_COLORS[cat] || 'bg-muted text-muted-foreground';
  const dotColor = CAT_COLORS[cat] || '#94a3b8';

  const handleSave = (tx, updated) => {
    const globalIdx = allTransactions.indexOf(tx);
    if (globalIdx !== -1) onUpdate(globalIdx, updated);
    setEditIdx(null);
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="font-semibold text-sm">{CAT_LABELS[cat] || cat}</span>
          <Badge className={`${badgeColor} border-0 text-[9px]`}>{txList.length} txn{txList.length !== 1 ? 's' : ''}</Badge>
          {reviewCount > 0 && <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />{reviewCount} review</span>}
          {dupeCount > 0 && <span className="text-[10px] text-red-600 font-medium">⊕ {dupeCount} dupe</span>}
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          {totalDebit > 0 && <div className="text-right hidden sm:block"><p className="text-[10px] text-muted-foreground">Debits</p><p className="text-xs font-mono font-bold text-red-600">{fmt(totalDebit)}</p></div>}
          {totalCredit > 0 && <div className="text-right hidden sm:block"><p className="text-[10px] text-muted-foreground">Credits</p><p className="text-xs font-mono font-bold text-green-600">{fmt(totalCredit)}</p></div>}
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto border-t">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-muted/30">
              <tr>{['Date', 'Description / Vendor', 'Debit', 'Credit', 'Category', 'Notes/File', 'Edit'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {txList.map((tx, i) => {
                const isEdit = editIdx === i;
                if (isEdit) return <EditRow key={i} tx={tx} onSave={u => handleSave(tx, u)} onCancel={() => setEditIdx(null)} />;
                return (
                  <tr key={i} className={`border-t hover:bg-muted/10 ${tx.is_duplicate ? 'bg-red-50/40' : tx.needs_review ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date || '—'}</td>
                    <td className="px-3 py-2 max-w-[220px]">
                      <p className="text-xs font-medium truncate">{tx.description || '—'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{tx.vendor_or_customer}</p>
                      {tx.needs_review && !tx.is_duplicate && <p className="text-[9px] text-amber-600 flex items-center gap-0.5 mt-0.5"><AlertTriangle className="w-2.5 h-2.5" />{tx.review_reason?.substring(0, 40)}</p>}
                      {tx.is_duplicate && <p className="text-[9px] text-red-600 flex items-center gap-0.5 mt-0.5"><Copy className="w-2.5 h-2.5" /> Possible duplicate</p>}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-red-600 whitespace-nowrap">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
                    <td className="px-3 py-2 text-xs font-mono text-green-600 whitespace-nowrap">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
                    <td className="px-3 py-2">
                      <Badge className={`${BADGE_COLORS[tx.category] || 'bg-muted text-muted-foreground'} border-0 text-[9px]`}>
                        {CAT_LABELS[tx.category] || tx.category || '—'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground max-w-[120px] truncate">{tx.user_notes || tx.source_file || ''}</td>
                    <td className="px-3 py-2">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditIdx(i)}><Edit2 className="w-3 h-3" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/20 border-t">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-xs font-bold">Subtotal — {CAT_LABELS[cat] || cat}</td>
                <td className="px-3 py-2 text-xs font-mono font-bold text-red-600">{totalDebit > 0 ? fmt(totalDebit) : ''}</td>
                <td className="px-3 py-2 text-xs font-mono font-bold text-green-600">{totalCredit > 0 ? fmt(totalCredit) : ''}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BKCategorizationReport({ transactions, onUpdate }) {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Build unique source files list
  const sourceFiles = useMemo(() => {
    const files = [...new Set(transactions.map(t => t.source_file).filter(Boolean))];
    return files;
  }, [transactions]);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (sourceFilter !== 'all' && t.source_file !== sourceFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (t.description || '').toLowerCase().includes(q) ||
             (t.vendor_or_customer || '').toLowerCase().includes(q) ||
             (t.category || '').toLowerCase().includes(q);
    });
  }, [transactions, search, sourceFilter]);

  // Group by category
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(tx => {
      const cat = tx.category || 'uncategorized';
      if (!g[cat]) g[cat] = [];
      g[cat].push(tx);
    });
    // Sort: income first, then expenses, then pass-through, then uncategorized
    const ORDER = ['revenue', 'other_income', 'cogs', 'payroll', 'rent', 'professional_fees', 'bank_charges', 'utilities', 'software', 'advertising', 'telecom', 'vehicle', 'travel', 'meals', 'insurance', 'office_expenses', 'repairs', 'interest_expense', 'taxes', 'owner_drawings', 'transfer', 'cc_payment', 'loan_payment', 'cash_withdrawal', 'uncategorized'];
    return Object.entries(g).sort(([a], [b]) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [filtered]);

  // Summary stats
  const totalCredits = filtered.reduce((s, t) => s + (t.credit_amount || 0), 0);
  const totalDebits = filtered.reduce((s, t) => s + (t.debit_amount || 0), 0);
  const uncatCount = filtered.filter(t => !t.category || t.category === 'uncategorized').length;
  const reviewCount = filtered.filter(t => t.needs_review).length;

  // Pie chart data — top categories by total volume
  const pieData = grouped
    .map(([cat, txs]) => ({
      name: CAT_LABELS[cat] || cat,
      value: parseFloat((txs.reduce((s, t) => s + (t.debit_amount || 0) + (t.credit_amount || 0), 0)).toFixed(2)),
      color: CAT_COLORS[cat] || '#94a3b8',
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total Transactions</p>
          <p className="text-xl font-bold mt-0.5">{filtered.length}</p>
          <p className="text-[10px] text-muted-foreground">{grouped.length} categories</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total Credits (IN)</p>
          <p className="text-xl font-bold mt-0.5 text-green-600 font-mono">{fmt(totalCredits)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total Debits (OUT)</p>
          <p className="text-xl font-bold mt-0.5 text-red-600 font-mono">{fmt(totalDebits)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Uncategorized / Review</p>
          <p className={`text-xl font-bold mt-0.5 ${uncatCount + reviewCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>{uncatCount} / {reviewCount}</p>
        </Card>
      </div>

      {/* Chart + filters row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <Card className="p-4 lg:w-80 flex-shrink-0">
            <p className="text-sm font-semibold mb-2">Spend by Category</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Filters */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {sourceFiles.length > 1 && (
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-8 text-xs w-52"><SelectValue placeholder="All files" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Files</SelectItem>
                  {sourceFiles.map(f => <SelectItem key={f} value={f} className="text-xs truncate">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quick category totals grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {grouped.map(([cat, txs]) => {
              const debit = txs.reduce((s, t) => s + (t.debit_amount || 0), 0);
              const credit = txs.reduce((s, t) => s + (t.credit_amount || 0), 0);
              return (
                <div key={cat} className="flex items-center justify-between bg-muted/30 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[cat] || '#94a3b8' }} />
                    <span className="text-[10px] font-medium truncate">{CAT_LABELS[cat] || cat}</span>
                    <span className="text-[9px] text-muted-foreground">({txs.length})</span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 text-[10px] font-mono">
                    {credit > 0 && <span className="text-green-600">{fmt(credit)}</span>}
                    {debit > 0 && <span className="text-red-600">{fmt(debit)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Click any category to expand and see individual transactions. Click Edit to reclassify.</p>
        {grouped.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No transactions match your filter</p>
          </div>
        ) : (
          grouped.map(([cat, txs]) => (
            <CategoryGroup
              key={cat}
              cat={cat}
              txList={txs}
              onUpdate={onUpdate}
              allTransactions={transactions}
            />
          ))
        )}
      </div>
    </div>
  );
}
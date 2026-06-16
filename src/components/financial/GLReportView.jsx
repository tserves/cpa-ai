import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_ORDER = ['assets', 'liabilities', 'equity', 'revenue', 'cogs', 'operating_expenses', 'other_income', 'other_expenses', 'unclassified'];
const CATEGORY_LABELS = {
  assets: 'Assets', liabilities: 'Liabilities', equity: 'Equity',
  revenue: 'Revenue', cogs: 'Cost of Goods Sold', operating_expenses: 'Operating Expenses',
  other_income: 'Other Income', other_expenses: 'Other Expenses', unclassified: 'Unclassified'
};
const CATEGORY_COLORS = {
  assets: 'bg-blue-50 text-blue-700 border-blue-200',
  liabilities: 'bg-purple-50 text-purple-700 border-purple-200',
  equity: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  revenue: 'bg-green-50 text-green-700 border-green-200',
  cogs: 'bg-orange-50 text-orange-700 border-orange-200',
  operating_expenses: 'bg-red-50 text-red-700 border-red-200',
  other_income: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  other_expenses: 'bg-rose-50 text-rose-700 border-rose-200',
  unclassified: 'bg-gray-50 text-gray-600 border-gray-200',
};

function AccountSection({ account }) {
  const [expanded, setExpanded] = useState(false);
  const net = account.debit_total - account.credit_total;
  const colorClass = CATEGORY_COLORS[account.category] || CATEGORY_COLORS.unclassified;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-sm truncate">{account.account_name}</span>
          {account.account_code && <span className="text-xs text-muted-foreground">#{account.account_code}</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${colorClass}`}>{CATEGORY_LABELS[account.category] || account.category}</span>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Debits</p>
            <p className="text-xs font-mono font-semibold">${account.debit_total.toFixed(2)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Credits</p>
            <p className="text-xs font-mono font-semibold">${account.credit_total.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Net</p>
            <p className={`text-xs font-mono font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{net >= 0 ? '' : '-'}${Math.abs(net).toFixed(2)}</p>
          </div>
          <span className="text-xs text-muted-foreground">{account.transactions.length} txn{account.transactions.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Ref</th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Debit</th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Credit</th>
                <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(() => {
                let running = account.opening_balance;
                return account.transactions.map((tx, i) => {
                  running += (tx.debit_amount || 0) - (tx.credit_amount || 0);
                  return (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{tx.transaction_date || '—'}</td>
                      <td className="px-3 py-1.5 max-w-[200px] truncate">{tx.description || '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{tx.reference_number || tx.invoice_number || '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : '—'}</td>
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${running >= 0 ? 'text-green-700' : 'text-red-700'}`}>${running.toFixed(2)}</td>
                    </tr>
                  );
                });
              })()}
              <tr className="bg-muted/40 font-semibold">
                <td colSpan={3} className="px-3 py-1.5 text-xs">Totals</td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">${account.debit_total.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">${account.credit_total.toFixed(2)}</td>
                <td className={`px-3 py-1.5 text-right font-mono text-xs font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>${net.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function GLReportView({ report }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');

  const accounts = (report.accounts || []).filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (search && !a.account_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...accounts].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category);
    const bi = CATEGORY_ORDER.indexOf(b.category);
    return ai - bi;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Debits', value: report.total_debits, color: 'text-red-600' },
          { label: 'Total Credits', value: report.total_credits, color: 'text-green-600' },
          { label: 'Difference', value: Math.abs((report.total_debits || 0) - (report.total_credits || 0)), color: Math.abs((report.total_debits || 0) - (report.total_credits || 0)) < 0.01 ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.color}`}>${(s.value || 0).toFixed(2)}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search accounts…" className="h-8 text-xs w-48" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {['all', ...CATEGORY_ORDER].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted-foreground">No accounts match your filter</p>
        ) : sorted.map((acct, i) => <AccountSection key={i} account={acct} />)}
      </div>
    </div>
  );
}
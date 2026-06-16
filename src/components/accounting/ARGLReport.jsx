import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const CAT_ORDER = ['assets','revenue','cogs','operating_expenses','liabilities','equity','other_income','other_expenses','unclassified'];
const CAT_LABELS = { assets:'Assets', revenue:'Revenue', cogs:'Cost of Goods Sold', operating_expenses:'Operating Expenses', liabilities:'Liabilities', equity:'Equity', other_income:'Other Income', other_expenses:'Other Expenses', unclassified:'Unclassified' };
const CAT_COLORS = { assets:'bg-blue-100 text-blue-700', revenue:'bg-green-100 text-green-700', cogs:'bg-orange-100 text-orange-700', operating_expenses:'bg-red-100 text-red-700', liabilities:'bg-purple-100 text-purple-700', equity:'bg-indigo-100 text-indigo-700', other_income:'bg-teal-100 text-teal-700', other_expenses:'bg-rose-100 text-rose-700', unclassified:'bg-gray-100 text-gray-600' };

function AccountSection({ acct }) {
  const [open, setOpen] = useState(false);
  const net = acct.debit_total - acct.credit_total;
  return (
    <div className="border rounded-xl overflow-hidden mb-2">
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {acct.account_code && <span className="text-xs text-muted-foreground font-mono">{acct.account_code}</span>}
              <p className="text-sm font-semibold truncate">{acct.account_name}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">{acct.transactions.length} transactions · {acct.account_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0 text-right">
          <div className="hidden sm:block"><p className="text-[10px] text-muted-foreground">Debit</p><p className="text-xs font-mono text-red-600">${acct.debit_total.toFixed(2)}</p></div>
          <div className="hidden sm:block"><p className="text-[10px] text-muted-foreground">Credit</p><p className="text-xs font-mono text-green-600">${acct.credit_total.toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Net</p><p className={`text-xs font-mono font-bold ${net >= 0 ? 'text-red-600' : 'text-green-600'}`}>${Math.abs(net).toFixed(2)}</p></div>
        </div>
      </button>
      {open && (
        <div className="border-t overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30">
              <tr>{['Date','Doc #','Description','Ref','Debit','Credit','Balance','Source'].map(h => <th key={h} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {acct.transactions.map((tx, i) => (
                <tr key={i} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs font-mono whitespace-nowrap">{tx.transaction_date || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{tx.document_number || tx.invoice_number || '—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[180px] truncate">{tx.description || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{tx.reference_number || '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-right">{tx.debit_amount ? <span className="text-red-600">${tx.debit_amount.toFixed(2)}</span> : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-right">{tx.credit_amount ? <span className="text-green-600">${tx.credit_amount.toFixed(2)}</span> : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-right">{tx.running_balance != null ? `$${tx.running_balance.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground truncate max-w-[120px]">{tx.source_file || '—'}{tx.source_page ? ` p.${tx.source_page}` : ''}</td>
                </tr>
              ))}
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-3 py-2 text-xs">Closing Balance</td>
                <td className="px-3 py-2 text-xs font-mono text-right text-red-600">${acct.debit_total.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs font-mono text-right text-green-600">${acct.credit_total.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs font-mono text-right">${acct.closing_balance.toFixed(2)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ARGLReport({ report }) {
  const [search, setSearch] = useState('');
  const accounts = report.accounts || [];
  const filtered = accounts.filter(a => !search || a.account_name?.toLowerCase().includes(search.toLowerCase()) || a.account_code?.includes(search));
  const grouped = {};
  CAT_ORDER.forEach(cat => { grouped[cat] = filtered.filter(a => a.category === cat); });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-lg font-bold font-mono text-red-600">${(report.total_debits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-lg font-bold font-mono text-green-600">${(report.total_credits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Difference</p>
          <p className={`text-lg font-bold font-mono ${Math.abs((report.total_debits||0)-(report.total_credits||0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs((report.total_debits||0)-(report.total_credits||0)).toFixed(2)}
          </p>
        </Card>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-8 h-8 text-xs" placeholder="Filter accounts or codes…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {CAT_ORDER.map(cat => {
        const accts = grouped[cat];
        if (!accts?.length) return null;
        const catTotal = accts.reduce((s, a) => s + a.debit_total - a.credit_total, 0);
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`border-0 text-xs ${CAT_COLORS[cat] || CAT_COLORS.unclassified}`}>{CAT_LABELS[cat] || cat}</Badge>
                <span className="text-xs text-muted-foreground">{accts.length} account{accts.length !== 1 ? 's' : ''}</span>
              </div>
              <span className={`text-xs font-mono font-semibold ${catTotal < 0 ? 'text-green-600' : 'text-red-600'}`}>${Math.abs(catTotal).toFixed(2)}</span>
            </div>
            {accts.map((acct, i) => <AccountSection key={i} acct={acct} />)}
          </div>
        );
      })}
    </div>
  );
}
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Search, AlertTriangle } from 'lucide-react';

const CAT_GROUPS = {
  'Income': ['revenue', 'other_income'],
  'Cost of Sales': ['cogs'],
  'Operating Expenses': ['bank_fees', 'rent', 'payroll', 'insurance', 'utilities', 'software', 'advertising', 'telecom', 'fuel', 'vehicle', 'travel', 'meals', 'professional_fees', 'office_supplies', 'repairs', 'interest_expense', 'misc_expense'],
  'Balance Sheet / Non-P&L': ['transfer', 'cc_payment', 'loan_payment', 'owner_draw', 'owner_contribution', 'cash_withdrawal', 'cheque', 'tax_remittance', 'asset_purchase'],
  'Unclassified': ['unclassified'],
};

function AccountSection({ account }) {
  const [open, setOpen] = useState(false);
  const net = account.debit_total - account.credit_total;
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/20" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-sm font-medium">{account.account_name}</span>
          {!account.pl_include && <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0">Non-P&L</Badge>}
        </div>
        <div className="flex items-center gap-4 text-xs font-mono flex-shrink-0">
          <span className="text-red-600">DR: ${account.debit_total.toFixed(2)}</span>
          <span className="text-green-600">CR: ${account.credit_total.toFixed(2)}</span>
          <span className={`font-bold ${net > 0 ? 'text-red-600' : 'text-green-600'}`}>Net: ${Math.abs(net).toFixed(2)}</span>
        </div>
      </div>
      {open && (
        <div className="border-t overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/30">
              <tr>{['Date','Description','Ref #','Debit','Credit','Balance','Source','Review'].map(h => <th key={h} className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {account.transactions.map((tx, i) => (
                <tr key={i} className={`border-t text-xs ${tx.needs_review ? 'bg-amber-50/30' : 'hover:bg-muted/10'}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap">{tx.transaction_date || '—'}</td>
                  <td className="px-3 py-1.5 max-w-[180px] truncate">{tx.description || '—'}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{tx.cheque_number || '—'}</td>
                  <td className="px-3 py-1.5 font-mono text-red-600">{tx.debit_amount ? `$${tx.debit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-1.5 font-mono text-green-600">{tx.credit_amount ? `$${tx.credit_amount.toFixed(2)}` : ''}</td>
                  <td className="px-3 py-1.5 font-mono">{tx.running_balance_gl != null ? `$${tx.running_balance_gl.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-[10px] truncate max-w-[100px]">{tx.source_file || '—'}</td>
                  <td className="px-3 py-1.5">{tx.needs_review && <AlertTriangle className="w-3 h-3 text-amber-500" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FRGLReport({ report }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('category');
  if (!report?.accounts?.length) return <div className="text-center py-8 text-muted-foreground text-sm">No GL data available.</div>;

  const filtered = report.accounts.filter(a => !search || a.account_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(report.total_debits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(report.total_credits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Accounts</p><p className="text-base font-bold">{report.accounts.length}</p></Card>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-xs" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {Object.entries(CAT_GROUPS).map(([group, cats]) => {
        const accounts = filtered.filter(a => cats.includes(a.category));
        if (!accounts.length) return null;
        const groupTotal = accounts.reduce((s, a) => ({ debits: s.debits + a.debit_total, credits: s.credits + a.credit_total }), { debits: 0, credits: 0 });
        return (
          <div key={group} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group}</h4>
              <span className="text-xs font-mono text-muted-foreground">DR ${groupTotal.debits.toFixed(2)} · CR ${groupTotal.credits.toFixed(2)}</span>
            </div>
            {accounts.map((a, i) => <AccountSection key={i} account={a} />)}
          </div>
        );
      })}
    </div>
  );
}
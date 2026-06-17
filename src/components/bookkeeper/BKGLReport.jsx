import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

const fmt = n => `$${(n || 0).toFixed(2)}`;

function AccountSection({ account }) {
  const [open, setOpen] = useState(false);
  const net = account.debit_total - account.credit_total;
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors bg-muted/5">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-semibold text-sm">{account.account_name}</span>
          {!account.pl_include && <Badge className="bg-gray-100 text-gray-600 border-0 text-[9px]">Non-P&L</Badge>}
          <span className="text-xs text-muted-foreground">({account.transactions.length} txns)</span>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="text-red-600">DR {fmt(account.debit_total)}</span>
          <span className="text-green-600">CR {fmt(account.credit_total)}</span>
          <span className={`font-bold ${net >= 0 ? 'text-red-600' : 'text-green-600'}`}>Net {fmt(Math.abs(net))}</span>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-muted/30"><tr>{['Date','Description','Ref #','Debit','Credit','Balance','Source'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {account.transactions.map((tx, i) => (
                <tr key={i} className={`border-t hover:bg-muted/10 ${tx.needs_review ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date || '—'}</td>
                  <td className="px-3 py-1.5 text-xs max-w-[200px] truncate">{tx.description || '—'}</td>
                  <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{tx.reference_number || tx.cheque_number || '—'}</td>
                  <td className="px-3 py-1.5 text-xs font-mono text-red-600">{tx.debit_amount ? fmt(tx.debit_amount) : ''}</td>
                  <td className="px-3 py-1.5 text-xs font-mono text-green-600">{tx.credit_amount ? fmt(tx.credit_amount) : ''}</td>
                  <td className="px-3 py-1.5 text-xs font-mono">{fmt(tx.running_balance_gl)}</td>
                  <td className="px-3 py-1.5 text-[10px] text-muted-foreground truncate max-w-[100px]">{tx.source_file || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BKGLReport({ report }) {
  const [search, setSearch] = useState('');
  if (!report) return null;
  const accounts = (report.accounts || []).filter(a => !search || a.account_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(report.total_debits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(report.total_credits || 0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Accounts</p><p className="text-base font-bold">{report.accounts?.length || 0}</p></Card>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-8 h-8 text-xs" placeholder="Search accounts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">{accounts.map((a, i) => <AccountSection key={i} account={a} />)}</div>
    </div>
  );
}
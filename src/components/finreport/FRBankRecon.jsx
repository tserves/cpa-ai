import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';

const STATUSES = {
  reconciled:               { label: 'Reconciled',               color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  reconciled_with_warnings: { label: 'Reconciled w/ Warnings',   color: 'bg-amber-100 text-amber-700',   icon: AlertTriangle },
  not_reconciled:           { label: 'Not Reconciled',           color: 'bg-red-100 text-red-700',       icon: XCircle },
  missing_opening_balance:  { label: 'Missing Opening Balance',  color: 'bg-orange-100 text-orange-700', icon: HelpCircle },
  missing_closing_balance:  { label: 'Missing Closing Balance',  color: 'bg-orange-100 text-orange-700', icon: HelpCircle },
  confidence_too_low:       { label: 'Confidence Too Low',       color: 'bg-red-100 text-red-700',       icon: XCircle },
};

const fmt = n => n != null ? `$${Number(n).toFixed(2)}` : '—';

function ReconCard({ r }) {
  const [open, setOpen] = useState(false);
  const sc = STATUSES[r.status] || STATUSES.not_reconciled;
  const Icon = sc.icon;
  const ok = ['reconciled', 'reconciled_with_warnings'].includes(r.status);

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{r.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {[r.institution_name, r.account_number_masked && `···${r.account_number_masked}`, r.period_start && `${r.period_start} → ${r.period_end || '?'}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{r.transaction_count} txns</span>
          <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}><Icon className="w-3 h-3" /> {sc.label}</Badge>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', val: fmt(r.opening_balance), c: 'text-foreground' },
              { label: '+ Credits', val: fmt(r.total_credits), c: 'text-green-600' },
              { label: '− Debits', val: fmt(r.total_debits), c: 'text-red-600' },
              { label: '= Calc. Closing', val: fmt(r.calculated_closing), c: 'text-blue-600' },
            ].map(row => (
              <div key={row.label} className="rounded-lg bg-background border p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground">{row.label}</p>
                <p className={`text-xs font-bold font-mono mt-0.5 ${row.c}`}>{row.val}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background border p-2.5 text-center">
              <p className="text-[9px] text-muted-foreground">Statement Closing Balance</p>
              <p className="text-xs font-bold font-mono mt-0.5">{fmt(r.closing_balance)}</p>
            </div>
            <div className={`rounded-lg border p-2.5 text-center ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-[9px] text-muted-foreground">Difference</p>
              <p className={`text-xs font-bold font-mono mt-0.5 ${ok ? 'text-green-600' : 'text-red-600'}`}>{r.difference != null ? `$${r.difference.toFixed(2)}` : '—'}</p>
            </div>
          </div>
          {r.warnings?.length > 0 && (
            <div className="space-y-1.5">
              {r.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}
          {r.duplicate_count > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {r.duplicate_count} possible duplicate transaction(s) detected
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border p-2"><p className="text-[9px] text-muted-foreground">Transactions</p><p className="text-xs font-bold">{r.transaction_count}</p></div>
            <div className="rounded-lg border p-2"><p className="text-[9px] text-muted-foreground">Review Items</p><p className="text-xs font-bold text-amber-600">{r.review_count}</p></div>
            <div className="rounded-lg border p-2"><p className="text-[9px] text-muted-foreground">Confidence</p><p className="text-xs font-bold text-blue-600">{r.confidence_score}%</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FRBankRecon({ reconciliations = [] }) {
  if (!reconciliations.length) return <div className="text-center py-10 text-sm text-muted-foreground">No reconciliation data available.</div>;
  const reconciledCount = reconciliations.filter(r => ['reconciled', 'reconciled_with_warnings'].includes(r.status)).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Statements</p><p className="text-xl font-bold">{reconciliations.length}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Reconciled</p><p className="text-xl font-bold text-green-600">{reconciledCount}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Issues</p><p className="text-xl font-bold text-red-600">{reconciliations.length - reconciledCount}</p></Card>
      </div>
      <div className="space-y-3">{reconciliations.map((r, i) => <ReconCard key={i} r={r} />)}</div>
    </div>
  );
}
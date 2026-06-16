import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';

const RECON_STATUS = {
  reconciled:               { label: 'Reconciled',                color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  reconciled_with_warnings: { label: 'Reconciled with Warnings',  color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  not_reconciled:           { label: 'Not Reconciled',            color: 'bg-red-100 text-red-700',      icon: XCircle },
  missing_opening_balance:  { label: 'Missing Opening Balance',   color: 'bg-orange-100 text-orange-700',icon: HelpCircle },
  missing_closing_balance:  { label: 'Missing Closing Balance',   color: 'bg-orange-100 text-orange-700',icon: HelpCircle },
  confidence_too_low:       { label: 'Confidence Too Low',        color: 'bg-red-100 text-red-700',      icon: XCircle },
};

function ReconRow({ recon }) {
  const [expanded, setExpanded] = useState(false);
  const sc = RECON_STATUS[recon.status] || RECON_STATUS.not_reconciled;
  const StatusIcon = sc.icon;
  const fmt = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—';
  const isReconciled = ['reconciled', 'reconciled_with_warnings'].includes(recon.status);

  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{recon.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {recon.institution_name && `${recon.institution_name} · `}
              {recon.account_number_masked && `···${recon.account_number_masked} · `}
              {recon.period_start} → {recon.period_end || '?'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:block">{recon.transaction_count} txns</span>
          <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
            <StatusIcon className="w-3 h-3" /> {sc.label}
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t bg-muted/10 space-y-4">
          {/* Reconciliation math */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', value: fmt(recon.opening_balance), color: 'text-foreground' },
              { label: '+ Total Credits', value: fmt(recon.total_credits), color: 'text-green-600' },
              { label: '− Total Debits', value: fmt(recon.total_debits), color: 'text-red-600' },
              { label: '= Calc. Closing', value: fmt(recon.calculated_closing), color: 'text-blue-600' },
            ].map(row => (
              <div key={row.label} className="rounded-lg bg-background border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{row.label}</p>
                <p className={`text-sm font-bold font-mono ${row.color}`}>{row.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background border p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Statement Closing Balance</p>
              <p className="text-sm font-bold font-mono">{fmt(recon.closing_balance)}</p>
            </div>
            <div className={`rounded-lg border p-3 text-center ${isReconciled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-[10px] text-muted-foreground">Difference</p>
              <p className={`text-sm font-bold font-mono ${isReconciled ? 'text-green-600' : 'text-red-600'}`}>
                {recon.difference != null ? `$${recon.difference.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          {/* Statement totals comparison */}
          {(recon.statement_total_credits != null || recon.statement_total_debits != null) && (
            <div>
              <p className="text-xs font-semibold mb-2">Statement Totals vs Extracted</p>
              <div className="grid grid-cols-2 gap-3">
                {recon.statement_total_credits != null && (
                  <div className="rounded-lg bg-background border p-3">
                    <p className="text-[10px] text-muted-foreground">Credits: Statement</p>
                    <p className="text-xs font-mono text-green-600">{fmt(recon.statement_total_credits)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Credits: Extracted</p>
                    <p className="text-xs font-mono text-green-600">{fmt(recon.total_credits)}</p>
                  </div>
                )}
                {recon.statement_total_debits != null && (
                  <div className="rounded-lg bg-background border p-3">
                    <p className="text-[10px] text-muted-foreground">Debits: Statement</p>
                    <p className="text-xs font-mono text-red-600">{fmt(recon.statement_total_debits)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Debits: Extracted</p>
                    <p className="text-xs font-mono text-red-600">{fmt(recon.total_debits)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {recon.warnings?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-amber-700">Warnings</p>
              {recon.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {recon.duplicate_count > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {recon.duplicate_count} possible duplicate transaction(s) detected — review before finalising
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ARBankReconciliation({ reconciliations = [] }) {
  if (!reconciliations.length) return (
    <div className="text-center py-10 text-muted-foreground text-sm">No reconciliation data available.</div>
  );

  const reconciledCount = reconciliations.filter(r => ['reconciled', 'reconciled_with_warnings'].includes(r.status)).length;
  const notReconciledCount = reconciliations.length - reconciledCount;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total Statements</p>
          <p className="text-xl font-bold">{reconciliations.length}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Reconciled</p>
          <p className="text-xl font-bold text-green-600">{reconciledCount}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Issues</p>
          <p className="text-xl font-bold text-red-600">{notReconciledCount}</p>
        </Card>
      </div>
      <div className="space-y-3">
        {reconciliations.map((r, i) => <ReconRow key={i} recon={r} />)}
      </div>
    </div>
  );
}
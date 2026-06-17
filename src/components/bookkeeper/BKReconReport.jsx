import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Scale } from 'lucide-react';

const STATUS_CONFIG = {
  reconciled:             { label: 'Reconciled',           color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  partially_reconciled:   { label: 'Partially Reconciled', color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  not_reconciled:         { label: 'Not Reconciled',       color: 'bg-red-100 text-red-700',      icon: XCircle },
  missing_balances:       { label: 'Missing Balances',     color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
};

const DOC_LABELS = {
  bank_statement: 'Bank', credit_card_statement: 'Credit Card', invoice: 'Invoice',
  receipt: 'Receipt', payroll_report: 'Payroll', loan_statement: 'Loan',
  sales_report: 'Sales', expense_report: 'Expense', tax_report: 'Tax', other: 'Other',
};

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtNum = (n) => n != null ? Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

function StatBox({ label, value, color = '', sub }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ReconCard({ recon }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[recon.status] || STATUS_CONFIG.not_reconciled;
  const Icon = sc.icon;
  const net = (recon.total_credits || 0) - (recon.total_debits || 0);

  return (
    <div className={`border rounded-xl overflow-hidden ${recon.status === 'reconciled' ? 'border-green-200' : recon.status === 'not_reconciled' ? 'border-red-200' : 'border-amber-200'}`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left gap-2"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <span className="font-semibold text-sm truncate max-w-[180px]">{recon.file_name}</span>
          {recon.document_type && (
            <Badge className="bg-primary/10 text-primary border-0 text-[9px] flex-shrink-0">
              {DOC_LABELS[recon.document_type] || recon.document_type}
            </Badge>
          )}
          <Badge className={`${sc.color} border-0 text-[10px] flex items-center gap-0.5 flex-shrink-0`}>
            <Icon className="w-2.5 h-2.5" /> {sc.label}
          </Badge>
          {recon.confidence_score > 0 && (
            <span className={`text-[10px] flex-shrink-0 ${recon.confidence_score >= 80 ? 'text-green-600' : recon.confidence_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              ⬤ {recon.confidence_score}%
            </span>
          )}
        </div>
        {/* Quick totals always visible */}
        <div className="flex items-center gap-3 text-xs flex-shrink-0 font-mono">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Credits</p>
            <p className="text-green-600 font-bold">{fmt(recon.total_credits)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Debits</p>
            <p className="text-red-600 font-bold">{fmt(recon.total_debits)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Net</p>
            <p className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</p>
          </div>
          {recon.difference != null && recon.difference > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Diff</p>
              <p className="text-red-600 font-bold">Δ{fmt(recon.difference)}</p>
            </div>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t bg-muted/5 px-4 py-4 space-y-4">
          {/* Institution / period */}
          {(recon.institution_name || recon.period_start || recon.account_number_masked) && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pb-2 border-b">
              {recon.institution_name && <span>🏦 <strong>{recon.institution_name}</strong></span>}
              {recon.account_number_masked && <span>···{recon.account_number_masked}</span>}
              {recon.period_start && <span>📅 {recon.period_start} → {recon.period_end || '?'}</span>}
            </div>
          )}

          {/* Balance reconciliation grid */}
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Balance Reconciliation</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Opening Balance" value={fmt(recon.opening_balance)} />
              <StatBox label="+ Total Credits (IN)" value={fmt(recon.total_credits)} color="text-green-600" />
              <StatBox label="− Total Debits (OUT)" value={fmt(recon.total_debits)} color="text-red-600" />
              <StatBox label="= Calculated Closing" value={fmt(recon.calculated_closing)} color={recon.difference != null && recon.difference < 0.02 ? 'text-green-600' : 'text-amber-600'} />
              <StatBox label="Stated Closing Balance" value={fmt(recon.closing_balance)} />
              <StatBox label="Difference" value={recon.difference != null ? `$${recon.difference.toFixed(2)}` : '—'} color={recon.difference != null && recon.difference < 0.02 ? 'text-green-600' : 'text-red-600'} />
              <StatBox label="Net Activity" value={fmt(recon.net_activity)} color={net >= 0 ? 'text-green-600' : 'text-red-600'} />
              <StatBox label="Transactions" value={recon.transaction_count} />
            </div>
          </div>

          {/* Statement vs extracted comparison */}
          {(recon.statement_total_credits != null || recon.statement_total_debits != null) && (
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Statement vs Extracted</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      {['', 'Statement Total', 'Extracted Total', 'Match?'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-green-700">Credits (Money IN)</td>
                      <td className="px-3 py-2 font-mono">{recon.statement_total_credits != null ? fmt(recon.statement_total_credits) : '—'}</td>
                      <td className="px-3 py-2 font-mono text-green-600">{fmt(recon.total_credits)}</td>
                      <td className="px-3 py-2">
                        {recon.statement_total_credits != null
                          ? Math.abs(recon.statement_total_credits - recon.total_credits) < 0.02
                            ? <span className="text-green-600 font-semibold">✓ Match</span>
                            : <span className="text-red-600 font-semibold">✗ Off by ${Math.abs(recon.statement_total_credits - recon.total_credits).toFixed(2)}</span>
                          : <span className="text-muted-foreground">No statement total</span>
                        }
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-red-700">Debits (Money OUT)</td>
                      <td className="px-3 py-2 font-mono">{recon.statement_total_debits != null ? fmt(recon.statement_total_debits) : '—'}</td>
                      <td className="px-3 py-2 font-mono text-red-600">{fmt(recon.total_debits)}</td>
                      <td className="px-3 py-2">
                        {recon.statement_total_debits != null
                          ? Math.abs(recon.statement_total_debits - recon.total_debits) < 0.02
                            ? <span className="text-green-600 font-semibold">✓ Match</span>
                            : <span className="text-red-600 font-semibold">✗ Off by ${Math.abs(recon.statement_total_debits - recon.total_debits).toFixed(2)}</span>
                          : <span className="text-muted-foreground">No statement total</span>
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transaction breakdown */}
          <div>
            <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Transaction Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Total Transactions" value={recon.transaction_count} />
              <StatBox label="Duplicate Entries" value={recon.duplicate_count || 0} color={recon.duplicate_count > 0 ? 'text-red-600' : 'text-green-600'} />
              <StatBox label="Flagged for Review" value={recon.review_count || 0} color={recon.review_count > 0 ? 'text-amber-600' : 'text-green-600'} />
              <StatBox label="AI Confidence" value={recon.confidence_score > 0 ? `${recon.confidence_score}%` : '—'} color={recon.confidence_score >= 80 ? 'text-green-600' : recon.confidence_score >= 60 ? 'text-amber-600' : 'text-red-600'} />
            </div>
          </div>

          {/* Warnings */}
          {recon.warnings?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reconciliation Notes</p>
              {recon.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {recon.status === 'reconciled' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>This file is fully reconciled. Opening balance + credits − debits = closing balance ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BKReconReport({ reconciliations }) {
  if (!reconciliations?.length) return null;

  const reconciled = reconciliations.filter(r => r.status === 'reconciled').length;
  const partial = reconciliations.filter(r => r.status === 'partially_reconciled').length;
  const issues = reconciliations.filter(r => r.status === 'not_reconciled' || r.status === 'missing_balances').length;
  const totalCredits = reconciliations.reduce((s, r) => s + (r.total_credits || 0), 0);
  const totalDebits = reconciliations.reduce((s, r) => s + (r.total_debits || 0), 0);
  const totalTxns = reconciliations.reduce((s, r) => s + (r.transaction_count || 0), 0);
  const totalDupes = reconciliations.reduce((s, r) => s + (r.duplicate_count || 0), 0);
  const net = totalCredits - totalDebits;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Files</p>
          <p className="text-xl font-bold">{reconciliations.length}</p>
          <div className="flex gap-1.5 mt-1">
            <span className="text-[10px] text-green-600 font-semibold">{reconciled} reconciled</span>
            {partial > 0 && <span className="text-[10px] text-amber-600 font-semibold">· {partial} partial</span>}
            {issues > 0 && <span className="text-[10px] text-red-600 font-semibold">· {issues} issues</span>}
          </div>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total Money IN (Credits)</p>
          <p className="text-xl font-bold font-mono text-green-600">{fmt(totalCredits)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{totalTxns} total transactions</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-muted-foreground">Total Money OUT (Debits)</p>
          <p className="text-xl font-bold font-mono text-red-600">{fmt(totalDebits)}</p>
          {totalDupes > 0 && <p className="text-[10px] text-red-600 mt-0.5">{totalDupes} duplicates found</p>}
        </Card>
        <Card className={`p-3 ${net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[10px] text-muted-foreground">Net Cash Flow</p>
          <p className={`text-xl font-bold font-mono ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Credits − Debits</p>
        </Card>
      </div>

      {/* Reconciliation status bar */}
      <div className="bg-muted/20 rounded-xl p-3 flex items-center gap-3">
        <Scale className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold">Reconciliation Completion</span>
            <span className="text-muted-foreground">{reconciled}/{reconciliations.length} files fully reconciled</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 flex overflow-hidden">
            <div className="h-2 bg-green-500" style={{ width: `${(reconciled / reconciliations.length) * 100}%` }} />
            <div className="h-2 bg-amber-400" style={{ width: `${(partial / reconciliations.length) * 100}%` }} />
            <div className="h-2 bg-red-400" style={{ width: `${(issues / reconciliations.length) * 100}%` }} />
          </div>
          <div className="flex gap-3 mt-1 text-[10px]">
            <span className="text-green-600">■ Reconciled ({reconciled})</span>
            {partial > 0 && <span className="text-amber-600">■ Partial ({partial})</span>}
            {issues > 0 && <span className="text-red-600">■ Issues ({issues})</span>}
          </div>
        </div>
      </div>

      {/* Per-file cards */}
      <div className="space-y-2">
        {reconciliations.map((r, i) => <ReconCard key={i} recon={r} />)}
      </div>
    </div>
  );
}
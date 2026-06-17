import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from 'lucide-react';

const DOC_TYPES = [
  'bank_statement', 'credit_card_statement', 'invoice', 'receipt',
  'payroll_report', 'loan_statement', 'sales_report', 'expense_report',
  'tax_report', 'vendor_statement', 'customer_statement', 'accounting_export',
  'gl_export', 'pl_statement', 'balance_sheet', 'trial_balance', 'other', 'ignore'
];

const TYPE_LABELS = {
  bank_statement: 'Bank Statement', credit_card_statement: 'Credit Card Statement',
  invoice: 'Invoice', receipt: 'Receipt', payroll_report: 'Payroll Report',
  loan_statement: 'Loan Statement', sales_report: 'Sales Report', expense_report: 'Expense Report',
  tax_report: 'Tax Report', vendor_statement: 'Vendor Statement', customer_statement: 'Customer Statement',
  accounting_export: 'Accounting Export', gl_export: 'GL Export', pl_statement: 'P&L Statement',
  balance_sheet: 'Balance Sheet', trial_balance: 'Trial Balance', other: 'Other', ignore: 'Ignore This File', unknown: 'Unknown'
};

const STATUS_CONFIG = {
  ready:         { label: 'Ready',          color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  needs_review:  { label: 'Needs Review',   color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  low_confidence:{ label: 'Low Confidence', color: 'bg-orange-100 text-orange-700',icon: AlertTriangle },
  classifying:   { label: 'Classifying…',  color: 'bg-blue-100 text-blue-700',    icon: RefreshCw, spin: true },
  error:         { label: 'Error',          color: 'bg-red-100 text-red-700',      icon: XCircle },
  pending:       { label: 'Pending',        color: 'bg-muted text-muted-foreground',icon: Clock },
};

function ConfidenceBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[48px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-7 text-right">{score}%</span>
    </div>
  );
}

export default function BKFileClassification({ classifications, onOverride }) {
  if (!classifications?.length) return null;

  return (
    <div className="space-y-2">
      {classifications.map((c, i) => {
        const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
        const Icon = sc.icon;
        return (
          <div key={i} className={`rounded-xl border p-3 ${c.status === 'needs_review' || c.status === 'low_confidence' ? 'border-amber-200 bg-amber-50/50' : c.status === 'error' ? 'border-red-200 bg-red-50/50' : 'bg-muted/20'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold truncate">{c.file_name}</p>
                  <Badge className={`${sc.color} border-0 text-[10px] flex items-center gap-0.5`}>
                    <Icon className={`w-2.5 h-2.5 ${sc.spin ? 'animate-spin' : ''}`} /> {sc.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {c.institution_name && <span className="text-[10px] text-muted-foreground">🏦 {c.institution_name}</span>}
                  {c.company_name && <span className="text-[10px] text-muted-foreground">🏢 {c.company_name}</span>}
                  {c.account_number_masked && <span className="text-[10px] text-muted-foreground">···{c.account_number_masked}</span>}
                  {c.period_start && <span className="text-[10px] text-muted-foreground">📅 {c.period_start} → {c.period_end || '?'}</span>}
                </div>
                {c.review_reason && <p className="text-[10px] text-amber-700 mt-1">⚠ {c.review_reason}</p>}
                {c.classification_reason && !c.review_reason && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{c.classification_reason}</p>}
                {c.confidence_score > 0 && <div className="mt-1.5 max-w-[160px]"><ConfidenceBar score={c.confidence_score} /></div>}
              </div>
              <div className="flex-shrink-0 w-full sm:w-44">
                <p className="text-[10px] text-muted-foreground mb-1">Document Type</p>
                <Select value={c.document_type || 'unknown'} onValueChange={val => onOverride(i, val)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';

const SEVERITY_STYLES = {
  high:   { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" /> },
  medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> },
  low:    { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" /> },
};

export default function ValidationPanel({ issues, txTotal, autoApproved, reviewCount, totalDebits, totalCredits }) {
  const diff = Math.abs((totalDebits || 0) - (totalCredits || 0));
  const hasHighIssues = issues.some(i => i.severity === 'high');

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        {hasHighIssues
          ? <><XCircle className="w-4 h-4 text-red-500" /> Validation — Issues Found</>
          : reviewCount > 0
            ? <><AlertTriangle className="w-4 h-4 text-amber-500" /> Validation — Review Required</>
            : <><CheckCircle2 className="w-4 h-4 text-green-500" /> Validation Passed</>
        }
      </h3>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Extracted', value: txTotal, color: 'text-foreground' },
          { label: 'Auto-Approved', value: autoApproved, color: 'text-green-600' },
          { label: 'Needs Review', value: reviewCount, color: reviewCount > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Debit/Credit Diff', value: `$${diff.toFixed(2)}`, color: diff < 0.01 ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Issues */}
      {issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue, i) => {
            const s = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.low;
            return (
              <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${s.bg} ${s.text}`}>
                {s.icon}
                <span className="flex-1">{issue.message}</span>
                <span className="capitalize font-semibold flex-shrink-0 opacity-70">{issue.severity}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          ✓ All checks passed — ready to generate reports
        </p>
      )}
    </Card>
  );
}
import React from 'react';
import { Card } from '@/components/ui/card';
import { FileText, Database, CheckCircle2, AlertTriangle, Copy, Tag, TrendingUp, CreditCard, Landmark } from 'lucide-react';

export default function BKDashboard({ sessions }) {
  const totalDocs = sessions.reduce((s, r) => { try { return s + JSON.parse(r.file_names || '[]').length; } catch { return s; } }, 0);
  const totalTx = sessions.reduce((s, r) => s + (r.transaction_count || 0), 0);
  const totalMatched = sessions.reduce((s, r) => s + (r.matched_count || 0), 0);
  const totalUnmatched = sessions.reduce((s, r) => s + (r.unmatched_count || 0), 0);
  const totalDupes = sessions.reduce((s, r) => s + (r.duplicate_count || 0), 0);
  const totalUncat = sessions.reduce((s, r) => s + (r.uncategorized_count || 0), 0);
  const totalCredits = sessions.reduce((s, r) => s + (r.total_credits || 0), 0);
  const totalDebits = sessions.reduce((s, r) => s + (r.total_debits || 0), 0);
  const reconPct = totalTx > 0 ? Math.round((totalMatched / totalTx) * 100) : 0;

  const stats = [
    { label: 'Documents Uploaded', value: totalDocs, icon: FileText, color: '' },
    { label: 'Transactions Extracted', value: totalTx.toLocaleString(), icon: Database, color: '' },
    { label: 'Matched Transactions', value: totalMatched.toLocaleString(), icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Flagged for Review', value: totalUnmatched.toLocaleString(), icon: AlertTriangle, color: totalUnmatched > 0 ? 'text-amber-600' : 'text-green-600' },
    { label: 'Duplicates Found', value: totalDupes.toLocaleString(), icon: Copy, color: totalDupes > 0 ? 'text-red-600' : 'text-green-600' },
    { label: 'Uncategorized', value: totalUncat.toLocaleString(), icon: Tag, color: totalUncat > 0 ? 'text-orange-600' : 'text-green-600' },
    { label: 'Reconciliation %', value: `${reconPct}%`, icon: CheckCircle2, color: reconPct >= 80 ? 'text-green-600' : 'text-amber-600' },
    { label: 'Net Cash Flow', value: totalTx > 0 ? `$${Math.abs(totalCredits - totalDebits).toLocaleString('en-CA', { maximumFractionDigits: 0 })}` : '—', icon: TrendingUp, color: (totalCredits - totalDebits) >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Total Credits', value: totalCredits > 0 ? `$${(totalCredits / 1000).toFixed(1)}k` : '—', icon: Landmark, color: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <s.icon className={`w-4 h-4 opacity-30 ${s.color}`} />
          </div>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
        </Card>
      ))}
    </div>
  );
}
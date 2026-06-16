import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CAT_COLORS = { assets:'bg-blue-100 text-blue-700', revenue:'bg-green-100 text-green-700', cogs:'bg-orange-100 text-orange-700', operating_expenses:'bg-red-100 text-red-700', liabilities:'bg-purple-100 text-purple-700', equity:'bg-indigo-100 text-indigo-700', other_income:'bg-teal-100 text-teal-700', other_expenses:'bg-rose-100 text-rose-700', unclassified:'bg-gray-100 text-gray-600' };

export default function ARTrialBalance({ report }) {
  const accounts = report.accounts || [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-lg font-bold font-mono text-red-600">${(report.total_debits||0).toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-lg font-bold font-mono text-green-600">${(report.total_credits||0).toFixed(2)}</p></Card>
        <Card className={`p-3 text-center border-2 ${report.is_balanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {report.is_balanced ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
            <span className={`text-sm font-bold ${report.is_balanced ? 'text-green-700' : 'text-red-700'}`}>{report.is_balanced ? 'Balanced' : 'Imbalanced'}</span>
          </div>
        </Card>
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>{['Account Code','Account Name','Type','Category','Debit','Credit','Net Balance'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {accounts.map((acct, i) => (
                <tr key={i} className="border-b hover:bg-muted/10">
                  <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{acct.account_code || '—'}</td>
                  <td className="px-3 py-2 text-xs font-medium">{acct.account_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{acct.account_type}</td>
                  <td className="px-3 py-2"><Badge className={`text-[10px] border-0 ${CAT_COLORS[acct.category] || CAT_COLORS.unclassified}`}>{(acct.category||'unclassified').replace(/_/g,' ')}</Badge></td>
                  <td className="px-3 py-2 text-xs font-mono text-right text-red-600">{acct.debit_total > 0 ? `$${acct.debit_total.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono text-right text-green-600">{acct.credit_total > 0 ? `$${acct.credit_total.toFixed(2)}` : '—'}</td>
                  <td className={`px-3 py-2 text-xs font-mono text-right font-bold ${acct.net_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>${Math.abs(acct.net_balance).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-bold border-t-2">
                <td colSpan={4} className="px-3 py-2 text-xs">TOTALS</td>
                <td className="px-3 py-2 text-xs font-mono text-right text-red-600">${(report.total_debits||0).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs font-mono text-right text-green-600">${(report.total_credits||0).toFixed(2)}</td>
                <td className="px-3 py-2 text-xs font-mono text-right">${Math.abs((report.total_debits||0)-(report.total_credits||0)).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
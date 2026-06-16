import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = n => `$${Math.abs(Number(n || 0)).toFixed(2)}`;
const fmtSigned = n => { const v = Number(n || 0); return `${v >= 0 ? '' : '-'}$${Math.abs(v).toFixed(2)}`; };

function PLSection({ title, lines = [], total, field = 'amount', isExpense }) {
  if (!lines.length && !total) return null;
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/20">
          <span className="text-xs">{l.account}</span>
          <span className={`text-xs font-mono ${isExpense ? 'text-red-600' : 'text-green-600'}`}>{fmt(l[field])}</span>
        </div>
      ))}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 font-semibold">
        <span className="text-xs">Total {title}</span>
        <span className={`text-xs font-mono ${isExpense ? 'text-red-600' : 'text-green-600'}`}>{fmt(total)}</span>
      </div>
    </div>
  );
}

function Subtotal({ label, value, highlight }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${highlight ? 'border-primary/30 bg-primary/5' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${color}`} /><span className={`text-sm font-bold ${highlight ? '' : 'text-muted-foreground'}`}>{label}</span></div>
      <span className={`text-lg font-bold font-mono ${color}`}>{fmtSigned(value)}</span>
    </div>
  );
}

export default function FRPLReport({ report }) {
  if (!report) return null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Revenue', val: report.revenue, c: 'text-green-600' },
          { label: 'Gross Profit', val: report.gross_profit, c: report.gross_profit >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Total Expenses', val: report.operating_expenses, c: 'text-red-600' },
          { label: 'Net Income', val: report.net_profit, c: report.net_profit >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className={`text-base font-bold font-mono mt-0.5 ${s.c}`}>{fmtSigned(s.val)}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 space-y-4">
        <PLSection title="Revenue" lines={report.revenue_lines} total={report.revenue} field="amount" />
        <PLSection title="Cost of Goods Sold" lines={report.cogs_lines} total={report.cogs} field="amount" isExpense />
        <Subtotal label="Gross Profit" value={report.gross_profit} />
        <PLSection title="Operating Expenses" lines={report.operating_expense_lines} total={report.operating_expenses} field="amount" isExpense />
        <Subtotal label="Net Operating Income" value={report.net_operating_income} />
        {report.other_income > 0 && <PLSection title="Other Income" lines={report.other_income_lines} total={report.other_income} field="amount" />}
        <Subtotal label="Net Income" value={report.net_profit} highlight />
      </Card>

      {report.monthly_data?.length > 0 && (
        <Card className="p-4">
          <h4 className="text-xs font-semibold mb-3">Monthly Breakdown</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50">
                <tr>{['Month','Revenue','COGS','Gross Profit','Expenses','Net Income'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {report.monthly_data.map((m, i) => (
                  <tr key={i} className="border-t hover:bg-muted/10">
                    <td className="px-3 py-2 text-xs font-semibold">{m.month}</td>
                    <td className="px-3 py-2 text-xs font-mono text-green-600">{fmtSigned(m.revenue)}</td>
                    <td className="px-3 py-2 text-xs font-mono text-red-600">{fmtSigned(m.cogs)}</td>
                    <td className={`px-3 py-2 text-xs font-mono font-bold ${m.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtSigned(m.gross_profit)}</td>
                    <td className="px-3 py-2 text-xs font-mono text-red-600">{fmtSigned(m.opex)}</td>
                    <td className={`px-3 py-2 text-xs font-mono font-bold ${m.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtSigned(m.net_income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {report.note && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">{report.note}</p>
      )}
    </div>
  );
}
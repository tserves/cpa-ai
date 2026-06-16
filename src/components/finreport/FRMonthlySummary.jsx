import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function FRMonthlySummary({ report }) {
  if (!report?.months?.length) return <div className="text-center py-10 text-sm text-muted-foreground">No monthly data available.</div>;
  const fmt = n => `$${Number(n || 0).toFixed(2)}`;
  const fmtK = n => Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const totalC = report.months.reduce((s, m) => s + (m.total_credits || 0), 0);
  const totalD = report.months.reduce((s, m) => s + (m.total_debits || 0), 0);
  const totalTx = report.months.reduce((s, m) => s + (m.transaction_count || 0), 0);
  const chartData = report.months.map(m => ({ name: m.month, Credits: +m.total_credits.toFixed(2), Debits: +m.total_debits.toFixed(2) }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">{fmt(totalC)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">{fmt(totalD)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Transactions</p><p className="text-base font-bold">{totalTx}</p></Card>
      </div>
      <Card className="p-4">
        <p className="text-xs font-semibold mb-3">Monthly Credits vs Debits</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Credits" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Debits" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left">
          <thead className="bg-muted/50">
            <tr>{['Month','Transactions','Total Credits','Total Debits','Net','Review Items'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {report.months.map((m, i) => {
              const net = (m.total_credits || 0) - (m.total_debits || 0);
              return (
                <tr key={i} className="border-t hover:bg-muted/10">
                  <td className="px-3 py-2 text-xs font-semibold">{m.month}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.transaction_count}</td>
                  <td className="px-3 py-2 text-xs font-mono text-green-600">{fmt(m.total_credits)}</td>
                  <td className="px-3 py-2 text-xs font-mono text-red-600">{fmt(m.total_debits)}</td>
                  <td className={`px-3 py-2 text-xs font-mono font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(net)}</td>
                  <td className="px-3 py-2 text-xs">{m.review_count > 0 ? <span className="text-amber-600 font-medium">⚠ {m.review_count}</span> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              );
            })}
            <tr className="border-t bg-muted/30 font-bold">
              <td className="px-3 py-2 text-xs">TOTAL</td>
              <td className="px-3 py-2 text-xs">{totalTx}</td>
              <td className="px-3 py-2 text-xs font-mono text-green-600">{fmt(totalC)}</td>
              <td className="px-3 py-2 text-xs font-mono text-red-600">{fmt(totalD)}</td>
              <td className={`px-3 py-2 text-xs font-mono ${(totalC - totalD) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(totalC - totalD)}</td>
              <td className="px-3 py-2 text-xs">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
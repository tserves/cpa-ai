import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = n => `$${Math.abs(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Section({ title, lines, total, color = 'text-foreground', fieldLabel = 'Amount' }) {
  if (!lines?.length && !total) return null;
  return (
    <div>
      <div className="flex justify-between items-center py-1.5 border-b">
        <span className="text-sm font-semibold">{title}</span>
        <span className={`text-sm font-bold font-mono ${color}`}>{fmt(total)}</span>
      </div>
      {lines?.map((l, i) => (
        <div key={i} className="flex justify-between items-center py-1 pl-4">
          <span className="text-xs text-muted-foreground">{l.account} <span className="text-[10px]">({l.count})</span></span>
          <span className="text-xs font-mono">{fmt(l.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function Subtotal({ label, value, color, border = true }) {
  return (
    <div className={`flex justify-between items-center py-2 ${border ? 'border-t border-b' : ''} bg-muted/20 px-2 rounded`}>
      <span className="text-sm font-bold">{label}</span>
      <span className={`text-sm font-bold font-mono ${color}`}>{fmt(value)}</span>
    </div>
  );
}

export default function BKPLReport({ report }) {
  if (!report) return null;
  const np = report.net_profit || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Revenue</p><p className="text-base font-bold font-mono text-green-600">{fmt(report.revenue)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">COGS</p><p className="text-base font-bold font-mono text-orange-600">{fmt(report.cogs)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Gross Profit</p><p className={`text-base font-bold font-mono ${(report.gross_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(report.gross_profit)}</p></Card>
        <Card className={`p-3 text-center ${np >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[10px] text-muted-foreground">Net Profit</p>
          <div className="flex items-center justify-center gap-1">
            {np >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            <p className={`text-base font-bold font-mono ${np >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(np)}</p>
          </div>
          {report.revenue > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">Margin: {report.gross_margin_pct}%</p>}
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <Section title="Revenue" lines={report.revenue_lines} total={report.revenue} color="text-green-600" />
        <Section title="Cost of Goods Sold" lines={report.cogs_lines} total={report.cogs} color="text-orange-600" />
        <Subtotal label="Gross Profit" value={report.gross_profit} color={(report.gross_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
        <Section title="Operating Expenses" lines={report.operating_expense_lines} total={report.operating_expenses} color="text-red-600" />
        <Subtotal label="Net Operating Income" value={report.net_operating_income} color={(report.net_operating_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'} />
        {report.other_income > 0 && <Section title="Other Income" lines={[]} total={report.other_income} color="text-blue-600" />}
        <Subtotal label="Net Profit / Loss" value={np} color={np >= 0 ? 'text-green-600' : 'text-red-600'} />
      </Card>

      {report.monthly_data?.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3">Monthly Performance</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={report.monthly_data}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-3))" name="Revenue" radius={[2,2,0,0]} />
              <Bar dataKey="net_income" fill="hsl(var(--chart-1))" name="Net Income" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
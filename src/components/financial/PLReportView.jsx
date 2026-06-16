import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function PLSection({ title, lines = [], total, totalLabel, colorClass, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!lines.length && total === 0) return null;
  return (
    <div className="border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
        </div>
        <span className={`text-sm font-bold font-mono ${colorClass}`}>${total.toFixed(2)}</span>
      </button>
      {open && lines.length > 0 && (
        <div className="border-t">
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between items-center px-8 py-2 border-b last:border-0 hover:bg-muted/10">
              <span className="text-xs text-muted-foreground">{l.account}</span>
              <span className="text-xs font-mono">${(l.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-2 bg-muted/20 font-semibold">
            <span className="text-xs">{totalLabel || `Total ${title}`}</span>
            <span className={`text-xs font-mono ${colorClass}`}>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SubtotalRow({ label, value, colorClass, size = 'normal', border = false }) {
  return (
    <div className={`flex justify-between items-center px-4 py-3 rounded-xl ${border ? 'border-2 border-primary/20 bg-primary/5' : 'bg-muted/40'}`}>
      <span className={`font-bold ${size === 'large' ? 'text-base' : 'text-sm'}`}>{label}</span>
      <div className="flex items-center gap-2">
        {value < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-green-500" />}
        <span className={`font-bold font-mono ${size === 'large' ? 'text-xl' : 'text-base'} ${colorClass}`}>${Math.abs(value).toFixed(2)}</span>
        {value < 0 && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Loss</Badge>}
        {value > 0 && <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Profit</Badge>}
      </div>
    </div>
  );
}

export default function PLReportView({ report }) {
  const [view, setView] = useState('all');

  // Monthly view
  const monthlyData = report.monthly_data || {};
  const months = Object.keys(monthlyData).sort();

  const getMonthlyValue = (key) => {
    if (view === 'all') return null;
    const filtered = months.filter(m => {
      if (view === 'all') return true;
      const [y, mo] = m.split('-').map(Number);
      if (view === 'q1') return mo >= 1 && mo <= 3;
      if (view === 'q2') return mo >= 4 && mo <= 6;
      if (view === 'q3') return mo >= 7 && mo <= 9;
      if (view === 'q4') return mo >= 10 && mo <= 12;
      return true;
    });
    return filtered.reduce((s, m) => s + (monthlyData[m]?.[key] || 0), 0);
  };

  const rev = view === 'all' ? report.revenue : (getMonthlyValue('revenue') ?? report.revenue);
  const cogs = view === 'all' ? report.cogs : (getMonthlyValue('cogs') ?? report.cogs);
  const opex = view === 'all' ? report.operating_expenses : (getMonthlyValue('opex') ?? report.operating_expenses);
  const oi = view === 'all' ? report.other_income : (getMonthlyValue('other_income') ?? report.other_income);
  const oe = view === 'all' ? report.other_expenses : (getMonthlyValue('other_expenses') ?? report.other_expenses);
  const gp = rev - cogs;
  const noi = gp - opex;
  const np = noi + oi - oe;
  const gm = rev > 0 ? ((gp / rev) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Revenue</p><p className="text-lg font-bold text-green-600">${rev.toFixed(2)}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Gross Margin</p><p className="text-lg font-bold text-blue-600">{gm}%</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Expenses</p><p className="text-lg font-bold text-red-600">${(cogs + opex).toFixed(2)}</p></Card>
        <Card className={`p-3 text-center border-2 ${np >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className="text-[10px] text-muted-foreground">Net Profit</p>
          <p className={`text-lg font-bold ${np >= 0 ? 'text-green-700' : 'text-red-700'}`}>${np.toFixed(2)}</p>
        </Card>
      </div>

      {/* Period filter */}
      {months.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              <SelectItem value="q1">Q1 (Jan–Mar)</SelectItem>
              <SelectItem value="q2">Q2 (Apr–Jun)</SelectItem>
              <SelectItem value="q3">Q3 (Jul–Sep)</SelectItem>
              <SelectItem value="q4">Q4 (Oct–Dec)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* P&L Sections */}
      <PLSection title="Revenue" lines={report.revenue_lines || []} total={rev} colorClass="text-green-600" defaultOpen={true} />
      <PLSection title="Cost of Goods Sold" lines={report.cogs_lines || []} total={cogs} colorClass="text-orange-600" />
      <SubtotalRow label="Gross Profit" value={gp} colorClass={gp >= 0 ? 'text-green-600' : 'text-red-600'} />

      <PLSection title="Operating Expenses" lines={report.operating_expense_lines || []} total={opex} colorClass="text-red-600" />
      <SubtotalRow label="Net Operating Income" value={noi} colorClass={noi >= 0 ? 'text-green-600' : 'text-red-600'} />

      {(oi > 0 || oe > 0) && (
        <>
          <PLSection title="Other Income" lines={report.other_income_lines || []} total={oi} colorClass="text-teal-600" />
          <PLSection title="Other Expenses" lines={report.other_expense_lines || []} total={oe} colorClass="text-rose-600" />
        </>
      )}

      <SubtotalRow label="Net Profit / Loss" value={np} colorClass={np >= 0 ? 'text-green-700' : 'text-red-700'} size="large" border />

      {/* Monthly breakdown table */}
      {months.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Monthly Breakdown</p>
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/40 border-b">
                <tr>
                  {['Month', 'Revenue', 'COGS', 'Op. Expenses', 'Net'].map(h => (
                    <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m => {
                  const md = monthlyData[m];
                  const mNet = (md.revenue || 0) - (md.cogs || 0) - (md.opex || 0) + (md.other_income || 0) - (md.other_expenses || 0);
                  return (
                    <tr key={m} className="border-b hover:bg-muted/10">
                      <td className="px-3 py-2 text-xs font-medium">{m}</td>
                      <td className="px-3 py-2 text-xs font-mono text-green-600">${(md.revenue || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-orange-600">${(md.cogs || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-red-600">${(md.opex || 0).toFixed(2)}</td>
                      <td className={`px-3 py-2 text-xs font-mono font-bold ${mNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>${mNet.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';

function PLSection({ title, lines = [], total, colorClass, isPositive }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold font-mono ${colorClass}`}>${(total || 0).toFixed(2)}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && lines.length > 0 && (
        <div className="border-t divide-y bg-muted/10">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-2">
              <span className="text-xs text-muted-foreground">{line.account}</span>
              <span className="text-xs font-mono font-medium">${(line.amount || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubtotalRow({ label, value, colorClass, large = false, border = false }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${border ? 'border rounded-lg' : ''} ${large ? 'bg-primary/5' : 'bg-muted/30'}`}>
      <span className={`font-semibold ${large ? 'text-base' : 'text-sm'}`}>{label}</span>
      <span className={`font-bold font-mono ${large ? 'text-lg' : 'text-sm'} ${colorClass}`}>${(value || 0).toFixed(2)}</span>
    </div>
  );
}

export default function PLReportView({ report }) {
  const netPositive = (report.net_profit || 0) >= 0;
  const grossPositive = (report.gross_profit || 0) >= 0;
  const noiPositive = (report.net_operating_income || 0) >= 0;

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Revenue', value: report.revenue, color: 'text-green-600' },
          { label: 'Gross Profit', value: report.gross_profit, color: grossPositive ? 'text-green-600' : 'text-red-600' },
          { label: 'Net Operating Income', value: report.net_operating_income, color: noiPositive ? 'text-green-600' : 'text-red-600' },
          { label: 'Net Profit / Loss', value: report.net_profit, color: netPositive ? 'text-green-600' : 'text-red-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{(s.value || 0) < 0 ? '-' : ''}${Math.abs(s.value || 0).toFixed(2)}</p>
            {s.label === 'Gross Profit' && report.gross_margin_pct !== null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Margin: {report.gross_margin_pct}%</p>
            )}
          </Card>
        ))}
      </div>

      {/* P&L Statement */}
      <div className="space-y-2 pt-2">
        <PLSection title="Revenue" lines={report.revenue_lines} total={report.revenue} colorClass="text-green-600" />
        <PLSection title="Cost of Goods Sold" lines={report.cogs_lines} total={report.cogs} colorClass="text-red-600" />
        <SubtotalRow label="Gross Profit" value={report.gross_profit} colorClass={grossPositive ? 'text-green-700' : 'text-red-700'} border />

        <PLSection title="Operating Expenses" lines={report.operating_expense_lines} total={report.operating_expenses} colorClass="text-red-600" />
        <SubtotalRow label="Net Operating Income" value={report.net_operating_income} colorClass={noiPositive ? 'text-green-700' : 'text-red-700'} border />

        <PLSection title="Other Income" lines={report.other_income_lines} total={report.other_income} colorClass="text-green-600" />
        <PLSection title="Other Expenses" lines={report.other_expense_lines} total={report.other_expenses} colorClass="text-red-600" />

        <div className={`flex items-center justify-between px-4 py-4 rounded-lg border-2 ${netPositive ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {netPositive ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            <span className="font-bold text-base">{netPositive ? 'Net Profit' : 'Net Loss'}</span>
          </div>
          <span className={`text-2xl font-bold font-mono ${netPositive ? 'text-green-700' : 'text-red-700'}`}>
            {!netPositive && '('}${Math.abs(report.net_profit || 0).toFixed(2)}{!netPositive && ')'}
          </span>
        </div>
      </div>
    </div>
  );
}
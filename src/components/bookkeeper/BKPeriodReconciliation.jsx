import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RefreshCw, CheckCircle2, AlertTriangle, Download, Scale, TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmt = n => n != null ? `$${Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

// Generate period options from transaction data
function buildPeriodOptions(transactions) {
  const months = new Set(), years = new Set(), quarters = new Set();
  transactions.forEach(tx => {
    if (!tx.transaction_date) return;
    const d = tx.transaction_date;
    const ym = d.substring(0, 7);
    const y = d.substring(0, 4);
    const m = parseInt(d.substring(5, 7));
    const q = Math.ceil(m / 3);
    months.add(ym);
    years.add(y);
    quarters.add(`${y}-Q${q}`);
  });
  return {
    months: [...months].sort().reverse(),
    quarters: [...quarters].sort().reverse(),
    years: [...years].sort().reverse(),
  };
}

const PERIOD_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom Range',
};

const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtPeriodLabel(type, value) {
  if (!value) return '';
  if (type === 'monthly') {
    const [y, m] = value.split('-');
    return `${MONTH_NAMES[parseInt(m)]} ${y}`;
  }
  if (type === 'quarterly') return value.replace('-', ' ').replace('Q', 'Q');
  if (type === 'yearly') return `FY ${value}`;
  return value;
}

function SummaryCard({ label, value, color = '', sub, icon: IconComp }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {IconComp && <IconComp className={`w-5 h-5 opacity-25 ${color}`} />}
      </div>
    </Card>
  );
}

export default function BKPeriodReconciliation({ session, transactions }) {
  const [periodType, setPeriodType] = useState('monthly');
  const [periodValue, setPeriodValue] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const options = useMemo(() => buildPeriodOptions(transactions), [transactions]);

  // Auto-select latest period when type changes
  const handleTypeChange = (type) => {
    setPeriodType(type);
    setPeriodValue('');
    setResult(null);
    setError(null);
    if (type === 'monthly' && options.months[0]) setPeriodValue(options.months[0]);
    if (type === 'quarterly' && options.quarters[0]) setPeriodValue(options.quarters[0]);
    if (type === 'yearly' && options.years[0]) setPeriodValue(options.years[0]);
  };

  const handleRun = async () => {
    if (periodType !== 'custom' && !periodValue) return;
    if (periodType === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('bookKeeperProcess', {
        mode: 'reconcile_period',
        session_id: session.id,
        period_type: periodType,
        period_value: periodType !== 'custom' ? periodValue : null,
        date_from: periodType === 'custom' ? customFrom : null,
        date_to: periodType === 'custom' ? customTo : null,
      });
      if (res.data?.success) setResult(res.data);
      else setError(res.data?.error || 'Reconciliation failed');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleExport = () => {
    if (!result) return;
    const rows = [
      ['Period Reconciliation Report'],
      ['Session', session.session_name],
      ['Company', session.company_name || ''],
      ['Period Type', PERIOD_LABELS[result.period_type]],
      ['Period', fmtPeriodLabel(result.period_type, result.period_value)],
      ['Date From', result.date_from || ''],
      ['Date To', result.date_to || ''],
      ['Generated', new Date().toLocaleString('en-CA')],
      [],
      ['SUMMARY'],
      ['Total Transactions', result.transaction_count],
      ['Total Credits (IN)', result.total_credits?.toFixed(2)],
      ['Total Debits (OUT)', result.total_debits?.toFixed(2)],
      ['Net Activity', result.net_activity?.toFixed(2)],
      ['Matched', result.matched_count],
      ['Flagged for Review', result.review_count],
      ['Duplicates', result.duplicate_count],
      ['Uncategorized', result.uncategorized_count],
      ['Reconciliation %', `${result.reconciliation_pct}%`],
      [],
      ['ACCOUNT BREAKDOWN', '', '', ''],
      ['Account', 'Category', 'Debits', 'Credits', 'Count'],
      ...(result.account_breakdown || []).map(a => [a.account_name, a.category, a.debit_total?.toFixed(2), a.credit_total?.toFixed(2), a.count]),
      [],
      ['CATEGORY BREAKDOWN', '', '', ''],
      ['Category', 'Debits', 'Credits', 'Count'],
      ...(result.category_breakdown || []).map(c => [c.category, c.debit_total?.toFixed(2), c.credit_total?.toFixed(2), c.count]),
      [],
      ['MONTHLY BREAKDOWN', '', '', ''],
      ['Month', 'Credits', 'Debits', 'Net', 'Transactions'],
      ...(result.monthly_breakdown || []).map(m => [m.month, m.credit_total?.toFixed(2), m.debit_total?.toFixed(2), m.net?.toFixed(2), m.count]),
      [],
      ['TRANSACTIONS'],
      ['Date', 'Description', 'Vendor', 'Reference', 'Debit', 'Credit', 'Category', 'Source File', 'Needs Review'],
      ...(result.transactions || []).map(t => [
        t.transaction_date || '', t.description || '', t.vendor_or_customer || '',
        t.reference_number || '', t.debit_amount || '', t.credit_amount || '',
        t.category || '', t.source_file || '', t.needs_review ? 'Yes' : 'No',
      ]),
    ];
    downloadCSV(rows, `Reconciliation_${session.session_name}_${result.period_value || 'custom'}.csv`);
  };

  const net = result?.net_activity ?? 0;
  const periodLabel = periodType === 'custom' ? `${customFrom} → ${customTo}` : fmtPeriodLabel(periodType, periodValue);

  return (
    <div className="space-y-5">
      {/* Period Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Reconciliation Period</h3>
        </div>

        {/* Period type tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleTypeChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${periodType === key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          {periodType === 'monthly' && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Select Month</p>
              <Select value={periodValue} onValueChange={setPeriodValue}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select month…" /></SelectTrigger>
                <SelectContent>
                  {options.months.map(m => (
                    <SelectItem key={m} value={m} className="text-xs">{fmtPeriodLabel('monthly', m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {periodType === 'quarterly' && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Select Quarter</p>
              <Select value={periodValue} onValueChange={setPeriodValue}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select quarter…" /></SelectTrigger>
                <SelectContent>
                  {options.quarters.map(q => (
                    <SelectItem key={q} value={q} className="text-xs">{q.replace('-', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {periodType === 'yearly' && (
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Select Year</p>
              <Select value={periodValue} onValueChange={setPeriodValue}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select year…" /></SelectTrigger>
                <SelectContent>
                  {options.years.map(y => (
                    <SelectItem key={y} value={y} className="text-xs">FY {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {periodType === 'custom' && (
            <>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">From Date</p>
                <Input type="date" className="h-9 text-xs" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">To Date</p>
                <Input type="date" className="h-9 text-xs" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <Button onClick={handleRun} disabled={loading || (periodType !== 'custom' && !periodValue) || (periodType === 'custom' && (!customFrom || !customTo))} className="h-9 gap-2 flex-shrink-0">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</> : <><Scale className="w-4 h-4" /> Reconcile</>}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold text-base">{PERIOD_LABELS[result.period_type]} Reconciliation</h3>
                <p className="text-xs text-muted-foreground">{periodLabel} · {result.transaction_count} transactions · {result.date_from} → {result.date_to}</p>
              </div>
              <Badge className={result.status === 'reconciled' ? 'bg-green-100 text-green-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                {result.status === 'reconciled' ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                {result.status === 'reconciled' ? 'Reconciled' : 'Needs Attention'}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>

          {/* Reconciliation progress */}
          <div className="bg-muted/20 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Reconciliation Completeness</span>
              <span className={`font-bold ${result.reconciliation_pct >= 90 ? 'text-green-600' : result.reconciliation_pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{result.reconciliation_pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${result.reconciliation_pct >= 90 ? 'bg-green-500' : result.reconciliation_pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${result.reconciliation_pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="text-green-600">✓ {result.matched_count} matched</span>
              {result.review_count > 0 && <span className="text-amber-600">⚠ {result.review_count} flagged</span>}
              {result.duplicate_count > 0 && <span className="text-red-600">⊕ {result.duplicate_count} duplicates</span>}
              {result.uncategorized_count > 0 && <span className="text-orange-600">◯ {result.uncategorized_count} uncategorized</span>}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Total Money IN (Credits)" value={fmt(result.total_credits)} color="text-green-600" icon={TrendingUp} sub={`${result.transaction_count} transactions`} />
            <SummaryCard label="Total Money OUT (Debits)" value={fmt(result.total_debits)} color="text-red-600" icon={TrendingDown} />
            <SummaryCard label="Net Activity" value={`${net >= 0 ? '+' : ''}${fmt(net)}`} color={net >= 0 ? 'text-green-600' : 'text-red-600'} icon={BarChart2} sub="Credits − Debits" />
            <SummaryCard label="Flagged / Duplicates" value={`${result.review_count} / ${result.duplicate_count}`} color={result.review_count + result.duplicate_count > 0 ? 'text-amber-600' : 'text-green-600'} icon={AlertTriangle} sub={`${result.reconciliation_pct}% reconciled`} />
          </div>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="space-y-1.5">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {/* Monthly chart (shown for quarterly/yearly views) */}
          {result.monthly_breakdown?.length > 1 && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Month-by-Month Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={result.monthly_breakdown}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => { const [y,m] = v.split('-'); return `${MONTH_NAMES[parseInt(m)]} ${y.slice(2)}`; }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} labelFormatter={l => fmtPeriodLabel('monthly', l)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="credit_total" name="Credits (IN)" fill="#22c55e" radius={[2,2,0,0]} />
                  <Bar dataKey="debit_total" name="Debits (OUT)" fill="#ef4444" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Account & Category Breakdowns side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Account breakdown */}
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">Account Breakdown</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {(result.account_breakdown || []).map((a, i) => {
                  const total = a.debit_total + a.credit_total;
                  const maxTotal = Math.max(...(result.account_breakdown || []).map(x => x.debit_total + x.credit_total), 1);
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate max-w-[160px]">{a.account_name}</span>
                        <div className="flex gap-3 font-mono flex-shrink-0">
                          {a.credit_total > 0 && <span className="text-green-600">+{fmt(a.credit_total)}</span>}
                          {a.debit_total > 0 && <span className="text-red-600">-{fmt(a.debit_total)}</span>}
                          <span className="text-muted-foreground text-[10px]">({a.count})</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div className="h-1 rounded-full bg-primary/40" style={{ width: `${(total / maxTotal) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Category breakdown */}
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">Category Breakdown</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {(result.category_breakdown || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <span className="capitalize text-muted-foreground truncate max-w-[160px]">{c.category.replace(/_/g,' ')}</span>
                    <div className="flex gap-3 font-mono flex-shrink-0 text-right">
                      {c.credit_total > 0 && <span className="text-green-600">{fmt(c.credit_total)}</span>}
                      {c.debit_total > 0 && <span className="text-red-600">{fmt(c.debit_total)}</span>}
                      <span className="text-muted-foreground text-[10px] w-6 text-right">{c.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* File breakdown */}
          {result.file_breakdown?.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">Per-File Breakdown</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>{['Source File','Transactions','Credits (IN)','Debits (OUT)','Net','Review Items'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {result.file_breakdown.map((f, i) => {
                      const fn = f.credit_total - f.debit_total;
                      return (
                        <tr key={i} className="border-t hover:bg-muted/10">
                          <td className="px-3 py-2 font-medium truncate max-w-[200px]">{f.file_name}</td>
                          <td className="px-3 py-2 font-mono">{f.count}</td>
                          <td className="px-3 py-2 font-mono text-green-600">{fmt(f.credit_total)}</td>
                          <td className="px-3 py-2 font-mono text-red-600">{fmt(f.debit_total)}</td>
                          <td className={`px-3 py-2 font-mono font-bold ${fn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fn >= 0 ? '+' : ''}{fmt(fn)}</td>
                          <td className="px-3 py-2">
                            {f.review_count > 0
                              ? <span className="text-amber-600 font-semibold">⚠ {f.review_count}</span>
                              : <span className="text-green-600">✓</span>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t bg-muted/20 font-bold">
                      <td className="px-3 py-2 text-xs">TOTAL</td>
                      <td className="px-3 py-2 font-mono text-xs">{result.transaction_count}</td>
                      <td className="px-3 py-2 font-mono text-xs text-green-600">{fmt(result.total_credits)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-red-600">{fmt(result.total_debits)}</td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</td>
                      <td className="px-3 py-2 text-xs text-amber-600">{result.review_count > 0 ? `⚠ ${result.review_count}` : '✓'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Monthly breakdown table */}
          {result.monthly_breakdown?.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-3">Monthly Summary</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>{['Month','Transactions','Credits (IN)','Debits (OUT)','Net Activity'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {result.monthly_breakdown.map((m, i) => (
                      <tr key={i} className="border-t hover:bg-muted/10">
                        <td className="px-3 py-2 font-medium">{fmtPeriodLabel('monthly', m.month)}</td>
                        <td className="px-3 py-2 font-mono">{m.count}</td>
                        <td className="px-3 py-2 font-mono text-green-600">{fmt(m.credit_total)}</td>
                        <td className="px-3 py-2 font-mono text-red-600">{fmt(m.debit_total)}</td>
                        <td className={`px-3 py-2 font-mono font-bold ${m.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.net >= 0 ? '+' : ''}{fmt(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="w-14 h-14 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-semibold">Select a period and click Reconcile</p>
          <p className="text-xs mt-1">Choose Monthly, Quarterly, Yearly or a Custom date range to run a detailed reconciliation</p>
        </div>
      )}
    </div>
  );
}
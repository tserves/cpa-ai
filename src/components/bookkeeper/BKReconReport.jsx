import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  reconciled:         { label: 'Reconciled',        color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  not_reconciled:     { label: 'Not Reconciled',    color: 'bg-red-100 text-red-700',      icon: XCircle },
  missing_balances:   { label: 'Missing Balances',  color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
};

const fmt = n => n != null ? `$${n.toFixed(2)}` : '—';

function ReconCard({ recon }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[recon.status] || STATUS_CONFIG.not_reconciled;
  const Icon = sc.icon;
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-semibold text-sm truncate max-w-[200px]">{recon.file_name}</span>
          <Badge className={`${sc.color} border-0 text-[10px] flex items-center gap-0.5`}><Icon className="w-2.5 h-2.5" /> {sc.label}</Badge>
          {recon.confidence_score > 0 && <span className="text-[10px] text-blue-600">{recon.confidence_score}%</span>}
        </div>
        <div className="flex gap-3 text-xs flex-shrink-0">
          <span className="text-green-600 font-mono">{fmt(recon.total_credits)}</span>
          <span className="text-red-600 font-mono">{fmt(recon.total_debits)}</span>
          {recon.difference != null && <span className={`font-bold font-mono ${recon.difference < 0.02 ? 'text-green-600' : 'text-red-600'}`}>Δ {fmt(recon.difference)}</span>}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Period', val: recon.period_start ? `${recon.period_start} → ${recon.period_end || '?'}` : '—' },
              { label: 'Opening Balance', val: fmt(recon.opening_balance) },
              { label: 'Closing Balance', val: fmt(recon.closing_balance) },
              { label: 'Calculated Closing', val: fmt(recon.calculated_closing) },
              { label: 'Total Credits', val: fmt(recon.total_credits), color: 'text-green-600' },
              { label: 'Total Debits', val: fmt(recon.total_debits), color: 'text-red-600' },
              { label: 'Transactions', val: recon.transaction_count },
              { label: 'Duplicates', val: recon.duplicate_count || 0, color: recon.duplicate_count > 0 ? 'text-amber-600' : '' },
            ].map(s => <div key={s.label}><p className="text-[10px] text-muted-foreground">{s.label}</p><p className={`text-xs font-semibold font-mono ${s.color || ''}`}>{s.val}</p></div>)}
          </div>
          {recon.warnings?.length > 0 && (
            <div className="space-y-1">
              {recon.warnings.map((w, i) => <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{w}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BKReconReport({ reconciliations }) {
  if (!reconciliations?.length) return null;
  const reconciled = reconciliations.filter(r => r.status === 'reconciled').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Files</p><p className="text-lg font-bold">{reconciliations.length}</p></Card>
        <Card className="p-3 text-center bg-green-50 border-green-200"><p className="text-[10px] text-muted-foreground">Reconciled</p><p className="text-lg font-bold text-green-600">{reconciled}</p></Card>
        <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Issues</p><p className="text-lg font-bold text-amber-600">{reconciliations.length - reconciled}</p></Card>
      </div>
      <div className="space-y-2">{reconciliations.map((r, i) => <ReconCard key={i} recon={r} />)}</div>
    </div>
  );
}
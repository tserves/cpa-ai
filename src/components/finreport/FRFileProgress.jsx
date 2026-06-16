import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, Clock, FileText } from 'lucide-react';

const STATUS_MAP = {
  pending:    { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  processing: { icon: RefreshCw, color: 'text-blue-600', label: 'Extracting…', spin: true },
  done:       { icon: CheckCircle2, color: 'text-green-600', label: 'Done' },
  failed:     { icon: XCircle, color: 'text-red-600', label: 'Failed' },
};

export default function FRFileProgress({ fileProgress }) {
  if (!fileProgress?.length) return null;
  const done = fileProgress.filter(f => f.status === 'done').length;
  const pct = Math.round((done / fileProgress.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">Extracting {fileProgress.length} file{fileProgress.length !== 1 ? 's' : ''}…</span>
        <span className="text-muted-foreground">{done}/{fileProgress.length} complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {fileProgress.map((f, i) => {
          const sc = STATUS_MAP[f.status] || STATUS_MAP.pending;
          const Icon = sc.icon;
          return (
            <div key={i} className="flex items-center gap-2.5">
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${sc.color} ${sc.spin ? 'animate-spin' : ''}`} />
              <span className="text-xs truncate flex-1">{f.name}</span>
              <span className={`text-[10px] flex-shrink-0 ${sc.color}`}>{sc.label}</span>
              {f.tx_count > 0 && <span className="text-[10px] text-muted-foreground flex-shrink-0">{f.tx_count} txns</span>}
              {f.confidence > 0 && <span className="text-[10px] text-blue-600 flex-shrink-0">{f.confidence}%</span>}
              {f.error && <span className="text-[10px] text-red-600 truncate max-w-[120px]">{f.error}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
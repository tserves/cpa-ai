import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Clock, FileText, FileSpreadsheet, Image, File } from 'lucide-react';

const FILE_ICONS = {
  excel: <FileSpreadsheet className="w-4 h-4 text-green-600" />,
  csv: <FileText className="w-4 h-4 text-blue-600" />,
  pdf: <FileText className="w-4 h-4 text-red-600" />,
  image: <Image className="w-4 h-4 text-purple-600" />,
  document: <File className="w-4 h-4 text-muted-foreground" />,
};

const STATUS = {
  pending:    { icon: <Clock className="w-3.5 h-3.5 text-muted-foreground" />, label: 'Queued', color: 'text-muted-foreground' },
  processing: { icon: <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />, label: 'Extracting…', color: 'text-blue-600' },
  done:       { icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />, label: 'Done', color: 'text-green-600' },
  failed:     { icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />, label: 'Failed', color: 'text-red-600' },
};

export default function ARFileProgress({ fileProgress }) {
  if (!fileProgress?.length) return null;
  const done = fileProgress.filter(f => f.status === 'done').length;
  const total = fileProgress.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Extracting {total} file{total !== 1 ? 's' : ''}…</span>
        <span className="font-semibold">{done}/{total} complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div className="h-1.5 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {fileProgress.map((file, i) => {
          const sc = STATUS[file.status] || STATUS.pending;
          const fileIcon = FILE_ICONS[file.file_type] || FILE_ICONS.document;
          return (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
              {fileIcon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {file.status === 'done' && file.tx_count != null && <span className="text-[10px] text-muted-foreground">{file.tx_count} transactions</span>}
                  {file.status === 'done' && file.confidence != null && <span className="text-[10px] text-blue-600">{file.confidence}% confidence</span>}
                  {file.error && <span className="text-[10px] text-red-600 truncate">{file.error}</span>}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-medium flex-shrink-0 ${sc.color}`}>
                {sc.icon}<span className="hidden sm:inline">{sc.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
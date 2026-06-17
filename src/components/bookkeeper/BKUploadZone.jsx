import React, { useState, useRef } from 'react';
import { Upload, X, FileText, FileSpreadsheet, File } from 'lucide-react';

const ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.webp', '.xlsx', '.xls', '.csv', '.ofx', '.qbo', '.qfx'];

function getIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['xlsx','xls','csv'].includes(ext)) return FileSpreadsheet;
  if (['pdf'].includes(ext)) return FileText;
  return File;
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function BKUploadZone({ files, onFilesChange, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const addFiles = newFiles => {
    const arr = Array.from(newFiles);
    const unique = arr.filter(f => !files.some(e => e.name === f.name && e.size === f.size));
    onFilesChange([...files, ...unique]);
  };

  const onDrop = e => { e.preventDefault(); setDragging(false); if (!disabled) addFiles(e.dataTransfer.files); };
  const removeFile = i => onFilesChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-semibold text-sm">Drop financial documents here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Excel, CSV, OFX, QBO, Images — multiple files supported</p>
        <p className="text-[10px] text-muted-foreground mt-1">Bank statements · Credit cards · Invoices · Receipts · Payroll · Tax reports</p>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED.join(',')} className="hidden" onChange={e => addFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {files.map((f, i) => {
            const Icon = getIcon(f.name);
            return (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3 py-2">
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs flex-1 truncate font-medium">{f.name}</span>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtSize(f.size)}</span>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
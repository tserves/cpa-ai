import React, { useRef, useState } from 'react';
import { Upload, X, FileText, FileSpreadsheet, Image } from 'lucide-react';

const EXT_ICONS = { pdf: FileText, xlsx: FileSpreadsheet, xls: FileSpreadsheet, csv: FileText, ofx: FileText, qbo: FileText, png: Image, jpg: Image, jpeg: Image, tiff: Image, webp: Image };
const getExt = f => f.name.split('.').pop().toLowerCase();
const fmtSize = b => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

export default function FRUploadZone({ files, onFilesChange, disabled }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const add = (newFiles) => {
    const arr = Array.from(newFiles);
    const names = new Set(files.map(f => f.name));
    onFilesChange([...files, ...arr.filter(f => !names.has(f.name))]);
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-semibold">Drop files here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Scanned PDF, Excel, CSV, OFX, QBO, Images</p>
        <input ref={inputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.ofx,.qbo,.qfx,.png,.jpg,.jpeg,.tiff,.webp" className="hidden" onChange={e => add(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => {
            const ext = getExt(f);
            const Icon = EXT_ICONS[ext] || FileText;
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate font-medium">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtSize(f.size)}</span>
                </div>
                {!disabled && (
                  <button onClick={e => { e.stopPropagation(); onFilesChange(files.filter((_, j) => j !== i)); }} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
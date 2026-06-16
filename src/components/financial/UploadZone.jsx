import React, { useRef, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_TYPES = {
  xlsx: { icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />, label: 'Excel', color: 'text-green-600' },
  xls:  { icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />, label: 'Excel', color: 'text-green-600' },
  csv:  { icon: <FileText className="w-4 h-4 text-blue-600" />, label: 'CSV', color: 'text-blue-600' },
  pdf:  { icon: <FileText className="w-4 h-4 text-red-600" />, label: 'PDF', color: 'text-red-600' },
  png:  { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image', color: 'text-purple-600' },
  jpg:  { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image', color: 'text-purple-600' },
  jpeg: { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image', color: 'text-purple-600' },
};

const getExt = (name) => (name || '').split('.').pop().toLowerCase();
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function UploadZone({ files, onFilesChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming) => {
    const newFiles = Array.from(incoming).filter(f => !files.some(ex => ex.name === f.name && ex.size === f.size));
    onFilesChange([...files, ...newFiles]);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden" multiple
          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <div className="flex flex-col items-center gap-2">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-colors", dragging ? "bg-primary/20" : "bg-primary/10")}>
            <Upload className={cn("w-5 h-5 transition-colors", dragging ? "text-primary" : "text-primary/70")} />
          </div>
          <div>
            <p className="font-semibold text-sm">{dragging ? 'Drop files here' : 'Drag & drop files here'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {['Excel', 'CSV', 'PDF', 'Bank Statements', 'Invoices', 'Scanned PDFs'].map(f => (
              <span key={f} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border bg-card divide-y max-h-48 overflow-y-auto">
          {files.map((file, idx) => {
            const ext = getExt(file.name);
            const ft = FILE_TYPES[ext] || { icon: <FileText className="w-4 h-4 text-muted-foreground" />, label: ext.toUpperCase() };
            return (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                {ft.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ft.label} · {formatSize(file.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onFilesChange(files.filter((_, i) => i !== idx)); }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
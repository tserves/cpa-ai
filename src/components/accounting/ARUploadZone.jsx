import React, { useRef, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILE_TYPES = {
  xlsx: { icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />, label: 'Excel' },
  xls:  { icon: <FileSpreadsheet className="w-4 h-4 text-green-600" />, label: 'Excel' },
  csv:  { icon: <FileText className="w-4 h-4 text-blue-600" />, label: 'CSV' },
  pdf:  { icon: <FileText className="w-4 h-4 text-red-600" />, label: 'PDF' },
  png:  { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image' },
  jpg:  { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image' },
  jpeg: { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'Image' },
  tiff: { icon: <Image className="w-4 h-4 text-purple-600" />, label: 'TIFF' },
};

const getExt = (name) => (name || '').split('.').pop().toLowerCase();
const formatSize = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

export default function ARUploadZone({ files, onFilesChange }) {
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
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/20"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden" multiple
          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.tiff"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-colors", dragging ? "bg-primary/20" : "bg-primary/10")}>
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{dragging ? 'Drop files here' : 'Drag & drop financial documents'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse your files</p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {['Excel', 'CSV', 'PDF', 'Scanned PDF', 'Bank Statements', 'Invoices', 'GL Exports', 'Trial Balance', 'Images'].map(f => (
              <span key={f} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border bg-card divide-y max-h-52 overflow-y-auto">
          {files.map((file, idx) => {
            const ext = getExt(file.name);
            const ft = FILE_TYPES[ext] || { icon: <File className="w-4 h-4 text-muted-foreground" />, label: ext.toUpperCase() };
            return (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                {ft.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ft.label} · {formatSize(file.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onFilesChange(files.filter((_, i) => i !== idx)); }}
                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors">
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
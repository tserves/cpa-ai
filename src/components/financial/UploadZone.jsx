import React, { useRef, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const getFileIcon = (name) => {
  if (name.match(/\.(xlsx|xls)$/i)) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  if (name.match(/\.csv$/i)) return <FileText className="w-4 h-4 text-blue-600" />;
  if (name.match(/\.pdf$/i)) return <FileText className="w-4 h-4 text-red-600" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
};

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

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRemove = (idx) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Drag & drop accounting files here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {['Excel .xlsx/.xls', 'CSV', 'PDF', 'Bank Statements', 'Invoice Exports'].map(f => (
              <span key={f} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border bg-card divide-y max-h-52 overflow-y-auto">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
              {getFileIcon(file.name)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => handleRemove(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
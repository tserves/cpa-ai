import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  BarChart2, Upload, FileText, CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Trash2, Eye, Download, Plus, History, ArrowLeft,
  Shield, Search, TrendingUp, BookOpen, Zap, XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import UploadZone from '@/components/financial/UploadZone';
import FileProgressPanel from '@/components/financial/FileProgressPanel';
import ValidationPanel from '@/components/financial/ValidationPanel';
import ExceptionReviewTable from '@/components/financial/ExceptionReviewTable';
import GLReportView from '@/components/financial/GLReportView';
import PLReportView from '@/components/financial/PLReportView';

const STATUS_CONFIG = {
  uploading:   { label: 'Uploading',    color: 'bg-blue-100 text-blue-700',     icon: Upload },
  extracting:  { label: 'Extracting',   color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  review:      { label: 'Needs Review', color: 'bg-amber-100 text-amber-700',   icon: AlertTriangle },
  generating:  { label: 'Generating',   color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:   { label: 'Completed',    color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  failed:      { label: 'Failed',       color: 'bg-red-100 text-red-700',       icon: XCircle },
};

// ─── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onOpen, onDelete }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;
  const fileCount = (() => { try { return JSON.parse(session.file_names || '[]').length; } catch { return 0; } })();
  const isProcessing = session.status === 'extracting' || session.status === 'uploading' || session.status === 'generating';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{session.session_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              {session.transaction_count > 0 && <span className="text-xs text-muted-foreground">{session.transaction_count} txns</span>}
              {session.auto_approved_count > 0 && <span className="text-xs text-green-600">✓ {session.auto_approved_count} auto-approved</span>}
              {session.review_count > 0 && <span className="text-xs text-amber-600 font-medium">⚠ {session.review_count} exceptions</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{fileCount} file{fileCount !== 1 ? 's' : ''} · {session.uploaded_by} · {session.upload_date ? new Date(session.upload_date).toLocaleDateString('en-CA') : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => onOpen(session)}>
            <Eye className="w-3.5 h-3.5" /> Open
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(session.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {session.total_debits > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
          <div><p className="text-[10px] text-muted-foreground">Debits</p><p className="text-xs font-mono font-bold text-red-600">${(session.total_debits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Credits</p><p className="text-xs font-mono font-bold text-green-600">${(session.total_credits || 0).toFixed(2)}</p></div>
          <div>
            <p className="text-[10px] text-muted-foreground">Difference</p>
            <p className={`text-xs font-mono font-bold ${Math.abs((session.total_debits || 0) - (session.total_credits || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs((session.total_debits || 0) - (session.total_credits || 0)).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── New Session Dialog ───────────────────────────────────────────────────────
function NewSessionDialog({ open, onOpenChange, onCreated }) {
  const [sessionName, setSessionName] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleStart = async () => {
    if (!sessionName.trim() || !files.length) return;
    setUploading(true);
    setUploadProgress(0);
    const user = await base44.auth.me();
    const fileNames = files.map(f => f.name);
    const fileUrls = [];

    for (let i = 0; i < files.length; i++) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
      fileUrls.push(file_url);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    const record = await base44.entities.FinancialReport.create({
      session_name: sessionName.trim(),
      uploaded_by: user.email || user.full_name,
      file_names: JSON.stringify(fileNames),
      file_urls: JSON.stringify(fileUrls),
      upload_date: new Date().toISOString(),
      status: 'extracting',
    });

    setUploading(false);
    onOpenChange(false);
    setSessionName('');
    setFiles([]);
    setUploadProgress(0);
    toast({ title: '🚀 Extraction started', description: `Processing ${files.length} file${files.length !== 1 ? 's' : ''} in the background…` });
    onCreated(record);
  };

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> New Financial Report Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div>
            <Label>Session Name *</Label>
            <Input className="mt-1" placeholder="e.g. Q1 2024 Bank Reconciliation" value={sessionName} onChange={e => setSessionName(e.target.value)} disabled={uploading} />
          </div>
          <div>
            <Label>Upload Documents *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Excel, CSV, PDF, scanned documents, bank/credit card statements</p>
            <UploadZone files={files} onFilesChange={setFiles} />
          </div>
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uploading files…</span>
                <span className="font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleStart} disabled={!sessionName.trim() || !files.length || uploading}>
            {uploading
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading {uploadProgress}%…</>
              : <><Zap className="w-4 h-4 mr-2" /> Upload & Extract</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session Detail ───────────────────────────────────────────────────────────
function SessionDetail({ session: initialSession, onBack, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Live polling while extracting/generating
  const { data: liveSession } = useQuery({
    queryKey: ['financial-report-detail', initialSession.id],
    queryFn: async () => {
      const rows = await base44.entities.FinancialReport.filter({ id: initialSession.id });
      return rows[0] || initialSession;
    },
    refetchInterval: (query) => {
      const s = query.state.data?.status || initialSession.status;
      return (s === 'extracting' || s === 'generating') ? 2500 : false;
    },
    initialData: initialSession,
  });

  const session = liveSession || initialSession;
  const fileProgress = (() => { try { return JSON.parse(session.file_progress || '[]'); } catch { return []; } })();
  const fileMetadata = (() => { try { return JSON.parse(session.file_metadata || '[]'); } catch { return []; } })();
  const validationIssues = (() => { try { return JSON.parse(session.validation_issues || '[]'); } catch { return []; } })();
  const glReport = (() => { try { return session.gl_report ? JSON.parse(session.gl_report) : null; } catch { return null; } })();
  const plReport = (() => { try { return session.pl_report ? JSON.parse(session.pl_report) : null; } catch { return null; } })();
  const fileNames = (() => { try { return JSON.parse(session.file_names || '[]'); } catch { return []; } })();

  const [transactions, setTransactions] = useState(() => {
    try { return JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (session.status !== 'extracting') {
      try {
        const parsed = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]');
        if (parsed.length > 0) setTransactions(parsed);
      } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const autoApproved = transactions.filter(t => !t.needs_review).length;
  const mappedCount = transactions.filter(t => !t.needs_review && t.category !== 'unclassified').length;
  const isProcessing = session.status === 'extracting' || session.status === 'generating';

  const handleUpdateTransaction = (idx, updated) => {
    setTransactions(prev => { const next = [...prev]; next[idx] = updated; return next; });
  };

  const handleSaveReview = async () => {
    setSaving(true);
    const newReviewCount = transactions.filter(t => t.needs_review).length;
    await base44.entities.FinancialReport.update(session.id, {
      transactions_reviewed: JSON.stringify(transactions),
      review_count: newReviewCount,
      mapped_count: transactions.filter(t => !t.needs_review && t.category !== 'unclassified').length,
      auto_approved_count: transactions.filter(t => !t.needs_review).length,
      status: newReviewCount === 0 ? 'completed' : 'review',
    });
    setSaving(false);
    onRefresh();
    toast({ title: '✅ Review saved' });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await base44.entities.FinancialReport.update(session.id, { status: 'generating' });
    const res = await base44.functions.invoke('processFinancialDocument', {
      mode: 'generate_reports',
      report_id: session.id,
      date_from: dateFrom || null,
      date_to: dateTo || null,
    });
    setGenerating(false);
    onRefresh();
    if (res.data?.success) {
      toast({ title: '✅ GL & P&L Reports generated' });
      setActiveTab('gl');
      queryClient.invalidateQueries({ queryKey: ['financial-report-detail', session.id] });
    } else {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  };

  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = (type) => {
    if (type === 'gl' && glReport) {
      const rows = [['Date', 'Account', 'Code', 'Category', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Source']];
      for (const acct of (glReport.accounts || [])) {
        for (const tx of acct.transactions) {
          rows.push([tx.transaction_date || '', acct.account_name, acct.account_code || '', acct.category, tx.description || '', tx.reference_number || '', tx.debit_amount || 0, tx.credit_amount || 0, tx.running_balance?.toFixed(2) || '', tx.source_file || '']);
        }
      }
      downloadCSV(rows, `GL_${session.session_name}.csv`);
    } else if (type === 'pl' && plReport) {
      const rows = [['Section', 'Account', 'Amount']];
      (plReport.revenue_lines || []).forEach(l => rows.push(['Revenue', l.account, l.amount]));
      (plReport.cogs_lines || []).forEach(l => rows.push(['COGS', l.account, l.amount]));
      rows.push(['Gross Profit', '', plReport.gross_profit]);
      (plReport.operating_expense_lines || []).forEach(l => rows.push(['Operating Expenses', l.account, l.amount]));
      rows.push(['Net Operating Income', '', plReport.net_operating_income]);
      rows.push(['Net Profit / Loss', '', plReport.net_profit]);
      downloadCSV(rows, `PL_${session.session_name}.csv`);
    } else if (type === 'transactions') {
      const rows = [['Date', 'Description', 'Vendor', 'Reference', 'Debit', 'Credit', 'Category', 'Account', 'Confidence', 'Source', 'Page']];
      transactions.forEach(tx => rows.push([tx.transaction_date || '', tx.description || '', tx.vendor_or_customer || '', tx.reference_number || '', tx.debit_amount || '', tx.credit_amount || '', tx.category || '', tx.account_name || '', tx.confidence || '', tx.source_file || '', tx.source_page || '']));
      downloadCSV(rows, `Transactions_${session.session_name}.csv`);
    }
    toast({ title: `${type.toUpperCase()} exported` });
  };

  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-display font-bold">{session.session_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{fileNames.length} file{fileNames.length !== 1 ? 's' : ''} · {session.uploaded_by}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {transactions.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('transactions')}><Download className="w-3.5 h-3.5" /> Transactions CSV</Button>}
          {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
          {plReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('pl')}><Download className="w-3.5 h-3.5" /> P&L CSV</Button>}
        </div>
      </div>

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Files', value: fileNames.length, color: 'text-foreground', icon: FileText },
          { label: 'Transactions', value: session.transaction_count || transactions.length, color: 'text-foreground', icon: BookOpen },
          { label: 'Auto-Approved', value: autoApproved, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Exceptions', value: reviewCount, color: reviewCount > 0 ? 'text-amber-600' : 'text-green-600', icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color} opacity-50`} />
            </div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* File extraction progress (while running) */}
      {isProcessing && fileProgress.length > 0 && (
        <Card className="p-4">
          <FileProgressPanel fileProgress={fileProgress} />
        </Card>
      )}

      {/* Validation Panel */}
      {!isProcessing && transactions.length > 0 && (
        <ValidationPanel
          issues={validationIssues}
          txTotal={transactions.length}
          autoApproved={autoApproved}
          reviewCount={reviewCount}
          totalDebits={session.total_debits}
          totalCredits={session.total_credits}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          {reviewCount > 0 && (
            <TabsTrigger value="exceptions" className="text-xs gap-1">
              Exceptions <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewCount}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="all_transactions" className="text-xs">All Transactions</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs">Generate Reports</TabsTrigger>
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {isProcessing ? (
            <Card className="p-6">
              <FileProgressPanel fileProgress={fileProgress} />
              <div className="flex justify-center mt-4">
                <p className="text-xs text-muted-foreground">AI is extracting data from your documents. You can navigate away and come back — extraction runs in the background.</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Debit/Credit */}
              {session.total_debits > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(session.total_debits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(session.total_credits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Difference</p>
                    <p className={`text-base font-bold font-mono ${Math.abs((session.total_debits || 0) - (session.total_credits || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs((session.total_debits || 0) - (session.total_credits || 0)).toFixed(2)}
                    </p>
                  </Card>
                </div>
              )}

              {/* Per-file metadata */}
              {fileMetadata.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Document Details</h3>
                  <div className="space-y-3">
                    {fileMetadata.map((fm, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 ${fm.error ? 'border-red-200 bg-red-50' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium truncate">{fm.file_name}</p>
                          <Badge className="text-[10px] border-0 bg-muted flex-shrink-0">{fm.statement_type || 'document'}</Badge>
                        </div>
                        {fm.error ? (
                          <p className="text-[10px] text-red-600 mt-1">{fm.error}</p>
                        ) : (
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {fm.period_start && <span className="text-[10px] text-muted-foreground">Period: {fm.period_start} → {fm.period_end || '?'}</span>}
                            {fm.opening_balance != null && <span className="text-[10px] text-muted-foreground">Open: ${fm.opening_balance?.toFixed(2)}</span>}
                            {fm.closing_balance != null && <span className="text-[10px] text-muted-foreground">Close: ${fm.closing_balance?.toFixed(2)}</span>}
                            <span className="text-[10px] text-muted-foreground">{fm.tx_count} transactions</span>
                          </div>
                        )}
                        {fm.document_summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{fm.document_summary}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* EXCEPTIONS */}
        <TabsContent value="exceptions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Edit fields inline, then approve. Clean transactions are already auto-approved.</p>
              <Button size="sm" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save & Approve
              </Button>
            </div>
            <ExceptionReviewTable transactions={transactions} onUpdate={handleUpdateTransaction} showOnlyReview />
          </div>
        </TabsContent>

        {/* ALL TRANSACTIONS */}
        <TabsContent value="all_transactions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{transactions.length} transactions · {autoApproved} auto-approved · {reviewCount} exceptions</p>
              <Button size="sm" variant="outline" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : null} Save Changes
              </Button>
            </div>
            <ExceptionReviewTable transactions={transactions} onUpdate={handleUpdateTransaction} />
          </div>
        </TabsContent>

        {/* GENERATE */}
        <TabsContent value="generate" className="mt-4">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Generate Reports</h3>
              <p className="text-xs text-muted-foreground mt-1">Optionally filter by date range. Leave blank to include all transactions.</p>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{reviewCount} exception{reviewCount !== 1 ? 's' : ''} still pending. Reports will use current data — resolve exceptions first for maximum accuracy.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            </div>
            <Button onClick={handleGenerate} disabled={generating || transactions.length === 0} className="w-full">
              {generating
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                : <><BarChart2 className="w-4 h-4 mr-2" /> Generate GL & P&L Reports</>}
            </Button>
            {transactions.length === 0 && <p className="text-xs text-muted-foreground text-center">No transactions — wait for extraction to complete.</p>}
          </Card>
        </TabsContent>

        {/* GL */}
        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3>
                <p className="text-xs text-muted-foreground">Generated {new Date(glReport.generated_at).toLocaleString('en-CA')}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <GLReportView report={glReport} />
          </TabsContent>
        )}

        {/* P&L */}
        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3>
                <p className="text-xs text-muted-foreground">Generated {new Date(plReport.generated_at).toLocaleString('en-CA')}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('pl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <PLReportView report={plReport} />
          </TabsContent>
        )}

        {/* AUDIT */}
        <TabsContent value="audit" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Audit Trail</h3>
            <div className="space-y-2">
              {[
                { label: 'Session Created', value: session.upload_date ? new Date(session.upload_date).toLocaleString('en-CA') : '—' },
                { label: 'Uploaded By', value: session.uploaded_by || '—' },
                { label: 'Files', value: fileNames.join(', ') || '—' },
                { label: 'Extraction Status', value: STATUS_CONFIG[session.status]?.label || session.status },
                { label: 'Transactions Extracted', value: session.transaction_count || transactions.length },
                { label: 'Auto-Approved', value: session.auto_approved_count || autoApproved },
                { label: 'Exceptions', value: session.review_count || reviewCount },
                { label: 'Successfully Mapped', value: session.mapped_count || mappedCount },
                { label: 'GL Generated', value: session.gl_generated_at ? new Date(session.gl_generated_at).toLocaleString('en-CA') : 'Not yet' },
                { label: 'P&L Generated', value: session.pl_generated_at ? new Date(session.pl_generated_at).toLocaleString('en-CA') : 'Not yet' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground font-medium w-48 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancialReportGenerator() {
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Realtime toast notifications when extraction finishes
  useEffect(() => {
    const unsubscribe = base44.entities.FinancialReport.subscribe((event) => {
      if (event.type === 'update') {
        const { data, old_data } = event;
        const wasProcessing = old_data?.status === 'extracting' || old_data?.status === 'generating';
        const isDone = data?.status === 'review' || data?.status === 'completed' || data?.status === 'failed';
        if (wasProcessing && isDone) {
          const name = data.session_name || 'Session';
          if (data.status === 'failed') {
            toast({ title: `❌ ${name} — processing failed`, variant: 'destructive' });
          } else {
            const exceptions = data.review_count || 0;
            toast({
              title: `✅ ${name} — extraction complete`,
              description: exceptions > 0
                ? `${data.transaction_count || 0} transactions extracted · ${exceptions} exceptions need review`
                : `${data.transaction_count || 0} transactions auto-approved — ready to generate reports`,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
        }
      }
    });
    return unsubscribe;
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['financial-reports'],
    queryFn: () => base44.entities.FinancialReport.list('-created_date'),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = Array.isArray(data) && data.some(s => s.status === 'extracting' || s.status === 'generating');
      return hasActive ? 4000 : false;
    },
  });

  const handleDelete = async (id) => {
    queryClient.setQueryData(['financial-reports'], (old) => (old || []).filter(s => s.id !== id));
    await base44.entities.FinancialReport.delete(id);
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    toast({ title: 'Session deleted' });
  };

  const handleCreated = (record) => {
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    setActiveSession(record);
  };

  const handleOpenSession = async (session) => {
    const fresh = await base44.entities.FinancialReport.filter({ id: session.id });
    setActiveSession(fresh[0] || session);
  };

  const handleRefresh = async () => {
    if (!activeSession) return;
    const fresh = await base44.entities.FinancialReport.filter({ id: activeSession.id });
    if (fresh && fresh.length) setActiveSession(fresh[0]);
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
  };

  const filtered = sessions.filter(s =>
    !search || s.session_name?.toLowerCase().includes(search.toLowerCase()) || s.uploaded_by?.toLowerCase().includes(search.toLowerCase())
  );

  if (activeSession) {
    return (
      <div className="space-y-6">
        <SessionDetail
          session={activeSession}
          onBack={() => { setActiveSession(null); queryClient.invalidateQueries({ queryKey: ['financial-reports'] }); }}
          onRefresh={handleRefresh}
        />
      </div>
    );
  }

  const totalTransactions = sessions.reduce((s, r) => s + (r.transaction_count || 0), 0);
  const totalAutoApproved = sessions.reduce((s, r) => s + (r.auto_approved_count || 0), 0);
  const totalReview = sessions.reduce((s, r) => s + (r.review_count || 0), 0);
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" /> Financial Report Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Upload documents → AI extracts data → Review exceptions → Generate GL & P&L</p>
        </div>
        <Button onClick={() => setNewSessionOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Report Session
        </Button>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'text-foreground' },
          { label: 'Transactions Extracted', value: totalTransactions, color: 'text-foreground' },
          { label: 'Auto-Approved', value: totalAutoApproved, color: 'text-green-600' },
          { label: 'Exceptions Pending', value: totalReview, color: totalReview > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-9 text-sm" placeholder="Search sessions…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Session List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No report sessions yet</p>
          <p className="text-xs mt-1 mb-4">Upload bank statements, invoices, or accounting exports to get started</p>
          <Button onClick={() => setNewSessionOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Report Session</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(s => (
            <SessionCard key={s.id} session={s} onOpen={handleOpenSession} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <NewSessionDialog open={newSessionOpen} onOpenChange={setNewSessionOpen} onCreated={handleCreated} />
    </div>
  );
}
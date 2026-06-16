import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BookOpen, BarChart2, Upload, FileText, CheckCircle2, AlertTriangle,
  RefreshCw, Trash2, Eye, Download, Plus, ArrowLeft, Search,
  TrendingUp, Zap, XCircle, Shield, History, Building2, Scale,
  Calendar, FileSearch, ListChecks, Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ARUploadZone from '@/components/accounting/ARUploadZone';
import ARFileProgress from '@/components/accounting/ARFileProgress';
import ARTransactionTable from '@/components/accounting/ARTransactionTable';
import ARGLReport from '@/components/accounting/ARGLReport';
import ARPLReport from '@/components/accounting/ARPLReport';
import ARTrialBalance from '@/components/accounting/ARTrialBalance';
import ARBankReconciliation from '@/components/accounting/ARBankReconciliation';
import ARReviewItems from '@/components/accounting/ARReviewItems';
import ARMonthlySummary from '@/components/accounting/ARMonthlySummary';

const STATUS_CONFIG = {
  uploading:  { label: 'Uploading',   color: 'bg-blue-100 text-blue-700',    icon: Upload },
  extracting: { label: 'Extracting',  color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  review:     { label: 'Ready',       color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  generating: { label: 'Generating',  color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:  { label: 'Completed',   color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Failed',      color: 'bg-red-100 text-red-700',      icon: XCircle },
};

const REPORT_OPTIONS = [
  { id: 'gl',             label: 'General Ledger',         icon: BookOpen,     desc: 'Transaction-level ledger by account with running balances' },
  { id: 'pl',             label: 'Profit & Loss',          icon: TrendingUp,   desc: 'Revenue, COGS, expenses and net income by period' },
  { id: 'monthly_summary',label: 'Monthly Summary',        icon: Calendar,     desc: 'Month-by-month credits, debits and net cash flow' },
  { id: 'review_items',   label: 'Review Items',           icon: ListChecks,   desc: 'Flagged transactions requiring manual classification' },
  { id: 'trial_balance',  label: 'Trial Balance',          icon: Scale,        desc: 'Debit/credit totals per account — checks balance' },
];

const CURRENCIES = ['CAD','USD','EUR','GBP','AUD'];

// ── CSV Download Helper ───────────────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onOpen, onDelete }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;
  const isProcessing = ['extracting', 'uploading', 'generating'].includes(session.status);
  const fileCount = (() => { try { return JSON.parse(session.file_names || '[]').length; } catch { return 0; } })();
  const reportsGenerated = (() => { try { return JSON.parse(session.reports_generated || '[]'); } catch { return []; } })();
  const reconciliation = (() => { try { return JSON.parse(session.bank_reconciliation || '[]'); } catch { return []; } })();
  const reconciledAll = reconciliation.length > 0 && reconciliation.every(r => ['reconciled', 'reconciled_with_warnings'].includes(r.status));

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{session.session_name}</p>
            {session.company_name && <p className="text-xs text-muted-foreground truncate">{session.company_name}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              {session.confidence_score > 0 && <span className="text-xs text-blue-600">⬤ {session.confidence_score}% confidence</span>}
              {session.transaction_count > 0 && <span className="text-xs text-muted-foreground">{session.transaction_count} txns</span>}
              {session.review_count > 0 && <span className="text-xs text-amber-600 font-medium">⚠ {session.review_count} review</span>}
              {reconciliation.length > 0 && (
                <span className={`text-xs font-medium ${reconciledAll ? 'text-green-600' : 'text-red-600'}`}>
                  {reconciledAll ? '✓ Reconciled' : '✗ Recon. Issues'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
              {session.currency && <span className="text-xs text-muted-foreground">{session.currency}</span>}
              {session.date_from && <span className="text-xs text-muted-foreground">{session.date_from} → {session.date_to || '?'}</span>}
              {reportsGenerated.length > 0 && <span className="text-xs text-green-600">{reportsGenerated.length} reports</span>}
            </div>
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
      {(session.total_debits > 0 || session.total_credits > 0) && (
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
          <div><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-xs font-mono font-bold text-red-600">${(session.total_debits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-xs font-mono font-bold text-green-600">${(session.total_credits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Basis</p><p className="text-xs font-medium capitalize">{session.accounting_basis || '—'}</p></div>
        </div>
      )}
    </Card>
  );
}

// ── New Session Dialog ────────────────────────────────────────────────────────
function NewSessionDialog({ open, onOpenChange, onCreated }) {
  const [sessionName, setSessionName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleStart = async () => {
    if (!sessionName.trim() || !files.length) return;
    setUploading(true);
    setUploadProgress(0);
    const user = await base44.auth.me();
    const fileUrls = [];
    for (let i = 0; i < files.length; i++) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
      fileUrls.push(file_url);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    const record = await base44.entities.AccountingReport.create({
      session_name: sessionName.trim(),
      company_name: companyName.trim() || null,
      uploaded_by: user.email || user.full_name,
      file_names: JSON.stringify(files.map(f => f.name)),
      file_urls: JSON.stringify(fileUrls),
      upload_date: new Date().toISOString(),
      currency,
      status: 'extracting',
    });

    const fileNames = files.map(f => f.name);
    setUploading(false);
    onOpenChange(false);
    setSessionName(''); setCompanyName(''); setFiles([]); setUploadProgress(0);
    toast({ title: '🚀 Extraction started', description: `Processing ${fileNames.length} file(s) — stay on this page for live updates`, duration: 5000 });
    onCreated(record);

    // Process one file at a time to stay under 90s timeout per call
    (async () => {
      try {
        let progress = fileNames.map((name, i) => ({ name, index: i, status: 'pending', file_type: name.split('.').pop().toLowerCase(), tx_count: 0 }));
        await base44.entities.AccountingReport.update(record.id, { status: 'extracting', file_progress: JSON.stringify(progress), transaction_count: 0 });

        const fileResults = [];
        let allTransactions = [];

        for (let i = 0; i < fileUrls.length; i++) {
          const res = await base44.functions.invoke('generateAccountingReports', {
            mode: 'extract_file',
            report_id: record.id,
            file_url: fileUrls[i],
            file_name: fileNames[i],
            file_index: i,
            file_progress: JSON.stringify(progress),
            existing_transactions: JSON.stringify(allTransactions),
          });
          if (res.data?.success) {
            allTransactions = allTransactions.concat(res.data.transactions || []);
            fileResults.push(res.data.file_result);
            progress = JSON.parse(res.data.progress || JSON.stringify(progress));
          } else {
            progress[i] = { ...progress[i], status: 'failed', error: res.data?.error || 'Unknown error' };
            fileResults.push({ file_name: fileNames[i], tx_count: 0, confidence_score: 0, error: res.data?.error });
          }
        }

        await base44.functions.invoke('generateAccountingReports', {
          mode: 'finalise',
          report_id: record.id,
          all_transactions: JSON.stringify(allTransactions),
          file_results: JSON.stringify(fileResults),
          file_progress: JSON.stringify(progress),
        });
      } catch (err) {
        await base44.entities.AccountingReport.update(record.id, { status: 'failed' }).catch(() => {});
      }
    })();
  };

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> New Report Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Session Name *</Label>
              <Input className="mt-1" placeholder="e.g. Q1 2024 Reconciliation" value={sessionName} onChange={e => setSessionName(e.target.value)} disabled={uploading} />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input className="mt-1" placeholder="Optional" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={uploading} />
            </div>
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={uploading}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Upload Financial Documents *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">PDF bank statements, scanned PDFs, Excel, CSV, OFX/QBO, images</p>
            <ARUploadZone files={files} onFilesChange={setFiles} />
          </div>
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Uploading files…</span><span className="font-semibold">{uploadProgress}%</span></div>
              <div className="w-full bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleStart} disabled={!sessionName.trim() || !files.length || uploading}>
            {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading {uploadProgress}%…</> : <><Zap className="w-4 h-4 mr-2" /> Upload & Extract</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Generate Reports Dialog ───────────────────────────────────────────────────
function GenerateDialog({ open, onOpenChange, session, transactions, onGenerated }) {
  const [selectedReports, setSelectedReports] = useState(['gl', 'pl', 'monthly_summary', 'review_items', 'trial_balance']);
  const [dateFrom, setDateFrom] = useState(session?.date_from || '');
  const [dateTo, setDateTo] = useState(session?.date_to || '');
  const [includeReview, setIncludeReview] = useState(false);
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const toggle = (id) => setSelectedReports(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  const reviewCount = transactions.filter(t => t.needs_review).length;

  const handleGenerate = async () => {
    if (!selectedReports.length) return;
    setGenerating(true);
    await base44.entities.AccountingReport.update(session.id, { status: 'generating' });
    const res = await base44.functions.invoke('generateAccountingReports', {
      mode: 'generate',
      report_id: session.id,
      report_types: selectedReports,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      options: { include_review: includeReview, include_transfers: includeTransfers },
    });
    setGenerating(false);
    if (res.data?.success) {
      toast({ title: `✅ ${res.data.generated.length} reports generated`, duration: 5000 });
      onGenerated(res.data.generated);
      onOpenChange(false);
    } else {
      toast({ title: 'Generation failed', variant: 'destructive', duration: 5000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={generating ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Generate Reports
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          {reviewCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{reviewCount} transactions flagged for review — excluded from P&L by default unless you opt in below.</span>
            </div>
          )}
          <div>
            <Label className="text-xs font-semibold">Report Types</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {REPORT_OPTIONS.map(opt => (
                <div key={opt.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selectedReports.includes(opt.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`} onClick={() => toggle(opt.id)}>
                  <Checkbox checked={selectedReports.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} className="mt-0.5" />
                  <div><div className="flex items-center gap-1.5"><opt.icon className="w-3.5 h-3.5 text-primary" /><p className="text-xs font-semibold">{opt.label}</p></div><p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">P&L Options</Label>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIncludeReview(!includeReview)}>
              <Checkbox checked={includeReview} onCheckedChange={setIncludeReview} />
              <span className="text-xs">Include review-flagged transactions in P&L</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIncludeTransfers(!includeTransfers)}>
              <Checkbox checked={includeTransfers} onCheckedChange={setIncludeTransfers} />
              <span className="text-xs">Include transfers & credit card payments in P&L</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating || !selectedReports.length || transactions.length === 0}>
            {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><BarChart2 className="w-4 h-4 mr-2" /> Generate {selectedReports.length} Report{selectedReports.length !== 1 ? 's' : ''}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Session Detail ────────────────────────────────────────────────────────────
function SessionDetail({ session: initialSession, onBack, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState(() => { try { return JSON.parse(initialSession.transactions_reviewed || initialSession.transactions_raw || '[]'); } catch { return []; } });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: liveSession } = useQuery({
    queryKey: ['ar-detail', initialSession.id],
    queryFn: async () => { try { const rows = await base44.entities.AccountingReport.filter({ id: initialSession.id }); return rows[0] || initialSession; } catch { return initialSession; } },
    refetchInterval: (q) => ['extracting', 'generating'].includes(q.state.data?.status || initialSession.status) ? 1500 : false,
    initialData: initialSession,
  });
  const session = liveSession || initialSession;

  useEffect(() => {
    if (!['extracting', 'uploading'].includes(session.status)) {
      try {
        const parsed = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]');
        if (parsed.length > 0) setTransactions(parsed);
      } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const parse = (field) => { try { return session[field] ? JSON.parse(session[field]) : null; } catch { return null; } };
  const fileProgress = parse('file_progress') || [];
  const fileMetadata = parse('file_metadata') || [];
  const validationIssues = parse('validation_issues') || [];
  const glReport = parse('gl_report');
  const plReport = parse('pl_report');
  const trialBalance = parse('trial_balance');
  const monthlySummary = parse('transaction_summary');
  const reviewItemsReport = parse('review_items_report');
  const bankReconciliation = parse('bank_reconciliation') || [];
  const fileNames = parse('file_names') || [];
  const reportsGenerated = parse('reports_generated') || [];

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const isProcessing = ['extracting', 'uploading', 'generating'].includes(session.status);
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  const handleUpdateTransaction = (idx, updated) => setTransactions(prev => { const next = [...prev]; next[idx] = updated; return next; });

  const handleSaveReview = async () => {
    setSaving(true);
    await base44.entities.AccountingReport.update(session.id, {
      transactions_reviewed: JSON.stringify(transactions),
      review_count: transactions.filter(t => t.needs_review).length,
      auto_approved_count: transactions.filter(t => !t.needs_review).length,
    });
    setSaving(false);
    onRefresh();
    toast({ title: '✅ Review saved', duration: 5000 });
  };

  const handleGenerated = (types) => {
    queryClient.invalidateQueries({ queryKey: ['ar-detail', session.id] });
    queryClient.invalidateQueries({ queryKey: ['accounting-reports'] });
    onRefresh();
    setActiveTab(types.includes('gl') ? 'gl' : types[0] || 'overview');
  };

  const handleExportCSV = (type) => {
    if (type === 'transactions') {
      const rows = [['Date','Posted Date','Description','Vendor/Payee','Cheque #','Debit','Credit','Running Balance','Category','Account','Review','Source File','Source Page','Confidence','Raw Text']];
      transactions.forEach(tx => rows.push([tx.transaction_date||'',tx.posting_date||'',tx.description||'',tx.vendor_or_customer||'',tx.cheque_number||'',tx.debit_amount||'',tx.credit_amount||'',tx.running_balance||'',tx.category||'',tx.account_name||'',tx.needs_review?'Yes':'No',tx.source_file||'',tx.source_page||'',tx.confidence||'',tx.raw_text||'']));
      downloadCSV(rows, `Transactions_${session.session_name}.csv`);
    } else if (type === 'gl' && glReport) {
      const rows = [['Account','Category','Date','Description','Reference','Debit','Credit','Running Balance','Source','Review']];
      (glReport.accounts||[]).forEach(acct => acct.transactions.forEach(tx => rows.push([acct.account_name,acct.category,tx.transaction_date||'',tx.description||'',tx.cheque_number||'',tx.debit_amount||0,tx.credit_amount||0,(tx.running_balance||0).toFixed(2),tx.source_file||'',tx.needs_review?'Yes':'No'])));
      downloadCSV(rows, `GL_${session.session_name}.csv`);
    } else if (type === 'pl' && plReport) {
      const rows = [['Section','Account','Amount']];
      (plReport.revenue_lines||[]).forEach(l => rows.push(['Revenue',l.account,l.amount]));
      rows.push(['Gross Profit','',plReport.gross_profit]);
      (plReport.operating_expense_lines||[]).forEach(l => rows.push(['Operating Expenses',l.account,l.amount]));
      rows.push(['Net Profit','',plReport.net_profit]);
      downloadCSV(rows, `PL_${session.session_name}.csv`);
    } else if (type === 'recon' && bankReconciliation.length) {
      const rows = [['File','Period Start','Period End','Opening Balance','Total Credits','Total Debits','Calculated Closing','Statement Closing','Difference','Status','Warnings']];
      bankReconciliation.forEach(r => rows.push([r.file_name,r.period_start||'',r.period_end||'',r.opening_balance??'',r.total_credits,r.total_debits,r.calculated_closing??'',r.closing_balance??'',r.difference??'',r.status,(r.warnings||[]).join('; ')]));
      downloadCSV(rows, `Reconciliation_${session.session_name}.csv`);
    } else if (type === 'review' && reviewItemsReport) {
      const rows = [['Date','Description','Debit','Credit','Suggested Category','Review Reason','Source File','Confidence','Recommended Action']];
      (reviewItemsReport.items||[]).forEach(i => rows.push([i.transaction_date||'',i.description||'',i.debit_amount||'',i.credit_amount||'',i.suggested_category||'',i.review_reason||'',i.source_file||'',i.confidence||'',i.recommended_action||'']));
      downloadCSV(rows, `ReviewItems_${session.session_name}.csv`);
    }
    toast({ title: `${type} exported`, duration: 5000 });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 flex-shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-xl font-display font-bold">{session.session_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              {session.company_name && <span className="text-xs text-muted-foreground">{session.company_name}</span>}
              {session.confidence_score > 0 && <span className="text-xs text-blue-600">⬤ {session.confidence_score}% confidence</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isProcessing && transactions.length > 0 && (
            <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={() => setGenerateOpen(true)}>
              <BarChart2 className="w-3.5 h-3.5" /> Generate Reports
            </Button>
          )}
          {transactions.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('transactions')}><Download className="w-3.5 h-3.5" /> Transactions CSV</Button>}
          {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
          {bankReconciliation.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('recon')}><Download className="w-3.5 h-3.5" /> Recon CSV</Button>}
          {reviewItemsReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('review')}><Download className="w-3.5 h-3.5" /> Review CSV</Button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Files', value: fileNames.length, color: 'text-foreground', icon: FileText },
          { label: 'Transactions', value: session.transaction_count || transactions.length, color: 'text-foreground', icon: BookOpen },
          { label: 'Review Items', value: reviewCount, color: reviewCount > 0 ? 'text-amber-600' : 'text-green-600', icon: AlertTriangle },
          { label: 'Reconciled', value: bankReconciliation.length > 0 ? `${bankReconciliation.filter(r => ['reconciled','reconciled_with_warnings'].includes(r.status)).length}/${bankReconciliation.length}` : '—', color: 'text-foreground', icon: Scale },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{s.label}</p><s.icon className={`w-4 h-4 ${s.color} opacity-50`} /></div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Extraction Progress */}
      {isProcessing && <Card className="p-4"><ARFileProgress fileProgress={fileProgress} /><p className="text-xs text-muted-foreground text-center mt-3">AI extraction running — you can navigate away and return.</p></Card>}

      {/* Validation Issues */}
      {!isProcessing && validationIssues.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" /> Validation Issues ({validationIssues.length})</h3>
          <div className="space-y-2">
            {validationIssues.map((issue, i) => {
              const styles = { high: 'bg-red-50 border-red-200 text-red-800', medium: 'bg-amber-50 border-amber-200 text-amber-800', low: 'bg-blue-50 border-blue-200 text-blue-800' };
              return <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${styles[issue.severity] || styles.low}`}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span className="flex-1">{issue.message}</span><span className="capitalize font-semibold opacity-70">{issue.severity}</span></div>;
            })}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">All Transactions</TabsTrigger>
          {reviewCount > 0 && <TabsTrigger value="exceptions" className="text-xs gap-1">Exceptions <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewCount}</span></TabsTrigger>}
          {bankReconciliation.length > 0 && <TabsTrigger value="recon" className="text-xs">Bank Reconciliation</TabsTrigger>}
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          {monthlySummary && <TabsTrigger value="monthly" className="text-xs">Monthly Summary</TabsTrigger>}
          {reviewItemsReport && <TabsTrigger value="review" className="text-xs gap-1">Review Items <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewItemsReport.count}</span></TabsTrigger>}
          {trialBalance && <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {isProcessing ? (
            <Card className="p-6"><ARFileProgress fileProgress={fileProgress} /></Card>
          ) : (
            <>
              {(session.total_debits > 0 || session.total_credits > 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(session.total_debits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(session.total_credits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Net</p>
                    <p className={`text-base font-bold font-mono ${((session.total_credits||0)-(session.total_debits||0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs((session.total_credits||0)-(session.total_debits||0)).toFixed(2)}
                    </p>
                  </Card>
                </div>
              )}
              {fileMetadata.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" /> Source Document Analysis</h3>
                  <div className="space-y-3">
                    {fileMetadata.map((fm, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 ${fm.error ? 'border-red-200 bg-red-50' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium truncate">{fm.file_name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {fm.confidence_score > 0 && <span className="text-[10px] text-blue-600">{fm.confidence_score}%</span>}
                            <Badge className="text-[10px] border-0 bg-muted">{fm.document_type || 'doc'}</Badge>
                          </div>
                        </div>
                        {fm.error ? <p className="text-[10px] text-red-600 mt-1">{fm.error}</p> : (
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {fm.institution_name && <span className="text-[10px] text-muted-foreground">🏦 {fm.institution_name}</span>}
                            {fm.company_name && <span className="text-[10px] text-muted-foreground">🏢 {fm.company_name}</span>}
                            {fm.period_start && <span className="text-[10px] text-muted-foreground">📅 {fm.period_start} → {fm.period_end || '?'}</span>}
                            {fm.opening_balance != null && <span className="text-[10px] text-muted-foreground">Open: ${fm.opening_balance?.toFixed(2)}</span>}
                            {fm.closing_balance != null && <span className="text-[10px] text-muted-foreground">Close: ${fm.closing_balance?.toFixed(2)}</span>}
                            <span className="text-[10px] text-muted-foreground">{fm.tx_count} txns</span>
                          </div>
                        )}
                        {fm.document_summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{fm.document_summary}</p>}
                        {(fm.extraction_warnings || []).map((w, wi) => (
                          <p key={wi} className="text-[10px] text-amber-600 mt-0.5">⚠ {w}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {!transactions.length && !isProcessing && (
                <div className="text-center py-10 text-muted-foreground">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No transactions extracted yet. {session.status === 'failed' ? 'Extraction failed — try again.' : ''}</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ALL TRANSACTIONS */}
        <TabsContent value="transactions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{transactions.length} transactions · {transactions.filter(t=>!t.needs_review).length} auto-categorized · {reviewCount} for review</p>
              <Button size="sm" variant="outline" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null} Save Changes
              </Button>
            </div>
            <ARTransactionTable transactions={transactions} onUpdate={handleUpdateTransaction} />
          </div>
        </TabsContent>

        {/* EXCEPTIONS */}
        <TabsContent value="exceptions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Edit inline, then approve. These are excluded from P&L by default.</p>
              <Button size="sm" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save & Approve
              </Button>
            </div>
            <ARTransactionTable transactions={transactions} onUpdate={handleUpdateTransaction} showOnlyReview />
          </div>
        </TabsContent>

        {/* BANK RECONCILIATION */}
        {bankReconciliation.length > 0 && (
          <TabsContent value="recon" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Bank Reconciliation</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('recon')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARBankReconciliation reconciliations={bankReconciliation} />
          </TabsContent>
        )}

        {/* GL */}
        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3><p className="text-xs text-muted-foreground">{glReport.transaction_count} transactions · {glReport.accounts?.length} accounts</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARGLReport report={glReport} />
          </TabsContent>
        )}

        {/* P&L */}
        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3>
                <p className="text-xs text-muted-foreground">{plReport.included_count} included · {plReport.excluded_count} excluded · {plReport.uncategorized_count} uncategorized</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('pl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            {plReport.note && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 mb-4">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {plReport.note}
              </div>
            )}
            <ARPLReport report={plReport} />
          </TabsContent>
        )}

        {/* MONTHLY SUMMARY */}
        {monthlySummary && (
          <TabsContent value="monthly" className="mt-4">
            <h3 className="font-semibold text-base flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" /> Monthly Summary</h3>
            <ARMonthlySummary report={monthlySummary} />
          </TabsContent>
        )}

        {/* REVIEW ITEMS */}
        {reviewItemsReport && (
          <TabsContent value="review" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Review Items</h3><p className="text-xs text-muted-foreground">{reviewItemsReport.count} transactions require attention</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('review')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARReviewItems report={reviewItemsReport} />
          </TabsContent>
        )}

        {/* TRIAL BALANCE */}
        {trialBalance && (
          <TabsContent value="tb" className="mt-4">
            <h3 className="font-semibold text-base flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-primary" /> Trial Balance</h3>
            <ARTrialBalance report={trialBalance} />
          </TabsContent>
        )}

        {/* AUDIT TRAIL */}
        <TabsContent value="audit" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Audit Trail</h3>
            <div className="space-y-0">
              {[
                { label: 'Session Created', value: session.upload_date ? new Date(session.upload_date).toLocaleString('en-CA') : '—' },
                { label: 'Uploaded By', value: session.uploaded_by || '—' },
                { label: 'Company Name', value: session.company_name || '—' },
                { label: 'Currency', value: session.currency || '—' },
                { label: 'Accounting Basis', value: session.accounting_basis || '—' },
                { label: 'Source Files', value: fileNames.join(', ') || '—' },
                { label: 'Confidence Score', value: session.confidence_score ? `${session.confidence_score}%` : '—' },
                { label: 'Transactions Extracted', value: session.transaction_count || transactions.length },
                { label: 'Auto-Categorized', value: session.auto_approved_count || transactions.filter(t => !t.needs_review).length },
                { label: 'Review Items', value: session.review_count || reviewCount },
                { label: 'Statement Period', value: session.date_from ? `${session.date_from} → ${session.date_to || '?'}` : '—' },
                { label: 'Reports Generated', value: reportsGenerated.join(', ') || 'None yet' },
                { label: 'Total Debits', value: session.total_debits ? `$${session.total_debits.toFixed(2)}` : '—' },
                { label: 'Total Credits', value: session.total_credits ? `$${session.total_credits.toFixed(2)}` : '—' },
                { label: 'Reconciliation Status', value: bankReconciliation.length > 0 ? `${bankReconciliation.filter(r => ['reconciled','reconciled_with_warnings'].includes(r.status)).length}/${bankReconciliation.length} statements reconciled` : 'Not yet reconciled' },
                { label: 'System', value: 'SOC Ai Accounting System' },
                { label: 'Report Generated', value: new Date().toLocaleString('en-CA') },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground font-medium w-52 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        session={session}
        transactions={transactions}
        onGenerated={handleGenerated}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AccountingReports() {
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = base44.entities.AccountingReport.subscribe((event) => {
      if (event.type === 'update') {
        const { data, old_data } = event;
        const wasProcessing = ['extracting', 'generating'].includes(old_data?.status);
        const isDone = ['review', 'completed', 'failed'].includes(data?.status);
        if (wasProcessing && isDone) {
          const name = data.session_name || 'Session';
          if (data.status === 'failed') toast({ title: `❌ ${name} — extraction failed`, variant: 'destructive', duration: 5000 });
          else toast({ title: `✅ ${name} — ready for review`, description: `${data.transaction_count || 0} transactions · ${data.review_count || 0} review items · ${data.confidence_score || 0}% confidence`, duration: 5000 });
          queryClient.invalidateQueries({ queryKey: ['accounting-reports'] });
        }
      }
    });
    return unsubscribe;
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['accounting-reports'],
    queryFn: () => base44.entities.AccountingReport.list('-created_date'),
    refetchInterval: (q) => Array.isArray(q.state.data) && q.state.data.some(s => ['extracting', 'generating'].includes(s.status)) ? 2000 : false,
  });

  const handleDelete = async (id) => {
    queryClient.setQueryData(['accounting-reports'], (old) => (old || []).filter(s => s.id !== id));
    await base44.entities.AccountingReport.delete(id);
    toast({ title: 'Session deleted', duration: 5000 });
  };

  const handleCreated = (record) => { queryClient.invalidateQueries({ queryKey: ['accounting-reports'] }); setActiveSession(record); };
  const handleOpenSession = async (session) => { try { const fresh = await base44.entities.AccountingReport.filter({ id: session.id }); setActiveSession(fresh[0] || session); } catch { setActiveSession(session); } };
  const handleRefresh = async () => {
    if (!activeSession) return;
    try { const fresh = await base44.entities.AccountingReport.filter({ id: activeSession.id }); if (fresh?.length) setActiveSession(fresh[0]); } catch {}
    queryClient.invalidateQueries({ queryKey: ['accounting-reports'] });
  };

  const filtered = sessions.filter(s => !search || s.session_name?.toLowerCase().includes(search.toLowerCase()) || s.company_name?.toLowerCase().includes(search.toLowerCase()));

  if (activeSession) return (
    <div className="space-y-6">
      <SessionDetail session={activeSession} onBack={() => { setActiveSession(null); queryClient.invalidateQueries({ queryKey: ['accounting-reports'] }); }} onRefresh={handleRefresh} />
    </div>
  );

  const totalTx = sessions.reduce((s, r) => s + (r.transaction_count || 0), 0);
  const totalReports = sessions.reduce((s, r) => { try { return s + JSON.parse(r.reports_generated || '[]').length; } catch { return s; } }, 0);
  const avgConf = sessions.filter(s => s.confidence_score > 0);
  const avgConfidence = avgConf.length > 0 ? Math.round(avgConf.reduce((s, r) => s + r.confidence_score, 0) / avgConf.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Accounting Report Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload bank statements, CSVs, PDFs, Excel or OFX files → AI extracts, reconciles & generates GL, P&L, Monthly Summary, Bank Reconciliation & more</p>
        </div>
        <Button onClick={() => setNewSessionOpen(true)} className="gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> New Report Session</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length },
          { label: 'Transactions Extracted', value: totalTx.toLocaleString() },
          { label: 'Reports Generated', value: totalReports, color: 'text-green-600' },
          { label: 'Avg. Confidence', value: avgConfidence > 0 ? `${avgConfidence}%` : '—', color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label} className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ''}`}>{s.value}</p></Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-9 text-sm" placeholder="Search sessions…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No report sessions yet</p>
          <p className="text-xs mt-1 mb-4">Upload bank statements, invoices, GL exports or accounting documents to get started</p>
          <Button onClick={() => setNewSessionOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Report Session</Button>
        </div>
      ) : (
        <div className="grid gap-4">{filtered.map(s => <SessionCard key={s.id} session={s} onOpen={handleOpenSession} onDelete={handleDelete} />)}</div>
      )}

      <NewSessionDialog open={newSessionOpen} onOpenChange={setNewSessionOpen} onCreated={handleCreated} />
    </div>
  );
}
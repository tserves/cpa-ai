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
  TrendingUp, Zap, XCircle, Shield, History, Scale, Calendar,
  ListChecks, Info, FileSearch, Database
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FRUploadZone from '@/components/finreport/FRUploadZone';
import FRFileProgress from '@/components/finreport/FRFileProgress';
import FRTransactionTable from '@/components/finreport/FRTransactionTable';
import FRGLReport from '@/components/finreport/FRGLReport';
import FRPLReport from '@/components/finreport/FRPLReport';
import FRBankRecon from '@/components/finreport/FRBankRecon';
import FRReviewItems from '@/components/finreport/FRReviewItems';
import FRMonthlySummary from '@/components/finreport/FRMonthlySummary';

const STATUS_CONFIG = {
  uploading:  { label: 'Uploading',   color: 'bg-blue-100 text-blue-700',    icon: Upload },
  extracting: { label: 'Extracting',  color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  review:     { label: 'Ready',       color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  generating: { label: 'Generating',  color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:  { label: 'Completed',   color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Failed',      color: 'bg-red-100 text-red-700',      icon: XCircle },
};

const REPORT_OPTIONS = [
  { id: 'gl',             label: 'General Ledger',      icon: BookOpen,   desc: 'Transaction-level ledger grouped by account' },
  { id: 'pl',             label: 'Profit & Loss',       icon: TrendingUp, desc: 'Revenue, COGS, expenses and net income' },
  { id: 'monthly_summary',label: 'Monthly Summary',     icon: Calendar,   desc: 'Month-by-month cash flow analysis' },
  { id: 'review_items',   label: 'Review Items',        icon: ListChecks, desc: 'Transactions requiring manual classification' },
  { id: 'trial_balance',  label: 'Trial Balance',       icon: Scale,      desc: 'Debit/credit totals per account' },
];

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onOpen, onDelete }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const Icon = sc.icon;
  const isProc = ['extracting', 'uploading', 'generating'].includes(session.status);
  const fileCount = (() => { try { return JSON.parse(session.file_names || '[]').length; } catch { return 0; } })();
  const recon = (() => { try { return JSON.parse(session.bank_reconciliation || '[]'); } catch { return []; } })();
  const reconOk = recon.length > 0 && recon.every(r => ['reconciled', 'reconciled_with_warnings'].includes(r.status));
  const reports = (() => { try { return JSON.parse(session.reports_generated || '[]'); } catch { return []; } })();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{session.session_name}</p>
            {session.company_name && <p className="text-xs text-muted-foreground">{session.company_name}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <Icon className={`w-3 h-3 ${isProc ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              {session.confidence_score > 0 && <span className="text-xs text-blue-600">⬤ {session.confidence_score}% confidence</span>}
              {session.transaction_count > 0 && <span className="text-xs text-muted-foreground">{session.transaction_count} txns</span>}
              {session.review_count > 0 && <span className="text-xs text-amber-600 font-medium">⚠ {session.review_count} review</span>}
              {recon.length > 0 && <span className={`text-xs font-medium ${reconOk ? 'text-green-600' : 'text-red-600'}`}>{reconOk ? '✓ Reconciled' : '✗ Recon Issues'}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
              {session.currency && <span className="text-xs text-muted-foreground">{session.currency}</span>}
              {session.date_from && <span className="text-xs text-muted-foreground">{session.date_from} → {session.date_to || '?'}</span>}
              {reports.length > 0 && <span className="text-xs text-green-600">{reports.length} reports</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => onOpen(session)}><Eye className="w-3.5 h-3.5" /> Open</Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(session.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
      {(session.total_debits > 0 || session.total_credits > 0) && (
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
          <div><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-xs font-mono font-bold text-red-600">${(session.total_debits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-xs font-mono font-bold text-green-600">${(session.total_credits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Basis</p><p className="text-xs capitalize">{session.accounting_basis || '—'}</p></div>
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
    const user = await base44.auth.me();
    const fileUrls = [];
    for (let i = 0; i < files.length; i++) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
      fileUrls.push(file_url);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    const record = await base44.entities.AccountingReport.create({
      session_name: sessionName.trim(), company_name: companyName.trim() || null,
      uploaded_by: user.email || user.full_name,
      file_names: JSON.stringify(files.map(f => f.name)), file_urls: JSON.stringify(fileUrls),
      upload_date: new Date().toISOString(), currency, status: 'extracting',
    });
    const fileNames = files.map(f => f.name);
    setUploading(false); onOpenChange(false);
    setSessionName(''); setCompanyName(''); setFiles([]); setUploadProgress(0);
    toast({ title: '🚀 Extraction started', description: `Processing ${fileNames.length} file(s)…`, duration: 5000 });
    onCreated(record);

    (async () => {
      try {
        let progress = fileNames.map((name, i) => ({ name, index: i, status: 'pending', file_type: name.split('.').pop().toLowerCase(), tx_count: 0 }));
        await base44.entities.AccountingReport.update(record.id, { status: 'extracting', file_progress: JSON.stringify(progress), transaction_count: 0 });
        const fileResults = [];
        // Accumulate transactions only in frontend memory — don't send growing arrays back to backend
        let allTx = [];
        for (let i = 0; i < fileUrls.length; i++) {
          try {
            // 5-minute per-file timeout
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Extraction timed out after 5 minutes')), 300000));
            const invokePromise = base44.functions.invoke('generateAccountingReports', {
              mode: 'extract_file', report_id: record.id, file_url: fileUrls[i], file_name: fileNames[i],
              file_index: i, file_progress: JSON.stringify(progress),
              // Don't pass existing_transactions — backend no longer needs it for mid-flight updates
            });
            const res = await Promise.race([invokePromise, timeoutPromise]);
            if (res.data?.success) {
              allTx = allTx.concat(res.data.transactions || []);
              fileResults.push(res.data.file_result);
              progress = JSON.parse(res.data.progress || JSON.stringify(progress));
            } else {
              progress[i] = { ...progress[i], status: 'failed', error: res.data?.error || 'Extraction failed' };
              fileResults.push({ file_name: fileNames[i], tx_count: 0, confidence_score: 0, error: res.data?.error });
              await base44.entities.AccountingReport.update(record.id, { file_progress: JSON.stringify(progress) });
            }
          } catch (fileErr) {
            progress[i] = { ...progress[i], status: 'failed', error: fileErr.message };
            fileResults.push({ file_name: fileNames[i], tx_count: 0, confidence_score: 0, error: fileErr.message });
            await base44.entities.AccountingReport.update(record.id, { file_progress: JSON.stringify(progress) });
          }
        }
        await base44.functions.invoke('generateAccountingReports', {
          mode: 'finalise', report_id: record.id, all_transactions: JSON.stringify(allTx),
          file_results: JSON.stringify(fileResults), file_progress: JSON.stringify(progress),
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
          <DialogTitle className="font-display flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> New Extraction Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Session Name *</Label><Input className="mt-1" placeholder="e.g. Q1 2024 Bank Statements" value={sessionName} onChange={e => setSessionName(e.target.value)} disabled={uploading} /></div>
            <div><Label>Company Name</Label><Input className="mt-1" placeholder="Optional" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={uploading} /></div>
          </div>
          <div><Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={uploading}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Upload Documents *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">PDF, Scanned PDF, Excel, CSV, OFX, QBO, Images — multiple files supported</p>
            <FRUploadZone files={files} onFilesChange={setFiles} disabled={uploading} />
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
  const [selected, setSelected] = useState(['gl', 'pl', 'monthly_summary', 'review_items', 'trial_balance']);
  const [dateFrom, setDateFrom] = useState(session?.date_from || '');
  const [dateTo, setDateTo] = useState(session?.date_to || '');
  const [includeReview, setIncludeReview] = useState(false);
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);
  const reviewCount = transactions.filter(t => t.needs_review).length;

  const handleGenerate = async () => {
    if (!selected.length) return;
    setGenerating(true);
    await base44.entities.AccountingReport.update(session.id, { status: 'generating' });
    const res = await base44.functions.invoke('generateAccountingReports', {
      mode: 'generate', report_id: session.id, report_types: selected,
      date_from: dateFrom || null, date_to: dateTo || null,
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
        <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Generate Reports</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          {reviewCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {reviewCount} transactions flagged for review — excluded from P&L by default.
            </div>
          )}
          <div>
            <Label className="text-xs font-semibold">Select Reports</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {REPORT_OPTIONS.map(opt => (
                <div key={opt.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selected.includes(opt.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`} onClick={() => toggle(opt.id)}>
                  <Checkbox checked={selected.includes(opt.id)} onCheckedChange={() => toggle(opt.id)} className="mt-0.5" />
                  <div><div className="flex items-center gap-1.5"><opt.icon className="w-3.5 h-3.5 text-primary" /><p className="text-xs font-semibold">{opt.label}</p></div><p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          </div>
          <div className="space-y-2 border rounded-xl p-3">
            <Label className="text-xs font-semibold">P&L Options</Label>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIncludeReview(!includeReview)}>
              <Checkbox checked={includeReview} onCheckedChange={setIncludeReview} /><span className="text-xs">Include review-flagged transactions in P&L</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIncludeTransfers(!includeTransfers)}>
              <Checkbox checked={includeTransfers} onCheckedChange={setIncludeTransfers} /><span className="text-xs">Include transfers & credit card payments in P&L</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={generating || !selected.length || transactions.length === 0}>
            {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><BarChart2 className="w-4 h-4 mr-2" /> Generate {selected.length} Report{selected.length !== 1 ? 's' : ''}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Session Detail ────────────────────────────────────────────────────────────
function SessionDetail({ session: init, onBack, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState(() => { try { return JSON.parse(init.transactions_reviewed || init.transactions_raw || '[]'); } catch { return []; } });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: liveSession } = useQuery({
    queryKey: ['fr-detail', init.id],
    queryFn: async () => { try { const r = await base44.entities.AccountingReport.filter({ id: init.id }); return r[0] || init; } catch { return init; } },
    refetchInterval: q => ['extracting', 'generating'].includes(q.state.data?.status || init.status) ? 1500 : false,
    initialData: init,
  });
  const session = liveSession || init;

  useEffect(() => {
    if (!['extracting', 'uploading'].includes(session.status)) {
      try { const p = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]'); if (p.length > 0) setTransactions(p); } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const parse = f => { try { return session[f] ? JSON.parse(session[f]) : null; } catch { return null; } };
  const fileProgress = parse('file_progress') || [];
  const fileMetadata = parse('file_metadata') || [];
  const validationIssues = parse('validation_issues') || [];
  const glReport = parse('gl_report');
  const plReport = parse('pl_report');
  const trialBalance = parse('trial_balance');
  const monthlySummary = parse('transaction_summary');
  const reviewReport = parse('review_items_report');
  const bankRecon = parse('bank_reconciliation') || [];
  const fileNames = parse('file_names') || [];
  const reportsGenerated = parse('reports_generated') || [];

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const uncatCount = transactions.filter(t => !t.category || t.category === 'unclassified').length;
  const isProc = ['extracting', 'uploading', 'generating'].includes(session.status);
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  const handleUpdate = (idx, updated) => setTransactions(prev => { const n = [...prev]; n[idx] = updated; return n; });
  const handleSave = async () => {
    setSaving(true);
    await base44.entities.AccountingReport.update(session.id, { transactions_reviewed: JSON.stringify(transactions), review_count: transactions.filter(t => t.needs_review).length, auto_approved_count: transactions.filter(t => !t.needs_review).length });
    setSaving(false); onRefresh();
    toast({ title: '✅ Changes saved', duration: 5000 });
  };
  const handleGenerated = types => {
    queryClient.invalidateQueries({ queryKey: ['fr-detail', session.id] });
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    onRefresh();
    setActiveTab(types.includes('gl') ? 'gl' : types[0] || 'overview');
  };

  const handleExport = type => {
    if (type === 'transactions') {
      downloadCSV([['Date','Posted','Description','Payee','Cheque #','Debit','Credit','Balance','Category','Account','P&L','Review','Source File','Page','Confidence','Raw Text','Notes'], ...transactions.map(t => [t.transaction_date||'',t.posting_date||'',t.description||'',t.vendor_or_customer||'',t.cheque_number||'',t.debit_amount||'',t.credit_amount||'',t.running_balance||'',t.category||'',t.account_name||'',t.pl_include?'Yes':'No',t.needs_review?'Yes':'No',t.source_file||'',t.source_page||'',t.confidence||'',t.raw_text||'',t.user_notes||''])], `Transactions_${session.session_name}.csv`);
    } else if (type === 'gl' && glReport) {
      downloadCSV([['Account','Category','P&L','Date','Description','Ref #','Debit','Credit','GL Balance','Source File','Review'], ...(glReport.accounts||[]).flatMap(a => a.transactions.map(t => [a.account_name,a.category,a.pl_include?'Yes':'No',t.transaction_date||'',t.description||'',t.cheque_number||'',t.debit_amount||0,t.credit_amount||0,(t.running_balance_gl||0).toFixed(2),t.source_file||'',t.needs_review?'Yes':'No']))], `GL_${session.session_name}.csv`);
    } else if (type === 'recon') {
      downloadCSV([['File','Institution','Period Start','Period End','Opening Balance','Total Credits','Total Debits','Calc Closing','Statement Closing','Difference','Status','Transactions','Warnings'], ...bankRecon.map(r => [r.file_name,r.institution_name||'',r.period_start||'',r.period_end||'',r.opening_balance??'',r.total_credits,r.total_debits,r.calculated_closing??'',r.closing_balance??'',r.difference??'',r.status,(r.warnings||[]).join('; ')])], `Reconciliation_${session.session_name}.csv`);
    } else if (type === 'review' && reviewReport) {
      downloadCSV([['Date','Description','Debit','Credit','Category','Review Reason','Source File','Page','Confidence','Recommended Action'], ...(reviewReport.items||[]).map(i => [i.transaction_date||'',i.description||'',i.debit_amount||'',i.credit_amount||'',i.suggested_category||'',i.review_reason||'',i.source_file||'',i.source_page||'',i.confidence||'',i.recommended_action||''])], `ReviewItems_${session.session_name}.csv`);
    }
    toast({ title: `Exported ${type}`, duration: 5000 });
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
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}><StatusIcon className={`w-3 h-3 ${isProc ? 'animate-spin' : ''}`} /> {sc.label}</Badge>
              {session.company_name && <span className="text-xs text-muted-foreground">{session.company_name}</span>}
              {session.confidence_score > 0 && <span className="text-xs text-blue-600">⬤ {session.confidence_score}% confidence</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isProc && transactions.length > 0 && <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setGenerateOpen(true)}><BarChart2 className="w-3.5 h-3.5" /> Generate Reports</Button>}
          {transactions.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('transactions')}><Download className="w-3.5 h-3.5" /> Transactions CSV</Button>}
          {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
          {bankRecon.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('recon')}><Download className="w-3.5 h-3.5" /> Recon CSV</Button>}
          {reviewReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('review')}><Download className="w-3.5 h-3.5" /> Review CSV</Button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Files', val: fileNames.length, icon: FileText },
          { label: 'Transactions', val: session.transaction_count || transactions.length, icon: Database },
          { label: 'Total Credits', val: session.total_credits ? `$${session.total_credits.toFixed(0)}` : '—', icon: TrendingUp, c: 'text-green-600' },
          { label: 'Total Debits', val: session.total_debits ? `$${session.total_debits.toFixed(0)}` : '—', icon: TrendingUp, c: 'text-red-600' },
          { label: 'Review Items', val: reviewCount, icon: AlertTriangle, c: reviewCount > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Reconciled', val: bankRecon.length > 0 ? `${bankRecon.filter(r => ['reconciled','reconciled_with_warnings'].includes(r.status)).length}/${bankRecon.length}` : '—', icon: Scale },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between"><p className="text-[10px] text-muted-foreground">{s.label}</p><s.icon className={`w-3.5 h-3.5 opacity-40 ${s.c || ''}`} /></div>
            <p className={`text-lg font-bold mt-0.5 ${s.c || ''}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      {/* Extraction progress */}
      {isProc && <Card className="p-4"><FRFileProgress fileProgress={fileProgress} /><p className="text-xs text-center text-muted-foreground mt-3">AI extraction running — you can navigate away and return.</p></Card>}

      {/* Validation issues */}
      {!isProc && validationIssues.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" /> Validation Issues</h3>
          {validationIssues.map((issue, i) => {
            const s = { high: 'bg-red-50 border-red-200 text-red-800', medium: 'bg-amber-50 border-amber-200 text-amber-800', low: 'bg-blue-50 border-blue-200 text-blue-800' };
            return <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${s[issue.severity] || s.low}`}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span className="flex-1">{issue.message}</span><span className="capitalize font-semibold opacity-70">{issue.severity}</span></div>;
          })}
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs">All Transactions</TabsTrigger>
          {reviewCount > 0 && <TabsTrigger value="exceptions" className="text-xs gap-1">Exceptions <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewCount}</span></TabsTrigger>}
          {bankRecon.length > 0 && <TabsTrigger value="recon" className="text-xs">Bank Reconciliation</TabsTrigger>}
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          {monthlySummary && <TabsTrigger value="monthly" className="text-xs">Monthly Summary</TabsTrigger>}
          {reviewReport && <TabsTrigger value="review" className="text-xs gap-1">Review Items <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewReport.count}</span></TabsTrigger>}
          {trialBalance && <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {isProc ? <Card className="p-6"><FRFileProgress fileProgress={fileProgress} /></Card> : (
            <>
              {(session.total_debits > 0 || session.total_credits > 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(session.total_credits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(session.total_debits || 0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Net Movement</p>
                    <p className={`text-base font-bold font-mono ${((session.total_credits||0)-(session.total_debits||0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs((session.total_credits||0)-(session.total_debits||0)).toFixed(2)}
                    </p>
                  </Card>
                </div>
              )}
              {fileMetadata.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileSearch className="w-4 h-4 text-primary" /> Document Analysis</h3>
                  <div className="space-y-3">
                    {fileMetadata.map((fm, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 ${fm.error ? 'border-red-200 bg-red-50' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium truncate">{fm.file_name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {fm.confidence_score > 0 && <span className="text-[10px] text-blue-600">{fm.confidence_score}%</span>}
                            {fm.is_scanned && <Badge className="text-[9px] bg-amber-100 text-amber-700 border-0">Scanned</Badge>}
                            <Badge className="text-[10px] border-0 bg-muted">{fm.document_type || 'doc'}</Badge>
                          </div>
                        </div>
                        {fm.error ? <p className="text-[10px] text-red-600 mt-1">{fm.error}</p> : (
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {fm.institution_name && <span className="text-[10px] text-muted-foreground">🏦 {fm.institution_name}</span>}
                            {fm.account_number_masked && <span className="text-[10px] text-muted-foreground">···{fm.account_number_masked}</span>}
                            {fm.company_name && <span className="text-[10px] text-muted-foreground">🏢 {fm.company_name}</span>}
                            {fm.period_start && <span className="text-[10px] text-muted-foreground">📅 {fm.period_start} → {fm.period_end || '?'}</span>}
                            {fm.opening_balance != null && <span className="text-[10px] text-muted-foreground">Open: ${fm.opening_balance?.toFixed(2)}</span>}
                            {fm.closing_balance != null && <span className="text-[10px] text-muted-foreground">Close: ${fm.closing_balance?.toFixed(2)}</span>}
                            {fm.page_count && <span className="text-[10px] text-muted-foreground">{fm.page_count} pages</span>}
                            <span className="text-[10px] text-muted-foreground">{fm.tx_count} txns</span>
                          </div>
                        )}
                        {fm.document_summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{fm.document_summary}</p>}
                        {(fm.extraction_warnings || []).map((w, wi) => <p key={wi} className="text-[10px] text-amber-600 mt-0.5">⚠ {w}</p>)}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {!transactions.length && !isProc && (
                <div className="text-center py-10 text-muted-foreground">
                  <Database className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{session.status === 'failed' ? 'Extraction failed — try again.' : 'No transactions extracted yet.'}</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ALL TRANSACTIONS */}
        <TabsContent value="transactions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{transactions.length} transactions · {transactions.filter(t => !t.needs_review).length} categorized · {reviewCount} for review · {uncatCount} unclassified</p>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-8 text-xs">
              {saving ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" /></> : null} Save Changes
            </Button>
          </div>
          <FRTransactionTable transactions={transactions} onUpdate={handleUpdate} />
        </TabsContent>

        {/* EXCEPTIONS */}
        <TabsContent value="exceptions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Review and reassign categories. These are excluded from P&L by default.</p>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs gap-1">
              {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
            </Button>
          </div>
          <FRTransactionTable transactions={transactions} onUpdate={handleUpdate} showOnlyReview />
        </TabsContent>

        {/* BANK RECONCILIATION */}
        {bankRecon.length > 0 && (
          <TabsContent value="recon" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Bank Reconciliation</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('recon')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <FRBankRecon reconciliations={bankRecon} />
          </TabsContent>
        )}

        {/* GL */}
        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3><p className="text-xs text-muted-foreground">{glReport.transaction_count} txns · {glReport.accounts?.length} accounts</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <FRGLReport report={glReport} />
          </TabsContent>
        )}

        {/* P&L */}
        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3>
              <p className="text-xs text-muted-foreground">{plReport.included_count} transactions included · {plReport.excluded_count} excluded</p>
            </div>
            {plReport.note && <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 mb-4"><Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {plReport.note}</div>}
            <FRPLReport report={plReport} />
          </TabsContent>
        )}

        {/* MONTHLY */}
        {monthlySummary && (
          <TabsContent value="monthly" className="mt-4">
            <h3 className="font-semibold text-base flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-primary" /> Monthly Summary</h3>
            <FRMonthlySummary report={monthlySummary} />
          </TabsContent>
        )}

        {/* REVIEW ITEMS */}
        {reviewReport && (
          <TabsContent value="review" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Review Items</h3><p className="text-xs text-muted-foreground">{reviewReport.count} transactions need attention</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('review')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <FRReviewItems report={reviewReport} />
          </TabsContent>
        )}

        {/* TRIAL BALANCE */}
        {trialBalance && (
          <TabsContent value="tb" className="mt-4">
            <h3 className="font-semibold text-base flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-primary" /> Trial Balance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(trialBalance.total_debits || 0).toFixed(2)}</p></Card>
                <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(trialBalance.total_credits || 0).toFixed(2)}</p></Card>
                <Card className={`p-3 text-center ${trialBalance.is_balanced ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <p className={`text-base font-bold ${trialBalance.is_balanced ? 'text-green-600' : 'text-red-600'}`}>{trialBalance.is_balanced ? 'Balanced' : 'Imbalanced'}</p>
                </Card>
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50"><tr>{['Account','Category','Debit','Credit','Net Balance'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {(trialBalance.accounts || []).map((a, i) => (
                      <tr key={i} className="border-t hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs font-medium">{a.account_name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{a.category?.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-xs font-mono text-red-600">${a.debit_total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs font-mono text-green-600">${a.credit_total.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-xs font-mono font-bold ${a.net_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>${Math.abs(a.net_balance).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-bold">
                      <td className="px-3 py-2 text-xs" colSpan={2}>TOTALS</td>
                      <td className="px-3 py-2 text-xs font-mono text-red-600">${(trialBalance.total_debits || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-mono text-green-600">${(trialBalance.total_credits || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-mono">${Math.abs((trialBalance.total_debits || 0) - (trialBalance.total_credits || 0)).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}

        {/* AUDIT TRAIL */}
        <TabsContent value="audit" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Audit Trail</h3>
            <div>
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
                { label: 'Uncategorized', value: uncatCount },
                { label: 'Statement Period', value: session.date_from ? `${session.date_from} → ${session.date_to || '?'}` : '—' },
                { label: 'Total Credits', value: session.total_credits ? `$${session.total_credits.toFixed(2)}` : '—' },
                { label: 'Total Debits', value: session.total_debits ? `$${session.total_debits.toFixed(2)}` : '—' },
                { label: 'Reconciliation', value: bankRecon.length > 0 ? `${bankRecon.filter(r => ['reconciled','reconciled_with_warnings'].includes(r.status)).length}/${bankRecon.length} statements reconciled` : 'Not reconciled' },
                { label: 'Reports Generated', value: reportsGenerated.join(', ') || 'None yet' },
                { label: 'System', value: 'SOC Ai Financial Extraction System' },
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

      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} session={session} transactions={transactions} onGenerated={handleGenerated} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialReports() {
  const [newOpen, setNewOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const unsub = base44.entities.AccountingReport.subscribe(event => {
      if (event.type === 'update') {
        const { data, old_data } = event;
        if (['extracting', 'generating'].includes(old_data?.status) && ['review', 'completed', 'failed'].includes(data?.status)) {
          if (data.status === 'failed') toast({ title: `❌ ${data.session_name} — extraction failed`, variant: 'destructive', duration: 5000 });
          else toast({ title: `✅ ${data.session_name} — ready for review`, description: `${data.transaction_count || 0} transactions · ${data.review_count || 0} review items · ${data.confidence_score || 0}% confidence`, duration: 5000 });
          queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
        }
      }
    });
    return unsub;
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['financial-reports'],
    queryFn: () => base44.entities.AccountingReport.list('-created_date'),
    refetchInterval: q => Array.isArray(q.state.data) && q.state.data.some(s => ['extracting', 'generating'].includes(s.status)) ? 2000 : false,
  });

  const handleDelete = async id => {
    queryClient.setQueryData(['financial-reports'], old => (old || []).filter(s => s.id !== id));
    await base44.entities.AccountingReport.delete(id);
    toast({ title: 'Session deleted', duration: 5000 });
  };

  const handleCreated = record => { queryClient.invalidateQueries({ queryKey: ['financial-reports'] }); setActiveSession(record); };
  const handleOpen = async session => { try { const r = await base44.entities.AccountingReport.filter({ id: session.id }); setActiveSession(r[0] || session); } catch { setActiveSession(session); } };
  const handleRefresh = async () => {
    if (!activeSession) return;
    try { const r = await base44.entities.AccountingReport.filter({ id: activeSession.id }); if (r?.length) setActiveSession(r[0]); } catch {}
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
  };

  const filtered = sessions.filter(s => !search || s.session_name?.toLowerCase().includes(search.toLowerCase()) || s.company_name?.toLowerCase().includes(search.toLowerCase()));

  if (activeSession) return (
    <div className="space-y-6">
      <SessionDetail session={activeSession} onBack={() => { setActiveSession(null); queryClient.invalidateQueries({ queryKey: ['financial-reports'] }); }} onRefresh={handleRefresh} />
    </div>
  );

  const totalTx = sessions.reduce((s, r) => s + (r.transaction_count || 0), 0);
  const totalReports = sessions.reduce((s, r) => { try { return s + JSON.parse(r.reports_generated || '[]').length; } catch { return s; } }, 0);
  const confArr = sessions.filter(s => s.confidence_score > 0);
  const avgConf = confArr.length > 0 ? Math.round(confArr.reduce((s, r) => s + r.confidence_score, 0) / confArr.length) : 0;
  const totalCredits = sessions.reduce((s, r) => s + (r.total_credits || 0), 0);
  const totalDebits = sessions.reduce((s, r) => s + (r.total_debits || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Database className="w-6 h-6 text-primary" /> Financial Data Extraction</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload bank statements, CSV, Excel, OFX or PDF files → AI extracts, reconciles & generates GL, P&L, Bank Reconciliation & more</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> New Extraction Session</Button>
      </div>

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Sessions', value: sessions.length },
          { label: 'Transactions', value: totalTx.toLocaleString() },
          { label: 'Total Credits', value: totalCredits > 0 ? `$${(totalCredits/1000).toFixed(1)}k` : '—', color: 'text-green-600' },
          { label: 'Total Debits', value: totalDebits > 0 ? `$${(totalDebits/1000).toFixed(1)}k` : '—', color: 'text-red-600' },
          { label: 'Reports', value: totalReports, color: 'text-primary' },
          { label: 'Avg. Confidence', value: avgConf > 0 ? `${avgConf}%` : '—', color: 'text-blue-600' },
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
          <Database className="w-14 h-14 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-medium">No extraction sessions yet</p>
          <p className="text-xs mt-1 mb-4">Upload PDF bank statements, Excel files, CSV exports or OFX files to get started</p>
          <Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Extraction Session</Button>
        </div>
      ) : (
        <div className="grid gap-4">{filtered.map(s => <SessionCard key={s.id} session={s} onOpen={handleOpen} onDelete={handleDelete} />)}</div>
      )}

      <NewSessionDialog open={newOpen} onOpenChange={setNewOpen} onCreated={handleCreated} />
    </div>
  );
}
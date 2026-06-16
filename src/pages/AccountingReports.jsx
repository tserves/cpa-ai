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
  TrendingUp, Zap, XCircle, Shield, History, Building2, Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ARUploadZone from '@/components/accounting/ARUploadZone';
import ARFileProgress from '@/components/accounting/ARFileProgress';
import ARTransactionTable from '@/components/accounting/ARTransactionTable';
import ARGLReport from '@/components/accounting/ARGLReport';
import ARPLReport from '@/components/accounting/ARPLReport';
import ARTrialBalance from '@/components/accounting/ARTrialBalance';

const STATUS_CONFIG = {
  uploading:  { label: 'Uploading',    color: 'bg-blue-100 text-blue-700',    icon: Upload },
  extracting: { label: 'Extracting',   color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  review:     { label: 'Ready',        color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  generating: { label: 'Generating',   color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:  { label: 'Completed',    color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  failed:     { label: 'Failed',       color: 'bg-red-100 text-red-700',      icon: XCircle },
};

const REPORT_OPTIONS = [
  { id: 'gl', label: 'General Ledger', icon: BookOpen, desc: 'Full account-by-account ledger with running balances' },
  { id: 'pl', label: 'Profit & Loss', icon: TrendingUp, desc: 'Revenue, expenses, and net profit/loss statement' },
  { id: 'trial_balance', label: 'Trial Balance', icon: BarChart2, desc: 'Debit/credit totals per account — checks balance' },
  { id: 'transaction_summary', label: 'Transaction Summary', icon: FileText, desc: 'Totals grouped by category with counts' },
  { id: 'vendor_ledger', label: 'Vendor Ledger', icon: Building2, desc: 'Payments by vendor sorted by total paid' },
  { id: 'customer_ledger', label: 'Customer Ledger', icon: Building2, desc: 'Receipts by customer sorted by total received' },
];

const CURRENCIES = ['CAD','USD','EUR','GBP','AUD','CHF','JPY','INR'];

// ─── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onOpen, onDelete }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;
  const isProcessing = ['extracting','uploading','generating'].includes(session.status);
  const fileCount = (() => { try { return JSON.parse(session.file_names || '[]').length; } catch { return 0; } })();
  const reportsGenerated = (() => { try { return JSON.parse(session.reports_generated || '[]'); } catch { return []; } })();

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
              {session.review_count > 0 && <span className="text-xs text-amber-600 font-medium">⚠ {session.review_count} exceptions</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
              {session.currency && <span className="text-xs text-muted-foreground">{session.currency}</span>}
              {reportsGenerated.length > 0 && <span className="text-xs text-green-600">{reportsGenerated.length} report{reportsGenerated.length !== 1 ? 's' : ''} generated</span>}
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
      {session.total_debits > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t">
          <div><p className="text-[10px] text-muted-foreground">Debits</p><p className="text-xs font-mono font-bold text-red-600">${(session.total_debits||0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Credits</p><p className="text-xs font-mono font-bold text-green-600">${(session.total_credits||0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Basis</p><p className="text-xs font-medium capitalize">{session.accounting_basis || '—'}</p></div>
        </div>
      )}
    </Card>
  );
}

// ─── New Session Dialog ────────────────────────────────────────────────────────
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
    setUploading(false);
    onOpenChange(false);
    setSessionName(''); setCompanyName(''); setFiles([]); setUploadProgress(0);
    toast({ title: '🚀 Extraction started', description: `Processing ${files.length} file${files.length !== 1 ? 's' : ''} in the background…` });
    onCreated(record);
  };

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> New Accounting Report Session
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
            <Label>Upload Documents *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Excel, CSV, PDF, scanned images, bank statements, accounting exports</p>
            <ARUploadZone files={files} onFilesChange={setFiles} />
          </div>
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Uploading…</span><span className="font-semibold">{uploadProgress}%</span></div>
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

// ─── Session Detail ────────────────────────────────────────────────────────────
function SessionDetail({ session: initialSession, onBack, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState(() => { try { return JSON.parse(initialSession.transactions_reviewed || initialSession.transactions_raw || '[]'); } catch { return []; } });
  const [selectedReports, setSelectedReports] = useState(['gl', 'pl', 'trial_balance']);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: liveSession } = useQuery({
    queryKey: ['accounting-report-detail', initialSession.id],
    queryFn: async () => { const rows = await base44.entities.AccountingReport.filter({ id: initialSession.id }); return rows[0] || initialSession; },
    refetchInterval: (q) => { const s = q.state.data?.status || initialSession.status; return ['extracting','generating'].includes(s) ? 2500 : false; },
    initialData: initialSession,
  });
  const session = liveSession || initialSession;

  useEffect(() => {
    if (!['extracting','uploading'].includes(session.status)) {
      try {
        const parsed = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]');
        if (parsed.length > 0) setTransactions(parsed);
      } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const fileProgress = (() => { try { return JSON.parse(session.file_progress || '[]'); } catch { return []; } })();
  const fileMetadata = (() => { try { return JSON.parse(session.file_metadata || '[]'); } catch { return []; } })();
  const validationIssues = (() => { try { return JSON.parse(session.validation_issues || '[]'); } catch { return []; } })();
  const glReport = (() => { try { return session.gl_report ? JSON.parse(session.gl_report) : null; } catch { return null; } })();
  const plReport = (() => { try { return session.pl_report ? JSON.parse(session.pl_report) : null; } catch { return null; } })();
  const trialBalance = (() => { try { return session.trial_balance ? JSON.parse(session.trial_balance) : null; } catch { return null; } })();
  const txSummary = (() => { try { return session.transaction_summary ? JSON.parse(session.transaction_summary) : null; } catch { return null; } })();
  const vendorLedger = (() => { try { return session.vendor_ledger ? JSON.parse(session.vendor_ledger) : null; } catch { return null; } })();
  const fileNames = (() => { try { return JSON.parse(session.file_names || '[]'); } catch { return []; } })();
  const reportsGenerated = (() => { try { return JSON.parse(session.reports_generated || '[]'); } catch { return []; } })();

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const autoApproved = transactions.filter(t => !t.needs_review).length;
  const isProcessing = ['extracting','uploading','generating'].includes(session.status);
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  const handleUpdateTransaction = (idx, updated) => setTransactions(prev => { const next = [...prev]; next[idx] = updated; return next; });

  const handleSaveReview = async () => {
    setSaving(true);
    const newReviewCount = transactions.filter(t => t.needs_review).length;
    await base44.entities.AccountingReport.update(session.id, {
      transactions_reviewed: JSON.stringify(transactions),
      review_count: newReviewCount,
      auto_approved_count: transactions.filter(t => !t.needs_review).length,
    });
    setSaving(false);
    onRefresh();
    toast({ title: '✅ Review saved' });
  };

  const handleGenerate = async () => {
    if (!selectedReports.length) { toast({ title: 'Select at least one report type', variant: 'destructive' }); return; }
    setGenerating(true);
    await base44.entities.AccountingReport.update(session.id, { status: 'generating' });
    const res = await base44.functions.invoke('generateAccountingReports', {
      mode: 'generate', report_id: session.id, report_types: selectedReports,
      date_from: dateFrom || null, date_to: dateTo || null,
    });
    setGenerating(false);
    onRefresh();
    if (res.data?.success) {
      toast({ title: `✅ ${res.data.generated.length} report${res.data.generated.length !== 1 ? 's' : ''} generated` });
      setActiveTab('gl');
      queryClient.invalidateQueries({ queryKey: ['accounting-report-detail', session.id] });
    } else {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  };

  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleExport = (type) => {
    if (type === 'transactions') {
      const rows = [['Date','Posting Date','Doc #','Invoice #','Vendor/Customer','Account','Code','Description','Debit','Credit','Tax','Currency','Category','Payment Method','Reference','Source File','Source Page','Confidence']];
      transactions.forEach(tx => rows.push([tx.transaction_date||'',tx.posting_date||'',tx.document_number||'',tx.invoice_number||'',tx.vendor_or_customer||'',tx.account_name||'',tx.account_code||'',tx.description||'',tx.debit_amount||'',tx.credit_amount||'',tx.tax_amount||'',tx.currency||'',tx.category||'',tx.payment_method||'',tx.reference_number||'',tx.source_file||'',tx.source_page||'',tx.confidence||'']));
      downloadCSV(rows, `Transactions_${session.session_name}.csv`);
    } else if (type === 'gl' && glReport) {
      const rows = [['Account Code','Account Name','Category','Date','Doc #','Description','Reference','Debit','Credit','Balance','Source']];
      for (const acct of (glReport.accounts||[])) for (const tx of acct.transactions) rows.push([acct.account_code||'',acct.account_name,acct.category,tx.transaction_date||'',tx.document_number||'',tx.description||'',tx.reference_number||'',tx.debit_amount||0,tx.credit_amount||0,tx.running_balance?.toFixed(2)||'',tx.source_file||'']);
      downloadCSV(rows, `GL_${session.session_name}.csv`);
    } else if (type === 'pl' && plReport) {
      const rows = [['Section','Account','Amount']];
      (plReport.revenue_lines||[]).forEach(l => rows.push(['Revenue',l.account,l.amount]));
      (plReport.cogs_lines||[]).forEach(l => rows.push(['COGS',l.account,l.amount]));
      rows.push(['Gross Profit','',plReport.gross_profit]);
      (plReport.operating_expense_lines||[]).forEach(l => rows.push(['Operating Expenses',l.account,l.amount]));
      rows.push(['Net Operating Income','',plReport.net_operating_income]);
      rows.push(['Net Profit / Loss','',plReport.net_profit]);
      downloadCSV(rows, `PL_${session.session_name}.csv`);
    } else if (type === 'trial_balance' && trialBalance) {
      const rows = [['Account Code','Account Name','Type','Category','Debit','Credit','Net Balance']];
      (trialBalance.accounts||[]).forEach(a => rows.push([a.account_code||'',a.account_name,a.account_type,a.category,a.debit_total,a.credit_total,a.net_balance]));
      rows.push(['','TOTALS','','',trialBalance.total_debits,trialBalance.total_credits,'']);
      downloadCSV(rows, `TrialBalance_${session.session_name}.csv`);
    }
    toast({ title: `${type.replace(/_/g,' ')} exported as CSV` });
  };

  const toggleReport = (id) => setSelectedReports(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

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
          {transactions.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('transactions')}><Download className="w-3.5 h-3.5" /> Transactions</Button>}
          {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
          {plReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('pl')}><Download className="w-3.5 h-3.5" /> P&L CSV</Button>}
          {trialBalance && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('trial_balance')}><Download className="w-3.5 h-3.5" /> TB CSV</Button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Files', value: fileNames.length, color: 'text-foreground', icon: FileText },
          { label: 'Transactions', value: session.transaction_count || transactions.length, color: 'text-foreground', icon: BookOpen },
          { label: 'Auto-Approved', value: autoApproved, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Exceptions', value: reviewCount, color: reviewCount > 0 ? 'text-amber-600' : 'text-green-600', icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{s.label}</p><s.icon className={`w-4 h-4 ${s.color} opacity-50`} /></div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Extraction progress */}
      {isProcessing && fileProgress.length > 0 && (
        <Card className="p-4"><ARFileProgress fileProgress={fileProgress} /></Card>
      )}

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
        <TabsList className="h-9 flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          {reviewCount > 0 && <TabsTrigger value="exceptions" className="text-xs gap-1">Exceptions <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewCount}</span></TabsTrigger>}
          <TabsTrigger value="transactions" className="text-xs">All Transactions</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs">Generate Reports</TabsTrigger>
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          {trialBalance && <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>}
          {txSummary && <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>}
          {vendorLedger && <TabsTrigger value="vendor" className="text-xs">Vendor Ledger</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {isProcessing ? (
            <Card className="p-6"><ARFileProgress fileProgress={fileProgress} /><p className="text-xs text-muted-foreground text-center mt-4">AI extraction running in background — you can navigate away and return.</p></Card>
          ) : (
            <>
              {session.total_debits > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-base font-bold font-mono text-red-600">${(session.total_debits||0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-base font-bold font-mono text-green-600">${(session.total_credits||0).toFixed(2)}</p></Card>
                  <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Difference</p>
                    <p className={`text-base font-bold font-mono ${Math.abs((session.total_debits||0)-(session.total_credits||0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs((session.total_debits||0)-(session.total_credits||0)).toFixed(2)}
                    </p>
                  </Card>
                </div>
              )}
              {fileMetadata.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Document Analysis</h3>
                  <div className="space-y-3">
                    {fileMetadata.map((fm, i) => (
                      <div key={i} className={`rounded-lg border px-3 py-2.5 ${fm.error ? 'border-red-200 bg-red-50' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium truncate">{fm.file_name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {fm.confidence_score > 0 && <span className="text-[10px] text-blue-600">{fm.confidence_score}%</span>}
                            <Badge className="text-[10px] border-0 bg-muted">{fm.document_type || fm.statement_type || 'doc'}</Badge>
                          </div>
                        </div>
                        {fm.error ? <p className="text-[10px] text-red-600 mt-1">{fm.error}</p> : (
                          <div className="flex flex-wrap gap-3 mt-1.5">
                            {fm.company_name && <span className="text-[10px] text-muted-foreground">🏢 {fm.company_name}</span>}
                            {fm.period_start && <span className="text-[10px] text-muted-foreground">📅 {fm.period_start} → {fm.period_end || '?'}</span>}
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
              <p className="text-xs text-muted-foreground">Edit inline, then approve. Clean transactions are already auto-approved.</p>
              <Button size="sm" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save & Approve
              </Button>
            </div>
            <ARTransactionTable transactions={transactions} onUpdate={handleUpdateTransaction} showOnlyReview />
          </div>
        </TabsContent>

        {/* ALL TRANSACTIONS */}
        <TabsContent value="transactions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{transactions.length} transactions · {autoApproved} approved · {reviewCount} exceptions</p>
              <Button size="sm" variant="outline" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null} Save Changes
              </Button>
            </div>
            <ARTransactionTable transactions={transactions} onUpdate={handleUpdateTransaction} />
          </div>
        </TabsContent>

        {/* GENERATE */}
        <TabsContent value="generate" className="mt-4">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2"><BarChart2 className="w-5 h-5 text-primary" /> Select Reports to Generate</h3>
              <p className="text-xs text-muted-foreground mt-1">Choose one or more report types. Leave date range blank to include all transactions.</p>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{reviewCount} exception{reviewCount !== 1 ? 's' : ''} still pending. Reports will use current data — resolve exceptions first for maximum accuracy.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${selectedReports.includes(opt.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => toggleReport(opt.id)}
                >
                  <Checkbox checked={selectedReports.includes(opt.id)} onCheckedChange={() => toggleReport(opt.id)} className="mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5"><opt.icon className="w-3.5 h-3.5 text-primary" /><p className="text-xs font-semibold">{opt.label}</p></div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1 h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            </div>
            <Button onClick={handleGenerate} disabled={generating || transactions.length === 0 || selectedReports.length === 0} className="w-full">
              {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating Reports…</> : <><BarChart2 className="w-4 h-4 mr-2" /> Generate {selectedReports.length} Report{selectedReports.length !== 1 ? 's' : ''}</>}
            </Button>
            {transactions.length === 0 && <p className="text-xs text-muted-foreground text-center">Waiting for extraction to complete…</p>}
          </Card>
        </TabsContent>

        {/* GL */}
        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3><p className="text-xs text-muted-foreground">Generated {new Date(glReport.generated_at).toLocaleString('en-CA')}</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARGLReport report={glReport} />
          </TabsContent>
        )}

        {/* P&L */}
        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3><p className="text-xs text-muted-foreground">Generated {new Date(plReport.generated_at).toLocaleString('en-CA')}</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('pl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARPLReport report={plReport} />
          </TabsContent>
        )}

        {/* TRIAL BALANCE */}
        {trialBalance && (
          <TabsContent value="tb" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><BarChart2 className="w-4 h-4 text-primary" /> Trial Balance</h3><p className="text-xs text-muted-foreground">Generated {new Date(trialBalance.generated_at).toLocaleString('en-CA')}</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('trial_balance')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <ARTrialBalance report={trialBalance} />
          </TabsContent>
        )}

        {/* TRANSACTION SUMMARY */}
        {txSummary && (
          <TabsContent value="summary" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Transaction Summary</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-xl font-bold">{txSummary.total_transactions}</p></Card>
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-xl font-bold font-mono text-red-600">${(txSummary.total_debits||0).toFixed(2)}</p></Card>
                <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-xl font-bold font-mono text-green-600">${(txSummary.total_credits||0).toFixed(2)}</p></Card>
              </div>
              <table className="w-full text-left border rounded-xl overflow-hidden">
                <thead className="bg-muted/50"><tr>{['Category','Count','Total Debit','Total Credit'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody>{(txSummary.by_category||[]).map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/10">
                    <td className="px-3 py-2 text-xs font-medium capitalize">{row.category.replace(/_/g,' ')}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{row.count}</td>
                    <td className="px-3 py-2 text-xs font-mono text-red-600">${(row.total_debit||0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs font-mono text-green-600">${(row.total_credit||0).toFixed(2)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          </TabsContent>
        )}

        {/* VENDOR LEDGER */}
        {vendorLedger && (
          <TabsContent value="vendor" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Vendor Ledger</h3>
              <div className="space-y-2">
                {(vendorLedger.vendors||[]).map((v, i) => (
                  <div key={i} className="rounded-lg border px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{v.vendor}</p>
                      <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{v.transaction_count} txns</span><span className="text-xs font-mono font-bold text-red-600">${v.total_paid.toFixed(2)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
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
                { label: 'Auto-Approved', value: session.auto_approved_count || autoApproved },
                { label: 'Exceptions Remaining', value: session.review_count || reviewCount },
                { label: 'Reports Generated', value: reportsGenerated.join(', ') || 'None yet' },
                { label: 'Date Range Detected', value: session.date_from ? `${session.date_from} → ${session.date_to || '?'}` : '—' },
                { label: 'Prepared By', value: 'SOC Ai Accounting System' },
                { label: 'Generated On', value: new Date().toLocaleString('en-CA') },
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
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
        const wasProcessing = ['extracting','generating'].includes(old_data?.status);
        const isDone = ['review','completed','failed'].includes(data?.status);
        if (wasProcessing && isDone) {
          const name = data.session_name || 'Session';
          if (data.status === 'failed') toast({ title: `❌ ${name} — processing failed`, variant: 'destructive' });
          else toast({ title: `✅ ${name} — extraction complete`, description: `${data.transaction_count || 0} transactions extracted · ${data.confidence_score || 0}% confidence` });
          queryClient.invalidateQueries({ queryKey: ['accounting-reports'] });
        }
      }
    });
    return unsubscribe;
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['accounting-reports'],
    queryFn: () => base44.entities.AccountingReport.list('-created_date'),
    refetchInterval: (q) => {
      const data = q.state.data;
      return Array.isArray(data) && data.some(s => ['extracting','generating'].includes(s.status)) ? 4000 : false;
    },
  });

  const handleDelete = async (id) => {
    queryClient.setQueryData(['accounting-reports'], (old) => (old || []).filter(s => s.id !== id));
    await base44.entities.AccountingReport.delete(id);
    queryClient.invalidateQueries({ queryKey: ['accounting-reports'] });
    toast({ title: 'Session deleted' });
  };

  const handleCreated = (record) => { queryClient.invalidateQueries({ queryKey: ['accounting-reports'] }); setActiveSession(record); };
  const handleOpenSession = async (session) => { const fresh = await base44.entities.AccountingReport.filter({ id: session.id }); setActiveSession(fresh[0] || session); };
  const handleRefresh = async () => {
    if (!activeSession) return;
    const fresh = await base44.entities.AccountingReport.filter({ id: activeSession.id });
    if (fresh?.length) setActiveSession(fresh[0]);
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
  const avgConfidence = sessions.filter(s => s.confidence_score > 0).length > 0
    ? Math.round(sessions.filter(s => s.confidence_score > 0).reduce((s, r) => s + r.confidence_score, 0) / sessions.filter(s => s.confidence_score > 0).length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" /> Accounting Report Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload financial documents → AI extracts & classifies → Review → Generate GL, P&L, Trial Balance & more</p>
        </div>
        <Button onClick={() => setNewSessionOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> New Report Session</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'text-foreground' },
          { label: 'Transactions Extracted', value: totalTx.toLocaleString(), color: 'text-foreground' },
          { label: 'Reports Generated', value: totalReports, color: 'text-green-600' },
          { label: 'Avg. Confidence', value: avgConfidence > 0 ? `${avgConfidence}%` : '—', color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label} className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></Card>
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
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
import {
  BookOpen, BarChart2, Upload, FileText, CheckCircle2, AlertTriangle,
  RefreshCw, Trash2, Eye, Download, Plus, ArrowLeft, Search,
  TrendingUp, Zap, XCircle, Scale, Calendar, ListChecks,
  Database, Layers, Cpu, ShieldCheck, History
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import BKUploadZone from '@/components/bookkeeper/BKUploadZone';
import BKFileClassification from '@/components/bookkeeper/BKFileClassification';
import BKFileProgress from '@/components/bookkeeper/BKFileProgress';
import BKTransactionTable from '@/components/bookkeeper/BKTransactionTable';
import BKGLReport from '@/components/bookkeeper/BKGLReport';
import BKPLReport from '@/components/bookkeeper/BKPLReport';
import BKReconReport from '@/components/bookkeeper/BKReconReport';
import BKDashboard from '@/components/bookkeeper/BKDashboard';

const STATUS_CONFIG = {
  uploading:    { label: 'Uploading',    color: 'bg-blue-100 text-blue-700',    icon: Upload },
  classifying:  { label: 'Classifying', color: 'bg-indigo-100 text-indigo-700', icon: Cpu },
  extracting:   { label: 'Extracting',  color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  reconciling:  { label: 'Reconciling', color: 'bg-cyan-100 text-cyan-700',     icon: Scale },
  review:       { label: 'Ready',       color: 'bg-amber-100 text-amber-700',   icon: AlertTriangle },
  generating:   { label: 'Generating',  color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:    { label: 'Completed',   color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  failed:       { label: 'Failed',      color: 'bg-red-100 text-red-700',       icon: XCircle },
};

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
  const isProc = ['uploading', 'classifying', 'extracting', 'reconciling', 'generating'].includes(session.status);
  const fileCount = (() => { try { return JSON.parse(session.file_names || '[]').length; } catch { return 0; } })();
  const recon = (() => { try { return JSON.parse(session.bank_reconciliation || '[]'); } catch { return []; } })();
  const reconOk = recon.length > 0 && recon.every(r => r.status === 'reconciled');

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-primary" />
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
              {session.duplicate_count > 0 && <span className="text-xs text-red-600 font-medium">⊕ {session.duplicate_count} dupes</span>}
              {recon.length > 0 && <span className={`text-xs font-medium ${reconOk ? 'text-green-600' : 'text-orange-600'}`}>{reconOk ? '✓ Reconciled' : '⚑ Recon Issues'}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
              {session.currency && <span className="text-xs text-muted-foreground">{session.currency}</span>}
              {session.date_from && <span className="text-xs text-muted-foreground">{session.date_from} → {session.date_to || '?'}</span>}
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
          <div><p className="text-[10px] text-muted-foreground">Net</p><p className={`text-xs font-mono font-bold ${((session.total_credits||0)-(session.total_debits||0))>=0?'text-green-600':'text-red-600'}`}>${Math.abs((session.total_credits||0)-(session.total_debits||0)).toFixed(2)}</p></div>
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
      setUploadProgress(Math.round(((i + 1) / files.length) * 60));
    }
    const record = await base44.entities.BookKeeperSession.create({
      session_name: sessionName.trim(), company_name: companyName.trim() || null,
      uploaded_by: user.email || user.full_name,
      file_names: JSON.stringify(files.map(f => f.name)), file_urls: JSON.stringify(fileUrls),
      currency, status: 'classifying',
    });
    const fileNames = files.map(f => f.name);
    setUploading(false); onOpenChange(false);
    setSessionName(''); setCompanyName(''); setFiles([]); setUploadProgress(0);
    toast({ title: '🤖 AI classifying documents…', description: `Analyzing ${fileNames.length} file(s) before extraction`, duration: 5000 });
    onCreated(record);

    // Step 1: classify
    const classRes = await base44.functions.invoke('bookKeeperProcess', {
      mode: 'classify', session_id: record.id, file_urls: fileUrls, file_names: fileNames,
    });

    if (!classRes?.data?.success) {
      toast({ title: '❌ Classification failed', variant: 'destructive', duration: 5000 });
      return;
    }

    toast({ title: '✅ Files classified — starting extraction…', duration: 5000 });

    // Step 2: extract
    const extractionPromise = base44.functions.invoke('bookKeeperProcess', {
      mode: 'extract_all', session_id: record.id, file_urls: fileUrls, file_names: fileNames,
      file_classifications: classRes.data.classifications,
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 600000));
    Promise.race([extractionPromise, timeoutPromise])
      .then(res => {
        if (res?.data?.success) {
          toast({
            title: res.data.has_failures ? '⚠️ Completed with some errors' : '✅ Extraction & reconciliation complete',
            description: `${res.data.transaction_count} transactions · ${res.data.review_count} need review`,
            duration: 5000
          });
        } else {
          toast({ title: '❌ Extraction failed', description: res?.data?.error, variant: 'destructive', duration: 5000 });
        }
      })
      .catch(() => {
        toast({ title: '⚠️ Timeout', description: 'Check session for partial results.', variant: 'destructive', duration: 5000 });
      });
  };

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> New Bookkeeping Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Session Name *</Label><Input className="mt-1" placeholder="e.g. Q1 2025 Bank Statements" value={sessionName} onChange={e => setSessionName(e.target.value)} disabled={uploading} /></div>
            <div><Label>Company Name</Label><Input className="mt-1" placeholder="Optional" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={uploading} /></div>
          </div>
          <div><Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={uploading}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Upload Financial Documents *</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">AI will automatically classify each file before extraction begins</p>
            <BKUploadZone files={files} onFilesChange={setFiles} disabled={uploading} />
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
            {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Zap className="w-4 h-4 mr-2" /> Upload & Start AI Analysis</>}
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
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: liveSession } = useQuery({
    queryKey: ['bk-detail', init.id],
    queryFn: async () => { try { const r = await base44.entities.BookKeeperSession.filter({ id: init.id }); return r[0] || init; } catch { return init; } },
    refetchInterval: q => ['classifying','extracting','reconciling','uploading','generating'].includes(q.state.data?.status || init.status) ? 1500 : false,
    initialData: init,
  });
  const session = liveSession || init;

  useEffect(() => {
    if (!['classifying','extracting','uploading'].includes(session.status)) {
      try { const p = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]'); if (p.length > 0) setTransactions(p); } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const parse = f => { try { return session[f] ? JSON.parse(session[f]) : null; } catch { return null; } };
  const fileProgress = parse('file_progress') || [];
  const classifications = parse('file_classifications') || [];
  const glReport = parse('gl_report');
  const plReport = parse('pl_report');
  const trialBalance = parse('trial_balance');
  const bankRecon = parse('bank_reconciliation') || [];
  const fileNames = parse('file_names') || [];
  const auditTrail = parse('audit_trail') || [];
  const reconSummary = parse('reconciliation_results');

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const dupeCount = transactions.filter(t => t.is_duplicate).length;
  const uncatCount = transactions.filter(t => !t.category || t.category === 'uncategorized').length;
  const isProc = ['classifying','extracting','reconciling','uploading','generating'].includes(session.status);
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  const handleUpdate = (idx, updated) => setTransactions(prev => { const n = [...prev]; n[idx] = updated; return n; });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.BookKeeperSession.update(session.id, {
      transactions_reviewed: JSON.stringify(transactions),
      review_count: transactions.filter(t => t.needs_review).length,
    });
    setSaving(false); onRefresh();
    toast({ title: '✅ Changes saved', duration: 5000 });
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    await base44.entities.BookKeeperSession.update(session.id, { status: 'generating' });
    const res = await base44.functions.invoke('bookKeeperProcess', {
      mode: 'regenerate', session_id: session.id,
      report_types: ['gl', 'pl', 'trial_balance', 'monthly_summary', 'review_items'],
    });
    setGenerating(false);
    if (res.data?.success) {
      toast({ title: '✅ Reports regenerated', duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['bk-detail', session.id] });
      onRefresh();
    } else {
      toast({ title: 'Regeneration failed', variant: 'destructive', duration: 5000 });
    }
  };

  const handleExport = type => {
    if (type === 'transactions') {
      downloadCSV([['Date','Description','Vendor','Reference','Debit','Credit','Balance','Category','Account','Review','Duplicate','Source File','Confidence','Notes'],
        ...transactions.map(t => [t.transaction_date||'',t.description||'',t.vendor_or_customer||'',t.reference_number||'',t.debit_amount||'',t.credit_amount||'',t.running_balance||'',t.category||'',t.account_name||'',t.needs_review?'Yes':'No',t.is_duplicate?'Yes':'No',t.source_file||'',t.confidence||'',t.user_notes||''])
      ], `Transactions_${session.session_name}.csv`);
    } else if (type === 'gl' && glReport) {
      downloadCSV([['Account','Category','Date','Description','Ref #','Debit','Credit','GL Balance','Source'],
        ...(glReport.accounts||[]).flatMap(a => a.transactions.map(t => [a.account_name,a.category,t.transaction_date||'',t.description||'',t.reference_number||t.cheque_number||'',t.debit_amount||0,t.credit_amount||0,(t.running_balance_gl||0).toFixed(2),t.source_file||'']))
      ], `GL_${session.session_name}.csv`);
    } else if (type === 'recon') {
      downloadCSV([['File','Institution','Period Start','Period End','Opening','Credits','Debits','Calc Closing','Closing','Diff','Status','Dupes'],
        ...bankRecon.map(r => [r.file_name,r.institution_name||'',r.period_start||'',r.period_end||'',r.opening_balance??'',r.total_credits,r.total_debits,r.calculated_closing??'',r.closing_balance??'',r.difference??'',r.status,r.duplicate_count||0])
      ], `Reconciliation_${session.session_name}.csv`);
    }
    toast({ title: `Exported to CSV`, duration: 5000 });
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
          {!isProc && transactions.length > 0 && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleRegenerate} disabled={generating}>
              {generating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><BarChart2 className="w-3.5 h-3.5" /> Regenerate Reports</>}
            </Button>
          )}
          {transactions.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('transactions')}><Download className="w-3.5 h-3.5" /> Transactions CSV</Button>}
          {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
          {bankRecon.length > 0 && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('recon')}><Download className="w-3.5 h-3.5" /> Recon CSV</Button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Files', val: fileNames.length, icon: FileText },
          { label: 'Transactions', val: session.transaction_count || transactions.length, icon: Database },
          { label: 'Credits', val: session.total_credits ? `$${session.total_credits.toFixed(0)}` : '—', icon: TrendingUp, c: 'text-green-600' },
          { label: 'Debits', val: session.total_debits ? `$${session.total_debits.toFixed(0)}` : '—', icon: TrendingUp, c: 'text-red-600' },
          { label: 'Review Items', val: reviewCount, icon: AlertTriangle, c: reviewCount > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Duplicates', val: dupeCount, icon: Database, c: dupeCount > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(s => (
          <Card key={s.label} className="p-3">
            <div className="flex items-center justify-between"><p className="text-[10px] text-muted-foreground">{s.label}</p><s.icon className={`w-3.5 h-3.5 opacity-40 ${s.c || ''}`} /></div>
            <p className={`text-lg font-bold mt-0.5 ${s.c || ''}`}>{s.val}</p>
          </Card>
        ))}
      </div>

      {/* Processing progress */}
      {isProc && (
        <Card className="p-4 space-y-3">
          {session.status === 'classifying' && (
            <div className="flex items-center gap-2 text-sm"><Cpu className="w-4 h-4 text-indigo-600 animate-spin" /> <span className="font-semibold">AI is classifying your documents…</span></div>
          )}
          {['extracting','reconciling'].includes(session.status) && fileProgress.length > 0 && <BKFileProgress fileProgress={fileProgress} label="Extracting" />}
          <p className="text-xs text-center text-muted-foreground">You can navigate away and return — processing continues in the background.</p>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          {classifications.length > 0 && <TabsTrigger value="classification" className="text-xs">File Classification</TabsTrigger>}
          <TabsTrigger value="transactions" className="text-xs">All Transactions{transactions.length > 0 ? ` (${transactions.length})` : ''}</TabsTrigger>
          {reviewCount > 0 && <TabsTrigger value="review" className="text-xs gap-1">Review Items <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{reviewCount}</span></TabsTrigger>}
          {bankRecon.length > 0 && <TabsTrigger value="recon" className="text-xs">Bank Reconciliation</TabsTrigger>}
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          {trialBalance && <TabsTrigger value="tb" className="text-xs">Trial Balance</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {reconSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Reconciled Files</p><p className="text-base font-bold text-green-600">{reconSummary.reconciled_files}/{reconSummary.total_files}</p></Card>
              <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Matched Txns</p><p className="text-base font-bold text-green-600">{reconSummary.total_matched}</p></Card>
              <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Flagged for Review</p><p className="text-base font-bold text-amber-600">{reconSummary.total_unmatched}</p></Card>
              <Card className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Reconciliation</p><p className={`text-base font-bold ${reconSummary.completion_pct >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{reconSummary.completion_pct}%</p></Card>
            </div>
          )}
          {!transactions.length && !isProc && (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">{session.status === 'failed' ? 'Extraction failed — try creating a new session.' : 'No transactions extracted yet.'}</p>
            </div>
          )}
          {transactions.length > 0 && !isProc && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-2">Categorization Summary</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center"><p className="text-lg font-bold text-green-600">{transactions.filter(t => !t.needs_review && t.category !== 'uncategorized').length}</p><p className="text-[10px] text-muted-foreground">Auto-categorized</p></div>
                <div className="text-center"><p className="text-lg font-bold text-amber-600">{reviewCount}</p><p className="text-[10px] text-muted-foreground">Needs Review</p></div>
                <div className="text-center"><p className="text-lg font-bold text-red-600">{uncatCount}</p><p className="text-[10px] text-muted-foreground">Uncategorized</p></div>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* FILE CLASSIFICATION */}
        {classifications.length > 0 && (
          <TabsContent value="classification" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">AI-detected document types. Override if classification is incorrect.</p>
            <BKFileClassification classifications={classifications} onOverride={() => {}} />
          </TabsContent>
        )}

        {/* ALL TRANSACTIONS */}
        <TabsContent value="transactions" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{transactions.length} transactions · {transactions.filter(t => !t.needs_review).length} categorized · {reviewCount} flagged · {dupeCount} duplicates</p>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-8 text-xs">
              {saving ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" /></> : null} Save Changes
            </Button>
          </div>
          <BKTransactionTable transactions={transactions} onUpdate={handleUpdate} />
        </TabsContent>

        {/* REVIEW ITEMS */}
        {reviewCount > 0 && (
          <TabsContent value="review" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{reviewCount} items flagged — edit category and save before generating final reports.</p>
              <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Save
              </Button>
            </div>
            <BKTransactionTable transactions={transactions} onUpdate={handleUpdate} showOnlyReview />
          </TabsContent>
        )}

        {/* BANK RECONCILIATION */}
        {bankRecon.length > 0 && (
          <TabsContent value="recon" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Bank Reconciliation</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('recon')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <BKReconReport reconciliations={bankRecon} />
          </TabsContent>
        )}

        {/* GENERAL LEDGER */}
        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3>
                <p className="text-xs text-muted-foreground">{glReport.transaction_count} txns · {glReport.accounts?.length} accounts</p></div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExport('gl')}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
            </div>
            <BKGLReport report={glReport} />
          </TabsContent>
        )}

        {/* PROFIT & LOSS */}
        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3>
              <p className="text-xs text-muted-foreground">{plReport.included_count} transactions included · {plReport.excluded_count} excluded</p>
            </div>
            <BKPLReport report={plReport} />
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
                  <p className={`text-base font-bold ${trialBalance.is_balanced ? 'text-green-600' : 'text-red-600'}`}>{trialBalance.is_balanced ? 'Balanced ✓' : 'Imbalanced ✗'}</p>
                </Card>
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50"><tr>{['Account','Category','Debit','Credit','Net Balance'].map(h => <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>
                    {(trialBalance.accounts || []).map((a, i) => (
                      <tr key={i} className="border-t hover:bg-muted/10">
                        <td className="px-3 py-2 text-xs font-medium">{a.account_name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{(a.category || '').replace(/_/g, ' ')}</td>
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
            <div className="space-y-3 mb-4">
              {auditTrail.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">{entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-CA') : '—'}</span>
                  <span className="font-medium capitalize">{(entry.action || '').replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              {[
                { label: 'Session Name', value: session.session_name },
                { label: 'Company', value: session.company_name || '—' },
                { label: 'Uploaded By', value: session.uploaded_by || '—' },
                { label: 'Currency', value: session.currency || '—' },
                { label: 'Source Files', value: fileNames.join(', ') || '—' },
                { label: 'Confidence Score', value: session.confidence_score ? `${session.confidence_score}%` : '—' },
                { label: 'Total Transactions', value: session.transaction_count || transactions.length },
                { label: 'Duplicates Detected', value: session.duplicate_count || dupeCount },
                { label: 'Uncategorized', value: uncatCount },
                { label: 'Statement Period', value: session.date_from ? `${session.date_from} → ${session.date_to || '?'}` : '—' },
                { label: 'System', value: 'SOC Ai Book Keeper Engine' },
                { label: 'Report Generated', value: new Date().toLocaleString('en-CA') },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-start gap-4 py-1.5 border-b last:border-0">
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BookKeeper() {
  const [newOpen, setNewOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const unsub = base44.entities.BookKeeperSession.subscribe(event => {
      if (event.type === 'update') {
        const { data, old_data } = event;
        const wasProc = ['classifying','extracting','reconciling','uploading'].includes(old_data?.status);
        const isDone = ['review','completed','failed'].includes(data?.status);
        if (wasProc && isDone) {
          if (data.status === 'failed') toast({ title: `❌ ${data.session_name} — failed`, variant: 'destructive', duration: 5000 });
          else toast({ title: `✅ ${data.session_name} — ready for review`, description: `${data.transaction_count || 0} transactions extracted`, duration: 5000 });
          queryClient.invalidateQueries({ queryKey: ['bookkeeper-sessions'] });
        }
      }
    });
    return unsub;
  }, []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['bookkeeper-sessions'],
    queryFn: () => base44.entities.BookKeeperSession.list('-created_date'),
    refetchInterval: q => Array.isArray(q.state.data) && q.state.data.some(s => ['classifying','extracting','reconciling','uploading'].includes(s.status)) ? 2000 : false,
  });

  const handleDelete = async id => {
    queryClient.setQueryData(['bookkeeper-sessions'], old => (old || []).filter(s => s.id !== id));
    await base44.entities.BookKeeperSession.delete(id);
    toast({ title: 'Session deleted', duration: 5000 });
  };

  const handleCreated = record => { queryClient.invalidateQueries({ queryKey: ['bookkeeper-sessions'] }); setActiveSession(record); };
  const handleOpen = async session => { try { const r = await base44.entities.BookKeeperSession.filter({ id: session.id }); setActiveSession(r[0] || session); } catch { setActiveSession(session); } };
  const handleRefresh = async () => {
    if (!activeSession) return;
    try { const r = await base44.entities.BookKeeperSession.filter({ id: activeSession.id }); if (r?.length) setActiveSession(r[0]); } catch {}
    queryClient.invalidateQueries({ queryKey: ['bookkeeper-sessions'] });
  };

  const filtered = sessions.filter(s => !search || s.session_name?.toLowerCase().includes(search.toLowerCase()) || s.company_name?.toLowerCase().includes(search.toLowerCase()));

  if (activeSession) return (
    <div className="space-y-6">
      <SessionDetail session={activeSession} onBack={() => { setActiveSession(null); queryClient.invalidateQueries({ queryKey: ['bookkeeper-sessions'] }); }} onRefresh={handleRefresh} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> Book Keeper</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload financial documents → AI classifies, extracts, reconciles & generates GL, P&L, Bank Reconciliation and more</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2 flex-shrink-0"><Plus className="w-4 h-4" /> New Bookkeeping Session</Button>
      </div>

      {sessions.length > 0 && <BKDashboard sessions={sessions} />}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-9 text-sm" placeholder="Search sessions…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="w-16 h-16 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-semibold">No bookkeeping sessions yet</p>
          <p className="text-xs mt-1 mb-4">Upload bank statements, invoices, receipts, CSV, Excel, OFX or PDF files to get started</p>
          <div className="flex flex-wrap justify-center gap-2 mb-6 text-[10px] text-muted-foreground">
            {['Bank Statements','Credit Card Statements','Invoices','Receipts','Payroll Reports','Sales Reports','Expense Reports','Tax Reports','CSV Exports','Excel Files'].map(t => (
              <span key={t} className="border rounded-full px-2.5 py-0.5">{t}</span>
            ))}
          </div>
          <Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Bookkeeping Session</Button>
        </div>
      ) : (
        <div className="grid gap-4">{filtered.map(s => <SessionCard key={s.id} session={s} onOpen={handleOpen} onDelete={handleDelete} />)}</div>
      )}

      <NewSessionDialog open={newOpen} onOpenChange={setNewOpen} onCreated={handleCreated} />
    </div>
  );
}
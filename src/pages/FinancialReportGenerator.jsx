import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  BarChart2, Upload, FileText, CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Trash2, Eye, Download, Plus, History, ChevronRight,
  TrendingUp, BookOpen, ArrowLeft, Shield, Search
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import UploadZone from '@/components/financial/UploadZone';
import TransactionReviewTable from '@/components/financial/TransactionReviewTable';
import GLReportView from '@/components/financial/GLReportView';
import PLReportView from '@/components/financial/PLReportView';

const STATUS_CONFIG = {
  uploading:   { label: 'Uploading',   color: 'bg-blue-100 text-blue-700',   icon: Upload },
  extracting:  { label: 'Extracting',  color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  review:      { label: 'Needs Review', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  generating:  { label: 'Generating',  color: 'bg-indigo-100 text-indigo-700', icon: RefreshCw },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed:      { label: 'Failed',      color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
};

const SEVERITY_COLORS = {
  high:   'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low:    'bg-blue-50 border-blue-200 text-blue-800',
};

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onOpen, onDelete }) {
  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;
  const fileNames = session.file_names ? JSON.parse(session.file_names) : [];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{session.session_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className="w-3 h-3" /> {sc.label}
              </Badge>
              {session.transaction_count > 0 && (
                <span className="text-xs text-muted-foreground">{session.transaction_count} transactions</span>
              )}
              {session.review_count > 0 && (
                <span className="text-xs text-amber-600 font-medium">{session.review_count} need review</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{fileNames.length} file{fileNames.length !== 1 ? 's' : ''} · {session.uploaded_by} · {session.upload_date ? new Date(session.upload_date).toLocaleDateString('en-CA') : ''}</p>
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
          <div><p className="text-[10px] text-muted-foreground">Debits</p><p className="text-xs font-mono font-bold">${(session.total_debits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Credits</p><p className="text-xs font-mono font-bold">${(session.total_credits || 0).toFixed(2)}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Difference</p>
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
  const { toast } = useToast();

  const handleStart = async () => {
    if (!sessionName.trim() || !files.length) return;
    setUploading(true);
    const user = await base44.auth.me();
    const fileNames = files.map(f => f.name);
    const fileUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrls.push(file_url);
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
    toast({ title: 'Upload started — extracting financial data…' });
    onCreated(record);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> New Financial Report Session
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 overflow-y-auto flex-1">
          <div>
            <Label>Session Name *</Label>
            <Input
              className="mt-1"
              placeholder="e.g. Q1 2024 Reconciliation"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
            />
          </div>
          <div>
            <Label>Upload Accounting Documents *</Label>
            <div className="mt-1">
              <UploadZone files={files} onFilesChange={setFiles} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleStart} disabled={!sessionName.trim() || !files.length || uploading}>
            {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload & Extract</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Session Detail View ──────────────────────────────────────────────────────
function SessionDetail({ session: initialSession, onBack, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-poll while extracting/generating
  const { data: liveSession } = useQuery({
    queryKey: ['financial-report-detail', initialSession.id],
    queryFn: async () => {
      const rows = await base44.entities.FinancialReport.filter({ id: initialSession.id });
      return rows[0] || initialSession;
    },
    refetchInterval: (query) => {
      const s = query.state.data?.status || initialSession.status;
      return (s === 'extracting' || s === 'generating') ? 3000 : false;
    },
    initialData: initialSession,
  });

  const session = liveSession || initialSession;

  const [transactions, setTransactions] = useState(() => {
    try { return JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]'); } catch { return []; }
  });

  // Sync transactions when extraction completes
  useEffect(() => {
    if (session.status !== 'extracting' && (session.transactions_reviewed || session.transactions_raw)) {
      try {
        const parsed = JSON.parse(session.transactions_reviewed || session.transactions_raw || '[]');
        setTransactions(parsed);
      } catch {}
    }
  }, [session.status, session.transactions_reviewed, session.transactions_raw]);

  const validationIssues = (() => { try { return JSON.parse(session.validation_issues || '[]'); } catch { return []; } })();
  const glReport = (() => { try { return session.gl_report ? JSON.parse(session.gl_report) : null; } catch { return null; } })();
  const plReport = (() => { try { return session.pl_report ? JSON.parse(session.pl_report) : null; } catch { return null; } })();
  const fileNames = (() => { try { return JSON.parse(session.file_names || '[]'); } catch { return []; } })();

  const reviewCount = transactions.filter(t => t.needs_review).length;
  const mappedCount = transactions.filter(t => !t.needs_review && t.category !== 'unclassified').length;

  const handleUpdateTransaction = async (idx, updated) => {
    const next = [...transactions];
    next[idx] = updated;
    setTransactions(next);
  };

  const handleSaveReview = async () => {
    setSaving(true);
    const reviewCount = transactions.filter(t => t.needs_review).length;
    await base44.entities.FinancialReport.update(session.id, {
      transactions_reviewed: JSON.stringify(transactions),
      review_count: reviewCount,
      mapped_count: transactions.filter(t => !t.needs_review && t.category !== 'unclassified').length,
      status: reviewCount === 0 ? 'completed' : 'review',
    });
    setSaving(false);
    onRefresh();
    toast({ title: '✅ Review saved — transactions updated' });
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
      toast({ title: '✅ Reports generated — GL and P&L ready' });
      setActiveTab('gl');
    } else {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  };

  const handleExportCSV = (type) => {
    const report = type === 'gl' ? glReport : null;
    if (type === 'gl' && report) {
      const rows = [['Date', 'Account', 'Account Code', 'Category', 'Description', 'Debit', 'Credit', 'Running Balance']];
      for (const acct of (report.accounts || [])) {
        let running = acct.opening_balance;
        for (const tx of acct.transactions) {
          running += (tx.debit_amount || 0) - (tx.credit_amount || 0);
          rows.push([tx.transaction_date || '', acct.account_name, acct.account_code || '', acct.category, tx.description || '', tx.debit_amount || 0, tx.credit_amount || 0, running.toFixed(2)]);
        }
      }
      downloadCSV(rows, `GL_Report_${session.session_name}.csv`);
    } else if (type === 'pl' && plReport) {
      const rows = [['Section', 'Account', 'Amount']];
      (plReport.revenue_lines || []).forEach(l => rows.push(['Revenue', l.account, l.amount]));
      (plReport.cogs_lines || []).forEach(l => rows.push(['COGS', l.account, l.amount]));
      rows.push(['Gross Profit', '', plReport.gross_profit]);
      (plReport.operating_expense_lines || []).forEach(l => rows.push(['Operating Expenses', l.account, l.amount]));
      rows.push(['Net Operating Income', '', plReport.net_operating_income]);
      (plReport.other_income_lines || []).forEach(l => rows.push(['Other Income', l.account, l.amount]));
      (plReport.other_expense_lines || []).forEach(l => rows.push(['Other Expenses', l.account, l.amount]));
      rows.push(['Net Profit / Loss', '', plReport.net_profit]);
      downloadCSV(rows, `PL_Report_${session.session_name}.csv`);
    }
    toast({ title: `${type.toUpperCase()} report exported as CSV` });
  };

  const downloadCSV = (rows, filename) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const sc = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = sc.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-display font-bold">{session.session_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                <StatusIcon className={`w-3 h-3 ${session.status === 'extracting' || session.status === 'generating' ? 'animate-spin' : ''}`} /> {sc.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{fileNames.length} file{fileNames.length !== 1 ? 's' : ''} · {session.uploaded_by}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {(glReport || plReport) && (
            <>
              {glReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}><Download className="w-3.5 h-3.5" /> GL CSV</Button>}
              {plReport && <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('pl')}><Download className="w-3.5 h-3.5" /> P&L CSV</Button>}
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Files Uploaded', value: fileNames.length, color: 'text-foreground', icon: FileText },
          { label: 'Transactions', value: session.transaction_count || transactions.length, color: 'text-foreground', icon: BookOpen },
          { label: 'Successfully Mapped', value: mappedCount, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Needs Review', value: reviewCount, color: reviewCount > 0 ? 'text-amber-600' : 'text-green-600', icon: AlertTriangle },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color} opacity-60`} />
            </div>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Debit/Credit Summary */}
      {(session.total_debits > 0 || session.total_credits > 0) && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Debits', value: session.total_debits, color: 'text-red-600' },
            { label: 'Total Credits', value: session.total_credits, color: 'text-green-600' },
            { label: 'Difference', value: Math.abs((session.total_debits || 0) - (session.total_credits || 0)), color: Math.abs((session.total_debits || 0) - (session.total_credits || 0)) < 0.01 ? 'text-green-600' : 'text-red-600' },
          ].map(s => (
            <Card key={s.label} className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${s.color}`}>${(s.value || 0).toFixed(2)}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-amber-500" /> Validation Issues</h3>
          {validationIssues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low}`}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{issue.message}</span>
              <span className={`ml-auto capitalize font-semibold flex-shrink-0 ${issue.severity === 'high' ? 'text-red-700' : issue.severity === 'medium' ? 'text-amber-700' : 'text-blue-700'}`}>{issue.severity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1">
            Review {reviewCount > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] px-1 rounded-full">{reviewCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="all_transactions" className="text-xs">All Transactions</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs">Generate Reports</TabsTrigger>
          {glReport && <TabsTrigger value="gl" className="text-xs">General Ledger</TabsTrigger>}
          {plReport && <TabsTrigger value="pl" className="text-xs">Profit & Loss</TabsTrigger>}
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {fileNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </Card>
          {session.status === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium">Extracting financial data with AI…</p>
              <p className="text-xs text-muted-foreground">This may take a few minutes for large documents</p>
              <Button variant="outline" size="sm" onClick={onRefresh} className="mt-2">Check Status</Button>
            </div>
          )}
          {session.notes && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-2">Notes</h3>
              <p className="text-xs text-muted-foreground">{session.notes}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          {reviewCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500 opacity-70" />
              <p className="text-sm font-medium">All transactions confirmed — no items need review</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-amber-700 font-medium">{reviewCount} transaction{reviewCount !== 1 ? 's' : ''} need your review. Edit any field and confirm to approve.</p>
                <Button size="sm" onClick={handleSaveReview} disabled={saving} className="h-8 text-xs">
                  {saving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Save Review
                </Button>
              </div>
              <TransactionReviewTable transactions={transactions} onUpdate={handleUpdateTransaction} showOnlyReview />
            </div>
          )}
        </TabsContent>

        <TabsContent value="all_transactions" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{transactions.length} total transactions extracted</p>
              <Button size="sm" onClick={handleSaveReview} disabled={saving} variant="outline" className="h-8 text-xs">
                {saving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null} Save Changes
              </Button>
            </div>
            <TransactionReviewTable transactions={transactions} onUpdate={handleUpdateTransaction} />
          </div>
        </TabsContent>

        <TabsContent value="generate" className="mt-4">
          <Card className="p-6">
            <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Generate Reports
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Optionally filter by date range before generating. Leave blank to include all transactions.</p>
            {reviewCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-4 text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                <span>{reviewCount} transaction{reviewCount !== 1 ? 's' : ''} still need{reviewCount === 1 ? 's' : ''} review. Reports will be generated with current data — consider reviewing first for maximum accuracy.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-xs">Date From</Label>
                <Input type="date" className="mt-1 h-9 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date To</Label>
                <Input type="date" className="mt-1 h-9 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleGenerate} disabled={generating || transactions.length === 0} className="flex-1">
                {generating
                  ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                  : <><BarChart2 className="w-4 h-4 mr-2" /> Generate GL & P&L Reports</>}
              </Button>
            </div>
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">No transactions available — please wait for extraction to complete.</p>
            )}
          </Card>
        </TabsContent>

        {glReport && (
          <TabsContent value="gl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> General Ledger</h3>
                <p className="text-xs text-muted-foreground">Generated {new Date(glReport.generated_at).toLocaleString('en-CA')}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('gl')}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <GLReportView report={glReport} />
          </TabsContent>
        )}

        {plReport && (
          <TabsContent value="pl" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Profit & Loss</h3>
                <p className="text-xs text-muted-foreground">Generated {new Date(plReport.generated_at).toLocaleString('en-CA')}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportCSV('pl')}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
            <PLReportView report={plReport} />
          </TabsContent>
        )}

        <TabsContent value="audit" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Audit Trail</h3>
            <div className="space-y-3">
              {[
                { label: 'Session Created', value: session.upload_date ? new Date(session.upload_date).toLocaleString('en-CA') : '—' },
                { label: 'Uploaded By', value: session.uploaded_by || '—' },
                { label: 'Files Uploaded', value: fileNames.join(', ') || '—' },
                { label: 'Extraction Status', value: STATUS_CONFIG[session.status]?.label || session.status },
                { label: 'Transactions Extracted', value: session.transaction_count || transactions.length },
                { label: 'Transactions Needing Review', value: session.review_count || reviewCount },
                { label: 'Successfully Mapped', value: session.mapped_count || mappedCount },
                { label: 'GL Report Generated', value: session.gl_generated_at ? new Date(session.gl_generated_at).toLocaleString('en-CA') : 'Not yet generated' },
                { label: 'P&L Report Generated', value: session.pl_generated_at ? new Date(session.pl_generated_at).toLocaleString('en-CA') : 'Not yet generated' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground font-medium w-48 flex-shrink-0">{row.label}</span>
                  <span className="text-xs text-right">{row.value}</span>
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

  // Realtime notification when any session finishes extracting
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
            toast({ title: `✅ ${name} — extraction complete`, description: `${data.transaction_count || 0} transactions ready for review.` });
          }
          queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
        }
      }
    });
    return unsubscribe;
  }, []);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['financial-reports'],
    queryFn: () => base44.entities.FinancialReport.list('-created_date'),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = Array.isArray(data) && data.some(s => s.status === 'extracting' || s.status === 'generating');
      return hasActive ? 5000 : false;
    },
  });

  const handleDelete = async (id) => {
    queryClient.setQueryData(['financial-reports'], (old) => (old || []).filter(s => s.id !== id));
    await base44.entities.FinancialReport.delete(id);
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    toast({ title: 'Session deleted' });
  };

  const handleCreated = async (record) => {
    queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    setActiveSession(record);
    // Extraction is handled automatically by the entity automation
  };

  const handleOpenSession = async (session) => {
    // Fetch fresh data
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
  const totalReview = sessions.reduce((s, r) => s + (r.review_count || 0), 0);
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" /> Financial Report Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Upload accounting documents, extract transactions, generate GL & P&L reports</p>
        </div>
        <Button onClick={() => setNewSessionOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Report Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, color: 'text-foreground' },
          { label: 'Transactions Extracted', value: totalTransactions, color: 'text-foreground' },
          { label: 'Completed Reports', value: completedSessions, color: 'text-green-600' },
          { label: 'Needing Review', value: totalReview, color: totalReview > 0 ? 'text-amber-600' : 'text-green-600' },
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
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No report sessions yet</p>
          <p className="text-xs mt-1 mb-4">Upload accounting documents to get started</p>
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
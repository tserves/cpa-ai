import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Brain, AlertTriangle, CheckCircle2, Clock, FileText,
  ChevronDown, ChevronUp, Search, BarChart2, ArrowRight, RefreshCw, Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const DOC_TYPES = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'receipt', label: 'Receipt / Invoice' },
  { value: 'pdf_financial', label: 'Financial Report (PDF)' },
  { value: 'csv_export', label: 'Bank / Accounting Export (CSV)' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
];

const statusConfig = {
  pending:    { label: 'Pending',       color: 'bg-gray-100 text-gray-600',   icon: Clock },
  processing: { label: 'Processing…',   color: 'bg-blue-100 text-blue-700',   icon: RefreshCw },
  completed:  { label: 'Completed',     color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  needs_review: { label: 'Needs Review', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  failed:     { label: 'Failed',        color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
};

const severityColor = {
  high:   'border-red-300 bg-red-50 text-red-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-800',
  low:    'border-blue-200 bg-blue-50 text-blue-800',
};

function AnomalyBadge({ severity }) {
  const colors = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-blue-100 text-blue-700' };
  return <Badge className={`${colors[severity]} border-0 text-xs capitalize`}>{severity}</Badge>;
}

function ProcessedDocCard({ doc, onReview }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusConfig[doc.status] || statusConfig.pending;
  const StatusIcon = sc.icon;
  const anomalies = doc.anomalies ? JSON.parse(doc.anomalies) : [];
  const extracted = doc.extracted_data ? JSON.parse(doc.extracted_data) : null;
  const transactions = extracted?.transactions || [];
  const entries = extracted?.accounting_entries || [];

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{doc.document_name}</p>
              {doc.client_name && <p className="text-xs text-muted-foreground">{doc.client_name}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={`${sc.color} border-0 text-xs flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" /> {sc.label}
                </Badge>
                {doc.anomaly_count > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {doc.anomaly_count} anomal{doc.anomaly_count === 1 ? 'y' : 'ies'}
                  </Badge>
                )}
                {doc.mapped_to_accounting && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mapped
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {doc.total_amount !== undefined && doc.total_amount !== null && (
              <span className="text-sm font-bold">${doc.total_amount?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
            )}
            {doc.status === 'needs_review' && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onReview(doc)}>
                <Eye className="w-3.5 h-3.5 mr-1" /> Review
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {expanded && extracted && (
        <div className="border-t px-4 pb-4">
          <Tabs defaultValue="transactions" className="mt-4">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="transactions" className="text-xs">Transactions ({transactions.length})</TabsTrigger>
              <TabsTrigger value="anomalies" className="text-xs">Anomalies ({anomalies.length})</TabsTrigger>
              <TabsTrigger value="journal" className="text-xs">Journal ({entries.length})</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              {transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No transactions extracted</p>
              ) : (
                <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                  {transactions.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 text-xs gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{tx.description}</span>
                        <span className="text-muted-foreground">{tx.date} · {tx.category}</span>
                      </div>
                      <span className={`font-bold flex-shrink-0 ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="anomalies">
              {anomalies.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> No anomalies detected
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {anomalies.map((a, i) => (
                    <div key={i} className={`rounded-lg border p-3 text-xs ${severityColor[a.severity] || severityColor.low}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold capitalize">{a.type?.replace(/_/g, ' ')}</span>
                        <AnomalyBadge severity={a.severity} />
                      </div>
                      <p>{a.description}</p>
                      {a.amount && <p className="mt-1 font-medium">Amount: ${Math.abs(a.amount).toFixed(2)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="journal">
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No journal entries generated</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {entries.map((e, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 p-3 text-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-green-700">DR {e.debit_account}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-red-700">CR {e.credit_account}</span>
                        <span className="ml-auto font-bold">${e.amount?.toFixed(2)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{e.description} · {e.date}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="summary">
              <div className="mt-3 space-y-2 text-sm">
                {extracted.document_summary && <p className="text-muted-foreground text-xs">{extracted.document_summary}</p>}
                {extracted.summary_by_category && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {Object.entries(extracted.summary_by_category).filter(([, v]) => v !== 0).map(([cat, val]) => (
                      <div key={cat} className="rounded-lg bg-muted/50 p-2 text-xs">
                        <p className="text-muted-foreground capitalize">{cat}</p>
                        <p className={`font-bold ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {val >= 0 ? '+' : ''}${Math.abs(val).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {doc.period_start && <p className="text-xs text-muted-foreground">Period: {doc.period_start} → {doc.period_end || 'N/A'}</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
}

export default function AIDocumentPipeline() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDoc, setReviewDoc] = useState(null);
  const [form, setForm] = useState({ document_name: '', client_id: '', client_name: '', document_type: 'bank_statement' });
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => base44.entities.Client.list() });
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['processed-docs'],
    queryFn: () => base44.entities.ProcessedDocument.list('-created_date'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProcessedDocument.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processed-docs'] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setForm(f => ({ ...f, document_name: f.document_name || file.name }));
    setUploading(false);
  };

  const handleClientChange = (id) => {
    const client = clients.find(c => c.id === id);
    setForm(f => ({ ...f, client_id: id, client_name: client?.name || '' }));
  };

  const handleProcess = async () => {
    if (!fileUrl) return;
    setProcessing(true);

    // Create pending record
    const record = await base44.entities.ProcessedDocument.create({
      document_name: form.document_name,
      client_id: form.client_id,
      client_name: form.client_name,
      document_type: form.document_type,
      file_url: fileUrl,
      status: 'processing',
    });

    setUploadOpen(false);
    setForm({ document_name: '', client_id: '', client_name: '', document_type: 'bank_statement' });
    setFileUrl('');
    queryClient.invalidateQueries({ queryKey: ['processed-docs'] });

    toast({ title: 'Processing started', description: 'AI is analyzing your document…' });

    const result = await base44.functions.invoke('processFinancialDocument', {
      file_url: record.file_url,
      document_type: record.document_type,
      client_name: record.client_name,
      document_name: record.document_name,
    });

    await base44.entities.ProcessedDocument.update(record.id, {
      ...result.data,
    });

    queryClient.invalidateQueries({ queryKey: ['processed-docs'] });
    setProcessing(false);

    toast({
      title: result.data?.status === 'needs_review' ? '⚠️ Document needs review' : '✅ Processing complete',
      description: result.data?.anomaly_count > 0
        ? `${result.data.anomaly_count} anomalie(s) flagged for review`
        : 'All data extracted successfully',
    });
  };

  const handleReview = (doc) => { setReviewDoc({ ...doc, reviewer_notes: doc.reviewer_notes || '' }); setReviewOpen(true); };

  const handleMarkReviewed = async () => {
    await updateMut.mutateAsync({ id: reviewDoc.id, data: { reviewed: true, reviewer_notes: reviewDoc.reviewer_notes, status: 'completed', mapped_to_accounting: true } });
    setReviewOpen(false);
    toast({ title: 'Marked as reviewed & mapped to accounting' });
  };

  const filtered = docs.filter(d => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSearch = !search || d.document_name?.toLowerCase().includes(search.toLowerCase()) || d.client_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: docs.length,
    needsReview: docs.filter(d => d.status === 'needs_review').length,
    completed: docs.filter(d => d.status === 'completed').length,
    anomalies: docs.reduce((s, d) => s + (d.anomaly_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> AI Document Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automatically extract, map & anomaly-flag financial documents</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} disabled={processing}>
          <Upload className="w-4 h-4 mr-2" /> Upload & Process
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Processed', value: stats.total, color: 'text-foreground' },
          { label: 'Needs Review', value: stats.needsReview, color: 'text-amber-600' },
          { label: 'Completed', value: stats.completed, color: 'text-green-600' },
          { label: 'Anomalies Found', value: stats.anomalies, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No documents processed yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <ProcessedDocCard key={doc.id} doc={doc} onReview={handleReview} />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Upload & Process Document</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>File *</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input type="file" className="hidden" id="ai-file-upload" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls" />
                <label htmlFor="ai-file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading…' : fileUrl ? '✓ File ready for processing' : 'Click to upload'}
                  </p>
                  {!fileUrl && !uploading && <p className="text-xs text-muted-foreground/60 mt-1">PDF, CSV, Excel, Images</p>}
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Document Name</Label>
              <Input value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} placeholder="e.g. TD Bank Statement March 2025" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleProcess} disabled={!fileUrl || processing || uploading}>
              <Brain className="w-4 h-4 mr-2" /> {processing ? 'Processing…' : 'Process with AI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Review Flagged Document</DialogTitle></DialogHeader>
          {reviewDoc && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" /> {reviewDoc.anomaly_count} anomal{reviewDoc.anomaly_count === 1 ? 'y' : 'ies'} flagged
                </div>
                <p className="text-xs">Review the anomalies in the document card above before approving.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Reviewer Notes</Label>
                <Textarea
                  placeholder="Add notes about your review, any adjustments made, or reasons for approval…"
                  className="h-28"
                  value={reviewDoc.reviewer_notes}
                  onChange={e => setReviewDoc(d => ({ ...d, reviewer_notes: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkReviewed} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Map to Accounting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
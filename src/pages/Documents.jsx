import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Upload, FileText, MoreHorizontal, Trash2, ExternalLink, Search } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 't_slips', label: 'T-Slips' },
  { value: 'financial_statements', label: 'Financial Statements' },
  { value: 'receipts', label: 'Receipts' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'returns', label: 'Returns' },
  { value: 'notices', label: 'CRA Notices' },
  { value: 'other', label: 'Other' },
];

const categoryColors = {
  t_slips: 'bg-blue-100 text-blue-700',
  financial_statements: 'bg-green-100 text-green-700',
  receipts: 'bg-amber-100 text-amber-700',
  correspondence: 'bg-purple-100 text-purple-700',
  returns: 'bg-emerald-100 text-emerald-700',
  notices: 'bg-red-100 text-red-700',
  other: 'bg-secondary text-secondary-foreground',
};

export default function Documents() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', client_id: '', client_name: '', category: 'other', tax_year: '', notes: '', file_url: '' });
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, file_url, name: prev.name || file.name }));
    setUploading(false);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client?.name || '' });
  };

  const handleSave = async () => {
    await createMut.mutateAsync(form);
    setDialogOpen(false);
    setForm({ name: '', client_id: '', client_name: '', category: 'other', tax_year: '', notes: '', file_url: '' });
  };

  const filtered = documents.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and organize client documents</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-12">No documents found</p>
          )}
          {filtered.map(doc => (
            <Card key={doc.id} className="p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    {doc.client_name && <p className="text-xs text-muted-foreground">{doc.client_name}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className={`${categoryColors[doc.category] || categoryColors.other} text-[10px] px-1.5 py-0 border-0`}>
                        {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                      </Badge>
                      {doc.tax_year && <span className="text-[10px] text-muted-foreground">{doc.tax_year}</span>}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {doc.file_url && (
                      <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                        <ExternalLink className="w-3 h-3 mr-2" /> View File
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => deleteMut.mutate(doc.id)} className="text-destructive">
                      <Trash2 className="w-3 h-3 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Uploaded {format(new Date(doc.created_date), 'MMM d, yyyy')}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>File</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <input type="file" className="hidden" id="file-upload" onChange={handleFileUpload} />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : form.file_url ? 'File uploaded ✓' : 'Click to upload'}
                  </p>
                </label>
              </div>
            </div>
            <div>
              <Label>Document Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tax Year</Label>
                <Input value={form.tax_year} onChange={e => setForm({...form, tax_year: e.target.value})} placeholder="e.g. 2025" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
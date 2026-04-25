import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, isPast, startOfDay } from 'date-fns';
import FilingFormDialog from '@/components/filings/FilingFormDialog';

const statusStyles = {
  not_started: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  filed: 'bg-green-100 text-green-700',
  assessed: 'bg-emerald-100 text-emerald-800',
  reassessed: 'bg-red-100 text-red-700',
};

const priorityStyles = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-accent/10 text-accent-foreground',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-destructive/10 text-destructive',
};

export default function TaxFilings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: filings = [], isLoading } = useQuery({
    queryKey: ['filings'],
    queryFn: () => base44.entities.TaxFiling.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.TaxFiling.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TaxFiling.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.TaxFiling.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['filings'] }),
  });

  const handleSave = async (data) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  const filtered = filings.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterType !== 'all' && f.filing_type !== filterType) return false;
    if (search && !f.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isDueSoon = (f) =>
    f.due_date && f.status !== 'filed' && f.status !== 'assessed' && isPast(startOfDay(parseISO(f.due_date)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Tax Filings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all Canadian tax filings and deadlines</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Filing
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="filed">Filed</SelectItem>
            <SelectItem value="assessed">Assessed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['T1', 'T2', 'T3', 'T4', 'T5', 'GST/HST'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No filings found</TableCell></TableRow>
              ) : filtered.map(filing => (
                <TableRow key={filing.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{filing.client_name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{filing.filing_type}</Badge></TableCell>
                  <TableCell className="text-sm">{filing.tax_year}</TableCell>
                  <TableCell className={`text-sm ${isDueSoon(filing) ? 'text-destructive font-medium' : ''}`}>
                    {filing.due_date ? format(parseISO(filing.due_date), 'MMM d, yyyy') : '—'}
                    {isDueSoon(filing) && <span className="ml-1 text-[10px]">overdue</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusStyles[filing.status] || statusStyles.not_started} text-[10px] border-0`}>
                      {(filing.status || 'not_started').replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${priorityStyles[filing.priority] || priorityStyles.medium} text-[10px] border-0 capitalize`}>
                      {filing.priority || 'medium'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{filing.amount_owing != null ? `$${Number(filing.amount_owing).toLocaleString()}` : '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(filing); setDialogOpen(true); }}>
                          <Pencil className="w-3 h-3 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMut.mutate(filing.id)} className="text-destructive">
                          <Trash2 className="w-3 h-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <FilingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        filing={editing}
        clients={clients}
        onSave={handleSave}
      />
    </div>
  );
}
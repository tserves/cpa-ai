import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import ClientFormDialog from '@/components/clients/ClientFormDialog';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-secondary text-muted-foreground',
  prospect: 'bg-blue-100 text-blue-700',
};

const typeLabels = {
  individual: 'Individual',
  corporation: 'Corporation',
  partnership: 'Partnership',
  sole_proprietorship: 'Sole Prop.',
  trust: 'Trust',
  non_profit: 'Non-Profit',
};

export default function Clients() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const handleSave = async (data) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients.length} clients in your practice</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <Card key={client.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{client.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{typeLabels[client.type] || client.type}</Badge>
                    <Badge className={`${statusColors[client.status] || statusColors.active} text-[10px] px-1.5 py-0 border-0`}>
                      {client.status}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditing(client); setDialogOpen(true); }}>
                      <Pencil className="w-3 h-3 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMut.mutate(client.id)} className="text-destructive">
                      <Trash2 className="w-3 h-3 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{client.email}</div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{client.phone}</div>
                )}
                {client.province && (
                  <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{client.province}</div>
                )}
              </div>
              {client.gst_hst_registered && (
                <Badge variant="outline" className="mt-3 text-[10px]">GST/HST Registered</Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        onSave={handleSave}
      />
    </div>
  );
}
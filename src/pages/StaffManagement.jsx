import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, UserCheck, Mail, Phone, MoreHorizontal, Pencil, Shield, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const roleColors = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  staff: 'bg-green-100 text-green-700',
};

const roleLabels = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
};

const defaultForm = { email: '', role: 'staff', job_title: '', department: '', phone: '' };

export default function StaffManagement() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [inviting, setInviting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      setEditingUser(null);
      toast({ title: 'Staff member updated' });
    },
  });

  const handleInvite = async () => {
    if (!form.email) return;
    setInviting(true);
    await base44.users.inviteUser(form.email, form.role === 'admin' ? 'admin' : 'user');
    toast({ title: 'Invitation sent', description: `${form.email} has been invited as ${roleLabels[form.role]}.` });
    setInviteOpen(false);
    setForm(defaultForm);
    setInviting(false);
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const handleEditSave = () => {
    updateMut.mutate({
      id: editingUser.id,
      data: {
        role: editingUser.role,
        job_title: editingUser.job_title,
        department: editingUser.department,
        phone: editingUser.phone,
      },
    });
  };

  const openEdit = (user) => {
    setEditingUser({ ...user });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} office users in your practice</p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setInviteOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Invite Staff Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No staff members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(user => (
            <Card key={user.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.full_name || '(Pending)'}</p>
                    <Badge className={`${roleColors[user.role] || roleColors.staff} text-[10px] px-1.5 py-0 border-0 mt-0.5`}>
                      {roleLabels[user.role] || user.role}
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
                    <DropdownMenuItem onClick={() => openEdit(user)}>
                      <Pencil className="w-3 h-3 mr-2" /> Edit Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{user.email}</div>
                {user.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{user.phone}</div>}
                {user.job_title && <div className="flex items-center gap-2"><UserCheck className="w-3 h-3" />{user.job_title}</div>}
                {user.department && <div className="flex items-center gap-2"><Shield className="w-3 h-3" />{user.department}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="staff@yourfirm.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. Senior Accountant"
                value={form.job_title}
                onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Tax, Audit, Advisory"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                placeholder="Office or mobile number"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!form.email || inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editingUser.role} onValueChange={v => setEditingUser(u => ({ ...u, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input
                  value={editingUser.job_title || ''}
                  onChange={e => setEditingUser(u => ({ ...u, job_title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={editingUser.department || ''}
                  onChange={e => setEditingUser(u => ({ ...u, department: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser(u => ({ ...u, phone: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateMut.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
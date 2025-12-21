'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthManager } from '@/lib/auth';
import { Users, Plus, Trash2, Edit, Mail, Clock, UserX, Crown, Shield, User, Eye, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isAdminRole, type TenantRole } from '@/lib/utils/roles';

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: string;
  joinedAt: string;
  status: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
}

export default function TeamPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TenantRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState<string | null>(null);
  
  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'AGENT' as 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER' });
  const [transferForm, setTransferForm] = useState({ newOwnerId: '', confirmationCode: '' });
  const [roleForm, setRoleForm] = useState<{ userId: string; role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER' } | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Usar AuthManager como single source of truth
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      
      // Verificar autenticación (síncrono, desde cache)
      if (!state.isAuthenticated || !state.tenant) {
        return;
      }
      
      // Usar estado directamente
      if (state.tenant) {
        const role = state.tenant.role as TenantRole;
        setCurrentUserRole(role);
      }
      
      if (state.user) {
        setCurrentUserId(state.user.id);
      }

      const response = await apiClient.getTeamMembers();
      if (response.success && response.data) {
        setMembers(response.data.members);
        setPendingInvitations(response.data.pendingInvitations);
      } else {
        console.error('❌ Team Page - Error getting team members:', response.error_key);
      }
    } catch (error) {
      console.error('❌ Error loading team data:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.role) {
      toast({
        title: t('errors.generic'),
        description: t('errors.required_fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiClient.createInvitation(inviteForm.email, inviteForm.role);
      if (response.success) {
        toast({
          title: t('team.invitation_sent'),
          description: t('team.invitation_sent_success'),
        });
        setShowInviteDialog(false);
        setInviteForm({ email: '', role: 'AGENT' });
        loadTeamData();
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.send_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm(t('team.confirm_cancel'))) {
      return;
    }

    try {
      const response = await apiClient.cancelInvitation(invitationId);
      if (response.success) {
        toast({
          title: t('team.invitation_cancelled'),
          description: t('team.invitation_cancelled_success'),
        });
        loadTeamData();
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.cancel_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleChangeRole = async () => {
    if (!roleForm) return;

    try {
      const response = await apiClient.changeMemberRole(roleForm.userId, roleForm.role);
      if (response.success) {
        toast({
          title: t('team.role_changed'),
          description: t('team.role_changed_success'),
        });
        setShowRoleDialog(null);
        setRoleForm(null);
        loadTeamData();
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId: string, name?: string) => {
    const member = members.find(m => m.id === userId);
    const memberName = member?.name || member?.email || name || 'este miembro';
    
    if (!confirm(t('team.confirm_remove', { name: memberName }))) {
      return;
    }

    try {
      const response = await apiClient.removeMember(userId);
      if (response.success) {
        toast({
          title: t('team.member_removed'),
          description: t('team.member_removed_success'),
        });
        loadTeamData();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.remove_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferForm.newOwnerId) {
      toast({
        title: t('errors.generic'),
        description: t('errors.required_fields'),
        variant: 'destructive',
      });
      return;
    }

    const newOwner = members.find(m => m.id === transferForm.newOwnerId);
    const newOwnerName = newOwner?.name || newOwner?.email || 'el nuevo propietario';
    
    if (!confirm(t('team.confirm_transfer', { name: newOwnerName }))) {
      return;
    }

    try {
      const response = await apiClient.transferOwnership(
        transferForm.newOwnerId,
        transferForm.confirmationCode || undefined
      );
      if (response.success) {
        toast({
          title: t('team.ownership_transferred'),
          description: t('team.ownership_transferred_success'),
        });
        setShowTransferDialog(false);
        setTransferForm({ newOwnerId: '', confirmationCode: '' });
        loadTeamData();
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4" />;
      case 'AGENT':
        return <User className="h-4 w-4" />;
      case 'VIEWER':
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      OWNER: 'default',
      ADMIN: 'secondary',
      AGENT: 'outline',
      VIEWER: 'outline',
    };
    return (
      <Badge variant={variants[role] || 'outline'} className="flex items-center gap-1">
        {getRoleIcon(role)}
        {t(`team.roles.${role}`)}
      </Badge>
    );
  };

  const canManageTeam = currentUserRole === 'OWNER' || (currentUserRole && isAdminRole(currentUserRole));
  const isOwner = currentUserRole === 'OWNER';

  // Log para depuración
  console.log('🔍 Team Page - Current user role:', currentUserRole);
  console.log('🔍 Team Page - Can manage team:', canManageTeam);
  console.log('🔍 Team Page - Is owner:', isOwner);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canManageTeam) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('errors.access_denied')}
            </h3>
            <p className="text-muted-foreground text-center mb-2">
              {t('team.only_owner_admin_can_view')}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Rol actual: {currentUserRole || 'No asignado'}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              (Revisa la consola del navegador para más detalles)
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminMembers = members.filter(m => m.role === 'ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            {t('team.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('team.description')}
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('team.invite_member')}
        </Button>
      </div>

      {/* Miembros del Equipo */}
      <Card>
        <CardHeader>
          <CardTitle>{t('team.members')}</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? t('common.member_singular') : t('common.member_plural')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('team.no_members')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const canChangeRole = isOwner || (currentUserRole === 'ADMIN' && !['OWNER', 'ADMIN'].includes(member.role));
                const canRemove = isOwner || (currentUserRole === 'ADMIN' && member.role !== 'OWNER');
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        {getRoleIcon(member.role)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.name || member.email}</p>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">Tú</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('team.joined_at')} {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="ml-auto">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canChangeRole && !isCurrentUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRoleForm({ userId: member.id, role: member.role as any });
                            setShowRoleDialog(member.id);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('team.change_role')}
                        </Button>
                      )}
                      {canRemove && !isCurrentUser && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.name)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          {t('team.remove_member')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitaciones Pendientes */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('team.pending_invitations')}</CardTitle>
            <CardDescription>
              {pendingInvitations.length} {pendingInvitations.length === 1 ? t('common.invitation_singular') : t('common.invitation_plural')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(invitation.role)}
                        <span className="text-xs text-muted-foreground">
                          • {t('team.invited_by')} {invitation.invitedBy}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('team.invited_at')} {new Date(invitation.invitedAt).toLocaleDateString()}
                        {' • '}
                        {t('team.expires_at')} {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('team.cancel_invitation')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transferir Propiedad (solo OWNER) */}
      {isOwner && adminMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              {t('team.transfer_ownership')}
            </CardTitle>
            <CardDescription>
              {t('team.transfer_dialog.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(true)}
            >
              <Crown className="h-4 w-4 mr-2" />
              {t('team.transfer_ownership')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Invitar Miembro */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.invite_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('team.invite_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t('team.invite_dialog.email')} *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder={t('team.invite_dialog.email_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t('team.invite_dialog.select_role')} *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role: value as any })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && (
                    <SelectItem value="ADMIN">
                      {t('team.roles.ADMIN')} - {t('team.role_descriptions.ADMIN')}
                    </SelectItem>
                  )}
                  <SelectItem value="AGENT">
                    {t('team.roles.AGENT')} - {t('team.role_descriptions.AGENT')}
                  </SelectItem>
                  <SelectItem value="VIEWER">
                    {t('team.roles.VIEWER')} - {t('team.role_descriptions.VIEWER')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleInvite} disabled={!inviteForm.email}>
                {t('common.send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambiar Rol */}
      {showRoleDialog && roleForm && (
        <Dialog open={!!showRoleDialog} onOpenChange={(open) => !open && setShowRoleDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('team.change_role')}</DialogTitle>
              <DialogDescription>
                {t('team.select_role_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('team.role')}</Label>
                <Select
                  value={roleForm.role}
                  onValueChange={(value) => setRoleForm({ ...roleForm, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isOwner && (
                      <SelectItem value="OWNER">
                        {t('team.roles.OWNER')} - {t('team.role_descriptions.OWNER')}
                      </SelectItem>
                    )}
                    {isOwner && (
                      <SelectItem value="ADMIN">
                        {t('team.roles.ADMIN')} - {t('team.role_descriptions.ADMIN')}
                      </SelectItem>
                    )}
                    <SelectItem value="AGENT">
                      {t('team.roles.AGENT')} - {t('team.role_descriptions.AGENT')}
                    </SelectItem>
                    <SelectItem value="VIEWER">
                      {t('team.roles.VIEWER')} - {t('team.role_descriptions.VIEWER')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRoleDialog(null)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleChangeRole}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog: Transferir Propiedad */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('team.transfer_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('team.transfer_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('team.transfer_dialog.select_new_owner')} *</Label>
              <Select
                value={transferForm.newOwnerId}
                onValueChange={(value) => setTransferForm({ ...transferForm, newOwnerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('team.transfer_dialog.select_admin_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {adminMembers.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name || admin.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation-code">
                {t('team.transfer_dialog.confirmation_code')}
              </Label>
              <Input
                id="confirmation-code"
                value={transferForm.confirmationCode}
                onChange={(e) => setTransferForm({ ...transferForm, confirmationCode: e.target.value })}
                placeholder={t('team.transfer_dialog.confirmation_code_placeholder')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleTransferOwnership}
                disabled={!transferForm.newOwnerId}
                variant="destructive"
              >
                {t('team.transfer_ownership')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


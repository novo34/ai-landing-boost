'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient, Channel, Agent } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthManager } from '@/lib/auth';
import { MessageSquare, Plus, Trash2, Edit, X, CheckCircle2, XCircle, AlertCircle, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ChannelsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showAgentDialog, setShowAgentDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'WEBCHAT' as 'WHATSAPP' | 'VOICE' | 'WEBCHAT' | 'TELEGRAM',
    name: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'ERROR',
  });

  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Usar AuthManager como single source of truth
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      
      // Verificar autenticación (síncrono, desde cache)
      if (!state.isAuthenticated || !state.tenant) {
        return;
      }
      
      // NO necesitas delay, estado ya está disponible
      const [channelsResponse, agentsResponse] = await Promise.all([
        apiClient.getChannels(),
        apiClient.getAgents(),
      ]);

      if (channelsResponse.success && channelsResponse.data) {
        // Mapear channelagent a channelAgents para compatibilidad con el frontend
        const mappedChannels = channelsResponse.data.map((channel: any) => ({
          ...channel,
          channelAgents: channel.channelagent || channel.channelAgents || [],
        }));
        setChannels(mappedChannels);
        console.log('📢 Canales cargados:', mappedChannels.length, mappedChannels);
      } else {
        // Log del error para debugging
        console.error('❌ Error cargando canales:', {
        success: channelsResponse.success,
        error_key: channelsResponse.error_key,
        data: channelsResponse.data,
        fullResponse: channelsResponse,
      });
        
        if (channelsResponse.error_key === 'auth.insufficient_permissions' || 
            channelsResponse.error_key === 'auth.role_required') {
          // Errores esperados, no mostrar toast
        } else if (channelsResponse.error_key === 'errors.rate_limit_exceeded') {
          // Rate limiting: no mostrar toast, solo esperar
        } else {
          // Otros errores: mostrar toast
          let errorMessage = t('errors.load_failed');
          if (channelsResponse.error_key) {
            try {
              const translated = t(channelsResponse.error_key);
              if (translated !== channelsResponse.error_key) {
                errorMessage = translated;
              } else {
                errorMessage = channelsResponse.error_key;
              }
            } catch {
              errorMessage = channelsResponse.error_key;
            }
          }
          toast({
            title: t('errors.generic'),
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }

      if (agentsResponse.success && agentsResponse.data) {
        setAgents(agentsResponse.data);
        console.log('🤖 Agentes cargados:', agentsResponse.data.length, agentsResponse.data);
      } else {
        // Log del error para debugging
        console.error('❌ Error cargando agentes:', {
          success: agentsResponse.success,
          error_key: agentsResponse.error_key,
          data: agentsResponse.data,
          fullResponse: agentsResponse,
        });
        
        if (agentsResponse.error_key === 'auth.insufficient_permissions' || 
            agentsResponse.error_key === 'auth.role_required') {
          // Errores esperados, no mostrar toast
        } else if (agentsResponse.error_key === 'errors.rate_limit_exceeded') {
          // Rate limiting: no mostrar toast, solo esperar
        } else {
          // Otros errores: mostrar toast
          let errorMessage = t('errors.load_failed');
          if (agentsResponse.error_key) {
            try {
              const translated = t(agentsResponse.error_key);
              if (translated !== agentsResponse.error_key) {
                errorMessage = translated;
              } else {
                errorMessage = agentsResponse.error_key;
              }
            } catch {
              errorMessage = agentsResponse.error_key;
            }
          }
          toast({
            title: t('errors.generic'),
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      // Solo loguear errores inesperados
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorKey = error && typeof error === 'object' && 'error_key' in error ? error.error_key : null;
      
      // Log detallado para debugging
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.error('❌ Error cargando canales/agentes:', {
          error,
          errorMessage,
          errorKey,
          channelsResponse: (error as any)?.channelsResponse,
          agentsResponse: (error as any)?.agentsResponse,
        });
      }
      
      if (errorKey !== 'auth.insufficient_permissions' &&
          errorKey !== 'auth.role_required' &&
          errorKey !== 'errors.rate_limit_exceeded' &&
          !errorMessage.includes('403') &&
          !errorMessage.includes('429')) {
        console.error('Error loading data:', error);
        toast({
          title: t('errors.generic'),
          description: t('errors.load_failed'),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    // Protección contra múltiples ejecuciones (React Strict Mode)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.createChannel(formData);
      if (response.success) {
        toast({
          title: t('channels.created'),
          description: t('channels.created_success'),
        });
        setShowCreateForm(false);
        setFormData({ type: 'WEBCHAT', name: '', status: 'ACTIVE' });
        loadData();
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;

    try {
      const response = await apiClient.updateChannel(editingChannel.id, {
        name: formData.name,
        status: formData.status,
      });
      if (response.success) {
        toast({
          title: t('channels.updated'),
          description: t('channels.updated_success'),
        });
        setEditingChannel(null);
        setFormData({ type: 'WEBCHAT', name: '', status: 'ACTIVE' });
        loadData();
      }
    } catch (error) {
      console.error('Error updating channel:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('channels.confirm_delete'))) {
      return;
    }

    try {
      const response = await apiClient.deleteChannel(id);
      if (response.success) {
        toast({
          title: t('channels.deleted'),
          description: t('channels.deleted_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleAddAgent = async (channelId: string, agentId: string) => {
    try {
      console.log('🔗 Agregando agente al canal:', { channelId, agentId });
      const response = await apiClient.addAgentToChannel(channelId, agentId);
      if (response.success) {
        toast({
          title: t('channels.agent_added'),
          description: t('channels.agent_added_success'),
        });
        loadData();
        setShowAgentDialog(null);
      } else {
        console.error('Error adding agent:', response);
        let errorMessage = t('errors.add_failed');
        if (response.error_key) {
          try {
            const translated = t(response.error_key);
            if (translated !== response.error_key) {
              errorMessage = translated;
            } else {
              errorMessage = response.error_key;
            }
          } catch {
            errorMessage = response.error_key;
          }
        }
        toast({
          title: t('errors.generic'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ Error adding agent:', error);
      let errorMessage = t('errors.add_failed');
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error_key) {
        try {
          const translated = t(error.response.data.error_key);
          if (translated !== error.response.data.error_key) {
            errorMessage = translated;
          } else {
            errorMessage = error.response.data.error_key;
          }
        } catch {
          errorMessage = error.response.data.error_key;
        }
      }
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAgent = async (channelId: string, agentId: string) => {
    try {
      const response = await apiClient.removeAgentFromChannel(channelId, agentId);
      if (response.success) {
        toast({
          title: t('channels.agent_removed'),
          description: t('channels.agent_removed_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error removing agent:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.remove_failed'),
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'ERROR':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-500">{t('channels.statuses.ACTIVE')}</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">{t('channels.statuses.INACTIVE')}</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">{t('channels.statuses.ERROR')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WHATSAPP':
        return t('channels.types.WHATSAPP');
      case 'VOICE':
        return t('channels.types.VOICE');
      case 'WEBCHAT':
        return t('channels.types.WEBCHAT');
      case 'TELEGRAM':
        return t('channels.types.TELEGRAM');
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('channels.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('channels.description')}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('channels.create_channel')}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('channels.create_channel')}</CardTitle>
            <CardDescription>
              {t('channels.create_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('channels.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Channel['type'] })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">{t('channels.types.WHATSAPP')}</SelectItem>
                    <SelectItem value="VOICE">{t('channels.types.VOICE')}</SelectItem>
                    <SelectItem value="WEBCHAT">{t('channels.types.WEBCHAT')}</SelectItem>
                    <SelectItem value="TELEGRAM">{t('channels.types.TELEGRAM')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('channels.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">{t('channels.create')}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {editingChannel && (
        <Card>
          <CardHeader>
            <CardTitle>{t('channels.edit_channel')}</CardTitle>
            <CardDescription>
              {t('channels.edit_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('channels.name')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">{t('channels.status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Channel['status'] })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t('channels.statuses.ACTIVE')}</SelectItem>
                    <SelectItem value="INACTIVE">{t('channels.statuses.INACTIVE')}</SelectItem>
                    <SelectItem value="ERROR">{t('channels.statuses.ERROR')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{t('channels.update')}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingChannel(null);
                    setFormData({ type: 'WEBCHAT', name: '', status: 'ACTIVE' });
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => {
          const assignedAgents = channel.channelAgents || [];
          const availableAgents = agents.filter(
            (agent) => !assignedAgents.some((ca) => ca.agentId === agent.id),
          );

          return (
            <Card key={channel.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {channel.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getTypeLabel(channel.type)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(channel.status)}
                    {getStatusBadge(channel.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t('channels.agents')} ({assignedAgents.length})
                    </Label>
                    {availableAgents.length > 0 && (
                      <Dialog open={showAgentDialog === channel.id} onOpenChange={(open) => setShowAgentDialog(open ? channel.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-3 w-3 mr-1" />
                            {t('channels.add_agent')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('channels.add_agent')}</DialogTitle>
                            <DialogDescription>
                              {t('channels.add_agent_description')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            {availableAgents.map((agent) => (
                              <Button
                                key={agent.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleAddAgent(channel.id, agent.id)}
                              >
                                {agent.name}
                              </Button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  {assignedAgents.length > 0 ? (
                    <div className="space-y-2">
                      {assignedAgents.map((ca) => {
                        const agent = agents.find((a) => a.id === ca.agentId);
                        return (
                          <div key={ca.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{agent?.name || ca.agentId}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAgent(channel.id, ca.agentId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('channels.no_agents')}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingChannel(channel);
                      setFormData({
                        type: channel.type,
                        name: channel.name,
                        status: channel.status,
                      });
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(channel.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {channels.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t('channels.no_channels')}
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('channels.create_first')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { apiClient, N8nFlow, Agent } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthManager } from '@/lib/auth';
import { Workflow, Plus, Trash2, Power, PowerOff } from 'lucide-react';

export default function N8nSettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<N8nFlow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    agentId: 'none',
    workflowId: '',
    type: 'CUSTOM' as 'LEAD_INTAKE' | 'BOOKING_FLOW' | 'FOLLOWUP' | 'PAYMENT_FAILED' | 'CUSTOM',
    name: '',
    description: '',
    isActive: true,
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
      const [flowsResponse, agentsResponse] = await Promise.all([
        apiClient.getN8nFlows(),
        apiClient.getAgents(),
      ]);

      if (flowsResponse.success && flowsResponse.data) {
        setFlows(flowsResponse.data);
      } else if (flowsResponse.error_key === 'auth.insufficient_permissions' || 
                 flowsResponse.error_key === 'auth.role_required' ||
                 flowsResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      }

      if (agentsResponse.success && agentsResponse.data) {
        setAgents(agentsResponse.data);
      } else if (agentsResponse.error_key === 'auth.insufficient_permissions' || 
                 agentsResponse.error_key === 'auth.role_required' ||
                 agentsResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      }
    } catch (error) {
      // Solo loguear errores inesperados
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorKey = error && typeof error === 'object' && 'error_key' in error ? (error as { error_key?: string }).error_key : null;
      
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

  const handleToggle = async (flow: N8nFlow) => {
    try {
      setToggling(flow.id);
      const response = flow.isActive
        ? await apiClient.deactivateN8nFlow(flow.id)
        : await apiClient.activateN8nFlow(flow.id);

      if (response.success) {
        toast({
          title: flow.isActive
            ? t('n8n.flow_deactivated')
            : t('n8n.flow_activated'),
          description: flow.isActive
            ? t('n8n.flow_deactivated_success')
            : t('n8n.flow_activated_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error toggling flow:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.update_failed'),
        variant: 'destructive',
      });
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('n8n.confirm_delete'))) {
      return;
    }

    try {
      const response = await apiClient.deleteN8nFlow(id);
      if (response.success) {
        toast({
          title: t('n8n.flow_deleted'),
          description: t('n8n.flow_deleted_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.createN8nFlow({
        agentId: formData.agentId && formData.agentId !== 'none' ? formData.agentId : undefined,
        workflowId: formData.workflowId,
        type: formData.type,
        name: formData.name,
        description: formData.description || undefined,
        isActive: formData.isActive,
      });

      if (response.success) {
        toast({
          title: t('n8n.flow_created'),
          description: t('n8n.flow_created_success'),
        });
        setShowCreateForm(false);
        setFormData({
          agentId: 'none',
          workflowId: '',
          type: 'CUSTOM',
          name: '',
          description: '',
          isActive: true,
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating flow:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.create_failed'),
        variant: 'destructive',
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LEAD_INTAKE: t('n8n.flow_types.LEAD_INTAKE'),
      BOOKING_FLOW: t('n8n.flow_types.BOOKING_FLOW'),
      FOLLOWUP: t('n8n.flow_types.FOLLOWUP'),
      PAYMENT_FAILED: t('n8n.flow_types.PAYMENT_FAILED'),
      CUSTOM: t('n8n.flow_types.CUSTOM'),
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      LEAD_INTAKE: 'bg-blue-500',
      BOOKING_FLOW: 'bg-green-500',
      FOLLOWUP: 'bg-yellow-500',
      PAYMENT_FAILED: 'bg-red-500',
      CUSTOM: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
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
            {t('n8n.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('n8n.description')}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('n8n.create_flow')}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('n8n.create_flow')}</CardTitle>
            <CardDescription>
              {t('n8n.create_flow_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agentId">{t('n8n.agent')}</Label>
                  <Select
                    value={formData.agentId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, agentId: value })}
                  >
                    <SelectTrigger id="agentId">
                      <SelectValue placeholder={t('n8n.select_agent')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('n8n.no_agent')}</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workflowId">{t('n8n.workflow_id')}</Label>
                  <Input
                    id="workflowId"
                    value={formData.workflowId}
                    onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                    placeholder="workflow-id-from-n8n"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t('n8n.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as typeof formData.type })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD_INTAKE">{t('n8n.flow_types.LEAD_INTAKE')}</SelectItem>
                      <SelectItem value="BOOKING_FLOW">{t('n8n.flow_types.BOOKING_FLOW')}</SelectItem>
                      <SelectItem value="FOLLOWUP">{t('n8n.flow_types.FOLLOWUP')}</SelectItem>
                      <SelectItem value="PAYMENT_FAILED">{t('n8n.flow_types.PAYMENT_FAILED')}</SelectItem>
                      <SelectItem value="CUSTOM">{t('n8n.flow_types.CUSTOM')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t('n8n.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('n8n.flow_name_placeholder')}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('n8n.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('n8n.description_placeholder')}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('n8n.active')}</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">{t('common.create')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('n8n.flows_list')}</CardTitle>
          <CardDescription>
            {t('n8n.flows_list_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Workflow className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t('n8n.no_flows')}</p>
              <p className="text-sm mt-2">
                {t('n8n.no_flows_description')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={flow.isActive}
                        onCheckedChange={() => handleToggle(flow)}
                        disabled={toggling === flow.id}
                      />
                      {flow.isActive ? (
                        <Power className="h-5 w-5 text-green-500" />
                      ) : (
                        <PowerOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{flow.name}</h3>
                        <Badge className={getTypeColor(flow.type)}>{getTypeLabel(flow.type)}</Badge>
                        {flow.agent && (
                          <Badge variant="outline">{flow.agent.name}</Badge>
                        )}
                      </div>
                      {flow.description && (
                        <p className="text-sm text-muted-foreground mt-1">{flow.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>ID: {flow.workflowId}</span>
                        {flow.agent && <span>{t('n8n.agent_label')} {flow.agent.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(flow.id)}
                      disabled={toggling === flow.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


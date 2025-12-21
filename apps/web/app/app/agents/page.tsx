'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient, Agent, WhatsAppAccount, KnowledgeCollection, CalendarIntegration } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthManager } from '@/lib/auth';
import { Bot, Plus, Trash2, Edit, Save, X, MessageSquare, Calendar, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VirtualList } from '@/components/ui/virtual-list';

export default function AgentsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [knowledgeCollections, setKnowledgeCollections] = useState<KnowledgeCollection[]>([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    whatsappAccountId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PAUSED' | 'DISABLED',
    languageStrategy: 'AUTO_DETECT' as 'AUTO_DETECT' | 'FIXED' | 'MULTI_LANGUAGE',
    defaultLanguage: 'es',
    knowledgeCollectionIds: [] as string[],
    calendarIntegrationId: 'none',
    n8nWorkflowId: '',
    personalitySettings: '',
  });

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Protección contra múltiples ejecuciones (React Strict Mode)
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    loadData();
  }, []);

  const loadData = async () => {
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
      const [agentsResponse, whatsappResponse, collectionsResponse, calendarResponse] = await Promise.all([
        apiClient.getAgents(),
        apiClient.getWhatsAppAccounts(),
        apiClient.getKnowledgeCollections(),
        apiClient.getCalendarIntegrations(),
      ]);

      // Solo actualizar estado si las respuestas fueron exitosas
      // Ignorar errores 403 (permisos insuficientes) y 429 (rate limiting) silenciosamente
      if (agentsResponse.success && agentsResponse.data) {
        setAgents(agentsResponse.data);
      } else if (agentsResponse.error_key === 'auth.insufficient_permissions' || 
                 agentsResponse.error_key === 'auth.role_required' ||
                 agentsResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      } else if (agentsResponse.error_key === 'auth.unauthorized') {
        return;
      }
      
      if (whatsappResponse.success && whatsappResponse.data) {
        setWhatsappAccounts(whatsappResponse.data);
      } else if (whatsappResponse.error_key === 'auth.insufficient_permissions' || 
                 whatsappResponse.error_key === 'auth.role_required' ||
                 whatsappResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      } else if (whatsappResponse.error_key === 'auth.unauthorized') {
        return;
      }
      
      if (collectionsResponse.success && collectionsResponse.data) {
        setKnowledgeCollections(collectionsResponse.data);
      } else if (collectionsResponse.error_key === 'auth.insufficient_permissions' || 
                 collectionsResponse.error_key === 'auth.role_required' ||
                 collectionsResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      } else if (collectionsResponse.error_key === 'auth.unauthorized') {
        return;
      }
      
      if (calendarResponse.success && calendarResponse.data) {
        setCalendarIntegrations(calendarResponse.data);
      } else if (calendarResponse.error_key === 'auth.insufficient_permissions' || 
                 calendarResponse.error_key === 'auth.role_required' ||
                 calendarResponse.error_key === 'errors.rate_limit_exceeded') {
        // Errores esperados, no mostrar toast
      } else if (calendarResponse.error_key === 'auth.unauthorized') {
        return;
      }
    } catch (error) {
      // Solo loguear errores inesperados
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorKey = error && typeof error === 'object' && 'error_key' in error ? error.error_key : null;
      
      if (errorKey !== 'auth.unauthorized' && 
          errorKey !== 'auth.insufficient_permissions' &&
          errorKey !== 'auth.role_required' &&
          errorKey !== 'errors.rate_limit_exceeded' &&
          !errorMessage.includes('403') &&
          !errorMessage.includes('429')) {
        console.error('Error loading agents:', error);
        toast({
          title: t('errors.generic'),
          description: t('errors.load_failed'),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData({
      name: '',
      whatsappAccountId: '',
      status: 'ACTIVE',
      languageStrategy: 'AUTO_DETECT',
      defaultLanguage: 'es',
      knowledgeCollectionIds: [],
      calendarIntegrationId: 'none',
      n8nWorkflowId: '',
      personalitySettings: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      whatsappAccountId: agent.whatsappAccountId,
      status: agent.status,
      languageStrategy: agent.languageStrategy,
      defaultLanguage: agent.defaultLanguage || 'es',
      knowledgeCollectionIds: agent.knowledgeCollectionIds || [],
      calendarIntegrationId: agent.calendarIntegrationId || 'none',
      n8nWorkflowId: agent.n8nWorkflowId || '',
      personalitySettings: agent.personalitySettings
        ? JSON.stringify(agent.personalitySettings, null, 2)
        : '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.whatsappAccountId) {
      toast({
        title: t('errors.generic'),
        description: t('agents.required_fields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Parsear personalitySettings si existe
      let personalitySettings: Record<string, unknown> | undefined;
      if (formData.personalitySettings.trim()) {
        try {
          personalitySettings = JSON.parse(formData.personalitySettings);
        } catch (e) {
          toast({
            title: t('errors.generic'),
            description: t('agents.invalid_json'),
            variant: 'destructive',
          });
          return;
        }
      }

      const data = {
        name: formData.name,
        whatsappAccountId: formData.whatsappAccountId,
        status: formData.status,
        languageStrategy: formData.languageStrategy,
        defaultLanguage: formData.defaultLanguage || undefined,
        knowledgeCollectionIds: formData.knowledgeCollectionIds.length > 0 ? formData.knowledgeCollectionIds : undefined,
        calendarIntegrationId: formData.calendarIntegrationId || undefined,
        n8nWorkflowId: formData.n8nWorkflowId || undefined,
        personalitySettings,
      };

      if (editingAgent) {
        const response = await apiClient.updateAgent(editingAgent.id, data);
        if (response.success) {
          toast({
            title: t('agents.updated'),
            description: t('agents.updated_success'),
          });
          setShowDialog(false);
          loadData();
        }
      } else {
        const response = await apiClient.createAgent(data);
        if (response.success) {
          toast({
            title: t('agents.created'),
            description: t('agents.created_success'),
          });
          setShowDialog(false);
          loadData();
        }
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.save_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(t('agents.confirm_delete'))) {
      return;
    }

    try {
      const response = await apiClient.deleteAgent(agent.id);
      if (response.success) {
        toast({
          title: t('agents.deleted'),
          description: t('agents.deleted_success'),
        });
        loadData();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ACTIVE: 'default',
      PAUSED: 'secondary',
      DISABLED: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {t(`agents.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  const toggleCollection = (collectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeCollectionIds: prev.knowledgeCollectionIds.includes(collectionId)
        ? prev.knowledgeCollectionIds.filter((id) => id !== collectionId)
        : [...prev.knowledgeCollectionIds, collectionId],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            {t('agents.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('agents.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('agents.create_agent')}
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t('agents.no_agents')}
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {t('agents.no_agents_description')}
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('agents.create_agent')}
            </Button>
          </CardContent>
        </Card>
      ) : agents.length < 20 ? (
        // Para listas pequeñas, no usar virtualización
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      {agent.name}
                    </CardTitle>
                    <div className="mt-1">
                      {getStatusBadge(agent.status)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(agent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(agent)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {whatsappAccounts.find((acc) => acc.id === agent.whatsappAccountId)?.phoneNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{t('agents.strategy_label')}</span>
                    <span>{t(`agents.${agent.languageStrategy.toLowerCase().replace('_', '_')}`)}</span>
                  </div>
                  {agent.defaultLanguage && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t('agents.language_label')}</span>
                      <span>{agent.defaultLanguage}</span>
                    </div>
                  )}
                  {agent.knowledgeCollectionIds && agent.knowledgeCollectionIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {agent.knowledgeCollectionIds.length} {agent.knowledgeCollectionIds.length === 1 ? t('agents.collection_singular') : t('agents.collection_plural')}
                      </span>
                    </div>
                  )}
                  {agent.calendarIntegrationId && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('agents.calendar_connected')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Para listas grandes, usar virtualización con grid
        <VirtualList
          items={agents}
          estimateSize={200}
          overscan={5}
          className="h-[calc(100vh-300px)]"
          emptyMessage={t('agents.no_agents')}
          emptyIcon={<Bot className="h-12 w-12 text-muted-foreground mb-4" />}
          renderItem={(agent) => (
            <div className="p-2">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        {agent.name}
                      </CardTitle>
                      <div className="mt-1">
                        {getStatusBadge(agent.status)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(agent)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {whatsappAccounts.find((acc) => acc.id === agent.whatsappAccountId)?.phoneNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t('agents.strategy_label')}</span>
                      <span>{t(`agents.${agent.languageStrategy.toLowerCase().replace('_', '_')}`)}</span>
                    </div>
                    {agent.defaultLanguage && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t('agents.language_label')}</span>
                        <span>{agent.defaultLanguage}</span>
                      </div>
                    )}
                    {agent.knowledgeCollectionIds && agent.knowledgeCollectionIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {agent.knowledgeCollectionIds.length} {agent.knowledgeCollectionIds.length === 1 ? t('agents.collection_singular') : t('agents.collection_plural')}
                        </span>
                      </div>
                    )}
                    {agent.calendarIntegrationId && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t('agents.calendar_connected')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        />
      )}

      {/* Dialog para crear/editar agente */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? t('agents.edit_agent') : t('agents.create_agent')}
            </DialogTitle>
            <DialogDescription>
              {editingAgent
                ? t('agents.edit_description')
                : t('agents.create_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('agents.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('agents.name_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappAccountId">{t('agents.whatsapp_account')} *</Label>
              <Select
                value={formData.whatsappAccountId}
                onValueChange={(value) => setFormData({ ...formData, whatsappAccountId: value })}
              >
                <SelectTrigger id="whatsappAccountId">
                  <SelectValue placeholder={t('agents.select_whatsapp_account')} />
                </SelectTrigger>
                <SelectContent>
                  {whatsappAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.phoneNumber} ({account.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">{t('agents.status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t('agents.active')}</SelectItem>
                    <SelectItem value="PAUSED">{t('agents.paused')}</SelectItem>
                    <SelectItem value="DISABLED">{t('agents.disabled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="languageStrategy">{t('agents.language_strategy')}</Label>
                <Select
                  value={formData.languageStrategy}
                  onValueChange={(value) => setFormData({ ...formData, languageStrategy: value as any })}
                >
                  <SelectTrigger id="languageStrategy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_DETECT">{t('agents.auto_detect')}</SelectItem>
                    <SelectItem value="FIXED">{t('agents.fixed')}</SelectItem>
                    <SelectItem value="MULTI_LANGUAGE">{t('agents.multi_language')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.languageStrategy === 'FIXED' && (
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">{t('agents.default_language')}</Label>
                <Select
                  value={formData.defaultLanguage}
                  onValueChange={(value) => setFormData({ ...formData, defaultLanguage: value })}
                >
                  <SelectTrigger id="defaultLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">{t('settings.languages.es')}</SelectItem>
                    <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
                    <SelectItem value="de">{t('settings.languages.de')}</SelectItem>
                    <SelectItem value="fr">{t('settings.languages.fr')}</SelectItem>
                    <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                    <SelectItem value="pt">{t('settings.languages.pt')}</SelectItem>
                    <SelectItem value="nl">{t('settings.languages.nl')}</SelectItem>
                    <SelectItem value="pl">{t('settings.languages.pl')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('agents.knowledge_collections')}</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                {knowledgeCollections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('agents.no_collections_available')}
                  </p>
                ) : (
                  knowledgeCollections.map((collection) => (
                    <div key={collection.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`collection-${collection.id}`}
                        checked={formData.knowledgeCollectionIds.includes(collection.id)}
                        onChange={() => toggleCollection(collection.id)}
                        className="rounded"
                      />
                      <label
                        htmlFor={`collection-${collection.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {collection.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendarIntegrationId">{t('agents.calendar_integration')}</Label>
              <Select
                value={formData.calendarIntegrationId}
                onValueChange={(value) => setFormData({ ...formData, calendarIntegrationId: value })}
              >
                <SelectTrigger id="calendarIntegrationId">
                  <SelectValue placeholder={t('agents.select_calendar')} />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('agents.none')}</SelectItem>
                  {calendarIntegrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id}>
                      {integration.provider} ({integration.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalitySettings">{t('agents.personality_settings')}</Label>
              <Textarea
                id="personalitySettings"
                value={formData.personalitySettings}
                onChange={(e) => setFormData({ ...formData, personalitySettings: e.target.value })}
                placeholder={t('agents.personality_placeholder')}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                {editingAgent ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


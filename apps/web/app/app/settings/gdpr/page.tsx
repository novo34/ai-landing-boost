'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Plus, Trash2, Edit, CheckCircle2, XCircle, Download, UserX, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ConsentLog {
  id: string;
  tenantId: string;
  userId?: string;
  consentType: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface RetentionPolicy {
  id: string;
  tenantId: string;
  dataType: string;
  retentionDays: number;
  autoDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function GdprPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentLog[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [consentForm, setConsentForm] = useState({
    consentType: 'data_processing',
    granted: true,
  });
  const [policyForm, setPolicyForm] = useState({
    dataType: 'conversations',
    retentionDays: 365,
    autoDelete: false,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [consentsResponse, policiesResponse] = await Promise.all([
        apiClient.getConsents(),
        apiClient.getRetentionPolicies(),
      ]);

      if (consentsResponse.success && consentsResponse.data) {
        setConsents(consentsResponse.data);
      }

      if (policiesResponse.success && policiesResponse.data) {
        setPolicies(policiesResponse.data);
      }
    } catch (error) {
      console.error('Error loading GDPR data:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar una vez al montar el componente

  const handleCreateConsent = async () => {
    try {
      const response = await apiClient.createConsent(consentForm);
      if (response.success) {
        toast({
          title: t('gdpr.consent_created'),
          description: t('gdpr.consent_created_success'),
        });
        setShowConsentDialog(false);
        setConsentForm({ consentType: 'data_processing', granted: true });
        loadData();
      }
    } catch (error) {
      console.error('Error creating consent:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.create_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const response = editingPolicy
        ? await apiClient.updateRetentionPolicy(editingPolicy.id, {
            retentionDays: policyForm.retentionDays,
            autoDelete: policyForm.autoDelete,
          })
        : await apiClient.createRetentionPolicy(policyForm);

      if (response.success) {
        toast({
          title: editingPolicy
            ? t('gdpr.policy_updated')
            : t('gdpr.policy_created'),
          description: editingPolicy
            ? t('gdpr.policy_updated_success')
            : t('gdpr.policy_created_success'),
        });
        setShowPolicyDialog(false);
        setEditingPolicy(null);
        setPolicyForm({ dataType: 'conversations', retentionDays: 365, autoDelete: false });
        loadData();
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.save_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleApplyRetention = async () => {
    if (!confirm(t('gdpr.confirm_apply'))) {
      return;
    }

    try {
      const response = await apiClient.applyRetentionPolicies();
      if (response.success) {
        toast({
          title: t('gdpr.policies_applied'),
          description: t('gdpr.policies_applied_success'),
        });
      }
    } catch (error) {
      console.error('Error applying retention policies:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.apply_failed'),
        variant: 'destructive',
      });
    }
  };

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      data_processing: 'Procesamiento de Datos',
      marketing: 'Marketing',
      analytics: 'Analíticas',
      cookies: 'Cookies',
    };
    return labels[type] || type;
  };

  const getDataTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      conversations: 'Conversaciones',
      messages: 'Mensajes',
      appointments: 'Citas',
      leads: 'Leads',
      knowledge: 'Base de Conocimiento',
    };
    return labels[type] || type;
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          {t('gdpr.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('gdpr.description')}
        </p>
      </div>

      {/* Consentimientos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('gdpr.consents')}</CardTitle>
              <CardDescription>
                {t('gdpr.consents_description')}
              </CardDescription>
            </div>
            <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('gdpr.create_consent')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('gdpr.create_consent')}</DialogTitle>
                  <DialogDescription>
                    {t('gdpr.create_consent_description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('gdpr.consent_type')}</Label>
                    <Select
                      value={consentForm.consentType}
                      onValueChange={(value) => setConsentForm({ ...consentForm, consentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data_processing">{t('gdpr.consent_types.data_processing')}</SelectItem>
                        <SelectItem value="marketing">{t('gdpr.consent_types.marketing')}</SelectItem>
                        <SelectItem value="analytics">{t('gdpr.consent_types.analytics')}</SelectItem>
                        <SelectItem value="cookies">{t('gdpr.consent_types.cookies')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="granted"
                      checked={consentForm.granted}
                      onCheckedChange={(checked) => setConsentForm({ ...consentForm, granted: checked })}
                    />
                    <Label htmlFor="granted">
                      {consentForm.granted ? t('gdpr.granted') : t('gdpr.denied')}
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateConsent} className="flex-1">
                      {t('common.save')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowConsentDialog(false)} className="flex-1">
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {consents.length > 0 ? (
            <div className="space-y-2">
              {consents.slice(0, 10).map((consent) => (
                <div key={consent.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {consent.granted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{getConsentTypeLabel(consent.consentType)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(consent.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={consent.granted ? 'default' : 'destructive'}>
                    {consent.granted ? t('gdpr.granted') : t('gdpr.denied')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('gdpr.no_consents')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Políticas de Retención */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('gdpr.retention_policies')}</CardTitle>
              <CardDescription>
                {t('gdpr.retention_policies_description')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleApplyRetention}>
                <FileText className="h-4 w-4 mr-2" />
                {t('gdpr.apply_policies')}
              </Button>
              <Dialog open={showPolicyDialog} onOpenChange={(open) => {
                setShowPolicyDialog(open);
                if (!open) {
                  setEditingPolicy(null);
                  setPolicyForm({ dataType: 'conversations', retentionDays: 365, autoDelete: false });
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('gdpr.create_policy')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPolicy
                        ? t('gdpr.edit_policy')
                        : t('gdpr.create_policy')}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPolicy
                        ? t('gdpr.edit_policy_description')
                        : t('gdpr.create_policy_description')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('gdpr.data_type')}</Label>
                      <Select
                        value={policyForm.dataType}
                        onValueChange={(value) => setPolicyForm({ ...policyForm, dataType: value })}
                        disabled={!!editingPolicy}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversations">{t('gdpr.data_types.conversations')}</SelectItem>
                          <SelectItem value="messages">{t('gdpr.data_types.messages')}</SelectItem>
                          <SelectItem value="appointments">{t('gdpr.data_types.appointments')}</SelectItem>
                          <SelectItem value="leads">{t('gdpr.data_types.leads')}</SelectItem>
                          <SelectItem value="knowledge">{t('gdpr.data_types.knowledge')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="retentionDays">
                        {t('gdpr.retention_days')} (0 = sin límite)
                      </Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        min="0"
                        value={policyForm.retentionDays}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, retentionDays: parseInt(e.target.value, 10) || 0 })
                        }
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoDelete"
                        checked={policyForm.autoDelete}
                        onCheckedChange={(checked) => setPolicyForm({ ...policyForm, autoDelete: checked })}
                      />
                      <Label htmlFor="autoDelete">
                        {t('gdpr.auto_delete')}
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreatePolicy} className="flex-1">
                        {t('common.save')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPolicyDialog(false);
                          setEditingPolicy(null);
                        }}
                        className="flex-1"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {policies.length > 0 ? (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{getDataTypeLabel(policy.dataType)}</p>
                    <p className="text-sm text-muted-foreground">
                      {policy.retentionDays === 0
                        ? t('gdpr.unlimited')
                        : `${policy.retentionDays} ${t('gdpr.days')}`}
                      {policy.autoDelete && ` • ${t('gdpr.auto_delete_enabled')}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPolicy(policy);
                        setPolicyForm({
                          dataType: policy.dataType,
                          retentionDays: policy.retentionDays,
                          autoDelete: policy.autoDelete,
                        });
                        setShowPolicyDialog(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t('common.edit')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('gdpr.no_policies')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Acciones de Usuario */}
      <Card>
        <CardHeader>
          <CardTitle>{t('gdpr.user_actions')}</CardTitle>
          <CardDescription>
            {t('gdpr.user_actions_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('gdpr.export_data')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.export_data_description')}
                </p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t('gdpr.export')}
              </Button>
            </div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('gdpr.anonymize_user')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.anonymize_user_description')}
                </p>
              </div>
              <Button variant="outline">
                <UserX className="h-4 w-4 mr-2" />
                {t('gdpr.anonymize')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


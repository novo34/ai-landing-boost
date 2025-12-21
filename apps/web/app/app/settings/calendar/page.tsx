'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, CalendarIntegration } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import CalendarConnectionWizard from '@/components/calendar/calendar-connection-wizard';

export default function CalendarSettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCalendarIntegrations();
      if (response.success && response.data) {
        setIntegrations(response.data);
      }
    } catch (error) {
      console.error('Error loading calendar integrations:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('calendar.confirm_delete'))) {
      return;
    }

    try {
      const response = await apiClient.deleteCalendarIntegration(id);
      if (response.success) {
        toast({
          title: t('calendar.integration_deleted'),
          description: t('calendar.integration_deleted_success'),
        });
        loadIntegrations();
      }
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.delete_failed'),
        variant: 'destructive',
      });
    }
  };

  const getProviderLabel = (provider: string) => {
    if (provider === 'CUSTOM') {
      return t('calendar.custom');
    }
    return t(`calendar.providers.${provider}`) || provider;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('calendar.active')}
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            {t('calendar.inactive')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('calendar.settings')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('calendar.settings_description')}
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('calendar.connect_calendar')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('calendar.integrations')}</CardTitle>
          <CardDescription>
            {t('calendar.integrations_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('calendar.no_integrations')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('calendar.no_integrations_description')}
              </p>
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('calendar.connect_calendar')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{getProviderLabel(integration.provider)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('calendar.credentials')}: {integration.credentials.masked}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('calendar.created_at')}: {new Date(integration.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {getStatusBadge(integration.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(integration.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CalendarConnectionWizard open={showWizard} onClose={() => {
        setShowWizard(false);
        loadIntegrations();
      }} />
    </div>
  );
}


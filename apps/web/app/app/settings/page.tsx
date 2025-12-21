'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Users, Palette, Lock as LockIcon, MessageSquare, Calendar, Workflow, Shield } from 'lucide-react';

interface TenantSettings {
  id: string;
  tenantId: string;
  defaultLocale: string;
  timeZone: string;
  country: string;
  dataRegion: string;
  whatsappProvider: string;
  calendarProvider: string;
  businessType?: string;
  industryNotes?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [formData, setFormData] = useState<Partial<TenantSettings>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Obtener tenantId de AuthManager (single source of truth)
      const { AuthManager } = await import('@/lib/auth');
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      const tenantId = state.tenant?.id;
      
      if (!tenantId) {
        toast({
          title: t('errors.generic'),
          description: t('settings.no_tenant'),
          variant: 'destructive',
        });
        return;
      }

      const response = await apiClient.getTenantSettings();
      if (response.success && response.data) {
        setSettings(response.data);
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Filtrar solo los campos que han cambiado y son válidos
      const dataToSend: Partial<TenantSettings> = {};
      
      if (formData.defaultLocale && formData.defaultLocale !== settings?.defaultLocale) {
        dataToSend.defaultLocale = formData.defaultLocale;
      }
      if (formData.timeZone && formData.timeZone !== settings?.timeZone) {
        dataToSend.timeZone = formData.timeZone;
      }
      if (formData.country && formData.country !== settings?.country) {
        dataToSend.country = formData.country;
      }
      if (formData.dataRegion && formData.dataRegion !== settings?.dataRegion) {
        dataToSend.dataRegion = formData.dataRegion;
      }
      if (formData.whatsappProvider && formData.whatsappProvider !== settings?.whatsappProvider) {
        dataToSend.whatsappProvider = formData.whatsappProvider;
      }
      if (formData.calendarProvider && formData.calendarProvider !== settings?.calendarProvider) {
        dataToSend.calendarProvider = formData.calendarProvider;
      }
      if (formData.businessType !== undefined && formData.businessType !== settings?.businessType) {
        dataToSend.businessType = formData.businessType;
      }
      if (formData.industryNotes !== undefined && formData.industryNotes !== settings?.industryNotes) {
        dataToSend.industryNotes = formData.industryNotes;
      }

      // Si no hay cambios, no enviar nada
      if (Object.keys(dataToSend).length === 0) {
        toast({
          title: t('settings.no_changes'),
          description: t('settings.no_changes_description'),
        });
        setSaving(false);
        return;
      }

      const response = await apiClient.updateTenantSettings(dataToSend);
      if (response.success) {
        toast({
          title: t('settings.saved'),
          description: t('settings.saved_success'),
        });
        if (response.data) {
          setSettings(response.data);
          setFormData(response.data);
        }
      } else {
        // Mostrar mensaje de error más específico
        const errorMessage = response.error_key 
          ? t(`errors.${response.error_key}`) || response.error_key
          : t('errors.save_failed');
        
        toast({
          title: t('errors.generic'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.save_failed'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.general')}</CardTitle>
            <CardDescription>
              {t('settings.general_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">{t('settings.country')}</Label>
                <Select
                  value={formData.country || ''}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder={t('settings.select_country')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">{t('settings.countries.ES')}</SelectItem>
                    <SelectItem value="CH">{t('settings.countries.CH')}</SelectItem>
                    <SelectItem value="FR">{t('settings.countries.FR')}</SelectItem>
                    <SelectItem value="DE">{t('settings.countries.DE')}</SelectItem>
                    <SelectItem value="IT">{t('settings.countries.IT')}</SelectItem>
                    <SelectItem value="PT">{t('settings.countries.PT')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRegion">{t('settings.data_region')}</Label>
                <Select
                  value={formData.dataRegion || ''}
                  onValueChange={(value) => setFormData({ ...formData, dataRegion: value })}
                >
                  <SelectTrigger id="dataRegion">
                    <SelectValue placeholder={t('settings.select_region')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EU">{t('settings.regions.EU')}</SelectItem>
                    <SelectItem value="CH">{t('settings.regions.CH')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultLocale">{t('settings.default_locale')}</Label>
                <Select
                  value={formData.defaultLocale || ''}
                  onValueChange={(value) => setFormData({ ...formData, defaultLocale: value })}
                >
                  <SelectTrigger id="defaultLocale">
                    <SelectValue placeholder={t('settings.select_locale')} />
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

              <div className="space-y-2">
                <Label htmlFor="timeZone">{t('settings.timezone')}</Label>
                <Input
                  id="timeZone"
                  value={formData.timeZone || ''}
                  onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                  placeholder="Europe/Madrid"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.integrations')}</CardTitle>
            <CardDescription>
              {t('settings.integrations_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsappProvider">{t('settings.whatsapp_provider')}</Label>
                <Select
                  value={formData.whatsappProvider || ''}
                  onValueChange={(value) => setFormData({ ...formData, whatsappProvider: value })}
                >
                  <SelectTrigger id="whatsappProvider">
                    <SelectValue placeholder={t('settings.select_provider')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t('settings.none')}</SelectItem>
                    <SelectItem value="META_API">{t('settings.providers.whatsapp.META_API')}</SelectItem>
                    <SelectItem value="EVOLUTION_API">{t('settings.providers.whatsapp.EVOLUTION_API')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendarProvider">{t('settings.calendar_provider')}</Label>
                <Select
                  value={formData.calendarProvider || ''}
                  onValueChange={(value) => setFormData({ ...formData, calendarProvider: value })}
                >
                  <SelectTrigger id="calendarProvider">
                    <SelectValue placeholder={t('settings.select_provider')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">{t('settings.none')}</SelectItem>
                    <SelectItem value="CAL_COM">{t('settings.providers.calendar.CAL_COM')}</SelectItem>
                    <SelectItem value="GOOGLE">{t('settings.providers.calendar.GOOGLE')}</SelectItem>
                    <SelectItem value="CUSTOM">{t('settings.providers.calendar.CUSTOM')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.business')}</CardTitle>
            <CardDescription>
              {t('settings.business_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">{t('settings.business_type')}</Label>
              <Input
                id="businessType"
                value={formData.businessType || ''}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                placeholder={t('settings.business_type_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryNotes">{t('settings.industry_notes')}</Label>
              <Textarea
                id="industryNotes"
                value={formData.industryNotes || ''}
                onChange={(e) => setFormData({ ...formData, industryNotes: e.target.value })}
                placeholder={t('settings.industry_notes_placeholder')}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={saving}>
            {saving
              ? t('common.saving')
              : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}


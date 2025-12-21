'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, Mail } from 'lucide-react';
import Link from 'next/link';

export default function PlatformSettingsPage() {
  const { t } = useTranslation('platform');
  const { t: tCommon } = useTranslation('common');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    timezone: 'Europe/Madrid',
    language: 'es',
    currency: 'EUR',
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      // TODO: Implementar guardado de configuración
      toast({
        title: t('success.settings_saved'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('errors.settings_save_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.settings.description')}</p>
        </div>
        <Link href="/platform/settings/email">
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            {tCommon('email.platform_settings_title')}
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('operations.settings.general')}
          </CardTitle>
          <CardDescription>{t('operations.settings.general_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="companyName">{t('common.company', { ns: 'common' })}</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder={t('operations.settings.company_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('common.email', { ns: 'common' })}</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder={t('operations.settings.email_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('common.phone', { ns: 'common' })}</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder={t('operations.settings.phone_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="timezone">{t('operations.settings.timezone')}</Label>
              <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Madrid">Europe/Madrid (GMT+1)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (GMT-8)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">{t('common.language', { ns: 'common' })}</Label>
              <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">{t('operations.settings.currency')}</Label>
              <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="address">{t('operations.settings.address')}</Label>
            <Textarea
              id="address"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder={t('operations.settings.address_placeholder')}
              rows={3}
            />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {t('common.save', { ns: 'common' })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

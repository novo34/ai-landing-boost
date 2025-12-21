'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlatformTenant } from '@/lib/api/platform-client';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CreateTenantPage() {
  const router = useRouter();
  const { t } = useTranslation('platform');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    country: '',
    dataRegion: 'EU',
    defaultLocale: 'es',
    timeZone: 'Europe/Madrid',
    ownerEmail: '',
    ownerName: '',
    initialPlan: '',
    initialStatus: 'TRIAL' as 'ACTIVE' | 'TRIAL' | 'SUSPENDED',
    trialEndsAt: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await createPlatformTenant({
        name: formData.name,
        slug: formData.slug,
        country: formData.country || undefined,
        dataRegion: formData.dataRegion || undefined,
        defaultLocale: formData.defaultLocale || undefined,
        timeZone: formData.timeZone || undefined,
        ownerEmail: formData.ownerEmail,
        ownerName: formData.ownerName || undefined,
        planId: formData.initialPlan || undefined,
        initialStatus: formData.initialStatus,
        trialEndsAt: formData.trialEndsAt || undefined,
      });

      if (response.success) {
        router.push('/platform/tenants');
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('tenants.create.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('tenants.create.form.name')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('tenants.create.title')}</CardTitle>
            <CardDescription>{t('tenants.create.form.name')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('tenants.create.form.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('tenants.create.form.name_placeholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t('tenants.create.form.slug')} *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder={t('tenants.create.form.slug_placeholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('tenants.create.form.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder={t('tenants.create.form.country')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRegion">{t('tenants.create.form.data_region')}</Label>
                <Select
                  value={formData.dataRegion}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, dataRegion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EU">{t('regions.regions.eu')}</SelectItem>
                    <SelectItem value="CH">{t('regions.regions.ch')}</SelectItem>
                    <SelectItem value="US">{t('regions.regions.us')}</SelectItem>
                    <SelectItem value="APAC">{t('regions.regions.apac')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultLocale">{t('tenants.create.form.default_locale')}</Label>
                <Select
                  value={formData.defaultLocale}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, defaultLocale: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">{t('settings.languages.es', { ns: 'common' })}</SelectItem>
                    <SelectItem value="en">{t('settings.languages.en', { ns: 'common' })}</SelectItem>
                    <SelectItem value="de">{t('settings.languages.de', { ns: 'common' })}</SelectItem>
                    <SelectItem value="fr">{t('settings.languages.fr', { ns: 'common' })}</SelectItem>
                    <SelectItem value="it">{t('settings.languages.it', { ns: 'common' })}</SelectItem>
                    <SelectItem value="pt">{t('settings.languages.pt', { ns: 'common' })}</SelectItem>
                    <SelectItem value="nl">{t('settings.languages.nl', { ns: 'common' })}</SelectItem>
                    <SelectItem value="pl">{t('settings.languages.pl', { ns: 'common' })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeZone">{t('tenants.create.form.time_zone')}</Label>
                <Input
                  id="timeZone"
                  value={formData.timeZone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, timeZone: e.target.value }))}
                  placeholder={t('tenants.create.form.time_zone_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">{t('tenants.create.form.owner_email')} *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                  placeholder="owner@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName">{t('tenants.create.form.owner_name')}</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ownerName: e.target.value }))}
                  placeholder={t('tenants.create.form.owner_name_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialStatus">{t('tenants.create.form.initial_status')}</Label>
                <Select
                  value={formData.initialStatus}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, initialStatus: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t('tenants.status.active')}</SelectItem>
                    <SelectItem value="TRIAL">{t('tenants.status.trial')}</SelectItem>
                    <SelectItem value="SUSPENDED">{t('tenants.status.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialEndsAt">{t('tenants.create.form.trial_ends_at')}</Label>
                <Input
                  id="trialEndsAt"
                  type="date"
                  value={formData.trialEndsAt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, trialEndsAt: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/tenants">{t('cancel', { ns: 'common' })}</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {loading ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

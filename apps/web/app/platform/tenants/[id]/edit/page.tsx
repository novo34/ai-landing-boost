'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlatformTenantDetails, updatePlatformTenant } from '@/lib/api/platform-client';
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

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('platform');
  const tenantId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    country: '',
    dataRegion: 'EU',
    status: 'ACTIVE' as 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED',
    trialEndsAt: '',
  });

  useEffect(() => {
    loadTenant();
  }, [tenantId]);

  const loadTenant = async () => {
    try {
      setLoadingData(true);
      const response = await getPlatformTenantDetails(tenantId);
      if (response.success && response.data) {
        const tenant = response.data;
        setFormData({
          name: tenant.name || '',
          slug: tenant.slug || '',
          country: tenant.country || '',
          dataRegion: tenant.dataRegion || 'EU',
          status: tenant.status || 'ACTIVE',
          trialEndsAt: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toISOString().split('T')[0] : '',
        });
      }
    } catch (error) {
      console.error('Error loading tenant:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await updatePlatformTenant(tenantId, {
        name: formData.name,
        slug: formData.slug,
        country: formData.country || undefined,
        dataRegion: formData.dataRegion || undefined,
        status: formData.status,
        trialEndsAt: formData.trialEndsAt || undefined,
      });

      if (response.success) {
        router.push(`/platform/tenants/${tenantId}`);
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('loading', { ns: 'common' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/platform/tenants/${tenantId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('tenants.edit.title')}</h1>
          <p className="text-muted-foreground mt-1">{formData.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t('tenants.edit.title')}</CardTitle>
            <CardDescription>{t('tenants.edit.title')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('tenants.list.columns.name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t('tenants.list.columns.slug')} *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{t('tenants.list.columns.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="ES"
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
                    <SelectItem value="EU">EU (GDPR)</SelectItem>
                    <SelectItem value="CH">CH (nLPD)</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="APAC">APAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('tenants.list.columns.status')}</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t('tenants.status.active')}</SelectItem>
                    <SelectItem value="TRIAL">{t('tenants.status.trial')}</SelectItem>
                    <SelectItem value="SUSPENDED">{t('tenants.status.suspended')}</SelectItem>
                    <SelectItem value="CANCELLED">{t('tenants.status.cancelled')}</SelectItem>
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
                <Link href={`/platform/tenants/${tenantId}`}>{t('cancel', { ns: 'common' })}</Link>
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

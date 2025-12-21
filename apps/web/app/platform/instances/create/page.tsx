'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { createInstance } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateInstancePage() {
  const { t } = useTranslation('platform');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    databaseUrl: '',
    stripeKey: '',
    n8nUrl: '',
    status: 'ACTIVE',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await createInstance({
        name: formData.name,
        domain: formData.domain,
        databaseUrl: formData.databaseUrl,
        stripeKey: formData.stripeKey || undefined,
        n8nUrl: formData.n8nUrl || undefined,
        status: formData.status as any,
      });

      if (response.success) {
        toast({
          title: t('success.instance_created'),
          variant: 'default',
        });
        router.push('/platform/instances');
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/instances">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('instances.create.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('instances.create.form.name')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('instances.create.title')}</CardTitle>
          <CardDescription>{t('instances.create.form.name')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('instances.create.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">{t('instances.create.form.domain')}</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="databaseUrl">{t('instances.create.form.database_url')}</Label>
              <Input
                id="databaseUrl"
                type="url"
                value={formData.databaseUrl}
                onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stripeKey">{t('instances.create.form.stripe_key')}</Label>
                <Input
                  id="stripeKey"
                  type="password"
                  value={formData.stripeKey}
                  onChange={(e) => setFormData({ ...formData, stripeKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="n8nUrl">{t('instances.create.form.n8n_url')}</Label>
                <Input
                  id="n8nUrl"
                  type="url"
                  value={formData.n8nUrl}
                  onChange={(e) => setFormData({ ...formData, n8nUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('instances.list.columns.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t('common.active', { ns: 'common' })}</SelectItem>
                  <SelectItem value="INACTIVE">{t('common.inactive', { ns: 'common' })}</SelectItem>
                  <SelectItem value="MAINTENANCE">{t('common.maintenance', { ns: 'common' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading', { ns: 'common' }) : t('common.create', { ns: 'common' })}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/instances">{t('common.cancel', { ns: 'common' })}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { getPlanDetails, updatePlan, type SubscriptionPlan } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const planId = params.planId as string;
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    currency: 'EUR',
    priceCents: 0,
    interval: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    maxAgents: 0,
    maxChannels: 0,
    maxMessages: 0,
  });

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await getPlanDetails(planId);
      if (response.success && response.data) {
        setPlan(response.data);
        setFormData({
          name: response.data.name,
          slug: response.data.slug,
          description: response.data.description || '',
          currency: response.data.currency,
          priceCents: response.data.priceCents,
          interval: response.data.interval,
          maxAgents: response.data.maxAgents || 0,
          maxChannels: response.data.maxChannels || 0,
          maxMessages: 0, // TODO: Agregar al schema si no existe
        });
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await updatePlan(planId, {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        currency: formData.currency,
        priceCents: formData.priceCents,
        interval: formData.interval,
        maxAgents: formData.maxAgents || undefined,
        maxChannels: formData.maxChannels || undefined,
        maxMessages: formData.maxMessages || undefined,
      });

      if (response.success) {
        toast({
          title: t('success.plan_updated'),
          variant: 'default',
        });
        router.push('/platform/plans');
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('common.loading', { ns: 'common' })}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('errors.plan_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/platform/plans">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('plans.edit.title')}</h1>
          <p className="text-muted-foreground mt-1">{plan.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('plans.edit.title')}</CardTitle>
          <CardDescription>{t('plans.create.form.name')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('plans.create.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t('plans.create.form.slug')}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('plans.create.form.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="currency">{t('plans.create.form.currency')}</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceCents">{t('plans.create.form.price_monthly')}</Label>
                <Input
                  id="priceCents"
                  type="number"
                  min="0"
                  value={formData.priceCents}
                  onChange={(e) => setFormData({ ...formData, priceCents: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">{t('plans.create.form.interval')}</Label>
                <Select value={formData.interval} onValueChange={(value) => setFormData({ ...formData, interval: value as 'MONTHLY' | 'YEARLY' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">{t('billing.month', { ns: 'common' })}</SelectItem>
                    <SelectItem value="YEARLY">{t('billing.year', { ns: 'common' })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxAgents">{t('plans.create.form.max_agents')}</Label>
                <Input
                  id="maxAgents"
                  type="number"
                  min="0"
                  value={formData.maxAgents}
                  onChange={(e) => setFormData({ ...formData, maxAgents: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxChannels">{t('plans.create.form.max_channels')}</Label>
                <Input
                  id="maxChannels"
                  type="number"
                  min="0"
                  value={formData.maxChannels}
                  onChange={(e) => setFormData({ ...formData, maxChannels: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMessages">{t('plans.create.form.max_messages')}</Label>
                <Input
                  id="maxMessages"
                  type="number"
                  min="0"
                  value={formData.maxMessages}
                  onChange={(e) => setFormData({ ...formData, maxMessages: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? t('common.loading', { ns: 'common' }) : t('common.save', { ns: 'common' })}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/plans">{t('common.cancel', { ns: 'common' })}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

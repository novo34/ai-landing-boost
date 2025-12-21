'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { createPlatformN8NFlow } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateN8NFlowPage() {
  const { t } = useTranslation('platform');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'OPERATIONS',
    workflow: '{}',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      let workflowJson;
      try {
        workflowJson = JSON.parse(formData.workflow);
      } catch (error) {
        toast({
          title: t('errors.generic', { ns: 'common' }),
          description: t('n8n.invalid_json') || 'Invalid workflow JSON',
          variant: 'destructive',
        });
        return;
      }

      const response = await createPlatformN8NFlow({
        name: formData.name,
        description: formData.description || undefined,
        workflow: workflowJson,
        category: formData.category as any,
      });

      if (response.success) {
        toast({
          title: t('success.flow_created'),
          variant: 'default',
        });
        router.push('/platform/n8n-flows');
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
          <Link href="/platform/n8n-flows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('operations.n8n.create.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.n8n.description')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('operations.n8n.create.title')}</CardTitle>
          <CardDescription>{t('operations.n8n.create.form.name')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('operations.n8n.create.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t('operations.n8n.create.form.category')}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONBOARDING">{t('n8n_flows.categories.onboarding')}</SelectItem>
                    <SelectItem value="NOTIFICATIONS">{t('n8n_flows.categories.notifications')}</SelectItem>
                    <SelectItem value="LEADS">{t('n8n_flows.categories.leads')}</SelectItem>
                    <SelectItem value="REPORTS">{t('n8n_flows.categories.reports')}</SelectItem>
                    <SelectItem value="OPERATIONS">{t('n8n_flows.categories.operations')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('operations.n8n.create.form.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workflow">{t('operations.n8n.create.form.workflow')}</Label>
              <Textarea
                id="workflow"
                value={formData.workflow}
                onChange={(e) => setFormData({ ...formData, workflow: e.target.value })}
                rows={12}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('operations.n8n.create.form.workflow')} (JSON)
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading', { ns: 'common' }) : t('common.create', { ns: 'common' })}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/n8n-flows">{t('common.cancel', { ns: 'common' })}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

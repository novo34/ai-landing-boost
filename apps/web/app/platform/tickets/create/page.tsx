'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { createSupportTicket } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateTicketPage() {
  const { t } = useTranslation('platform');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: '',
    subject: '',
    description: '',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    assignedToId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await createSupportTicket({
        tenantId: formData.tenantId || undefined,
        subject: formData.subject,
        description: formData.description,
        category: formData.category as any,
        priority: formData.priority as any,
        assignedToId: formData.assignedToId || undefined,
      });

      if (response.success) {
        toast({
          title: t('success.ticket_created'),
          variant: 'default',
        });
        router.push('/platform/tickets');
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
          <Link href="/platform/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('tickets.create.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('tickets.create.form.subject')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tickets.create.title')}</CardTitle>
          <CardDescription>{t('tickets.create.form.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('tickets.create.form.subject')}</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('tickets.create.form.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">{t('tickets.create.form.category')}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TECHNICAL">{t('tickets.category.technical')}</SelectItem>
                    <SelectItem value="BILLING">{t('tickets.category.billing')}</SelectItem>
                    <SelectItem value="CONFIGURATION">{t('tickets.category.configuration')}</SelectItem>
                    <SelectItem value="FEATURE_REQUEST">{t('tickets.category.feature_request', { ns: 'common' })}</SelectItem>
                    <SelectItem value="OTHER">{t('tickets.category.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">{t('tickets.create.form.priority')}</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">{t('tickets.priority.low')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('tickets.priority.medium')}</SelectItem>
                    <SelectItem value="HIGH">{t('tickets.priority.high')}</SelectItem>
                    <SelectItem value="CRITICAL">{t('tickets.priority.critical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading', { ns: 'common' }) : t('common.create', { ns: 'common' })}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/tickets">{t('common.cancel', { ns: 'common' })}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

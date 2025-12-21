'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import { createLead } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateLeadPage() {
  const { t } = useTranslation('platform');
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'MANUAL',
    interest: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await createLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        source: formData.source,
        interest: formData.interest || undefined,
        notes: formData.notes || undefined,
      });

      if (response.success) {
        toast({
          title: t('success.lead_created'),
          variant: 'default',
        });
        router.push('/platform/leads');
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
          <Link href="/platform/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('operations.leads.create.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.leads.create.form.name')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('operations.leads.create.title')}</CardTitle>
          <CardDescription>{t('operations.leads.create.form.name')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">{t('operations.leads.create.form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('operations.leads.create.form.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('operations.leads.create.form.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">{t('operations.leads.create.form.source')}</Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">{t('leads.source.whatsapp')}</SelectItem>
                    <SelectItem value="WEBCHAT">{t('leads.source.webchat')}</SelectItem>
                    <SelectItem value="LANDING">{t('leads.source.landing')}</SelectItem>
                    <SelectItem value="MANUAL">{t('leads.source.manual')}</SelectItem>
                    <SelectItem value="IMPORT">{t('leads.source.import')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">{t('operations.leads.create.form.interest')}</Label>
              <Input
                id="interest"
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                placeholder={t('operations.leads.create.form.interest')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('operations.leads.create.form.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading', { ns: 'common' }) : t('common.create', { ns: 'common' })}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/platform/leads">{t('common.cancel', { ns: 'common' })}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

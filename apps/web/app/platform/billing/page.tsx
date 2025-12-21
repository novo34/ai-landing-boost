'use client';

import { useTranslation } from '@/lib/i18n/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function PlatformBillingPage() {
  const { t } = useTranslation('platform');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('billing.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('billing.title')}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('billing.title')} - {t('billing.subscription.title')}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t('billing.subscription.title')}</CardTitle>
          <CardDescription>{t('billing.subscription.title')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('billing.subscription.plan')}: {t('billing.subscription.status')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

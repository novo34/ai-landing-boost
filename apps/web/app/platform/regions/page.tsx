'use client';

import { useTranslation } from '@/lib/i18n/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function PlatformRegionsPage() {
  const { t } = useTranslation('platform');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('regions.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('regions.list.title')}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('regions.title')} - {t('regions.list.title')}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t('regions.list.title')}</CardTitle>
          <CardDescription>{t('regions.list.title')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {t('regions.regions.eu')}
            </p>
            <p className="text-muted-foreground">
              {t('regions.regions.ch')}
            </p>
            <p className="text-muted-foreground">
              {t('regions.regions.us')}
            </p>
            <p className="text-muted-foreground">
              {t('regions.regions.apac')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

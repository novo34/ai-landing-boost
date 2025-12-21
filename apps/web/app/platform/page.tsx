'use client';

import { useEffect, useState } from 'react';
import { getPlatformMetrics, type PlatformMetrics } from '@/lib/api/platform-client';
import { useTranslation } from '@/lib/i18n/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlatformDashboard() {
  const { t } = useTranslation('platform');
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await getPlatformMetrics();
        if (response.success && response.data) {
          setMetrics(response.data);
        }
      } catch (error) {
        console.error('Error loading platform metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    // Refrescar cada 30 segundos
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('common.loading', { ns: 'common' })}</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('errors.unauthorized')}</p>
      </div>
    );
  }

  const suspendedPercentage = metrics.tenants.total > 0 
    ? ((metrics.tenants.suspended / metrics.tenants.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.metrics.tenants.total')}: {metrics.tenants.total}
          </p>
        </div>
        <Button asChild>
          <Link href="/platform/tenants">
            <Building2 className="mr-2 h-4 w-4" />
            {t('nav.tenants')}
          </Link>
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.metrics.tenants.total')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tenants.total}</div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-muted-foreground">
                {t('dashboard.metrics.tenants.active')}: {metrics.tenants.active}
              </p>
              <CheckCircle className="h-3 w-3 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.metrics.tenants.trial')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tenants.trial}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.metrics.tenants.new_last_30_days')}: {metrics.tenants.newLast30Days}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.metrics.users.total')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.users.total}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.metrics.users.active_last_30_days')}: {metrics.users.activeLast30Days}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.metrics.revenue.mrr')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{metrics.revenue.mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.metrics.revenue.current_month')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de uso y salud */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dashboard.metrics.usage.agents')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usage.agents}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.metrics.usage.channels')}: {metrics.usage.channels}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('dashboard.metrics.usage.conversations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.usage.conversations}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.metrics.usage.messages')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {t('dashboard.metrics.health.payment_failed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tenants.suspended}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {suspendedPercentage}% {t('dashboard.metrics.tenants.suspended')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.title')}</CardTitle>
          <CardDescription>{t('dashboard.metrics.tenants.total')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" asChild className="h-auto py-4">
              <Link href="/platform/tenants/create">
                <div className="text-left">
                  <div className="font-medium">{t('tenants.create.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('tenants.create.form.name')}
                  </div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4">
              <Link href="/platform/tenants">
                <div className="text-left">
                  <div className="font-medium">{t('tenants.list.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('tenants.title')}
                  </div>
                </div>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto py-4">
              <Link href="/platform/audit">
                <div className="text-left">
                  <div className="font-medium">{t('audit.title')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('audit.list.title')}
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

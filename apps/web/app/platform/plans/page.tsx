'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listPlans, getPlansMetrics, deletePlan, type SubscriptionPlan } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function PlansPage() {
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
    loadMetrics();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await listPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await getPlansMetrics();
      if (response.success && response.data) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      const response = await deletePlan(planId);
      if (response.success) {
        toast({
          title: t('success.plan_deleted'),
          variant: 'default',
        });
        await loadPlans();
      }
    } catch (error) {
      toast({
        title: t('errors.generic', { ns: 'common' }),
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('plans.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('plans.list.title')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/plans/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('plans.create.title')}
          </Link>
        </Button>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('plans.list.columns.name')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPlans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('plans.list.columns.tenants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('plans.list.columns.revenue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{metrics.totalRevenue?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('common.total', { ns: 'common' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSubscriptions}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de planes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('plans.list.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('plans.list.columns.name')}</TableHead>
                  <TableHead>{t('plans.list.columns.price_monthly')}</TableHead>
                  <TableHead>{t('plans.list.columns.price_yearly')}</TableHead>
                  <TableHead>{t('plans.list.columns.limits')}</TableHead>
                  <TableHead>{t('plans.list.columns.tenants')}</TableHead>
                  <TableHead>{t('plans.list.columns.revenue')}</TableHead>
                  <TableHead>{t('plans.list.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {plan.interval === 'MONTHLY'
                        ? `${(plan.priceCents / 100).toFixed(2)} ${plan.currency}`
                        : `${(plan.priceCents / 100 / 12).toFixed(2)} ${plan.currency}/${t('billing.month', { ns: 'common' })}`}
                    </TableCell>
                    <TableCell>
                      {plan.interval === 'YEARLY'
                        ? `${(plan.priceCents / 100).toFixed(2)} ${plan.currency}`
                        : `${(plan.priceCents / 100 * 12).toFixed(2)} ${plan.currency}/${t('billing.year', { ns: 'common' })}`}
                    </TableCell>
                    <TableCell>
                      {plan.maxAgents && `${t('common.agents', { ns: 'common' })}: ${plan.maxAgents}`}
                      {plan.maxChannels && `, ${t('common.channels', { ns: 'common' })}: ${plan.maxChannels}`}
                    </TableCell>
                    <TableCell>{plan.activeSubscriptions || plan._count?.tenantsubscription || 0}</TableCell>
                    <TableCell>€{plan.monthlyRevenue?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/plans/${plan.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('plans.delete.title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('plans.delete.confirm')}
                                <br />
                                {t('plans.delete.warning')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel', { ns: 'common' })}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(plan.id)}>
                                {t('common.delete', { ns: 'common' })}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

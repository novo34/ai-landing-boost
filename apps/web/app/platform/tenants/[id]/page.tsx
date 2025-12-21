'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPlatformTenantDetails, suspendPlatformTenant, reactivatePlatformTenant, deletePlatformTenant } from '@/lib/api/platform-client';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Ban, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function PlatformTenantDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation('platform');
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    loadTenant();
  }, [tenantId]);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const response = await getPlatformTenantDetails(tenantId);
      if (response.success && response.data) {
        setTenant(response.data);
      }
    } catch (error) {
      console.error('Error loading tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    try {
      const response = await suspendPlatformTenant(tenantId, suspendReason);
      if (response.success) {
        setSuspendDialogOpen(false);
        setSuspendReason('');
        loadTenant();
      }
    } catch (error) {
      console.error('Error suspending tenant:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      const response = await reactivatePlatformTenant(tenantId);
      if (response.success) {
        setReactivateDialogOpen(false);
        loadTenant();
      }
    } catch (error) {
      console.error('Error reactivating tenant:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await deletePlatformTenant(tenantId);
      if (response.success) {
        router.push('/platform/tenants');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ACTIVE: { variant: 'default', label: t('tenants.status.active') },
      TRIAL: { variant: 'secondary', label: t('tenants.status.trial') },
      SUSPENDED: { variant: 'destructive', label: t('tenants.status.suspended') },
      CANCELLED: { variant: 'outline', label: t('tenants.status.cancelled') },
    };
    const config = statusMap[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('loading', { ns: 'common' })}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('errors.tenant_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/platform/tenants">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground mt-1">{tenant.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {tenant.status === 'SUSPENDED' ? (
            <Button variant="outline" onClick={() => setReactivateDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('tenants.reactivate.title')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setSuspendDialogOpen(true)}>
              <Ban className="mr-2 h-4 w-4" />
              {t('tenants.suspend.title')}
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/platform/tenants/${tenantId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('tenants.edit.title')}
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('tenants.delete.title')}
          </Button>
        </div>
      </div>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.details.basic_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.name')}</Label>
              <p className="font-medium">{tenant.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.slug')}</Label>
              <p className="font-medium">{tenant.slug}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.status')}</Label>
              <div className="mt-1">{getStatusBadge(tenant.status)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.country')}</Label>
              <p className="font-medium">{tenant.country || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.plan')}</Label>
              <p className="font-medium">{tenant.plan || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('tenants.list.columns.created_at')}</Label>
              <p className="font-medium">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('tenants.list.columns.users')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.userCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('tenants.list.columns.agents')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.agentCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('tenants.list.columns.channels')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.channelCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogos */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenants.suspend.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('tenants.suspend.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">{t('tenants.suspend.reason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('tenants.suspend.reason_placeholder')}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={!suspendReason.trim()}>
              {t('tenants.suspend.title')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenants.reactivate.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('tenants.reactivate.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate}>
              {t('tenants.reactivate.title')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('tenants.delete.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('tenants.delete.confirm')}
              <div className="mt-4 space-y-2">
                <p className="font-medium">{t('tenants.delete.warning')}</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>{t('tenants.delete.warning_users', { count: tenant.userCount || 0 })}</li>
                  <li>{t('tenants.delete.warning_conversations', { count: tenant.conversationCount || 0 })}</li>
                  <li>{t('tenants.delete.warning_data')}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('tenants.delete.title')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listPlatformN8NFlows, activatePlatformN8NFlow, deactivatePlatformN8NFlow, deletePlatformN8NFlow, type PlatformN8NFlow } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Workflow, Plus, Play, Square, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function PlatformN8NPage() {
  const { t } = useTranslation('platform');
  const { toast } = useToast();
  const [flows, setFlows] = useState<PlatformN8NFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ category?: string; isActive?: boolean }>({});

  useEffect(() => {
    loadFlows();
  }, [filter]);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const response = await listPlatformN8NFlows(filter);
      if (response.success && response.data) {
        setFlows(response.data);
      }
    } catch (error) {
      console.error('Error loading flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (flowId: string) => {
    try {
      const response = await activatePlatformN8NFlow(flowId);
      if (response.success) {
        toast({
          title: t('success.flow_activated'),
          variant: 'default',
        });
        await loadFlows();
      }
    } catch (error) {
      console.error('Error activating flow:', error);
      toast({
        title: t('errors.flow_activation_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (flowId: string) => {
    try {
      const response = await deactivatePlatformN8NFlow(flowId);
      if (response.success) {
        toast({
          title: t('success.flow_deactivated'),
          variant: 'default',
        });
        await loadFlows();
      }
    } catch (error) {
      console.error('Error deactivating flow:', error);
      toast({
        title: t('errors.flow_deactivation_failed'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (flowId: string) => {
    try {
      const response = await deletePlatformN8NFlow(flowId);
      if (response.success) {
        toast({
          title: t('success.flow_deleted'),
          variant: 'default',
        });
        await loadFlows();
      }
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast({
        title: t('errors.flow_deletion_failed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.n8n.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.n8n.description')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/n8n-flows/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('common.create', { ns: 'common' })}
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              value={filter.category || undefined}
              onValueChange={(value) => setFilter({ ...filter, category: value === 'ALL' ? undefined : value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('n8n_flows.filters.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="LEAD_INTAKE">{t('n8n_flows.categories.lead_intake')}</SelectItem>
                <SelectItem value="BOOKING_FLOW">{t('n8n_flows.categories.booking_flow')}</SelectItem>
                <SelectItem value="FOLLOWUP">{t('n8n_flows.categories.followup')}</SelectItem>
                <SelectItem value="PAYMENT_FAILED">{t('n8n_flows.categories.payment_failed')}</SelectItem>
                <SelectItem value="CUSTOM">{t('n8n_flows.categories.custom')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.isActive !== undefined ? (filter.isActive ? 'true' : 'false') : 'ALL'}
              onValueChange={(value) => setFilter({ ...filter, isActive: value === 'ALL' ? undefined : value === 'true' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('n8n_flows.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="true">{t('common.active', { ns: 'common' })}</SelectItem>
                <SelectItem value="false">{t('common.inactive', { ns: 'common' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de flujos */}
      <Card>
        <CardHeader>
          <CardTitle>{t('operations.n8n.title')}</CardTitle>
          <CardDescription>{t('operations.n8n.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
              <Button asChild className="mt-4">
                <Link href="/platform/n8n-flows/create">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('common.create', { ns: 'common' })} {t('n8n_flows.title')}
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', { ns: 'common' })}</TableHead>
                  <TableHead>{t('n8n_flows.category')}</TableHead>
                  <TableHead>{t('common.status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.created_at', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.actions', { ns: 'common' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">{flow.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`n8n_flows.categories.${flow.category.toLowerCase()}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={flow.isActive ? 'default' : 'outline'}>
                        {flow.isActive ? t('common.active', { ns: 'common' }) : t('common.inactive', { ns: 'common' })}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(flow.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {flow.isActive ? (
                          <Button variant="ghost" size="sm" onClick={() => handleDeactivate(flow.id)}>
                            <Square className="h-4 w-4 mr-1" />
                            {t('n8n_flows.deactivate')}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleActivate(flow.id)}>
                            <Play className="h-4 w-4 mr-1" />
                            {t('n8n_flows.activate')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/n8n-flows/${flow.id}`}>{t('common.view', { ns: 'common' })}</Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.confirm_delete', { ns: 'common' })}</AlertDialogTitle>
                              <AlertDialogDescription>{t('common.delete_warning', { ns: 'common' })}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel', { ns: 'common' })}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(flow.id)}>{t('common.delete', { ns: 'common' })}</AlertDialogAction>
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

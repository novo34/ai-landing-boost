'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listInstances, type PlatformInstance } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Server, Plus } from 'lucide-react';
import Link from 'next/link';

export default function InstancesPage() {
  const { t } = useTranslation('platform');
  const [instances, setInstances] = useState<PlatformInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      const response = await listInstances();
      if (response.success && response.data) {
        setInstances(response.data);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('instances.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('instances.list.title')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/instances/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('instances.create.title')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('instances.list.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('instances.list.columns.name')}</TableHead>
                  <TableHead>{t('instances.list.columns.domain')}</TableHead>
                  <TableHead>{t('instances.list.columns.status')}</TableHead>
                  <TableHead>{t('instances.list.columns.tenants')}</TableHead>
                  <TableHead>{t('instances.list.columns.created_at')}</TableHead>
                  <TableHead>{t('instances.list.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">{instance.name}</TableCell>
                    <TableCell>{instance.domain}</TableCell>
                    <TableCell>
                      <Badge>{instance.status}</Badge>
                    </TableCell>
                    <TableCell>{instance._count?.tenants || 0}</TableCell>
                    <TableCell>{new Date(instance.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/platform/instances/${instance.id}`}>{t('common.view', { ns: 'common' })}</Link>
                      </Button>
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

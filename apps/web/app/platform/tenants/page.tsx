'use client';

import { useEffect, useState } from 'react';
import { listPlatformTenants, type PlatformTenant } from '@/lib/api/platform-client';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlatformTenantsPage() {
  const { t } = useTranslation('platform');
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTenants();
  }, [page, search]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await listPlatformTenants({
        search: search || undefined,
        page,
        limit: 50,
      });
      if (response.success && response.data) {
        setTenants(response.data.tenants);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
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

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('common.loading', { ns: 'common' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('tenants.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('tenants.list.title')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/tenants/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('create', { ns: 'common' })}
          </Link>
        </Button>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('tenants.list.search_placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de tenants */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tenants.list.columns.name')}</TableHead>
              <TableHead>{t('tenants.list.columns.slug')}</TableHead>
              <TableHead>{t('tenants.list.columns.status')}</TableHead>
              <TableHead>{t('tenants.list.columns.plan')}</TableHead>
              <TableHead>{t('tenants.list.columns.country')}</TableHead>
              <TableHead>{t('tenants.list.columns.users')}</TableHead>
              <TableHead>{t('tenants.list.columns.agents')}</TableHead>
              <TableHead>{t('tenants.list.columns.created_at')}</TableHead>
              <TableHead>{t('tenants.list.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t('no_data', { ns: 'common' }) || 'No hay datos'}
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                  <TableCell>{tenant.plan || '-'}</TableCell>
                  <TableCell>{tenant.country || '-'}</TableCell>
                  <TableCell>{tenant.userCount}</TableCell>
                  <TableCell>{tenant.agentCount}</TableCell>
                  <TableCell>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/platform/tenants/${tenant.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/platform/tenants/${tenant.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('common.page', { ns: 'common' })} {page} {t('common.of', { ns: 'common' })} {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {t('common.previous', { ns: 'common' })}
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next', { ns: 'common' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

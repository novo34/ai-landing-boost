'use client';

import { useEffect, useState } from 'react';
import { getPlatformAuditLogs, type PlatformAuditLog } from '@/lib/api/platform-client';
import { useTranslation } from '@/lib/i18n/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PlatformAuditPage() {
  const { t } = useTranslation('platform');
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await getPlatformAuditLogs({
        ...filters,
        page,
        limit: 50,
      });
      if (response.success && response.data) {
        setLogs(response.data.logs);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const actionKey = `audit.actions.${action.toLowerCase().replace(/_/g, '_')}`;
    const translated = t(actionKey);
    return translated !== actionKey ? translated : action;
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>{t('loading', { ns: 'common' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('audit.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('audit.list.title')}</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{t('audit.list.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('audit.list.filters.action')}</label>
              <Input
                placeholder={t('audit.list.filters.action')}
                value={filters.action}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, action: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('audit.list.filters.resource_type')}</label>
              <Input
                placeholder={t('audit.list.filters.resource_type')}
                value={filters.resourceType}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, resourceType: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('audit.list.filters.user')}</label>
              <Input
                placeholder={t('audit.list.filters.user')}
                value={filters.userId}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, userId: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('audit.list.filters.date_range')}</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('audit.list.title')}</CardTitle>
            <CardDescription>{t('audit.list.title')}</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('audit.list.export')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.list.columns.timestamp')}</TableHead>
                  <TableHead>{t('audit.list.columns.user')}</TableHead>
                  <TableHead>{t('audit.list.columns.action')}</TableHead>
                  <TableHead>{t('audit.list.columns.resource')}</TableHead>
                  <TableHead>{t('audit.list.columns.details')}</TableHead>
                  <TableHead>{t('audit.list.columns.ip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('no_data', { ns: 'common' }) || 'No hay datos'}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.user?.email || log.userId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getActionLabel(log.action)}
                      </TableCell>
                      <TableCell>
                        {log.resourceType}
                        {log.resourceId && ` #${log.resourceId.substring(0, 8)}`}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.ipAddress || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

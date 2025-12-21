'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { getPlatformChannels, getPlatformTenant, type Channel } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hash, Plus } from 'lucide-react';
import Link from 'next/link';
import { AuthManager } from '@/lib/auth';

export default function PlatformChannelsPage() {
  const { t } = useTranslation('platform');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });
  const [platformTenantId, setPlatformTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
    loadPlatformTenant();
  }, [filters]);

  const loadPlatformTenant = async () => {
    try {
      // Intentar obtener el tenant del PLATFORM_OWNER desde el endpoint específico
      const response = await getPlatformTenant();
      if (response.success && response.data?.tenantId) {
        setPlatformTenantId(response.data.tenantId);
      } else {
        // Fallback: intentar desde AuthManager
        const authManager = AuthManager.getInstance();
        const state = authManager.getState();
        if (state.tenant?.id) {
          setPlatformTenantId(state.tenant.id);
        }
      }
    } catch (error) {
      console.error('Error loading platform tenant:', error);
    }
  };

  const loadChannels = async () => {
    try {
      setLoading(true);
      const response = await getPlatformChannels({
        type: filters.type || undefined,
        status: filters.status || undefined,
      });
      if (response.success && response.data) {
        setChannels(response.data);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.channels.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.channels.description')}</p>
        </div>
        {platformTenantId && (
          <Button asChild>
            <Link href={`/app/channels/create`}>
              <Plus className="mr-2 h-4 w-4" />
              {t('common.create', { ns: 'common' })}
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              value={filters.type || undefined}
              onValueChange={(value) => setFilters({ ...filters, type: value === 'ALL' ? '' : value || '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.type', { ns: 'common' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="WEBCHAT">Webchat</SelectItem>
                <SelectItem value="TELEGRAM">Telegram</SelectItem>
                <SelectItem value="VOICE">{t('common.voice', { ns: 'common' })}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || undefined}
              onValueChange={(value) => setFilters({ ...filters, status: value === 'ALL' ? '' : value || '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.status', { ns: 'common' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="ACTIVE">{t('common.active', { ns: 'common' })}</SelectItem>
                <SelectItem value="INACTIVE">{t('common.inactive', { ns: 'common' })}</SelectItem>
                <SelectItem value="ERROR">{t('common.error', { ns: 'common' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de canales */}
      <Card>
        <CardHeader>
          <CardTitle>{t('operations.channels.title')}</CardTitle>
          <CardDescription>{t('operations.channels.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Hash className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
              {platformTenantId && (
                <Button asChild className="mt-4">
                  <Link href={`/app/channels/create`}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.create', { ns: 'common' })} {t('common.channels', { ns: 'common' })}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.type', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.created_at', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.actions', { ns: 'common' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{channel.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={channel.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {t(`common.${channel.status.toLowerCase()}`, { ns: 'common' })}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(channel.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/channels/${channel.id}`}>{t('common.view', { ns: 'common' })}</Link>
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

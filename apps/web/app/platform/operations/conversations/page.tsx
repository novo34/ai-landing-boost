'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { getPlatformConversations } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function PlatformConversationsPage() {
  const { t } = useTranslation('platform');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    agentId: '',
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  useEffect(() => {
    loadConversations();
  }, [filters]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await getPlatformConversations({
        status: filters.status || undefined,
        agentId: filters.agentId || undefined,
        limit: pagination.limit,
        offset: pagination.offset,
      });
      if (response.success && response.data) {
        setConversations(response.data.data || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.conversations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.conversations.description')}</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
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
                <SelectItem value="CLOSED">{t('common.closed', { ns: 'common' })}</SelectItem>
                <SelectItem value="ARCHIVED">{t('common.archived', { ns: 'common' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de conversaciones */}
      <Card>
        <CardHeader>
          <CardTitle>{t('operations.conversations.title')}</CardTitle>
          <CardDescription>
            {t('common.showing', { ns: 'common' })} {conversations.length} {t('common.of', { ns: 'common' })} {pagination.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.participant', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.agent', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.messages', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.last_message', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.actions', { ns: 'common' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conv) => (
                  <TableRow key={conv.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conv.participantName || conv.participantPhone || '-'}</div>
                        {conv.participantPhone && (
                          <div className="text-sm text-muted-foreground">{conv.participantPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{conv.agent?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={conv.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {conv.status ? (t(`common.${conv.status.toLowerCase()}`, { ns: 'common' }) || conv.status) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {conv.messageCount || 0}
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/conversations/${conv.id}`}>{t('common.view', { ns: 'common' })}</Link>
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

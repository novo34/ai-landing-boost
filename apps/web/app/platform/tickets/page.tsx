'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listSupportTickets, type SupportTicket } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Ticket, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function TicketsPage() {
  const { t } = useTranslation('platform');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadTickets();
  }, [filters, pagination.page]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await listSupportTickets({
        status: filters.status === 'ALL' ? undefined : filters.status || undefined,
        category: filters.category === 'ALL' ? undefined : filters.category || undefined,
        priority: filters.priority === 'ALL' ? undefined : filters.priority || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (response.success && response.data) {
        setTickets(response.data.tickets);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'RESOLVED':
        return 'outline';
      case 'CLOSED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('tickets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('tickets.list.title')}</p>
        </div>
        <Button asChild>
          <Link href="/platform/tickets/create">
            <Plus className="mr-2 h-4 w-4" />
            {t('tickets.create.title')}
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('common.filters', { ns: 'common' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Input
                placeholder={t('common.search', { ns: 'common' })}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <Select value={filters.status || undefined} onValueChange={(value) => setFilters({ ...filters, status: value || '' })}>
              <SelectTrigger>
                <SelectValue placeholder={t('tickets.list.filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="OPEN">{t('tickets.status.open')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('tickets.status.in_progress')}</SelectItem>
                <SelectItem value="WAITING_CLIENT">{t('tickets.status.waiting_client')}</SelectItem>
                <SelectItem value="RESOLVED">{t('tickets.status.resolved')}</SelectItem>
                <SelectItem value="CLOSED">{t('tickets.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category || undefined} onValueChange={(value) => setFilters({ ...filters, category: value === 'ALL' ? '' : value || '' })}>
              <SelectTrigger>
                <SelectValue placeholder={t('tickets.list.filters.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="TECHNICAL">{t('tickets.category.technical')}</SelectItem>
                <SelectItem value="BILLING">{t('tickets.category.billing')}</SelectItem>
                <SelectItem value="CONFIGURATION">{t('tickets.category.configuration')}</SelectItem>
                <SelectItem value="FEATURE_REQUEST">{t('tickets.category.feature_request')}</SelectItem>
                <SelectItem value="OTHER">{t('tickets.category.other')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority || undefined} onValueChange={(value) => setFilters({ ...filters, priority: value === 'ALL' ? '' : value || '' })}>
              <SelectTrigger>
                <SelectValue placeholder={t('tickets.list.filters.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                <SelectItem value="LOW">{t('tickets.priority.low')}</SelectItem>
                <SelectItem value="MEDIUM">{t('tickets.priority.medium')}</SelectItem>
                <SelectItem value="HIGH">{t('tickets.priority.high')}</SelectItem>
                <SelectItem value="CRITICAL">{t('tickets.priority.critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de tickets */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tickets.list.title')}</CardTitle>
          <CardDescription>
            {t('common.showing', { ns: 'common' })} {tickets.length} {t('common.of', { ns: 'common' })} {pagination.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tickets.list.columns.id')}</TableHead>
                  <TableHead>{t('tickets.list.columns.subject')}</TableHead>
                  <TableHead>{t('tickets.list.columns.tenant')}</TableHead>
                  <TableHead>{t('tickets.list.columns.category')}</TableHead>
                  <TableHead>{t('tickets.list.columns.priority')}</TableHead>
                  <TableHead>{t('tickets.list.columns.status')}</TableHead>
                  <TableHead>{t('tickets.list.columns.assigned_to')}</TableHead>
                  <TableHead>{t('tickets.list.columns.created_at')}</TableHead>
                  <TableHead>{t('tickets.list.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Link href={`/platform/tickets/${ticket.id}`} className="hover:underline">
                        {ticket.subject}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {ticket.tenant ? (
                        <Link href={`/platform/tenants/${ticket.tenant.id}`} className="hover:underline">
                          {ticket.tenant.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{t(`tickets.category.${ticket.category.toLowerCase()}`)}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {t(`tickets.priority.${ticket.priority.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {t(`tickets.status.${ticket.status.toLowerCase().replace('_', '_')}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email : '-'}
                    </TableCell>
                    <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/platform/tickets/${ticket.id}`}>{t('common.view', { ns: 'common' })}</Link>
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

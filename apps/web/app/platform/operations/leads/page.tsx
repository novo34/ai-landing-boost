'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { listLeads, getLeadPipeline, getSalesMetrics, type Lead } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function PlatformLeadsPage() {
  const { t } = useTranslation('platform');
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    stage: '',
    source: '',
  });

  useEffect(() => {
    if (view === 'list') {
      loadLeads();
    } else {
      loadPipeline();
      loadMetrics();
    }
  }, [view, filters]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await listLeads(filters);
      if (response.success && response.data) {
        setLeads(response.data.leads);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const response = await getLeadPipeline();
      if (response.success && response.data) {
        setPipeline(response.data.pipeline);
        setMetrics(response.data.metrics);
      }
    } catch (error) {
      console.error('Error loading pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await getSalesMetrics();
      if (response.success && response.data) {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.leads.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.leads.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} onClick={() => setView('list')}>
            {t('common.list', { ns: 'common' })}
          </Button>
          <Button variant={view === 'pipeline' ? 'default' : 'outline'} onClick={() => setView('pipeline')}>
            {t('leads.pipeline.title')}
          </Button>
          <Button asChild>
            <Link href="/platform/leads/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('common.create', { ns: 'common' })}
            </Link>
          </Button>
        </div>
      </div>

      {view === 'pipeline' && metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('leads.metrics.total_leads')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalLeads || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('leads.metrics.converted')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.converted || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('leads.metrics.conversion_rate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.conversionRate ? `${metrics.conversionRate}%` : '0%'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('leads.metrics.total_value')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalValue ? `€${metrics.totalValue}` : '€0'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      {view === 'list' && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                value={filters.status || undefined}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'ALL' ? '' : value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.status', { ns: 'common' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                  <SelectItem value="NEW">{t('leads.status.new')}</SelectItem>
                  <SelectItem value="CONTACTED">{t('leads.status.contacted')}</SelectItem>
                  <SelectItem value="QUALIFIED">{t('leads.status.qualified')}</SelectItem>
                  <SelectItem value="CONVERTED">{t('leads.status.converted')}</SelectItem>
                  <SelectItem value="LOST">{t('leads.status.lost')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.stage || undefined}
                onValueChange={(value) => setFilters({ ...filters, stage: value === 'ALL' ? '' : value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('leads.stage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                  <SelectItem value="LEAD">{t('leads.stages.lead')}</SelectItem>
                  <SelectItem value="CONTACTED">{t('leads.stages.contacted')}</SelectItem>
                  <SelectItem value="QUALIFIED">{t('leads.stages.qualified')}</SelectItem>
                  <SelectItem value="PROPOSAL">{t('leads.stages.proposal')}</SelectItem>
                  <SelectItem value="NEGOTIATION">{t('leads.stages.negotiation')}</SelectItem>
                  <SelectItem value="CLOSED">{t('leads.stages.closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.source || undefined}
                onValueChange={(value) => setFilters({ ...filters, source: value === 'ALL' ? '' : value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.sources', { ns: 'common' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all', { ns: 'common' })}</SelectItem>
                  <SelectItem value="WEBSITE">{t('leads.sources.website')}</SelectItem>
                  <SelectItem value="REFERRAL">{t('leads.sources.referral')}</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">{t('leads.sources.social_media')}</SelectItem>
                  <SelectItem value="EMAIL">{t('leads.sources.email')}</SelectItem>
                  <SelectItem value="OTHER">{t('leads.sources.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de Lista */}
      {view === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('operations.leads.title')}</CardTitle>
            <CardDescription>{t('operations.leads.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p>{t('common.loading', { ns: 'common' })}</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
                <Button asChild className="mt-4">
                  <Link href="/platform/leads/create">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.create', { ns: 'common' })} {t('leads.title')}
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name', { ns: 'common' })}</TableHead>
                    <TableHead>{t('common.email', { ns: 'common' })}</TableHead>
                    <TableHead>{t('common.phone', { ns: 'common' })}</TableHead>
                    <TableHead>{t('leads.stage')}</TableHead>
                    <TableHead>{t('common.status', { ns: 'common' })}</TableHead>
                    <TableHead>{t('common.created_at', { ns: 'common' })}</TableHead>
                    <TableHead>{t('common.actions', { ns: 'common' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.email}</TableCell>
                      <TableCell>{lead.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`leads.stages.${lead.stage?.toLowerCase()}`)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.status === 'CONVERTED' ? 'default' : 'outline'}>
                          {t(`leads.status.${lead.status.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/platform/leads/${lead.id}`}>{t('common.view', { ns: 'common' })}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista de Pipeline */}
      {view === 'pipeline' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('leads.pipeline.title')}</CardTitle>
            <CardDescription>{t('leads.pipeline.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p>{t('common.loading', { ns: 'common' })}</p>
              </div>
            ) : pipeline ? (
              <div className="grid gap-4 md:grid-cols-6">
                {Object.entries(pipeline).map(([stage, stageLeads]: [string, any]) => (
                  <div key={stage} className="space-y-2">
                    <h3 className="font-semibold">{t(`leads.stages.${stage.toLowerCase()}`)}</h3>
                    <div className="space-y-2">
                      {stageLeads.map((lead: Lead) => (
                        <Card key={lead.id} className="p-3">
                          <div className="font-medium text-sm">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.email}</div>
                          <Button variant="ghost" size="sm" className="mt-2 w-full" asChild>
                            <Link href={`/platform/leads/${lead.id}`}>{t('common.view', { ns: 'common' })}</Link>
                          </Button>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

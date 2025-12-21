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

export default function LeadsPage() {
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
      const response = await getLeadPipeline();
      if (response.success && response.data) {
        setPipeline(response.data.pipeline);
        setMetrics(response.data.metrics);
      }
    } catch (error) {
      console.error('Error loading pipeline:', error);
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
          <h1 className="text-3xl font-bold">{t('leads.title')}</h1>
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
              {t('operations.leads.create.title')}
            </Link>
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('leads.list.filters.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.all', { ns: 'common' })}</SelectItem>
                    <SelectItem value="NEW">{t('leads.status.new')}</SelectItem>
                    <SelectItem value="CONTACTED">{t('leads.status.contacted')}</SelectItem>
                    <SelectItem value="QUALIFIED">{t('leads.status.qualified')}</SelectItem>
                    <SelectItem value="OPPORTUNITY">{t('leads.status.opportunity')}</SelectItem>
                    <SelectItem value="CUSTOMER">{t('leads.status.customer')}</SelectItem>
                    <SelectItem value="LOST">{t('leads.status.lost')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.stage} onValueChange={(value) => setFilters({ ...filters, stage: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('leads.list.filters.stage')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.all', { ns: 'common' })}</SelectItem>
                    <SelectItem value="LEAD_CAPTURED">{t('leads.stage.lead_captured')}</SelectItem>
                    <SelectItem value="CONTACTED">{t('leads.stage.contacted')}</SelectItem>
                    <SelectItem value="QUALIFIED">{t('leads.stage.qualified')}</SelectItem>
                    <SelectItem value="DEMO">{t('leads.stage.demo')}</SelectItem>
                    <SelectItem value="PROPOSAL">{t('leads.stage.proposal')}</SelectItem>
                    <SelectItem value="NEGOTIATION">{t('leads.stage.negotiation')}</SelectItem>
                    <SelectItem value="CLOSED_WON">{t('leads.stage.closed_won')}</SelectItem>
                    <SelectItem value="CLOSED_LOST">{t('leads.stage.closed_lost')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.source} onValueChange={(value) => setFilters({ ...filters, source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('leads.list.filters.source')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('common.all', { ns: 'common' })}</SelectItem>
                    <SelectItem value="WHATSAPP">{t('leads.source.whatsapp')}</SelectItem>
                    <SelectItem value="WEBCHAT">{t('leads.source.webchat')}</SelectItem>
                    <SelectItem value="LANDING">{t('leads.source.landing')}</SelectItem>
                    <SelectItem value="MANUAL">{t('leads.source.manual')}</SelectItem>
                    <SelectItem value="IMPORT">{t('leads.source.import')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de leads */}
          <Card>
            <CardHeader>
              <CardTitle>{t('leads.list.title')}</CardTitle>
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
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leads.list.columns.name')}</TableHead>
                      <TableHead>{t('leads.list.columns.email')}</TableHead>
                      <TableHead>{t('leads.list.columns.phone')}</TableHead>
                      <TableHead>{t('leads.list.columns.source')}</TableHead>
                      <TableHead>{t('leads.list.columns.status')}</TableHead>
                      <TableHead>{t('leads.list.columns.stage')}</TableHead>
                      <TableHead>{t('leads.list.columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>{lead.phone || '-'}</TableCell>
                        <TableCell>{t(`leads.source.${lead.source.toLowerCase()}`)}</TableCell>
                        <TableCell>
                          <Badge>{t(`leads.status.${lead.status.toLowerCase()}`)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{t(`leads.stage.${lead.stage.toLowerCase()}`)}</Badge>
                        </TableCell>
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
        </>
      ) : (
        <>
          {/* Métricas */}
          {metrics && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('leads.pipeline.metrics.total')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('leads.pipeline.metrics.conversion_rate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('leads.pipeline.metrics.by_stage')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.byOutcome?.won || 0} / {metrics.byOutcome?.lost || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('leads.pipeline.metrics.by_source')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(metrics.bySource || {}).length} {t('common.sources', { ns: 'common' })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pipeline Kanban */}
          {pipeline && (
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
              {Object.entries(pipeline).map(([stage, stageLeads]: [string, any]) => (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {t(`leads.stage.${stage.toLowerCase()}`)} ({Array.isArray(stageLeads) ? stageLeads.length : 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.isArray(stageLeads) && stageLeads.length > 0 ? (
                      stageLeads.map((lead: Lead) => (
                        <div key={lead.id} className="p-2 border rounded cursor-pointer hover:bg-muted">
                          <div className="font-medium text-sm">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.email}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">-</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

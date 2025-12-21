'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic import de recharts para reducir bundle inicial (~80KB)
// Nota: La página de analytics solo se carga cuando el usuario navega a ella,
// por lo que recharts no afecta el bundle inicial de la landing page
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899'];

export default function AnalyticsPage() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    agentId: 'all',
    channelId: 'all',
    groupBy: 'day' as 'day' | 'week' | 'month',
  });
  const [data, setData] = useState<{
    conversationsTrend: Array<{ date: string; count: number }>;
    messagesStats: { sent: number; received: number; byDay: Array<{ date: string; sent: number; received: number }> };
    responseTimes: Array<{ agentId: string; agentName: string; averageMinutes: number; responseCount: number }>;
    conversions: { leads: number; conversations: number; appointments: number; conversionRates: { leadToConversation: number; conversationToAppointment: number; overall: number } };
    agentsUsage: Array<{ agentId: string; agentName: string; channelId: string; channelName: string; count: number }>;
  } | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [channels, setChannels] = useState<Array<{ id: string; phoneNumber: string }>>([]);

  useEffect(() => {
    loadAgents();
    loadChannels();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      if (response.success && response.data) {
        setAgents(response.data.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await apiClient.getWhatsAppAccounts();
      if (response.success && response.data) {
        setChannels(response.data.map((c: any) => ({ id: c.id, phoneNumber: c.phoneNumber })));
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAnalyticsMetrics({
        startDate: filters.startDate,
        endDate: filters.endDate,
        agentId: filters.agentId !== 'all' ? filters.agentId : undefined,
        channelId: filters.channelId !== 'all' ? filters.channelId : undefined,
        groupBy: filters.groupBy,
      });
      if (response.success && response.data) {
        setData(response.data);
      } else {
        toast({
          title: t('errors.generic'),
          description: t('analytics.load_failed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: t('errors.generic'),
        description: t('analytics.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!data) return;

    if (format === 'csv') {
      let csvContent = 'Date,Conversations,Messages Sent,Messages Received\n';

      // Combinar datos por fecha
      const dates = new Set<string>();
      data.conversationsTrend.forEach((item) => dates.add(item.date));
      data.messagesStats.byDay.forEach((item) => dates.add(item.date));

      Array.from(dates).sort().forEach((date) => {
        const conv = data.conversationsTrend.find((c) => c.date === date);
        const msg = data.messagesStats.byDay.find((m) => m.date === date);
        csvContent += `${date},${conv?.count || 0},${msg?.sent || 0},${msg?.received || 0}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      try {
        setLoading(true);
        const blob = await apiClient.exportAnalyticsPdf({
          startDate: filters.startDate,
          endDate: filters.endDate,
          agentId: filters.agentId !== 'all' ? filters.agentId : undefined,
          channelId: filters.channelId !== 'all' ? filters.channelId : undefined,
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics-report-${Date.now()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast({
          title: t('analytics.export_success'),
          description: t('analytics.pdf_exported'),
        });
      } catch (error) {
        console.error('Error exporting PDF:', error);
        toast({
          title: t('errors.generic'),
          description: t('analytics.export_failed'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Preparar datos para gráfico de uso de agentes por canal (pie chart)
  const agentsUsageData = data?.agentsUsage.reduce((acc, item) => {
    const key = item.agentName;
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key] += item.count;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('analytics.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={!data || loading}>
            <Download className="h-4 w-4 mr-2" />
            {t('analytics.export_csv')}
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={!data || loading}>
            <Download className="h-4 w-4 mr-2" />
            {t('analytics.export_pdf')}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>{t('analytics.start_date')}</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('analytics.end_date')}</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('analytics.agent')}</Label>
              <Select value={filters.agentId} onValueChange={(value) => setFilters({ ...filters, agentId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('analytics.all_agents')}</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('analytics.channel')}</Label>
              <Select value={filters.channelId} onValueChange={(value) => setFilters({ ...filters, channelId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('analytics.all_channels')}</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>{channel.phoneNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('analytics.group_by')}</Label>
              <Select value={filters.groupBy} onValueChange={(value: 'day' | 'week' | 'month') => setFilters({ ...filters, groupBy: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{t('analytics.group_by_day')}</SelectItem>
                  <SelectItem value="week">{t('analytics.group_by_week')}</SelectItem>
                  <SelectItem value="month">{t('analytics.group_by_month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tendencias de Conversaciones */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.conversations_trend')}</CardTitle>
              <CardDescription>{t('analytics.conversations_trend_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.conversationsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name={t('analytics.conversations')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mensajes Enviados vs Recibidos */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.messages_stats')}</CardTitle>
              <CardDescription>{t('analytics.messages_stats_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.messagesStats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#3b82f6" name={t('analytics.sent')} />
                  <Bar dataKey="received" fill="#8b5cf6" name={t('analytics.received')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tiempos de Respuesta por Agente */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.response_times')}</CardTitle>
              <CardDescription>{t('analytics.response_times_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.responseTimes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="agentName" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="averageMinutes" fill="#10b981" name={t('analytics.avg_minutes')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Uso de Agentes por Canal */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.agents_usage')}</CardTitle>
              <CardDescription>{t('analytics.agents_usage_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(agentsUsageData).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(agentsUsageData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Métricas de Conversión */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('analytics.conversions')}</CardTitle>
              <CardDescription>{t('analytics.conversions_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{data.conversions.leads}</div>
                  <div className="text-sm text-muted-foreground">{t('analytics.leads')}</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{data.conversions.conversations}</div>
                  <div className="text-sm text-muted-foreground">{t('analytics.conversations')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.conversions.conversionRates.leadToConversation.toFixed(1)}% {t('analytics.conversion_rate')}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{data.conversions.appointments}</div>
                  <div className="text-sm text-muted-foreground">{t('analytics.appointments')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.conversions.conversionRates.conversationToAppointment.toFixed(1)}% {t('analytics.conversion_rate')}
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-primary/10">
                  <div className="text-2xl font-bold">{data.conversions.conversionRates.overall.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">{t('analytics.overall_conversion')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('analytics.no_data')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

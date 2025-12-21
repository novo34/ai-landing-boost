'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { getPlatformAgents, getPlatformTenant, type Agent } from '@/lib/api/platform-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus } from 'lucide-react';
import Link from 'next/link';
import { AuthManager } from '@/lib/auth';

export default function PlatformAgentsPage() {
  const { t } = useTranslation('platform');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformTenantId, setPlatformTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    // Obtener tenant del PLATFORM_OWNER para poder crear agentes
    loadPlatformTenant();
  }, []);

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

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await getPlatformAgents();
      if (response.success && response.data) {
        setAgents(response.data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('operations.agents.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('operations.agents.description')}</p>
        </div>
        {platformTenantId && (
          <Button asChild>
            <Link href={`/app/agents/create`}>
              <Plus className="mr-2 h-4 w-4" />
              {t('common.create', { ns: 'common' })}
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('operations.agents.title')}</CardTitle>
          <CardDescription>{t('operations.agents.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p>{t('common.loading', { ns: 'common' })}</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('common.no_data', { ns: 'common' })}</p>
              {platformTenantId && (
                <Button asChild className="mt-4">
                  <Link href={`/app/agents/create`}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('common.create', { ns: 'common' })} {t('common.agents', { ns: 'common' })}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.language', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.created_at', { ns: 'common' })}</TableHead>
                  <TableHead>{t('common.actions', { ns: 'common' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>
                      <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'outline'}>
                        {t(`common.${agent.status.toLowerCase()}`, { ns: 'common' })}
                      </Badge>
                    </TableCell>
                    <TableCell>{agent.defaultLanguage || agent.languageStrategy}</TableCell>
                    <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/agents/${agent.id}`}>{t('common.view', { ns: 'common' })}</Link>
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

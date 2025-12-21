'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { isAdminRole, canEdit, isReadOnly, type TenantRole } from '@/lib/utils/roles';
import { AuthManager } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name?: string;
  locale?: string;
  memberships: Array<{
    tenant: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    role: string;
  }>;
}

interface Subscription {
  id: string;
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  country: string;
  plan: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    priceCents: number;
    interval: string;
  };
}

interface BillingData {
  subscription: Subscription | null;
  isTrial: boolean;
  daysLeftInTrial?: number;
}

export default function AppPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<{ id: string; name: string; status: string; role: string } | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [kpis, setKPIs] = useState<{
    leads: { total: number; thisMonth: number };
    agents: { active: number; total: number };
    channels: { active: number; total: number };
    conversations: { active: number; total: number };
    messages: { total: number; thisMonth: number };
    responseRate: { averageMinutes: number; formatted: string };
    responseTime: { averageMinutes: number; formatted: string };
  } | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const loadDashboardData = async () => {
    try {
      // Usar AuthManager como single source of truth
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      
      // Verificar autenticación (síncrono, desde cache)
      if (!state.isAuthenticated || !state.tenant) {
        router.push('/login');
        return;
      }

      // Usar estado directamente (no necesita más llamadas)
      if (state.user) {
        setUser({
          id: state.user.id,
          email: state.user.email,
          name: state.user.name,
          locale: state.user.locale,
          memberships: [],
        });
      }

      if (state.tenant) {
        setCurrentTenant(state.tenant);

        // Cargar datos adicionales de forma progresiva para evitar bloquear el main thread
        // Usar requestIdleCallback o setTimeout para diferir carga no crítica
        
        // Cargar KPIs primero (más importante para el dashboard)
        try {
          const kpisResponse = await apiClient.getKPIs();
          if (kpisResponse.success && kpisResponse.data) {
            setKPIs(kpisResponse.data);
          }
        } catch (error) {
          console.error('Error loading KPIs:', error);
          // No es crítico, continuar sin KPIs
        }

        // Si el usuario es OWNER, cargar información adicional de billing después
        // Cargar de forma diferida para no bloquear el render inicial
        if (state.tenant.role === 'OWNER' && !billingLoading) {
          // Usar setTimeout para diferir la carga y no bloquear el main thread
          setTimeout(async () => {
          setBillingLoading(true);
          try {
            const billingResponse = await apiClient.get<BillingData>('/billing/current');
            if (billingResponse.success && billingResponse.data) {
              setBilling(billingResponse.data);
            }
          } catch (error) {
            console.error('Error loading billing:', error);
            // No es crítico, continuar sin billing
          } finally {
            setBillingLoading(false);
          }
          }, 300); // Pequeño delay para no bloquear el render inicial
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Determinar permisos según rol
  const userRole = currentTenant?.role as TenantRole | undefined;
  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole ? isAdminRole(userRole) : false;
  const canEditContent = userRole ? canEdit(userRole) : false;
  const isReadOnlyUser = userRole ? isReadOnly(userRole) : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isOwner 
            ? t('dashboard.title_owner')
            : t('dashboard.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isOwner
            ? t('dashboard.welcome_owner')
            : t('dashboard.welcome')}
        </p>
      </div>

      {/* Estado de Suscripción/Trial - Solo para OWNER */}
      {isOwner && billing && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.subscription_status')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={billing.isTrial ? 'default' : 'secondary'}>
                {billing.isTrial
                  ? t('billing.trial')
                  : billing.subscription?.status || t('billing.no_subscription')}
              </Badge>
              {billing.isTrial && billing.daysLeftInTrial !== null && billing.daysLeftInTrial !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {t('billing.days_left', { days: billing.daysLeftInTrial })}
                </span>
              )}
              {billing.subscription?.plan && (
                <div className="ml-auto">
                  <p className="text-sm font-medium">{billing.subscription.plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(billing.subscription.plan.priceCents / 100).toFixed(2)}{' '}
                    {billing.subscription.plan.currency} / {billing.subscription.plan.interval === 'MONTHLY' ? t('billing.month') : t('billing.year')}
                  </p>
                </div>
              )}
              {!billing.subscription?.plan && (
                <div className="ml-auto">
                  <p className="text-sm text-muted-foreground">{t('billing.no_plan')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información del Tenant */}
      {currentTenant && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.tenant_info')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>{t('dashboard.tenant_name')}:</strong> {currentTenant.name}
            </div>
            <div>
              <strong>{t('dashboard.role')}:</strong>{' '}
              <Badge variant="outline">{currentTenant.role}</Badge>
            </div>
            <div>
              <strong>{t('dashboard.status')}:</strong>{' '}
              <Badge variant={currentTenant.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {currentTenant.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.leads')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.leads?.total ? kpis.leads.total.toLocaleString() : <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kpis?.leads?.thisMonth && kpis.leads.thisMonth > 0
                ? `${t('dashboard.kpis.this_month')}: ${kpis.leads.thisMonth.toLocaleString()}`
                : t('dashboard.kpis.leads_description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.agents')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.agents ? (
                <>
                  {kpis.agents.active.toLocaleString()}
                  {kpis.agents.total > kpis.agents.active && (
                    <span className="text-sm text-muted-foreground ml-2">
                      / {kpis.agents.total}
                    </span>
                  )}
                </>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kpis?.agents
                ? `${t('dashboard.kpis.active')}: ${kpis.agents.active} / ${t('dashboard.kpis.total')}: ${kpis.agents.total}`
                : t('dashboard.kpis.agents_description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.channels')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.channels ? (
                <>
                  {kpis.channels.active.toLocaleString()}
                  {kpis.channels.total > kpis.channels.active && (
                    <span className="text-sm text-muted-foreground ml-2">
                      / {kpis.channels.total}
                    </span>
                  )}
                </>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kpis?.channels
                ? `${t('dashboard.kpis.active')}: ${kpis.channels.active} / ${t('dashboard.kpis.total')}: ${kpis.channels.total}`
                : t('dashboard.kpis.channels_description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.conversations')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.conversations ? (
                <>
                  {kpis.conversations.active.toLocaleString()}
                  {kpis.conversations.total > kpis.conversations.active && (
                    <span className="text-sm text-muted-foreground ml-2">
                      / {kpis.conversations.total}
                    </span>
                  )}
                </>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kpis?.conversations
                ? `${t('dashboard.kpis.active')}: ${kpis.conversations.active} / ${t('dashboard.kpis.total')}: ${kpis.conversations.total}`
                : t('dashboard.kpis.conversations_description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.messages')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.messages?.total ? kpis.messages.total.toLocaleString() : <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {kpis?.messages?.thisMonth && kpis.messages.thisMonth > 0
                ? `${t('dashboard.kpis.this_month')}: ${kpis.messages.thisMonth.toLocaleString()}`
                : t('dashboard.kpis.messages_description')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.kpis.response_time')}</CardDescription>
            <CardTitle className="text-3xl">
              {kpis?.responseTime?.formatted ? kpis.responseTime.formatted : <Skeleton className="h-8 w-16" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.kpis.response_time_description')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Información del Usuario */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.user_info')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>{t('auth.email')}:</strong> {user.email}
            </div>
            {user.name && (
              <div>
                <strong>{t('auth.name')}:</strong> {user.name}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


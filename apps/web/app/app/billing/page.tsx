'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient, Subscription as ApiSubscription } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, CheckCircle2, AlertCircle, TrendingUp, Bot, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  currency: string;
  priceCents: number;
  interval: string;
  maxAgents?: number;
  maxChannels?: number;
}

interface Subscription {
  id: string;
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  country: string;
  plan: SubscriptionPlan | undefined;
}

interface BillingData {
  subscription: Subscription;
  isTrial: boolean;
  daysLeftInTrial?: number | null;
}

export default function BillingPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState<BillingData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<{
    agents: { current: number; limit: number | null; percentage: number };
    channels: { current: number; limit: number | null; percentage: number };
    messages: { current: number; limit: number | null };
  } | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      // Obtener tenantId de AuthManager (single source of truth)
      const { AuthManager } = await import('@/lib/auth');
      const authManager = AuthManager.getInstance();
      const state = authManager.getState();
      const tenantId = state.tenant?.id;
      
      if (!tenantId) {
        toast({
          title: t('errors.generic'),
          description: t('settings.no_tenant'),
          variant: 'destructive',
        });
        return;
      }

      const [subscriptionResponse, plansResponse, usageResponse] = await Promise.all([
        apiClient.getCurrentSubscription(),
        apiClient.getBillingPlans(),
        apiClient.getBillingUsage(),
      ]);

      if (subscriptionResponse.success && subscriptionResponse.data) {
        // La respuesta del API puede tener la estructura: { subscription, isTrial, daysLeftInTrial }
        // o directamente ser un Subscription
        const data = subscriptionResponse.data as ApiSubscription & { subscription?: ApiSubscription; isTrial?: boolean; daysLeftInTrial?: number | null };
        const subscription = data.subscription || data;
        
        if (subscription && subscription.plan) {
          setCurrentSubscription({
            subscription: {
              id: subscription.id,
              status: subscription.status,
              trialEndsAt: subscription.trialEndsAt,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              country: subscription.country,
              plan: {
                id: subscription.plan.id,
                name: subscription.plan.name,
                slug: subscription.plan.slug,
                description: subscription.plan.description,
                currency: subscription.plan.currency,
                priceCents: subscription.plan.priceCents,
                interval: subscription.plan.interval,
                maxAgents: subscription.plan.maxAgents,
                maxChannels: subscription.plan.maxChannels,
              },
            },
            isTrial: data.isTrial ?? (subscription.trialEndsAt ? new Date(subscription.trialEndsAt) > new Date() : false),
            daysLeftInTrial: data.daysLeftInTrial ?? (subscription.trialEndsAt 
              ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : undefined),
          });
        }
      }

      if (plansResponse.success && plansResponse.data) {
        setPlans(plansResponse.data);
      }

      if (usageResponse.success && usageResponse.data) {
        setUsage(usageResponse.data);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string, isTrial: boolean) => {
    if (isTrial) {
      return (
        <Badge variant="default" className="bg-blue-500">
          {t('billing.trial')}
        </Badge>
      );
    }
    
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('billing.active')}
          </Badge>
        );
      case 'PAST_DUE':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('billing.past_due')}
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="secondary">
            {t('billing.cancelled')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('billing.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('billing.description')}
        </p>
      </div>

      {/* Suscripción Actual */}
      {currentSubscription && currentSubscription.subscription.plan && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.current_subscription')}</CardTitle>
            <CardDescription>
              {t('billing.current_subscription_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('billing.plan')}
                </p>
                <p className="text-2xl font-bold">{currentSubscription.subscription.plan.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('billing.price')}
                </p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    currentSubscription.subscription.plan.priceCents,
                    currentSubscription.subscription.plan.currency
                  )}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {currentSubscription.subscription.plan.interval === 'MONTHLY' 
                      ? t('billing.month')
                      : t('billing.year')}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {getStatusBadge(currentSubscription.subscription.status, currentSubscription.isTrial)}
              {currentSubscription.isTrial && currentSubscription.daysLeftInTrial !== null && currentSubscription.daysLeftInTrial !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {t('billing.days_left', { days: currentSubscription.daysLeftInTrial })}
                </span>
              )}
              {currentSubscription.subscription.currentPeriodEnd && (
                <span className="text-sm text-muted-foreground">
                  {t('billing.period_end')}:{' '}
                  {new Date(currentSubscription.subscription.currentPeriodEnd).toLocaleDateString(undefined)}
                </span>
              )}
            </div>

            {/* Uso y Límites */}
            {usage && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('billing.usage')}
                </h3>
                
                {/* Agentes */}
                {usage.agents.limit !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t('billing.agents_usage')}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.agents.current} / {usage.agents.limit}
                      </span>
                    </div>
                    <Progress 
                      value={usage.agents.percentage} 
                      className={usage.agents.percentage >= 90 ? 'bg-destructive' : usage.agents.percentage >= 75 ? 'bg-yellow-500' : ''}
                    />
                    {usage.agents.percentage >= 90 && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('billing.limit_warning')}</span>
                      </div>
                    )}
                    {usage.agents.percentage >= 75 && usage.agents.percentage < 90 && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('billing.limit_approaching')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Canales */}
                {usage.channels.limit !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{t('billing.channels_usage')}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.channels.current} / {usage.channels.limit}
                      </span>
                    </div>
                    <Progress 
                      value={usage.channels.percentage} 
                      className={usage.channels.percentage >= 90 ? 'bg-destructive' : usage.channels.percentage >= 75 ? 'bg-yellow-500' : ''}
                    />
                    {usage.channels.percentage >= 90 && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('billing.limit_warning')}</span>
                      </div>
                    )}
                    {usage.channels.percentage >= 75 && usage.channels.percentage < 90 && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t('billing.limit_approaching')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t">
              <Button 
                variant="default"
                onClick={async () => {
                  try {
                    const response = await apiClient.createPortal();
                    if (response.success && response.data?.portalUrl) {
                      window.location.href = response.data.portalUrl;
                    } else {
                      toast({
                        title: t('errors.generic'),
                        description: t('errors.load_failed'),
                        variant: 'destructive',
                      });
                    }
                  } catch (error) {
                    console.error('Error opening portal:', error);
                    toast({
                      title: t('errors.generic'),
                      description: t('errors.load_failed'),
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {t('billing.configure_payment')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Scroll a planes disponibles
                  const plansSection = document.getElementById('available-plans');
                  plansSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('billing.change_plan')}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              {t('billing.stripe_note')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Planes Disponibles */}
      <div id="available-plans">
        <h2 className="text-2xl font-bold mb-4">
          {t('billing.available_plans')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.subscription.plan?.id === plan.id;
            const isUpgrade = currentSubscription?.subscription.plan?.priceCents 
              ? plan.priceCents > currentSubscription.subscription.plan.priceCents 
              : true;
            
            return (
              <Card key={plan.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <p className="text-3xl font-bold">
                      {formatPrice(plan.priceCents, plan.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      / {plan.interval === 'MONTHLY' ? t('billing.month') : t('billing.year')}
                    </p>
                  </div>
                  {plan.maxAgents && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <strong>{t('billing.max_agents')}:</strong> {plan.maxAgents}
                      </p>
                      {plan.maxChannels && (
                        <p className="text-sm">
                          <strong>{t('billing.max_channels')}:</strong> {plan.maxChannels}
                        </p>
                      )}
                    </div>
                  )}
                  <Button 
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    className="mt-auto"
                    disabled={isCurrentPlan}
                    onClick={async () => {
                      if (isCurrentPlan) return;
                      
                      try {
                        const response = await apiClient.createCheckout(plan.id);
                        if (response.success && response.data?.checkoutUrl) {
                          window.location.href = response.data.checkoutUrl;
                        } else {
                          toast({
                            title: t('errors.generic'),
                            description: t('errors.load_failed'),
                            variant: 'destructive',
                          });
                        }
                      } catch (error) {
                        console.error('Error creating checkout:', error);
                        toast({
                          title: t('errors.generic'),
                          description: t('errors.load_failed'),
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    {isCurrentPlan
                      ? t('billing.current_plan')
                      : isUpgrade
                      ? t('billing.upgrade')
                      : t('billing.downgrade')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubscriptionWarningBannerProps {
  tenantId: string | null;
}

export function SubscriptionWarningBanner({ tenantId }: SubscriptionWarningBannerProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [subscription, setSubscription] = useState<{
    status: string;
    trialEndsAt?: string;
    gracePeriodEndsAt?: string;
    currentPeriodEnd?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const loadSubscription = async () => {
      try {
        const response = await apiClient.getCurrentSubscription();
        
        // Si es exitoso, procesar datos
        if (response.success && response.data) {
          const data = response.data as any;
          const sub = data.subscription || data;
          setSubscription({
            status: sub.status,
            trialEndsAt: sub.trialEndsAt,
            gracePeriodEndsAt: sub.gracePeriodEndsAt,
            currentPeriodEnd: sub.currentPeriodEnd,
          });
        } else if (response.error_key === 'auth.insufficient_permissions' || 
                   response.error_key === 'auth.role_required') {
          // Usuario no tiene rol OWNER/ADMIN, no mostrar banner
          // Esto es esperado para usuarios con rol AGENT o VIEWER
          // El 403 aparece en la consola del navegador (es un error de red), pero es esperado y manejado
          setSubscription(null);
        } else if (response.error_key === 'errors.connection_refused') {
          // Backend no disponible, no mostrar banner para no confundir al usuario
          setSubscription(null);
        } else if (response.error_key === 'errors.rate_limit_exceeded') {
          // Rate limit: no mostrar banner, esperar a que se resuelva
          setSubscription(null);
        }
        // Otros errores se ignoran silenciosamente
      } catch (error) {
        // Solo loguear errores inesperados
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('connection_refused') && 
            !errorMessage.includes('insufficient_permissions')) {
          console.error('Error loading subscription:', error);
        }
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [tenantId]);

  if (loading || !subscription) {
    return null;
  }

  // Banner para PAST_DUE
  if (subscription.status === 'PAST_DUE') {
    const gracePeriodEndsAt = subscription.gracePeriodEndsAt
      ? new Date(subscription.gracePeriodEndsAt)
      : null;
    const daysUntilBlock = gracePeriodEndsAt
      ? Math.ceil((gracePeriodEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('billing.payment_failed_title')}</AlertTitle>
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p>{t('billing.payment_failed_message')}</p>
            {daysUntilBlock !== null && daysUntilBlock > 0 && (
              <p className="text-sm mt-1">
                {t('billing.grace_period_days', { days: daysUntilBlock })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await apiClient.createPortalSession();
                  if (response.success && response.data?.url) {
                    window.location.href = response.data.url;
                  }
                } catch (error) {
                  console.error('Error opening portal:', error);
                }
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('billing.update_payment_method')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/app/billing">{t('billing.view_billing')}</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Banner para trial por expirar
  if (subscription.trialEndsAt) {
    const trialEndsAt = new Date(subscription.trialEndsAt);
    const daysLeft = Math.ceil((trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0 && daysLeft <= 7) {
      return (
        <Alert variant="default" className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t('billing.trial_expiring_title')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p>{t('billing.trial_expiring_message', { days: daysLeft })}</p>
            </div>
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <Link href="/app/billing">{t('billing.subscribe_now')}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
  }

  return null;
}

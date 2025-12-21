'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { getDashboardRoute, type TenantRole } from '@/lib/utils/roles';
import { AuthManager } from '@/lib/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/verify-email', { token });
      if (response.success) {
        setVerified(true);
        // Invalidar cache de sesión para que el banner desaparezca inmediatamente
        apiClient.invalidateSessionCache();
        const authManager = AuthManager.getInstance();
        authManager.invalidateCache();
        
        toast({
          title: t('auth.email_verified'),
          description: t('auth.email_verified_success'),
        });
        
        // Obtener estado actualizado para redirigir al dashboard correcto
        const state = await authManager.bootstrap();
        const dashboardRoute = state.tenant?.role
          ? getDashboardRoute(state.tenant.role as TenantRole)
          : '/app';
        setTimeout(() => {
          router.push(dashboardRoute);
        }, 2000);
      } else {
        toast({
          title: t('auth.verification_error'),
          description: response.error_key || t('auth.invalid_token'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('errors.generic'),
        description: t('errors.network_error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('auth.verification_error')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.no_token')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">{t('auth.back_to_login')}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              {t('auth.email_verified')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('auth.email_verified_success')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/app" className="w-full">
              <Button className="w-full">{t('auth.go_to_dashboard')}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.verifying_email')}
          </CardTitle>
          <CardDescription className="text-center">
            {loading
              ? t('auth.please_wait')
              : t('auth.click_to_verify')}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          {!loading && (
            <Button onClick={verifyEmail} className="w-full">
              {t('auth.verify_email')}
            </Button>
          )}
          {loading && (
            <div className="w-full text-center">
              <p>{t('loading')}</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


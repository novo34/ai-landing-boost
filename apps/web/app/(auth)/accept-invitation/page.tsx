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

interface InvitationData {
  email: string;
  role: string;
  tenantName: string;
  inviterName: string;
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [accepted, setAccepted] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  const loadInvitation = async () => {
    if (!token) return;

    setLoadingInvitation(true);
    try {
      const response = await apiClient.get<InvitationData>(`/invitations/${token}`);
      if (response.success && response.data) {
        setInvitation(response.data);
      } else {
        toast({
          title: t('invitations.error'),
          description: response.error_key || t('invitations.invalid_token'),
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
      setLoadingInvitation(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await apiClient.post(`/invitations/${token}/accept`, {});
      if (response.success) {
        setAccepted(true);
        toast({
          title: t('invitations.accepted'),
          description: t('invitations.welcome_to_team'),
        });
        // Invalidar cache y obtener estado actualizado
        const authManager = AuthManager.getInstance();
        authManager.invalidateCache();
        
        // Obtener estado para redirigir al dashboard correcto
        const state = await authManager.bootstrap();
        const dashboardRoute = state.tenant?.role
          ? getDashboardRoute(state.tenant.role as TenantRole)
          : '/app';
        setTimeout(() => {
          router.push(dashboardRoute);
        }, 2000);
      } else {
        toast({
          title: t('invitations.error'),
          description: response.error_key || t('invitations.accept_error'),
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

  const handleReject = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await apiClient.post(`/invitations/${token}/reject`, {});
      if (response.success) {
        toast({
          title: t('invitations.rejected'),
          description: t('invitations.rejected_success'),
        });
        router.push('/login');
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
              {t('invitations.error')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('invitations.no_token')}
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

  if (loadingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('loading')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              {t('invitations.accepted')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('invitations.welcome_to_team')}
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

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {t('invitations.error')}
            </CardTitle>
            <CardDescription className="text-center">
              {t('invitations.invalid_token')}
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t('invitations.invitation_received')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('invitations.invited_to_join', { inviterName: invitation.inviterName, tenantName: invitation.tenantName })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>{t('invitations.role')}</strong> {invitation.role}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>{t('invitations.email')}</strong> {invitation.email}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={handleAccept} className="w-full" disabled={loading}>
            {loading
              ? t('loading')
              : t('invitations.accept')}
          </Button>
          <Button onClick={handleReject} variant="outline" className="w-full" disabled={loading}>
            {t('invitations.reject')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


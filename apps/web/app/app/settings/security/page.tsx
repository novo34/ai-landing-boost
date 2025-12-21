'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Trash2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface UserIdentity {
  id: string;
  provider: string;
  providerId: string;
  email: string;
  createdAt: string;
}

export default function SecurityPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [userHasPassword, setUserHasPassword] = useState<boolean>(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Obtener usuario con identidades
      const userResponse = await apiClient.getCurrentUser();
      if (userResponse.success && userResponse.data) {
        // Verificar si tiene contraseña (si no tiene passwordHash, no tiene contraseña)
        setUserHasPassword(!!(userResponse.data as any).passwordHash);
      }

      // Obtener identidades SSO
      const identitiesResponse = await apiClient.getUserIdentities();
      if (identitiesResponse.success && identitiesResponse.data) {
        setIdentities(identitiesResponse.data);
      }
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIdentity = async (identityId: string, provider: string) => {
    if (!confirm(t('security.confirm_delete_identity', { provider: t(`security.providers.${provider}`) }))) {
      return;
    }

    try {
      const response = await apiClient.deleteUserIdentity(identityId);
      if (response.success) {
        toast({
          title: t('security.identity_deleted'),
          description: t('security.identity_deleted_success'),
        });
        loadSecurityData();
      }
    } catch (error: any) {
      console.error('Error deleting identity:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? t(`errors.${error.response.data.error_key}`) || error.response.data.error_key
        : t('errors.delete_failed');
      
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const getProviderBadge = (provider: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      GOOGLE: 'default',
      MICROSOFT: 'secondary',
    };
    return (
      <Badge variant={variants[provider] || 'outline'}>
        {t(`security.providers.${provider}`)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const canDeleteIdentity = identities.length > 1 || userHasPassword;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          {t('security.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('security.description')}
        </p>
      </div>

      {/* Advertencia si no tiene contraseña y solo una identidad */}
      {!userHasPassword && identities.length === 1 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('security.warning')}</AlertTitle>
          <AlertDescription>
            {t('security.warning_description')}
          </AlertDescription>
        </Alert>
      )}

      {/* Métodos de Autenticación */}
      <Card>
        <CardHeader>
          <CardTitle>{t('security.authentication_methods')}</CardTitle>
          <CardDescription>
            {t('security.authentication_methods_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Contraseña */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('security.email_password')}</p>
                  <p className="text-sm text-muted-foreground">
                    {userHasPassword ? t('security.password_set') : t('security.password_not_set')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userHasPassword ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('security.active')}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t('security.not_configured')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Identidades SSO */}
            {identities.map((identity) => (
              <div key={identity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {identity.provider === 'GOOGLE' && (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {identity.provider === 'MICROSOFT' && (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#F25022" d="M1 1h10v10H1z"/>
                      <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                      <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                      <path fill="#FFB900" d="M13 13h10v10H13z"/>
                    </svg>
                  )}
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {getProviderBadge(identity.provider)}
                      {identity.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('security.connected_on')} {new Date(identity.createdAt).toLocaleDateString(undefined)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteIdentity(identity.id, identity.provider)}
                  disabled={!canDeleteIdentity}
                  title={!canDeleteIdentity ? t('security.cannot_delete_last') : ''}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('security.disconnect')}
                </Button>
              </div>
            ))}

            {identities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('security.no_identities')}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('security.no_identities_description')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información de Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle>{t('security.security_info')}</CardTitle>
          <CardDescription>
            {t('security.security_info_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {t('security.info_1')}
            </p>
            <p className="text-muted-foreground">
              {t('security.info_2')}
            </p>
            <p className="text-muted-foreground">
              {t('security.info_3')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


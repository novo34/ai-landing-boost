'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import WhatsAppConnectionWizard from '@/components/whatsapp/whatsapp-connection-wizard';
import type { AuthState } from '@/lib/auth/types';

interface WhatsAppAccount {
  id: string;
  provider: 'EVOLUTION_API' | 'WHATSAPP_CLOUD';
  phoneNumber: string;
  status: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  displayName?: string;
  instanceName?: string;
  connectedAt?: string;
  lastCheckedAt?: string;
  credentials: {
    masked: string;
  };
}

export default function WhatsAppSettingsPage() {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Recargar cuentas cuando cambia el tenant (usando AuthManager subscription)
  useEffect(() => {
    const { AuthManager } = require('@/lib/auth');
    const authManager = AuthManager.getInstance();
    
    const unsubscribe = authManager.subscribe((state: AuthState) => {
      // Si el tenant cambió, recargar cuentas
      if (state.tenant?.id) {
        loadAccounts();
      }
    });
    
    return () => unsubscribe();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWhatsAppAccounts();
      if (response.success && response.data) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Error loading WhatsApp accounts:', error);
      toast({
        title: t('errors.generic'),
        description: t('errors.load_failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('whatsapp.confirm_delete'))) {
      return;
    }

    try {
      const response = await apiClient.deleteWhatsAppAccount(id);
      if (response.success) {
        toast({
          title: t('whatsapp.account_deleted'),
          description: t('whatsapp.account_deleted_success'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key ? t(response.error_key) : t('errors.delete_failed'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? t(error.response.data.error_key) 
        : t('errors.delete_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
      loadAccounts();
    }
  };

  const handleValidate = async (id: string) => {
    try {
      setValidating(id);
      const response = await apiClient.validateWhatsAppAccount(id);
      if (response.success) {
        toast({
          title: t('whatsapp.validation_success'),
          description: t('whatsapp.account_validated'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('whatsapp.validation_failed'),
          description: response.error_key ? t(response.error_key) : t('whatsapp.invalid_credentials'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error validating account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? t(error.response.data.error_key) 
        : t('errors.validation_failed');
      toast({
        title: t('whatsapp.validation_failed'),
        description: errorMessage,
        variant: 'destructive',
      });
      loadAccounts();
    } finally {
      setValidating(null);
    }
  };

  const handleReconnect = async (id: string) => {
    try {
      setReconnecting(id);
      const response = await apiClient.reconnectWhatsAppAccount(id);
      if (response.success) {
        toast({
          title: t('whatsapp.reconnect_success'),
          description: t('whatsapp.reconnect_initiated'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key ? t(response.error_key) : t('errors.reconnect_failed'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error reconnecting account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? t(error.response.data.error_key) 
        : t('errors.reconnect_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
      loadAccounts();
    } finally {
      setReconnecting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('whatsapp.status.connected')}
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('whatsapp.status.pending')}
          </Badge>
        );
      case 'DISCONNECTED':
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            {t('whatsapp.status.disconnected')}
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('whatsapp.status.error')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProviderName = (provider: string) => {
    const translationKey = `whatsapp.providers.${provider}`;
    const translated = t(translationKey);
    // Si la traducción devuelve la misma clave, significa que no se encontró
    return translated !== translationKey ? translated : provider;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            {t('whatsapp.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('whatsapp.description')}
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('whatsapp.connect')}
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('whatsapp.no_accounts')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('whatsapp.no_accounts_description')}
            </p>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('whatsapp.connect')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {account.displayName || account.phoneNumber}
                      {getStatusBadge(account.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {getProviderName(account.provider)} • {account.phoneNumber}
                      {account.instanceName && ` • ${account.instanceName}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t('whatsapp.credentials')}: {account.credentials.masked}
                    </p>
                    {account.connectedAt && (
                      <p className="text-sm text-muted-foreground">
                        {t('whatsapp.connected_at')}:{' '}
                        {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidate(account.id)}
                      disabled={validating === account.id}
                    >
                      {validating === account.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {t('whatsapp.validate')}
                        </>
                      )}
                    </Button>
                    {account.provider === 'EVOLUTION_API' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReconnect(account.id)}
                        disabled={reconnecting === account.id}
                      >
                        {reconnecting === account.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('whatsapp.reconnect')}
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('whatsapp.delete')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showWizard && (
        <WhatsAppConnectionWizard
          open={showWizard}
          onClose={() => {
            setShowWizard(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}


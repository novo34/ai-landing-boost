'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n/client';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  MoreVertical,
  QrCode,
  Power,
  PowerOff,
  Info
} from 'lucide-react';
import WhatsAppConnectionWizard from '@/components/whatsapp/whatsapp-connection-wizard';
import type { AuthState } from '@/lib/auth/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [legacyErrorAccounts, setLegacyErrorAccounts] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isLegacy: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [qrModal, setQrModal] = useState<{ open: boolean; accountId: string | null; qrUrl: string | null }>({
    open: false,
    accountId: null,
    qrUrl: null,
  });

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

  const translateError = (key: string, fallback: string = 'errors.generic') => {
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return t(fallback);
  };

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

  const refreshAccountStatus = async (accountId: string) => {
    try {
      setRefreshingStatus(accountId);
      const response = await apiClient.getEvolutionInstanceStatus(accountId);
      if (response.success) {
        toast({
          title: t('whatsapp.status_refreshed'),
          description: t('whatsapp.status_refreshed'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key
            ? translateError(response.error_key, 'errors.load_failed')
            : t('errors.load_failed'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error refreshing status:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.load_failed')
        : t('errors.load_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setRefreshingStatus(null);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('[WhatsApp Settings] Syncing instances with Evolution API:', {
          endpoint: '/whatsapp/accounts/sync',
        });
      }
      const response = await apiClient.syncEvolutionInstances();
      if (response.success) {
        toast({
          title: t('whatsapp.sync_success'),
          description: response.data 
            ? `Sincronizadas: ${response.data.synced || 0}, Actualizadas: ${response.data.updated || 0}`
            : t('whatsapp.sync_success'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key
            ? translateError(response.error_key, 'errors.sync_failed')
            : t('errors.sync_failed'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error syncing instances:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.sync_failed')
        : t('errors.sync_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = async (id: string) => {
    try {
      setConnecting(id);
      const response = await apiClient.connectEvolutionInstance(id);
      if (response.success) {
        toast({
          title: t('whatsapp.connect_success'),
          description: t('whatsapp.connect_initiated'),
        });
        // Si hay QR, abrir modal
        if (response.data?.qrCodeUrl) {
          setQrModal({ open: true, accountId: id, qrUrl: response.data.qrCodeUrl });
        }
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key
            ? translateError(response.error_key, 'errors.generic')
            : t('errors.generic'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error connecting account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.generic')
        : t('errors.generic');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
      loadAccounts();
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      setDisconnecting(id);
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('[WhatsApp Settings] Disconnecting instance:', {
          accountId: id,
          endpoint: `/whatsapp/accounts/${id}/disconnect`,
        });
      }
      const response = await apiClient.disconnectEvolutionInstance(id);
      if (response.success) {
        // Si la desconexión fue idempotente (ya estaba desconectada), mostrar mensaje diferente
        const isIdempotent = response.data?.reason === 'already_disconnected_or_connection_missing';
        toast({
          title: t('whatsapp.disconnect_success'),
          description: isIdempotent 
            ? t('whatsapp.already_disconnected') 
            : t('whatsapp.disconnect_initiated'),
        });
        loadAccounts();
      } else {
        // Manejar error específico de "connection not found" como idempotente
        if (response.error_key === 'whatsapp.evolution_connection_not_found') {
          toast({
            title: t('whatsapp.disconnect_success'),
            description: t('whatsapp.already_disconnected'),
          });
          loadAccounts();
        } else {
          toast({
            title: t('errors.generic'),
            description: response.error_key
              ? translateError(response.error_key, 'errors.generic')
              : t('errors.generic'),
            variant: 'destructive',
          });
          loadAccounts();
        }
      }
    } catch (error: any) {
      console.error('Error disconnecting account:', error);
      const errorData = error?.response?.data;
      const errorKey = errorData?.error_key;
      
      // Manejar error "connection not found" como idempotente
      if (errorKey === 'whatsapp.evolution_connection_not_found') {
        toast({
          title: t('whatsapp.disconnect_success'),
          description: t('whatsapp.already_disconnected'),
        });
        loadAccounts();
      } else {
        const errorMessage = errorKey
          ? translateError(errorKey, 'errors.generic')
          : t('errors.generic');
        toast({
          title: t('errors.generic'),
          description: errorMessage,
          variant: 'destructive',
        });
        loadAccounts();
      }
    } finally {
      setDisconnecting(null);
    }
  };

  const handleShowQR = async (id: string) => {
    try {
      const response = await apiClient.getWhatsAppQRCode(id);
      if (response.success && response.data?.qrCodeUrl) {
        setQrModal({ open: true, accountId: id, qrUrl: response.data.qrCodeUrl });
      } else {
        toast({
          title: t('errors.generic'),
          description: t('errors.load_failed'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error getting QR code:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.load_failed')
        : t('errors.load_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const refreshQR = async () => {
    if (!qrModal.accountId) return;
    await handleShowQR(qrModal.accountId);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    const { id, isLegacy } = deleteTarget;
    setDeleting(true);
    try {
      const response = await apiClient.deleteWhatsAppAccount(id);
      if (response.success) {
        // Limpiar error legacy si se eliminó exitosamente
        setLegacyErrorAccounts((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast({
          title: t('whatsapp.account_deleted'),
          description: t('whatsapp.account_deleted_success'),
        });
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key
            ? translateError(response.error_key, 'errors.delete_failed')
            : t('errors.delete_failed'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.delete_failed')
        : t('errors.delete_failed');
      toast({
        title: t('errors.generic'),
        description: errorMessage,
        variant: 'destructive',
      });
      loadAccounts();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      setValidating(id);
      const response = await apiClient.validateWhatsAppAccount(id);
      if (response.success) {
        // Limpiar error legacy si la validación fue exitosa
        setLegacyErrorAccounts((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast({
          title: t('whatsapp.validation_success'),
          description: t('whatsapp.account_validated'),
        });
        loadAccounts();
      } else {
        // Error en validación: mostrar error pero NO refrescar lista
        const errorKey = response.error_key || 'whatsapp.invalid_credentials';
        
        // Si es error de formato legacy, marcarlo
        if (errorKey === 'whatsapp.invalid_credentials_format') {
          setLegacyErrorAccounts((prev) => new Set(prev).add(id));
        } else {
          setLegacyErrorAccounts((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
        
        toast({
          title: t('whatsapp.validation_failed'),
          description: translateError(errorKey, 'whatsapp.invalid_credentials'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error validating account:', error);
      const errorData = error?.response?.data;
      const errorKey = errorData?.error_key || 'errors.validation_failed';
      const errorMessage = translateError(errorKey, 'errors.validation_failed');
      
      // Si es error de formato legacy, marcarlo
      if (errorKey === 'whatsapp.invalid_credentials_format') {
        setLegacyErrorAccounts((prev) => new Set(prev).add(id));
      } else {
        setLegacyErrorAccounts((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      
      toast({
        title: t('whatsapp.validation_failed'),
        description: errorMessage,
        variant: 'destructive',
      });
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
        // Si hay QR, abrir modal
        if (response.data?.qrCodeUrl) {
          setQrModal({ open: true, accountId: id, qrUrl: response.data.qrCodeUrl });
        }
        loadAccounts();
      } else {
        toast({
          title: t('errors.generic'),
          description: response.error_key
            ? translateError(response.error_key, 'errors.reconnect_failed')
            : t('errors.reconnect_failed'),
          variant: 'destructive',
        });
        loadAccounts();
      }
    } catch (error: any) {
      console.error('Error reconnecting account:', error);
      const errorMessage = error?.response?.data?.error_key 
        ? translateError(error.response.data.error_key, 'errors.reconnect_failed')
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

  const canShowAction = (account: WhatsAppAccount, action: string): boolean => {
    if (legacyErrorAccounts.has(account.id)) {
      return action === 'delete';
    }
    
    switch (action) {
      case 'connect':
        return account.provider === 'EVOLUTION_API' && 
               (account.status === 'DISCONNECTED' || account.status === 'ERROR' || account.status === 'PENDING');
      case 'disconnect':
        return account.provider === 'EVOLUTION_API' && account.status === 'CONNECTED';
      case 'show_qr':
        return account.provider === 'EVOLUTION_API' && 
               (account.status === 'PENDING' || account.status === 'DISCONNECTED');
      case 'validate':
        return true; // Siempre disponible
      case 'reconnect':
        return account.provider === 'EVOLUTION_API';
      case 'refresh_status':
        return account.provider === 'EVOLUTION_API';
      case 'delete':
        return true; // Siempre disponible
      default:
        return false;
    }
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
        <div className="flex gap-2">
          {accounts.length > 0 && accounts.some(acc => acc.provider === 'EVOLUTION_API') && (
            <Button 
              variant="outline" 
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t('whatsapp.sync')}
            </Button>
          )}
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('whatsapp.connect')}
          </Button>
        </div>
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
            <Card key={account.id} data-account-id={account.id}>
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
                <div className="space-y-3">
                  {legacyErrorAccounts.has(account.id) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        {t('whatsapp.invalid_credentials_format')}
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                        {t('whatsapp.legacy_account_warning')}
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: account.id, isLegacy: true })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('whatsapp.delete_legacy_account')}
                      </Button>
                    </div>
                  )}
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
                      {/* Menú de acciones */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canShowAction(account, 'connect') && (
                            <DropdownMenuItem
                              onClick={() => handleConnect(account.id)}
                              disabled={connecting === account.id}
                            >
                              {connecting === account.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Power className="h-4 w-4 mr-2" />
                              )}
                              {t('whatsapp.connect')}
                            </DropdownMenuItem>
                          )}
                          {canShowAction(account, 'disconnect') && (
                            <DropdownMenuItem
                              onClick={() => handleDisconnect(account.id)}
                              disabled={disconnecting === account.id}
                            >
                              {disconnecting === account.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <PowerOff className="h-4 w-4 mr-2" />
                              )}
                              {t('whatsapp.disconnect')}
                            </DropdownMenuItem>
                          )}
                          {canShowAction(account, 'show_qr') && (
                            <DropdownMenuItem
                              onClick={() => handleShowQR(account.id)}
                            >
                              <QrCode className="h-4 w-4 mr-2" />
                              {t('whatsapp.show_qr')}
                            </DropdownMenuItem>
                          )}
                          {canShowAction(account, 'validate') && (
                            <DropdownMenuItem
                              onClick={() => handleValidate(account.id)}
                              disabled={validating === account.id}
                            >
                              {validating === account.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              {t('whatsapp.validate')}
                            </DropdownMenuItem>
                          )}
                          {canShowAction(account, 'reconnect') && (
                            <DropdownMenuItem
                              onClick={() => handleReconnect(account.id)}
                              disabled={reconnecting === account.id}
                            >
                              {reconnecting === account.id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                              )}
                              {t('whatsapp.reconnect')}
                            </DropdownMenuItem>
                          )}
                          {canShowAction(account, 'refresh_status') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => refreshAccountStatus(account.id)}
                                disabled={refreshingStatus === account.id}
                              >
                                {refreshingStatus === account.id ? (
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Info className="h-4 w-4 mr-2" />
                                )}
                                {t('whatsapp.refresh_status')}
                              </DropdownMenuItem>
                            </>
                          )}
                          {canShowAction(account, 'delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: account.id, isLegacy: false })}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('whatsapp.delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
          onSuccess={() => {
            loadAccounts();
          }}
        />
      )}

      {/* Modal de QR */}
      <Dialog open={qrModal.open} onOpenChange={(open) => !open && setQrModal({ open: false, accountId: null, qrUrl: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('whatsapp.qr_code')}</DialogTitle>
            <DialogDescription>
              {t('whatsapp.qr_instructions')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrModal.qrUrl ? (
              <img 
                src={qrModal.qrUrl} 
                alt="QR Code" 
                className="w-64 h-64 border rounded"
              />
            ) : (
              <div className="w-64 h-64 border rounded flex items-center justify-center">
                <p className="text-muted-foreground">{t('loading')}</p>
              </div>
            )}
            <Button onClick={refreshQR} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('whatsapp.refresh_qr')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('whatsapp.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isLegacy ? t('whatsapp.legacy_account_warning') : t('whatsapp.delete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteTarget(null)}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} disabled={deleting}>
              {deleting ? t('loading') : t('whatsapp.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

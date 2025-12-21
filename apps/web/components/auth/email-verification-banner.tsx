'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, X, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/client';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function EmailVerificationBanner() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const checkEmailVerification = async (forceRefresh = false) => {
    try {
      // Si se fuerza el refresh, invalidar cache primero
      if (forceRefresh) {
        apiClient.invalidateSessionCache();
      }
      
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        const user = response.data as any;
        // Verificar emailVerified explícitamente (puede ser undefined, null, false, o true)
        // Si es undefined, null, o false, considerar como no verificado
        const verified = user.emailVerified === true;
        setEmailVerified(verified);
        // Si el email está verificado, no mostrar el banner
        if (verified) {
          setDismissed(true);
        } else {
          // Si no está verificado, asegurarse de que el banner se muestre
          setDismissed(false);
        }
      } else {
        // Si no hay datos, asumir que no está verificado
        setEmailVerified(false);
        setDismissed(false);
      }
    } catch (error) {
      // Silenciar errores, no mostrar banner si hay error
      console.error('Error checking email verification:', error);
      // Si hay error, asumir que no está verificado para mostrar el banner
      setEmailVerified(false);
      setDismissed(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEmailVerification();
    
    // Refrescar estado cuando la ventana recupera el foco (por si se verificó en otra pestaña)
    const handleFocus = () => {
      // Solo refrescar si no está cargando y el email no está verificado
      if (!loading) {
        checkEmailVerification();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const response = await apiClient.post('/auth/resend-verification', {});
      if (response.success) {
        toast({
          title: t('auth.verification_email_sent'),
          description: t('auth.check_your_email'),
        });
      } else {
        // Manejar errores específicos
        if (response.error_key === 'auth.email_already_verified') {
          // Si el email ya está verificado, invalidar cache y actualizar estado
          apiClient.invalidateSessionCache();
          await checkEmailVerification(true);
          toast({
            title: t('auth.email_already_verified'),
            description: t('auth.email_verified_success') || 'Tu email ya está verificado',
            variant: 'default',
          });
        } else if (response.error_key === 'auth.user_has_no_tenant') {
          toast({
            title: t('errors.generic'),
            description: t('auth.user_has_no_tenant') || 'Usuario no tiene tenant asociado',
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('errors.generic'),
            description: response.error_key || t('errors.send_failed'),
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      // Verificar si el error es porque el email ya está verificado
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorData = error && typeof error === 'object' && 'error_key' in error 
        ? (error as { error_key?: string }).error_key 
        : null;
      
      if (errorMessage.includes('400') || 
          errorMessage.includes('email_already_verified') ||
          errorData === 'auth.email_already_verified') {
        // Si el email ya está verificado, invalidar cache y actualizar estado
        apiClient.invalidateSessionCache();
        await checkEmailVerification(true);
        toast({
          title: t('auth.email_already_verified'),
          description: t('auth.email_verified_success') || 'Tu email ya está verificado',
          variant: 'default',
        });
      } else if (errorMessage.includes('500')) {
        // Error 500 - puede ser que SMTP no esté configurado, pero el token se guardó
        toast({
          title: t('auth.verification_email_sent'),
          description: t('auth.check_your_email') + ' (El email puede tardar en llegar)',
        });
      } else {
        toast({
          title: t('errors.generic'),
          description: t('errors.network_error'),
          variant: 'destructive',
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  // No mostrar si está cargando
  if (loading) {
    return null;
  }

  // No mostrar si está verificado o fue descartado
  if (emailVerified === true || dismissed) {
    return null;
  }

  // Mostrar si email no está verificado (false o null se trata como no verificado)
  if (emailVerified === false || emailVerified === null) {
    return (
      <Alert className="mb-4 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="rounded-full bg-amber-500/10 p-2 mt-0.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 space-y-2">
              <AlertTitle className="text-base font-semibold text-amber-900 dark:text-amber-100">
                {t('auth.email_not_verified_title')}
              </AlertTitle>
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                <p className="mb-3">{t('auth.email_not_verified_message')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                  >
                    {isResending ? (
                      <>
                        <Mail className="h-4 w-4 mr-2 animate-pulse" />
                        {t('auth.please_wait') || 'Enviando...'}
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        {t('auth.resend_verification')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                  >
                    <Link href="/auth/verify-email">{t('auth.verify_email')}</Link>
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
            onClick={() => setDismissed(true)}
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
}

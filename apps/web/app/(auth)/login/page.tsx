'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { getDashboardRoute, type TenantRole } from '@/lib/utils/roles';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = t('auth.email_required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.email_invalid');
    }

    if (!formData.password) {
      newErrors.password = t('auth.password_required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('auth.password_min_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Solo loguear en modo debug
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
        console.log('🔐 Intentando login con:', { email: formData.email });
      }
      
      const response = await apiClient.login(formData.email, formData.password);

      if (response.success) {
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
          console.log('✅ Login exitoso');
        }
        toast({
          title: t('auth.login_success'),
          description: t('auth.welcome_back'),
        });

        // Limpiar caches después del login para forzar nueva verificación
        // Esto asegura que se obtenga información fresca
        apiClient.clearCaches();

        // Obtener sesión unificada para decidir dashboard correcto
        // Usar AuthManager para obtener estado actualizado
        let redirectPath = '/app'; // Ruta por defecto
        
        try {
          // Invalidar cache y hacer bootstrap para obtener estado fresco
          const { AuthManager } = await import('@/lib/auth');
          const authManager = AuthManager.getInstance();
          authManager.invalidateCache();
          const state = await authManager.bootstrap();
          
          if (state.isAuthenticated) {
            // Si tiene rol de plataforma, priorizar panel de plataforma
            if (state.platformRole) {
              redirectPath = '/platform';
            }
            // Si hay tenant actual, usar su rol para decidir ruta
            else if (state.tenant?.role) {
              redirectPath = getDashboardRoute(state.tenant.role as TenantRole);
            }
          }
        } catch (error) {
          // En caso de fallo de sesión (por ejemplo, rate limiting), 
          // usar ruta por defecto pero seguir redirigiendo
          if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
            console.warn('⚠️ Error obteniendo sesión después de login, usando ruta por defecto:', error);
          }
        }

        // SIEMPRE redirigir después de login exitoso, incluso si hay errores
        // Usar window.location para forzar recarga completa y evitar problemas de cache
        if (typeof window !== 'undefined') {
          window.location.href = redirectPath;
        } else {
          router.push(redirectPath);
        }
        
        return; // Salir temprano para evitar ejecutar código adicional
      } else {
        // Manejar diferentes tipos de errores con mensajes user-friendly
        let errorTitle = t('auth.login_error');
        let errorDescription = t('auth.invalid_credentials');
        
        if (response.error_key === 'errors.connection_refused') {
          errorTitle = t('errors.connection_refused');
          errorDescription = t('errors.connection_refused_message');
        } else if (response.error_key === 'errors.timeout') {
          errorTitle = t('errors.timeout');
          errorDescription = t('errors.timeout_message');
        } else if (response.error_key === 'auth.invalid_credentials' || response.error_key === 'auth.unauthorized') {
          errorTitle = t('auth.login_error');
          errorDescription = response.error_key === 'auth.unauthorized' 
            ? t('auth.unauthorized_message') 
            : t('auth.invalid_credentials');
        } else if (response.error_key) {
          // Intentar traducir el error_key
          try {
            const translated = t(response.error_key);
            // Si la traducción es diferente a la clave, usarla
            if (translated !== response.error_key) {
              errorDescription = translated;
            } else {
              // Si no hay traducción, usar mensaje genérico
              errorTitle = t('errors.unknown_error');
              errorDescription = t('errors.unknown_error_message');
            }
          } catch {
            // Si falla la traducción, usar mensaje genérico
            errorTitle = t('errors.unknown_error');
            errorDescription = t('errors.unknown_error_message');
          }
        }
        
        // Solo loguear errores no esperados
        if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && 
            response.error_key !== 'errors.connection_refused') {
          console.warn('⚠️ Login falló:', response.error_key);
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: 'destructive',
        });
        setLoading(false);
      }
    } catch (error) {
      // Manejar errores inesperados
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Solo loguear errores inesperados (no de conexión)
      if (process.env.NEXT_PUBLIC_DEBUG_API === 'true' && 
          !errorMessage.includes('connection_refused') &&
          !errorMessage.includes('Failed to fetch')) {
        console.error('❌ Error inesperado en login:', error);
      }
      
      // Determinar el tipo de error
      let errorTitle = t('errors.generic');
      let errorDescription = t('errors.network_error');
      
      if (errorMessage.includes('connection_refused') || errorMessage.includes('Failed to fetch')) {
        errorTitle = t('errors.server_unavailable');
        errorDescription = t('errors.server_unavailable_message');
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md shadow-xl border">
        <CardHeader className="space-y-2 px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
            {t('auth.login_title')}
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base text-muted-foreground">
            {t('auth.login_description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="w-full">
          <CardContent className="space-y-4 sm:space-y-5 px-6 sm:px-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.email_placeholder')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                className={`h-10 sm:h-11 text-sm sm:text-base ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1.5">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                {t('auth.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.password_placeholder')}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                className={`h-10 sm:h-11 text-sm sm:text-base ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {errors.password && (
                <p className="text-sm text-destructive mt-1.5">{errors.password}</p>
              )}
            </div>
          </CardContent>
          
          <div className="w-full flex flex-col space-y-4 sm:space-y-5 px-6 sm:px-8 pb-6 sm:pb-8">
            <Button 
              type="submit" 
              className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold" 
              disabled={loading}
              size="lg"
            >
              {loading ? t('loading') : t('auth.login')}
            </Button>

            {/* Separador */}
            <div className="relative w-full py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('auth.or_continue_with')}
                </span>
              </div>
            </div>

            {/* Botones SSO - DEBEN estar apilados verticalmente, uno debajo del otro */}
            <div className="w-full flex flex-col space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                  window.location.href = `${apiUrl}/auth/google`;
                }}
                disabled={loading}
                className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium"
                size="lg"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.google')}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                  window.location.href = `${apiUrl}/auth/microsoft`;
                }}
                disabled={loading}
                className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium"
                size="lg"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 23 23" fill="none">
                  <path fill="#F25022" d="M0 0h11v11H0z" />
                  <path fill="#7FBA00" d="M12 0h11v11H12z" />
                  <path fill="#00A4EF" d="M0 12h11v11H0z" />
                  <path fill="#FFB900" d="M12 12h11v11H12z" />
                </svg>
                {t('auth.microsoft')}
              </Button>
            </div>

            {/* Enlace de registro */}
            <div className="pt-2">
              <p className="text-sm text-center text-muted-foreground">
                {t('auth.no_account')}{' '}
                <Link 
                  href="/register" 
                  className="text-primary hover:underline font-semibold transition-colors"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}


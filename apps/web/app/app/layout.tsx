'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { measureClientOperation } from '@/lib/perf/client-perf';
import { useNavigationPerf } from '@/lib/perf/client-perf';
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppNavMobile } from '@/components/app/app-nav-mobile';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/lib/i18n/client';
import { getDashboardRoute, type TenantRole } from '@/lib/utils/roles';
import { NotificationsCenter } from '@/components/notifications/notifications-center';
import { GlobalSearch } from '@/components/search/global-search';
import { SubscriptionWarningBanner } from '@/components/billing/subscription-warning-banner';
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner';
import { SessionExpiredBanner } from '@/components/auth/session-expired-banner';
import { AuthManager, type AuthState } from '@/lib/auth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [branding, setBranding] = useState<{ logoUrl?: string; primaryColor?: string; secondaryColor?: string } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Medir navegación
  useNavigationPerf();

  // Memoizar función de cálculo de contraste
  const getContrastColor = useCallback((hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }, []);

  // Bootstrap: Inicializar AuthManager una vez
  useEffect(() => {
    const authManager = AuthManager.getInstance();
    let bootstrapCompleted = false;

    // Bootstrap: solo una vez al mount
    authManager.bootstrap().then(state => {
      setAuthState(state);
      setIsBootstrapping(false);
      bootstrapCompleted = true;

      // Si no está autenticado, redirigir a login
      if (!state.isAuthenticated) {
        router.push('/login');
        return;
      }

      // Si tiene platformRole y NO estamos ya en /platform, redirigir
      if (state.platformRole && !window.location.pathname.startsWith('/platform')) {
        router.push('/platform');
        return;
      }

      // Gestionar tenant para el layout de app
      // Solo redirigir si estamos en /app exactamente y no coincide con la ruta esperada
      if (state.tenant) {
        const expectedRoute = getDashboardRoute(state.tenant.role as TenantRole);
        const currentPath = window.location.pathname;
        // Solo redirigir si estamos en /app exactamente y la ruta esperada es diferente
        if (currentPath === '/app' && expectedRoute !== '/app') {
          router.push(expectedRoute);
        }
      }

      setSessionExpired(false);
    }).catch(error => {
      console.error('[AppLayout] Error en bootstrap:', error);
      setIsBootstrapping(false);
      bootstrapCompleted = true;
      router.push('/login');
    });

    // Suscribirse a cambios de estado
    // IMPORTANTE: El subscribe se ejecuta inmediatamente con el estado actual,
    // pero debemos ignorar esa primera llamada si el bootstrap aún no ha terminado
    const unsubscribe = authManager.subscribe(state => {
      // Ignorar la primera llamada del subscribe si el bootstrap aún no ha terminado
      // Esto previene redirecciones incorrectas durante la inicialización
      if (!bootstrapCompleted) {
        return;
      }

      setAuthState(state);

      // Si se hace logout, redirigir
      if (!state.isAuthenticated) {
        setSessionExpired(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      // Si tiene platformRole y NO estamos ya en /platform, redirigir
      if (state.platformRole && !window.location.pathname.startsWith('/platform')) {
        router.push('/platform');
        return;
      }

      setSessionExpired(false);
    });

    // Validación periódica (cada 5 minutos)
    const validationInterval = setInterval(() => {
      authManager.validate().catch(error => {
        console.error('[AppLayout] Error en validación periódica:', error);
      });
    }, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(validationInterval);
    };
  }, [router]);

  // Memoizar callback de loadBranding
  const loadBranding = useCallback(async () => {
    try {
      const response = await measureClientOperation('AppLayout.loadBranding', () =>
        apiClient.getTenantSettings()
      );
      if (response.success && response.data) {
        setBranding({
          logoUrl: response.data.logoUrl,
          primaryColor: response.data.primaryColor,
          secondaryColor: response.data.secondaryColor,
        });
        // Aplicar colores
        if (response.data.primaryColor) {
          document.documentElement.style.setProperty('--primary', response.data.primaryColor);
          const contrast = getContrastColor(response.data.primaryColor);
          document.documentElement.style.setProperty('--primary-foreground', contrast);
        }
        if (response.data.secondaryColor) {
          document.documentElement.style.setProperty('--secondary', response.data.secondaryColor);
          const contrast = getContrastColor(response.data.secondaryColor);
          document.documentElement.style.setProperty('--secondary-foreground', contrast);
        }
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  }, [getContrastColor]);

  // Cargar branding del tenant
  useEffect(() => {
    if (!isBootstrapping && authState?.isAuthenticated && authState.tenant) {
      loadBranding();
    }
  }, [isBootstrapping, authState, loadBranding]);

  // Memoizar estilos de branding
  const brandingStyles = useMemo(() => {
    if (!branding) return {};
    return {
      '--primary': branding.primaryColor,
      '--secondary': branding.secondaryColor,
    };
  }, [branding]);

  // Mostrar loading mientras se hace bootstrap
  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  // Si no está autenticado, no renderizar (ya se está redirigiendo)
  if (!authState?.isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar para desktop */}
        <Sidebar className="hidden md:flex">
          <AppSidebar />
        </Sidebar>
        
        {/* Contenido principal */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header con trigger del sidebar en mobile */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <Separator orientation="vertical" className="hidden md:block" />
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-8 max-w-[150px] object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.startsWith('http')) {
                    target.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${branding.logoUrl}`;
                  }
                }}
              />
            ) : (
              <div className="font-bold text-xl">AutomAI</div>
            )}
            <div className="flex-1" />
            <GlobalSearch />
            <NotificationsCenter />
          </header>
          
          {/* Contenido */}
          <main className="flex-1 overflow-auto pb-20 md:pb-0 safe-area-inset-bottom">
            <div className="container mx-auto p-3 sm:p-4 md:p-6">
              {sessionExpired && <SessionExpiredBanner />}
              <EmailVerificationBanner />
              <SubscriptionWarningBanner tenantId={authState.tenant?.id || null} />
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
      
      {/* Navegación móvil (bottom nav) */}
      <AppNavMobile />
    </SidebarProvider>
  );
}


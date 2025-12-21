'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getDashboardRoute, type TenantRole } from '@/lib/utils/roles';
import { AuthManager } from '@/lib/auth';

/**
 * RoleRouter
 * 
 * Componente centralizado que:
 * 1. Obtiene el rol del usuario desde el backend (fuente de verdad)
 * 2. Verifica que el usuario está en la ruta correcta según su rol
 * 3. Redirige automáticamente si es necesario
 * 
 * Uso: Incluir este componente en layouts o páginas que requieren verificación de rol
 */
export function RoleRouter({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkRoleAndRoute = async () => {
      try {
        // Usar AuthManager como single source of truth
        const authManager = AuthManager.getInstance();
        const state = await authManager.bootstrap();

        if (!state.isAuthenticated || !state.user) {
          router.push('/login');
          return;
        }

        const currentPath = pathname;

        // Si tiene rol de plataforma, priorizar /platform
        if (state.platformRole) {
          // Rutas de plataforma: permitir si ya está dentro
          if (currentPath.startsWith('/platform')) {
            setIsAuthorized(true);
            return;
          }

          // Si está en login/registro/raíz, redirigir al dashboard de plataforma
          if (
            currentPath === '/' ||
            currentPath.startsWith('/login') ||
            currentPath.startsWith('/register') ||
            currentPath.startsWith('/app')
          ) {
            router.push('/platform');
            return;
          }

          setIsAuthorized(true);
          return;
        }

        // Rutas de plataforma sin rol global: redirigir a /app
        if (currentPath.startsWith('/platform') && !state.platformRole) {
          router.push('/app');
          return;
        }

        // Gestión de tenant para /app/*
        const currentTenant = state.tenant;

        if (!currentTenant) {
          // Sin tenant actual: mandar a login por seguridad
          router.push('/login');
          return;
        }

        const userRole = currentTenant.role as TenantRole;
        const expectedRoute = getDashboardRoute(userRole);

        // Verificar si el usuario está en la ruta correcta
        if (currentPath.startsWith('/app')) {
          if (!currentPath.startsWith(expectedRoute)) {
            router.push(expectedRoute);
            return;
          }
        } else if (currentPath.startsWith('/login') || currentPath.startsWith('/register') || currentPath === '/') {
          // Si está autenticado y en login/register, redirigir al dashboard
          router.push(expectedRoute);
          return;
        }

        // Usuario autorizado y en la ruta correcta
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error verificando rol y ruta:', error);
        // En caso de error, redirigir a login
        router.push('/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkRoleAndRoute();
  }, [router, pathname]);

  // Mostrar loading mientras se verifica
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Solo renderizar children si está autorizado
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

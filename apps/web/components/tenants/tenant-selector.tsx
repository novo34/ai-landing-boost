'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { AuthManager } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';

interface Tenant {
  id: string;
  name: string;
  status: string;
  role: string;
}

/**
 * TenantSelector
 * 
 * Componente para seleccionar el tenant activo cuando el usuario tiene múltiples tenants.
 * Al cambiar de tenant, actualiza el sessionStorage y recarga la página para aplicar los cambios.
 */
export function TenantSelector() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenants = async () => {
      try {
        const authManager = AuthManager.getInstance();
        // Obtener estado actualizado (puede requerir bootstrap si no está inicializado)
        const state = authManager.getState();
        
        if (!state.isAuthenticated) {
          // Si no hay estado, hacer bootstrap para obtener información completa
          const bootstrappedState = await authManager.bootstrap();
          
          // Nota: AuthManager no expone la lista completa de tenants en el estado actual
          // Por ahora, usamos el tenant actual. Si necesitamos la lista completa,
          // necesitaríamos extender AuthManager o hacer una llamada directa aquí.
          // Por compatibilidad, hacemos una llamada directa solo para obtener la lista de tenants
          const sessionResponse = await apiClient.get('/session/me');
          if (sessionResponse.success && (sessionResponse as any).data) {
            const session = (sessionResponse as any).data as {
              tenants?: Array<{ tenantId: string; name: string; status: string; role: string }>;
              currentTenant: { tenantId: string; name: string; status: string; role: string } | null;
            };

            // Mapear tenants al formato esperado
            if (session.tenants) {
              const tenantsList: Tenant[] = session.tenants.map((t) => ({
                id: t.tenantId,
                name: t.name,
                status: t.status,
                role: t.role,
              }));
              setTenants(tenantsList);
            }

            // Usar currentTenant de la sesión
            if (session.currentTenant) {
              setCurrentTenant({
                id: session.currentTenant.tenantId,
                name: session.currentTenant.name,
                status: session.currentTenant.status,
                role: session.currentTenant.role,
              });
            } else if (bootstrappedState.tenant) {
              // Fallback: usar tenant del estado
              setCurrentTenant({
                id: bootstrappedState.tenant.id,
                name: bootstrappedState.tenant.name,
                status: bootstrappedState.tenant.status,
                role: bootstrappedState.tenant.role,
              });
            }
          }
        } else {
          // Estado ya disponible, pero necesitamos la lista completa de tenants
          // Hacemos una llamada directa solo para obtener la lista completa
          const sessionResponse = await apiClient.get('/session/me');
          if (sessionResponse.success && (sessionResponse as any).data) {
            const session = (sessionResponse as any).data as {
              tenants?: Array<{ tenantId: string; name: string; status: string; role: string }>;
              currentTenant: { tenantId: string; name: string; status: string; role: string } | null;
            };

            if (session.tenants) {
              const tenantsList: Tenant[] = session.tenants.map((t) => ({
                id: t.tenantId,
                name: t.name,
                status: t.status,
                role: t.role,
              }));
              setTenants(tenantsList);
            }

            if (session.currentTenant) {
              setCurrentTenant({
                id: session.currentTenant.tenantId,
                name: session.currentTenant.name,
                status: session.currentTenant.status,
                role: session.currentTenant.role,
              });
            } else if (state.tenant) {
              setCurrentTenant({
                id: state.tenant.id,
                name: state.tenant.name,
                status: state.tenant.status,
                role: state.tenant.role,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error cargando tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTenants();
  }, []);

  const handleTenantChange = async (tenantId: string) => {
    try {
      // Actualizar sessionStorage con el nuevo tenant
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('currentTenantId', tenantId);
      }

      // CRÍTICO: Limpiar cache del ApiClient para prevenir datos cross-tenant
      apiClient.clearCaches();

      // Invalidar cache de AuthManager y obtener estado actualizado
      const authManager = AuthManager.getInstance();
      authManager.invalidateCache();
      const state = await authManager.bootstrap();

      // Verificar que el tenant seleccionado coincide con el currentTenant del estado
      if (state.tenant && state.tenant.id === tenantId) {
        setCurrentTenant({
          id: state.tenant.id,
          name: state.tenant.name,
          status: state.tenant.status,
          role: state.tenant.role,
        });
        
        // Recargar la página para aplicar los cambios
        // Esto asegura que todas las peticiones futuras usen el nuevo tenant
        router.refresh();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error cambiando tenant:', error);
    }
  };

  // No mostrar selector si solo hay un tenant
  if (loading || tenants.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          {currentTenant ? (
            <>
              <span className="truncate">{currentTenant.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({currentTenant.role})
              </span>
            </>
          ) : (
            t('tenants.select_tenant')
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{t('tenants.my_tenants')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantChange(tenant.id)}
            className={currentTenant?.id === tenant.id ? 'bg-accent' : ''}
          >
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground">
                {tenant.role} • {tenant.status}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

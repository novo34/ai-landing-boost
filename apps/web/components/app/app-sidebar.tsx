'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, CreditCard, BookOpen, MessageSquare, LogOut, Calendar, Shield, MessageCircle, Bot, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/client';
import { apiClient } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAdminRole, canEdit, type TenantRole } from '@/lib/utils/roles';
import { AuthManager } from '@/lib/auth';

// Definición de items de navegación con permisos requeridos
const allNavItems = [
  {
    title: 'dashboard',
    href: '/app',
    icon: LayoutDashboard,
    requiredRole: null as TenantRole | null, // Todos los roles pueden ver el dashboard
  },
  {
    title: 'settings',
    href: '/app/settings',
    icon: Settings,
    requiredRole: null as TenantRole | null, // Todos los roles que pueden editar
    requiresEdit: true,
  },
  {
    title: 'billing',
    href: '/app/billing',
    icon: CreditCard,
    requiredRole: 'OWNER' as TenantRole, // Solo OWNER y ADMIN pueden ver billing
    requiresAdmin: true,
  },
  {
    title: 'knowledge_base',
    href: '/app/knowledge-base',
    icon: BookOpen,
    requiredRole: null as TenantRole | null,
    requiresEdit: true, // Solo roles que pueden editar
  },
  {
    title: 'channels',
    href: '/app/channels',
    icon: MessageSquare,
    requiredRole: null as TenantRole | null,
    requiresEdit: true, // Solo roles que pueden editar
  },
  {
    title: 'appointments',
    href: '/app/appointments',
    icon: Calendar,
    requiredRole: null as TenantRole | null,
    requiresEdit: true, // Solo roles que pueden editar
  },
  {
    title: 'conversations',
    href: '/app/conversations',
    icon: MessageCircle,
    requiredRole: null as TenantRole | null,
    requiresEdit: true, // Solo roles que pueden editar
  },
  {
    title: 'agents',
    href: '/app/agents',
    icon: Bot,
    requiredRole: null as TenantRole | null,
    requiresEdit: true, // Solo roles que pueden editar
  },
  {
    title: 'documentation',
    href: '/app/docs',
    icon: FileText,
    requiredRole: null as TenantRole | null, // Todos los roles pueden ver documentación
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const router = useRouter();
  const [userRole, setUserRole] = useState<TenantRole | null>(null);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Obtener rol del usuario y logo al cargar el componente
  useEffect(() => {
    const loadUserAndTenant = async () => {
      try {
        const authManager = AuthManager.getInstance();
        const state = authManager.getState();
        
        // Si no hay estado, hacer bootstrap
        if (!state.isAuthenticated) {
          const bootstrappedState = await authManager.bootstrap();
          setPlatformRole(bootstrappedState.platformRole ?? null);
          if (bootstrappedState.tenant?.role) {
            setUserRole(bootstrappedState.tenant.role as TenantRole);
          }
        } else {
          setPlatformRole(state.platformRole ?? null);
          if (state.tenant?.role) {
            setUserRole(state.tenant.role as TenantRole);
          }
        }
      } catch (error) {
        console.error('Error obteniendo sesión del usuario:', error);
      }
    };

    const loadLogo = async () => {
      try {
        const response = await apiClient.getTenantSettings();
        if (response.success && response.data?.logoUrl) {
          setLogoUrl(response.data.logoUrl);
        }
      } catch (error) {
        // Ignorar error
      }
    };

    loadUserAndTenant();
    loadLogo();
  }, []);

  // Filtrar items de navegación según permisos del rol
  const navItems = allNavItems.filter((item) => {
    if (!userRole) {
      // Si no hay rol, solo mostrar dashboard
      return item.href === '/app';
    }

    // Si requiere admin y el usuario no es admin, ocultar
    if (item.requiresAdmin && !isAdminRole(userRole)) {
      return false;
    }

    // Si requiere edición y el usuario no puede editar, ocultar
    if (item.requiresEdit && !canEdit(userRole)) {
      return false;
    }

    // Si tiene un rol requerido específico, verificar
    if (item.requiredRole && userRole !== item.requiredRole) {
      // Si requiere OWNER pero el usuario es ADMIN, permitir (ADMIN tiene permisos similares)
      if (item.requiredRole === 'OWNER' && userRole === 'ADMIN') {
        return true;
      }
      return false;
    }

    return true;
  });

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      
      // Limpiar caches del cliente API primero
      await apiClient.logout();
      
      console.log('✅ Logout exitoso, redirigiendo...');
    } catch (error) {
      console.error('❌ Error en logout:', error);
      // Continuar con el logout incluso si hay error
    }
    
    // Limpiar sessionStorage y localStorage (por si acaso)
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    
    // Redirigir SIEMPRE usando window.location.href para forzar recarga completa
    // Esto asegura que toda la aplicación se recargue y no haya estado residual
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo en header del sidebar */}
      <div className="p-4 border-b">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-8 max-w-[150px] object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.startsWith('http')) {
                target.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${logoUrl}`;
              }
            }}
          />
        ) : (
          <div className="font-bold text-lg">AutomAI</div>
        )}
      </div>
      <div className="flex-1 space-y-1 p-2">
        {platformRole && (
          <Button
            variant="outline"
            className="w-full justify-start mb-2"
            onClick={() => router.push('/platform')}
          >
            <Shield className="h-5 w-5 mr-2" />
            <span>{t('nav.dashboard')} {t('platform.title', { ns: 'platform' })}</span>
          </Button>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(`nav.${item.title}`) || item.title}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-2" />
          <span>{t('auth.logout')}</span>
        </Button>
      </div>
    </div>
  );
}


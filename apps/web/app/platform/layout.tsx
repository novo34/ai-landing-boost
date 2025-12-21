'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { measureClientOperation } from '@/lib/perf/client-perf';
import { useNavigationPerf } from '@/lib/perf/client-perf';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PlatformSidebar } from '@/components/platform/platform-sidebar';
import { useTranslation } from '@/lib/i18n/client';

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useTranslation('platform');
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Medir navegación
  useNavigationPerf();

  useEffect(() => {
    const checkPlatformAccess = async () => {
      try {
        // Usar AuthManager como single source of truth
        const { AuthManager } = await import('@/lib/auth');
        const authManager = AuthManager.getInstance();
        const state = await measureClientOperation('PlatformLayout.checkPlatformAccess', () =>
          authManager.bootstrap()
        );

        if (!state.isAuthenticated || !state.user) {
          router.push('/login');
          return;
        }

        // Verificar platformRole desde state
        if (!state.platformRole || !['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT'].includes(state.platformRole)) {
          console.log('❌ Usuario no tiene platformRole válido. Role actual:', state.platformRole || 'null');
          console.log('💡 Para acceder al panel, asigna un platformRole al usuario:');
          console.log('');
          console.log('   Opción 1 - SQL directo:');
          console.log(`   UPDATE user SET platformRole = 'PLATFORM_OWNER' WHERE email = '${state.user.email}';`);
          console.log('');
          console.log('   Opción 2 - Script Node.js:');
          console.log(`   cd apps/api && npx ts-node scripts/setup-platform-owner.ts ${state.user.email}`);
          console.log('');
          console.log('   Opción 3 - Script PowerShell:');
          console.log(`   .\\setup-platform-owner.ps1 ${state.user.email}`);
          console.log('');
          // No tiene acceso al panel de plataforma, redirigir al dashboard normal
          router.push('/app');
          return;
        }

        console.log('✅ Usuario tiene acceso al panel de plataforma');
        setHasAccess(true);
        setIsChecking(false);
      } catch (error) {
        console.error('❌ Error verificando acceso a plataforma:', error);
        router.push('/app');
      }
    };

    checkPlatformAccess();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('loading', { ns: 'common' })}</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar para desktop */}
        <Sidebar className="hidden md:flex">
          <PlatformSidebar />
        </Sidebar>
        
        {/* Contenido principal */}
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:px-6">
            <div className="font-bold text-xl">Platform Admin</div>
            <div className="flex-1" />
            <Link
              href="/platform/documentation"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              <span>📚 Documentación</span>
            </Link>
          </header>
          
          {/* Contenido */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

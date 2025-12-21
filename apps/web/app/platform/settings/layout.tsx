'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n/client';
import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configuración Platform: General, Email
const platformSettingsTabs = [
  { href: '/platform/operations/settings', label: 'platform.operations.settings.title', icon: Settings },
  { href: '/platform/settings/email', label: 'email.platform_settings_title', icon: Mail },
];

export default function PlatformSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation('common');

  // Determinar qué tab está activa
  const getActiveTab = () => {
    const activeTab = platformSettingsTabs.find(tab => pathname === tab.href || pathname?.startsWith(tab.href + '/'));
    return activeTab?.href || platformSettingsTabs[0].href;
  };

  const activeTab = getActiveTab();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('email.platform_settings_title') || 'Configuración de Email Global'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('email.platform_settings_description') || 'Configura el servidor SMTP global que se usará como fallback para tenants sin configuración propia'}
        </p>
      </div>

      {/* Tabs de Navegación (si hay más tabs en el futuro) */}
      {platformSettingsTabs.length > 1 && (
      <div className="mt-4">
        <Tabs value={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            {platformSettingsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/');
              return (
                <Link key={tab.href} href={tab.href}>
                  <TabsTrigger
                    value={tab.href}
                    className={cn(
                      'flex items-center gap-2 w-full',
                      isActive && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t(tab.label) || tab.label.replace('platform.', '').replace('email.', '')}
                    </span>
                  </TabsTrigger>
                </Link>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      )}

      {children}
    </div>
  );
}



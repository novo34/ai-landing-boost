'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n/client';
import { Settings, Users, MessageSquare, Calendar, Shield, Workflow, Lock as LockIcon, Palette, Plug, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configuración General: General, Team, Branding, Security, GDPR, Email
const generalSettingsTabs = [
  { href: '/app/settings', label: 'settings.general', icon: Settings },
  { href: '/app/settings/team', label: 'team.title', icon: Users },
  { href: '/app/settings/branding', label: 'branding.title', icon: Palette },
  { href: '/app/settings/email', label: 'email.settings_title', icon: Mail },
  { href: '/app/settings/security', label: 'security.title', icon: LockIcon },
  { href: '/app/settings/gdpr', label: 'gdpr.title', icon: Shield },
];

// Conexiones API y Sistema: WhatsApp, Calendar, n8n
const connectionsTabs = [
  { href: '/app/settings/whatsapp', label: 'whatsapp.title', icon: MessageSquare },
  { href: '/app/settings/calendar', label: 'calendar.title', icon: Calendar },
  { href: '/app/settings/n8n', label: 'n8n.title', icon: Workflow },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation('common');

  // Determinar qué pestaña principal está activa
  const isGeneralTab = generalSettingsTabs.some(tab => pathname === tab.href || pathname?.startsWith(tab.href + '/'));
  const isConnectionsTab = connectionsTabs.some(tab => pathname === tab.href || pathname?.startsWith(tab.href + '/'));
  
  // Si no hay ninguna activa, por defecto es general
  const activeMainTab = isConnectionsTab ? 'connections' : 'general';

  // Obtener las subpestañas según la pestaña principal activa
  const currentSubTabs = activeMainTab === 'connections' ? connectionsTabs : generalSettingsTabs;

  // Determinar qué subpestaña está activa
  const getActiveSubTab = () => {
    const activeTab = currentSubTabs.find(tab => pathname === tab.href || pathname?.startsWith(tab.href + '/'));
    return activeTab?.href || currentSubTabs[0].href;
  };

  const activeSubTab = getActiveSubTab();

  // Manejar cambio de pestaña principal
  const handleMainTabChange = (value: string) => {
    if (value === 'general' && activeMainTab !== 'general') {
      router.push('/app/settings');
    } else if (value === 'connections' && activeMainTab !== 'connections') {
      router.push('/app/settings/whatsapp');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.description')}
        </p>
      </div>

      {/* Pestañas Principales */}
      <Tabs value={activeMainTab} onValueChange={handleMainTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>{t('settings.main_tabs.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span>{t('settings.main_tabs.connections')}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Subpestañas */}
      <div className="mt-4">
        <Tabs value={activeSubTab} className="w-full">
          <TabsList className={cn(
            'grid w-full gap-2',
            activeMainTab === 'general' ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-1 lg:grid-cols-3'
          )}>
            {currentSubTabs.map((tab) => {
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
                    <span className="hidden sm:inline">{t(tab.label)}</span>
                  </TabsTrigger>
                </Link>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  );
}

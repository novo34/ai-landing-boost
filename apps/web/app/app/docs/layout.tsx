'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/lib/i18n/client';
import { BookOpen, Rocket, Puzzle, Workflow, Plug, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const docsTabs = [
  { 
    href: '/app/docs', 
    label: 'documentation.overview', 
    icon: BookOpen,
    doc: null
  },
  { 
    href: '/app/docs/getting-started', 
    label: 'documentation.getting_started', 
    icon: Rocket,
    doc: 'getting-started'
  },
  { 
    href: '/app/docs/modules', 
    label: 'documentation.modules', 
    icon: Puzzle,
    doc: 'modules'
  },
  { 
    href: '/app/docs/workflows', 
    label: 'documentation.workflows', 
    icon: Workflow,
    doc: 'workflows'
  },
  { 
    href: '/app/docs/integrations', 
    label: 'documentation.integrations', 
    icon: Plug,
    doc: 'integrations'
  },
  { 
    href: '/app/docs/troubleshooting', 
    label: 'documentation.troubleshooting', 
    icon: Wrench,
    doc: 'troubleshooting'
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('documentation.title') || 'Documentación'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('documentation.description') || 'Documentación completa del sistema AutomAI'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="no-print">
        <Tabs value={pathname || '/app/docs'} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {docsTabs.map((tab) => {
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
                      {t(tab.label) || tab.label.replace('documentation.', '')}
                    </span>
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

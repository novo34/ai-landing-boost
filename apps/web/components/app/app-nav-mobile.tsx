'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, CreditCard, BookOpen, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/client';

const navItems = [
  {
    title: 'dashboard',
    href: '/app',
    icon: LayoutDashboard,
  },
  {
    title: 'settings',
    href: '/app/settings',
    icon: Settings,
  },
  {
    title: 'billing',
    href: '/app/billing',
    icon: CreditCard,
  },
  {
    title: 'knowledge_base',
    href: '/app/knowledge-base',
    icon: BookOpen,
  },
  {
    title: 'channels',
    href: '/app/channels',
    icon: MessageSquare,
  },
  {
    title: 'appointments',
    href: '/app/appointments',
    icon: Calendar,
  },
];

export function AppNavMobile() {
  const pathname = usePathname();
  const { t } = useTranslation('common');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden safe-area-inset-bottom shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors touch-target',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground active:bg-accent'
              )}
              aria-label={t(`nav.${item.title}`) || item.title}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-[10px] leading-tight text-center truncate max-w-[60px]">{t(`nav.${item.title}`) || item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


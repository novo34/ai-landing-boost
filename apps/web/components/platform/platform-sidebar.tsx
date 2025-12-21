'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Package,
  Ticket,
  MessageSquare,
  Server,
  Globe,
  FileText,
  Settings,
  Bot,
  Hash,
  MessageCircle,
  Users,
  Workflow,
  BookOpen,
} from 'lucide-react';

export function PlatformSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation('platform');

  const menuItems = [
    {
      title: t('nav.dashboard'),
      url: '/platform',
      icon: LayoutDashboard,
    },
    {
      title: t('nav.tenants'),
      url: '/platform/tenants',
      icon: Building2,
    },
    {
      title: t('nav.billing'),
      url: '/platform/billing',
      icon: CreditCard,
    },
    {
      title: t('nav.plans'),
      url: '/platform/plans',
      icon: Package,
    },
    {
      title: t('nav.tickets'),
      url: '/platform/tickets',
      icon: Ticket,
    },
    {
      title: t('nav.chat'),
      url: '/platform/chat',
      icon: MessageSquare,
    },
    {
      title: t('nav.instances'),
      url: '/platform/instances',
      icon: Server,
    },
    {
      title: t('nav.regions'),
      url: '/platform/regions',
      icon: Globe,
    },
    {
      title: t('nav.audit'),
      url: '/platform/audit',
      icon: FileText,
    },
  ];

  const operationsItems = [
    {
      title: t('nav.operations.agents'),
      url: '/platform/operations/agents',
      icon: Bot,
    },
    {
      title: t('nav.operations.channels'),
      url: '/platform/operations/channels',
      icon: Hash,
    },
    {
      title: t('nav.operations.conversations'),
      url: '/platform/operations/conversations',
      icon: MessageCircle,
    },
    {
      title: t('nav.operations.leads'),
      url: '/platform/operations/leads',
      icon: Users,
    },
    {
      title: t('nav.operations.n8n'),
      url: '/platform/operations/n8n',
      icon: Workflow,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('title')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.operations.title')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname?.startsWith(item.url + '/');
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/platform/operations/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('nav.settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/platform/documentation" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Documentación</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

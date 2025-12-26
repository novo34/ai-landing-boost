import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { MarketingLeadsModule } from './modules/marketing-leads/marketing-leads.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantSettingsModule } from './modules/tenant-settings/tenant-settings.module';
import { BillingModule } from './modules/billing/billing.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { TeamModule } from './modules/team/team.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { AgentsModule } from './modules/agents/agents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { N8nIntegrationModule } from './modules/n8n-integration/n8n-integration.module';
import { GdprModule } from './modules/gdpr/gdpr.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { WebchatModule } from './modules/webchat/webchat.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { CommonModule } from './common/common.module';
import { PlatformModule } from './modules/platform/platform.module';
import { SupportModule } from './modules/platform/support/support.module';
import { LeadsModule } from './modules/platform/leads/leads.module';
import { InstancesModule } from './modules/platform/instances/instances.module';
import { SessionModule } from './modules/session/session.module';
import { PlatformChatModule } from './modules/platform/chat/platform-chat.module';
import { PlatformN8NFlowsModule } from './modules/platform/n8n-flows/platform-n8n-flows.module';
import { PlansModule } from './modules/platform/plans/plans.module';
import { OperationsModule } from './modules/platform/operations/operations.module';
import { EmailModule } from './modules/email/email.module';
import { CryptoModule } from './modules/crypto/crypto.module';

@Module({
  imports: [
    CryptoModule, // Módulo global de cifrado
    ScheduleModule.forRoot(), // Scheduler global
    // Rate Limiting: Configuración global
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minuto
        limit: 10, // 10 requests por minuto
      },
      {
        name: 'medium',
        ttl: 600000, // 10 minutos
        limit: 50, // 50 requests por 10 minutos
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hora
        limit: 200, // 200 requests por hora
      },
    ]),
    PrismaModule,
    CommonModule,
    MarketingLeadsModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    TenantSettingsModule,
    BillingModule,
    InvitationsModule,
    TeamModule,
    WhatsAppModule,
    ConversationsModule,
    KnowledgeBaseModule,
    AgentsModule,
    CalendarModule,
    AppointmentsModule,
    N8nIntegrationModule,
    GdprModule,
    AutomationsModule,
    WebchatModule,
    ChannelsModule,
    AnalyticsModule,
    NotificationsModule,
    SearchModule,
    PlatformModule,
    SupportModule,
    LeadsModule,
    InstancesModule,
    PlatformChatModule,
    PlatformN8NFlowsModule,
    PlansModule,
    OperationsModule,
    EmailModule,
    SessionModule,
    // TODO: Importar módulos de negocio según se vayan implementando
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


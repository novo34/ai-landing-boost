import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMessagingService } from './whatsapp-messaging.service';
import { WhatsAppWebhookController } from './webhooks/whatsapp-webhook.controller';
import { EvolutionProvider } from './providers/evolution.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { WhatsAppReconnectSchedulerService } from './services/whatsapp-reconnect-scheduler.service';
import { WhatsAppSyncService } from './whatsapp-sync.service';
import { WhatsAppSyncScheduler } from './schedulers/whatsapp-sync.scheduler';
import { ScheduleModule } from '@nestjs/schedule';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ConversationsModule),
    N8nIntegrationModule,
    KnowledgeBaseModule,
    NotificationsModule,
    ScheduleModule,
    CryptoModule,
  ],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [
    WhatsAppService,
    WhatsAppMessagingService,
    EvolutionProvider,
    WhatsAppCloudProvider,
    WebhookSignatureGuard,
    WhatsAppReconnectSchedulerService,
    WhatsAppSyncService,
    WhatsAppSyncScheduler,
  ],
  exports: [WhatsAppService, WhatsAppMessagingService],
})
export class WhatsAppModule {}


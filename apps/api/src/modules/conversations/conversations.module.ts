import { Module, forwardRef } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationOrchestratorService } from './orchestrator.service';
import { ConversationMemoryService } from './services/conversation-memory.service';
import { AIOrchestratorService } from './services/ai-orchestrator.service';
import { ConversationRetentionSchedulerService } from './services/conversation-retention-scheduler.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GdprModule } from '../gdpr/gdpr.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule,
    forwardRef(() => WhatsAppModule),
    KnowledgeBaseModule,
    forwardRef(() => AppointmentsModule),
    NotificationsModule,
    GdprModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationOrchestratorService,
    ConversationMemoryService,
    AIOrchestratorService,
    ConversationRetentionSchedulerService,
  ],
  exports: [
    ConversationsService,
    ConversationOrchestratorService,
    ConversationMemoryService,
    AIOrchestratorService,
  ],
})
export class ConversationsModule {}


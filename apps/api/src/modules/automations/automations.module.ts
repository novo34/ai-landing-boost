import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrialExpirationService } from './services/trial-expiration.service';
import { PaymentFailureService } from './services/payment-failure.service';
import { SubscriptionBlockingService } from './services/subscription-blocking.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';

@Module({
  imports: [
    ScheduleModule, // No usar forRoot() aquí, ya está en WhatsAppModule
    PrismaModule,
    N8nIntegrationModule,
  ],
  providers: [
    TrialExpirationService,
    PaymentFailureService,
    SubscriptionBlockingService,
  ],
  exports: [
    TrialExpirationService,
    PaymentFailureService,
    SubscriptionBlockingService,
  ],
})
export class AutomationsModule {}


import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, N8nIntegrationModule, NotificationsModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, StripeService],
  exports: [BillingService, StripeService],
})
export class BillingModule {}


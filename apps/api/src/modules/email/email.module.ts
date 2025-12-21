import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailDeliveryService } from './email-delivery.service';
import { EmailDeliveryController } from './email-delivery.controller';
import { PlatformEmailController } from './platform-email.controller';
import { EmailProviderService } from './services/email-provider.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailWorkerService } from './services/email-worker.service';
import { EmailI18nService } from './services/email-i18n.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [PrismaModule, ScheduleModule, CryptoModule],
  controllers: [EmailDeliveryController, PlatformEmailController],
  providers: [
    EmailDeliveryService,
    EmailProviderService,
    EmailQueueService,
    EmailWorkerService,
    EmailI18nService,
  ],
  exports: [EmailDeliveryService, EmailQueueService],
})
export class EmailModule {}


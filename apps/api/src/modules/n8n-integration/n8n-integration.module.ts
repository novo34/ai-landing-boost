import { Module } from '@nestjs/common';
import { N8nFlowsController } from './n8n-flows.controller';
import { N8nFlowsService } from './n8n-flows.service';
import { N8nApiClient } from './clients/n8n-api.client';
import { N8nWebhookService } from './services/n8n-webhook.service';
import { N8nEventService } from './services/n8n-event.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [N8nFlowsController],
  providers: [N8nFlowsService, N8nApiClient, N8nWebhookService, N8nEventService],
  exports: [N8nFlowsService, N8nApiClient, N8nWebhookService, N8nEventService],
})
export class N8nIntegrationModule {}


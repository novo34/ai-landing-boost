import { Module } from '@nestjs/common';
import { MarketingLeadsController } from './marketing-leads.controller';
import { MarketingLeadsService } from './marketing-leads.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { N8nIntegrationModule } from '../n8n-integration/n8n-integration.module';

@Module({
  imports: [PrismaModule, N8nIntegrationModule],
  controllers: [MarketingLeadsController],
  providers: [MarketingLeadsService],
  exports: [MarketingLeadsService],
})
export class MarketingLeadsModule {}


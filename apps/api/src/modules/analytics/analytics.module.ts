import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PdfService } from './pdf.service';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PdfService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

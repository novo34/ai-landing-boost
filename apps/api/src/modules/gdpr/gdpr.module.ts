import { Module } from '@nestjs/common';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';
import { DataResidencyService } from './services/data-residency.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GdprController],
  providers: [GdprService, DataResidencyService],
  exports: [GdprService, DataResidencyService],
})
export class GdprModule {}


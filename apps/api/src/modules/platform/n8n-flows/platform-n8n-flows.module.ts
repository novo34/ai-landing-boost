import { Module } from '@nestjs/common';
import { PlatformN8NFlowsController } from './platform-n8n-flows.controller';
import { PlatformN8NFlowsService } from './platform-n8n-flows.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformN8NFlowsController],
  providers: [PlatformN8NFlowsService],
  exports: [PlatformN8NFlowsService],
})
export class PlatformN8NFlowsModule {}

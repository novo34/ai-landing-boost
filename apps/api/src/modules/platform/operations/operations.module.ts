import { Module } from '@nestjs/common';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AgentsModule } from '../../agents/agents.module';
import { ChannelsModule } from '../../channels/channels.module';
import { ConversationsModule } from '../../conversations/conversations.module';

@Module({
  imports: [PrismaModule, AgentsModule, ChannelsModule, ConversationsModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}

import { Module } from '@nestjs/common';
import { WebchatController } from './webchat.controller';
import { WebchatService } from './webchat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [PrismaModule, ConversationsModule, KnowledgeBaseModule],
  controllers: [WebchatController],
  providers: [WebchatService],
  exports: [WebchatService],
})
export class WebchatModule {}


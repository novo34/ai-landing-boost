import { Module } from '@nestjs/common';
import { PlatformChatController } from './platform-chat.controller';
import { PlatformChatService } from './platform-chat.service';
import { PlatformChatGateway } from './platform-chat.gateway';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformChatController],
  providers: [PlatformChatService, PlatformChatGateway],
  exports: [PlatformChatService, PlatformChatGateway],
})
export class PlatformChatModule {}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformChatService } from './platform-chat.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { PlatformUser } from '../../../common/decorators/platform-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('platform/chat')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformChatController {
  constructor(private readonly chatService: PlatformChatService) {}

  /**
   * Lista conversaciones activas
   */
  @Get('conversations')
  async listActiveConversations() {
    return this.chatService.listActiveConversations();
  }

  /**
   * Obtiene historial de chat con un tenant
   */
  @Get('tenants/:tenantId/history')
  async getChatHistory(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getChatHistory(tenantId, limit ? parseInt(limit) : 100);
  }

  /**
   * Envía un mensaje (también disponible vía WebSocket)
   */
  @Post('tenants/:tenantId/messages')
  async sendMessage(
    @Param('tenantId') tenantId: string,
    @Body() dto: SendMessageDto,
    @PlatformUser() platformUser: { userId: string },
  ) {
    return this.chatService.sendMessage(tenantId, platformUser.userId, dto.message);
  }
}

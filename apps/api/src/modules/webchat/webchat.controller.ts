import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WebchatService } from './webchat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/public/webchat')
@Public()
export class WebchatController {
  constructor(private readonly webchatService: WebchatService) {}

  /**
   * Obtiene la configuración del widget para un tenant
   * GET /api/public/webchat/config/:tenantSlug
   */
  @Get('config/:tenantSlug')
  async getConfig(@Param('tenantSlug') tenantSlug: string) {
    return this.webchatService.getWidgetConfig(tenantSlug);
  }

  /**
   * Envía un mensaje desde el widget
   * POST /api/public/webchat/messages/:tenantSlug
   */
  @Post('messages/:tenantSlug')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: SendMessageDto,
    @Body('participantId') participantId?: string,
  ) {
    return this.webchatService.sendMessage(
      tenantSlug,
      dto.content,
      dto.conversationId,
      participantId,
      dto.participantName,
    );
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   * GET /api/public/webchat/messages/:conversationId/:tenantSlug
   */
  @Get('messages/:conversationId/:tenantSlug')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Param('tenantSlug') tenantSlug: string,
  ) {
    return this.webchatService.getMessages(conversationId, tenantSlug);
  }
}


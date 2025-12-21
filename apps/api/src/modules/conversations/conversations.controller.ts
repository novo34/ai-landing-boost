import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * Lista todas las conversaciones del tenant
   */
  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getConversations(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.conversationsService.getConversations(tenant.id, {
      agentId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Obtiene una conversación específica por ID
   */
  @Get(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getConversationById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.conversationsService.getConversationById(tenant.id, id);
  }

  /**
   * Obtiene los mensajes de una conversación
   */
  @Get(':id/messages')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getMessages(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') conversationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.conversationsService.getMessages(tenant.id, conversationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Envía un mensaje manual a una conversación
   */
  @Post(':id/messages')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(tenant.id, conversationId, dto);
  }

  /**
   * Archiva una conversación
   */
  @Post(':id/archive')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.OK)
  async archiveConversation(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.conversationsService.archiveConversation(tenant.id, id);
  }

  /**
   * Desarchiva una conversación
   */
  @Post(':id/unarchive')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.OK)
  async unarchiveConversation(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.conversationsService.unarchiveConversation(tenant.id, id);
  }
}


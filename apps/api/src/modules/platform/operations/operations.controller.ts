import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { PlatformUser } from '../../../common/decorators/platform-user.decorator';
import { $Enums } from '@prisma/client';

@Controller('platform/operations')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  /**
   * Obtiene el tenant del PLATFORM_OWNER
   */
  @Get('tenant')
  async getTenant(@PlatformUser() platformUser: { userId: string }) {
    const tenantId = await this.operationsService.getPlatformOwnerTenant(platformUser.userId);
    return {
      success: true,
      data: { tenantId },
    };
  }

  /**
   * Obtiene agentes del PLATFORM_OWNER
   */
  @Get('agents')
  async getAgents(@PlatformUser() platformUser: { userId: string }) {
    return this.operationsService.getPlatformAgents(platformUser.userId);
  }

  /**
   * Obtiene canales del PLATFORM_OWNER
   */
  @Get('channels')
  async getChannels(
    @PlatformUser() platformUser: { userId: string },
    @Query('type') type?: $Enums.channel_type,
    @Query('status') status?: $Enums.channel_status,
  ) {
    return this.operationsService.getPlatformChannels(platformUser.userId, { type, status });
  }

  /**
   * Obtiene conversaciones del PLATFORM_OWNER
   */
  @Get('conversations')
  async getConversations(
    @PlatformUser() platformUser: { userId: string },
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.operationsService.getPlatformConversations(platformUser.userId, {
      agentId,
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }
}

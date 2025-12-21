import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddAgentToChannelDto } from './dto/add-agent-to-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { PlanLimitsGuard } from '../billing/guards/plan-limits.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { SubscriptionStatusGuard } from '../../common/guards/subscription-status.guard';

@Controller('channels')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard, SubscriptionStatusGuard)
@SkipThrottle() // Excluir del rate limiting para evitar 429 en desarrollo
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /**
   * Lista canales del tenant
   */
  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getChannels(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('type') type?: $Enums.channel_type,
    @Query('status') status?: $Enums.channel_status,
  ) {
    return this.channelsService.getChannels(tenant.id, {
      type,
      status,
    });
  }

  /**
   * Obtiene un canal por ID
   */
  @Get(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getChannelById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.channelsService.getChannelById(tenant.id, id);
  }

  /**
   * Crea un nuevo canal
   */
  @Post()
  @UseGuards(EmailVerifiedGuard, PlanLimitsGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createChannel(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.createChannel(tenant.id, dto);
  }

  /**
   * Actualiza un canal
   */
  @Put(':id')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateChannel(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.updateChannel(tenant.id, id, dto);
  }

  /**
   * Elimina un canal
   */
  @Delete(':id')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteChannel(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.channelsService.deleteChannel(tenant.id, id);
  }

  /**
   * Agrega un agente a un canal
   */
  @Post(':id/agents')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async addAgentToChannel(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') channelId: string,
    @Body() dto: AddAgentToChannelDto,
  ) {
    return this.channelsService.addAgentToChannel(tenant.id, channelId, dto);
  }

  /**
   * Elimina un agente de un canal
   */
  @Delete(':id/agents/:agentId')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeAgentFromChannel(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') channelId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.channelsService.removeAgentFromChannel(tenant.id, channelId, agentId);
  }
}


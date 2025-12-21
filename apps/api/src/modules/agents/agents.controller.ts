import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { PlanLimitsGuard } from '../billing/guards/plan-limits.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { SubscriptionStatusGuard } from '../../common/guards/subscription-status.guard';

@Controller('agents')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard, SubscriptionStatusGuard)
@SkipThrottle() // Excluir del rate limiting para evitar 429 en desarrollo
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Lista todos los agentes del tenant
   */
  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAgents(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.agentsService.getAgents(tenant.id);
  }

  /**
   * Obtiene un agente específico por ID
   */
  @Get(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAgentById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.agentsService.getAgentById(tenant.id, id);
  }

  /**
   * Crea un nuevo agente
   */
  @Post()
  @UseGuards(EmailVerifiedGuard, PlanLimitsGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAgent(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateAgentDto,
  ) {
    return this.agentsService.createAgent(tenant.id, dto);
  }

  /**
   * Actualiza un agente
   */
  @Put(':id')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateAgent(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.updateAgent(tenant.id, id, dto);
  }

  /**
   * Elimina un agente
   */
  @Delete(':id')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAgent(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.agentsService.deleteAgent(tenant.id, id);
  }
}


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
import { N8nFlowsService } from './n8n-flows.service';
import { CreateN8nFlowDto } from './dto/create-n8n-flow.dto';
import { UpdateN8nFlowDto } from './dto/update-n8n-flow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';

@Controller('n8n/flows')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class N8nFlowsController {
  constructor(private readonly n8nFlowsService: N8nFlowsService) {}

  /**
   * Lista flujos n8n del tenant
   */
  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getFlows(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('agentId') agentId?: string,
    @Query('type') type?: $Enums.n8nflow_type,
    @Query('isActive') isActive?: string,
  ) {
    return this.n8nFlowsService.getFlows(tenant.id, {
      agentId,
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  /**
   * Obtiene un flujo por ID
   */
  @Get(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getFlowById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.n8nFlowsService.getFlowById(tenant.id, id);
  }

  /**
   * Crea un nuevo flujo n8n
   */
  @Post()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createFlow(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateN8nFlowDto,
  ) {
    return this.n8nFlowsService.createFlow(tenant.id, dto);
  }

  /**
   * Actualiza un flujo n8n
   */
  @Put(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateFlow(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateN8nFlowDto,
  ) {
    return this.n8nFlowsService.updateFlow(tenant.id, id, dto);
  }

  /**
   * Elimina un flujo n8n
   */
  @Delete(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteFlow(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.n8nFlowsService.deleteFlow(tenant.id, id);
  }

  /**
   * Activa un flujo n8n
   */
  @Put(':id/activate')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async activateFlow(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.n8nFlowsService.activateFlow(tenant.id, id);
  }

  /**
   * Desactiva un flujo n8n
   */
  @Put(':id/deactivate')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async deactivateFlow(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.n8nFlowsService.deactivateFlow(tenant.id, id);
  }
}


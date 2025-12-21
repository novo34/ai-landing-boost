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
import { CalendarService } from './calendar.service';
import { CreateCalendarIntegrationDto } from './dto/create-calendar-integration.dto';
import { UpdateCalendarIntegrationDto } from './dto/update-calendar-integration.dto';
import { CreateCalendarRuleDto } from './dto/create-calendar-rule.dto';
import { UpdateCalendarRuleDto } from './dto/update-calendar-rule.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';

@Controller('calendars')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ============================================
  // Integration Endpoints
  // ============================================

  /**
   * Lista todas las integraciones de calendario del tenant
   */
  @Get('integrations')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getIntegrations(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.calendarService.getIntegrations(tenant.id);
  }

  /**
   * Obtiene una integración específica por ID
   */
  @Get('integrations/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getIntegrationById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.calendarService.getIntegrationById(tenant.id, id);
  }

  /**
   * Crea una nueva integración de calendario
   */
  @Post('integrations')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateCalendarIntegrationDto,
  ) {
    return this.calendarService.createIntegration(tenant.id, dto);
  }

  /**
   * Actualiza una integración de calendario
   */
  @Put('integrations/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateIntegration(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateCalendarIntegrationDto,
  ) {
    return this.calendarService.updateIntegration(tenant.id, id, dto);
  }

  /**
   * Elimina una integración de calendario
   */
  @Delete('integrations/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteIntegration(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.calendarService.deleteIntegration(tenant.id, id);
  }

  // ============================================
  // Rules Endpoints
  // ============================================

  /**
   * Lista todas las reglas de calendario del tenant
   */
  @Get('rules')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getRules(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('agentId') agentId?: string,
  ) {
    return this.calendarService.getRules(tenant.id, agentId);
  }

  /**
   * Crea una nueva regla de calendario
   */
  @Post('rules')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateCalendarRuleDto,
  ) {
    return this.calendarService.createRule(tenant.id, dto);
  }

  /**
   * Actualiza una regla de calendario
   */
  @Put('rules/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async updateRule(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateCalendarRuleDto,
  ) {
    return this.calendarService.updateRule(tenant.id, id, dto);
  }

  /**
   * Elimina una regla de calendario
   */
  @Delete('rules/:id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteRule(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.calendarService.deleteRule(tenant.id, id);
  }

  // ============================================
  // Availability Endpoints
  // ============================================

  /**
   * Obtiene la disponibilidad de calendario
   */
  @Get('availability')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAvailability(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() query: GetAvailabilityDto,
  ) {
    return this.calendarService.getAvailability(tenant.id, query);
  }
}


import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Crea una nueva cita
   */
  @Post()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(tenant.id, dto);
  }

  /**
   * Lista citas con filtros
   */
  @Get()
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAppointments(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: ListAppointmentsDto,
  ) {
    return this.appointmentsService.getAppointments(tenant.id, filters);
  }

  /**
   * Obtiene las próximas citas
   */
  @Get('upcoming')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getUpcomingAppointments(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('limit') limit?: string,
  ) {
    return this.appointmentsService.getUpcomingAppointments(
      tenant.id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Obtiene citas en un rango de fechas (para calendario)
   */
  @Get('range')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAppointmentsByRange(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.appointmentsService.getAppointmentsByRange(tenant.id, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      agentId,
    });
  }

  /**
   * Obtiene una cita por ID
   */
  @Get(':id')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT, $Enums.tenantmembership_role.VIEWER)
  async getAppointmentById(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.appointmentsService.getAppointmentById(tenant.id, id);
  }

  /**
   * Reprograma una cita
   */
  @Put(':id/reschedule')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  async rescheduleAppointment(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAppointment(tenant.id, id, dto);
  }

  /**
   * Cancela una cita
   */
  @Put(':id/cancel')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  async cancelAppointment(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancelAppointment(tenant.id, id, dto);
  }

  /**
   * Envía un recordatorio de cita
   */
  @Post(':id/reminder')
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN, $Enums.tenantmembership_role.AGENT)
  @HttpCode(HttpStatus.OK)
  async sendReminder(
    @CurrentTenant() tenant: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.appointmentsService.sendReminder(tenant.id, id);
  }
}


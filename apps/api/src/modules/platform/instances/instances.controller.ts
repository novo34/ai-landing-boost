import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InstancesService } from './instances.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

@Controller('platform/instances')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  /**
   * Crea una nueva instancia
   */
  @Post()
  async createInstance(@Body() dto: CreateInstanceDto) {
    return this.instancesService.createInstance(dto);
  }

  /**
   * Lista todas las instancias
   */
  @Get()
  async listInstances() {
    return this.instancesService.listInstances();
  }

  /**
   * Obtiene detalles de una instancia
   */
  @Get(':instanceId')
  async getInstanceDetails(@Param('instanceId') instanceId: string) {
    return this.instancesService.getInstanceDetails(instanceId);
  }

  /**
   * Actualiza una instancia
   */
  @Put(':instanceId')
  async updateInstance(
    @Param('instanceId') instanceId: string,
    @Body() dto: UpdateInstanceDto,
  ) {
    return this.instancesService.updateInstance(instanceId, dto);
  }

  /**
   * Asigna un tenant a una instancia
   */
  @Post(':instanceId/tenants/:tenantId')
  async assignTenantToInstance(
    @Param('instanceId') instanceId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.instancesService.assignTenantToInstance(tenantId, instanceId);
  }

  /**
   * Elimina una instancia
   */
  @Delete(':instanceId')
  async deleteInstance(@Param('instanceId') instanceId: string) {
    return this.instancesService.deleteInstance(instanceId);
  }
}

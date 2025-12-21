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
  Req,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../common/guards/platform.guard';
import { PlatformUser } from '../../common/decorators/platform-user.decorator';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /**
   * Obtiene métricas globales del SaaS
   */
  @Get('metrics')
  async getGlobalMetrics() {
    return this.platformService.getGlobalMetrics();
  }

  /**
   * Lista todos los tenants con filtros
   */
  @Get('tenants')
  async listTenants(
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
    @Query('status') status?: string,
    @Query('planId') planId?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformService.listTenants(
      {
        status,
        planId,
        country,
        search,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Obtiene detalles de un tenant
   */
  @Get('tenants/:tenantId')
  async getTenantDetails(@Param('tenantId') tenantId: string) {
    return this.platformService.getTenantDetails(tenantId);
  }

  /**
   * Crea un nuevo tenant
   */
  @Post('tenants')
  async createTenant(
    @Body() dto: CreateTenantDto,
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
  ) {
    return this.platformService.createTenant(
      dto,
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Actualiza un tenant
   */
  @Put('tenants/:tenantId')
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
  ) {
    return this.platformService.updateTenant(
      tenantId,
      dto,
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Suspende un tenant
   */
  @Post('tenants/:tenantId/suspend')
  async suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body('reason') reason: string,
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
  ) {
    return this.platformService.suspendTenant(
      tenantId,
      reason,
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Reactiva un tenant
   */
  @Post('tenants/:tenantId/reactivate')
  async reactivateTenant(
    @Param('tenantId') tenantId: string,
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
  ) {
    return this.platformService.reactivateTenant(
      tenantId,
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Elimina un tenant
   */
  @Delete('tenants/:tenantId')
  async deleteTenant(
    @Param('tenantId') tenantId: string,
    @PlatformUser() platformUser: { userId: string },
    @Req() req: any,
  ) {
    return this.platformService.deleteTenant(
      tenantId,
      platformUser.userId,
      {
        ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    );
  }

  /**
   * Obtiene logs de auditoría
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.platformService.getAuditLogs({
      action,
      resourceType,
      resourceId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}

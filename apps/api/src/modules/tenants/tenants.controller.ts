import { Controller, Get, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

interface AuthenticatedUser {
  userId: string;
  email: string;
  name?: string;
  memberships?: unknown[];
}

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyTenants(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.findMyTenants(user.userId);
  }

  @Get('current')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  async getCurrentTenant(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant?: { id: string; role: string },
  ) {
    // Si TenantContextGuard adjuntó el tenant, usarlo
    if (tenant?.id) {
      return this.tenantsService.findCurrentTenant(user.userId, tenant.id);
    }

    // Fallback: usar tenantId del JWT si está disponible
    const tenantId = (user as any).tenantId;
    if (tenantId) {
      return this.tenantsService.findCurrentTenant(user.userId, tenantId);
    }

    // Si no hay tenant disponible, devolver el primero del usuario
    const myTenants = await this.tenantsService.findMyTenants(user.userId);
    if (myTenants.data && myTenants.data.length > 0) {
      const firstTenant = myTenants.data[0];
      return this.tenantsService.findCurrentTenant(user.userId, firstTenant.id);
    }

    throw new BadRequestException({
      success: false,
      error_key: 'tenants.no_tenant_available',
    });
  }
}


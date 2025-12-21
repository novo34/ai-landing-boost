import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { $Enums } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Lista todos los planes disponibles (público, sin auth)
   */
  @Get('plans')
  @Public()
  async getPlans() {
    return this.billingService.getPlans();
  }

  /**
   * Obtiene la información de suscripción del tenant actual
   */
  @Get('current')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getCurrentSubscription(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.billingService.getCurrentSubscription(tenant.id);
  }

  /**
   * Crea una checkout session de Stripe para suscribirse a un plan
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async createCheckout(
    @CurrentTenant() tenant: { id: string; role: string },
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(tenant.id, dto.planId);
  }

  /**
   * Crea una portal session de Stripe para gestionar la suscripción
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async createPortal(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.billingService.createPortalSession(tenant.id);
  }

  /**
   * Obtiene el uso actual del tenant (agentes, canales, mensajes)
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async getUsage(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.billingService.getUsage(tenant.id);
  }

  /**
   * Cancela la suscripción (marca para cancelar al final del período)
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.billingService.cancelSubscription(tenant.id);
  }

  /**
   * Reactiva una suscripción cancelada
   */
  @Post('reactivate')
  @UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.billingService.reactivateSubscription(tenant.id);
  }
}


import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitsGuard.name);

  constructor(
    private billingService: BillingService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    
    // Detectar recurso automáticamente desde la ruta
    let resource: 'agents' | 'channels' | null = null;
    const path = request.url || request.route?.path || '';
    
    if (path.includes('/agents') && request.method === 'POST') {
      resource = 'agents';
    } else if (path.includes('/channels') && request.method === 'POST') {
      resource = 'channels';
    }
    
    // También verificar si viene explícitamente en body o params
    if (!resource) {
      resource = request.body?.resource || request.params?.resource;
    }

    if (!tenant || !tenant.id) {
      return true; // Si no hay tenant, dejar pasar (otro guard lo validará)
    }

    // Verificar estado de suscripción (bloqueo por impago)
    const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId: tenant.id },
    });

    if (subscription) {
      // Bloquear si está bloqueada
      if (subscription.status === $Enums.tenantsubscription_status.BLOCKED || subscription.blockedAt) {
        throw new ForbiddenException({
          success: false,
          error_key: 'billing.subscription_blocked',
          message: 'Your subscription is blocked. Please update your payment method to continue.',
        });
      }

      // Verificar grace period si está en PAST_DUE
      if (subscription.status === $Enums.tenantsubscription_status.PAST_DUE) {
        if (subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt < new Date()) {
          throw new ForbiddenException({
            success: false,
            error_key: 'billing.grace_period_expired',
            message: 'Your grace period has expired. Please update your payment method to continue.',
          });
        }
      }
    }

    if (!resource || !['agents', 'channels'].includes(resource)) {
      return true; // Si no se especifica recurso, dejar pasar
    }

    const canCreate = await this.billingService.checkPlanLimits(tenant.id, resource);

    if (!canCreate) {
      throw new ForbiddenException({
        success: false,
        error_key: `billing.${resource}_limit_reached`,
        message: `You have reached the limit of ${resource} for your plan. Please upgrade to create more.`,
      });
    }

    return true;
  }
}


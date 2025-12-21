import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { $Enums } from '@prisma/client';

/**
 * Guard que verifica que el tenant tenga una suscripción activa y no bloqueada
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, TenantContextGuard, SubscriptionStatusGuard)
 */
@Injectable()
export class SubscriptionStatusGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionStatusGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // TenantContextGuard establece request.tenantId, no request.tenant
    const tenantId = request.tenant?.id || request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException({
        success: false,
        error_key: 'billing.tenant_not_found',
      });
    }

    // Obtener suscripción del tenant
    const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId: tenantId },
      include: {
        subscriptionplan: true,
      },
    });

    if (!subscription) {
      // Si no hay suscripción, permitir acceso (puede estar en trial o creándose)
      return true;
    }

    // Verificar si está bloqueada
    if (subscription.status === $Enums.tenantsubscription_status.BLOCKED) {
      throw new ForbiddenException({
        success: false,
        error_key: 'billing.subscription_blocked',
        message: 'Your subscription is blocked. Please update your payment method to continue.',
      });
    }

    // Verificar si tiene blockedAt
    if (subscription.blockedAt) {
      throw new ForbiddenException({
        success: false,
        error_key: 'billing.subscription_blocked',
        message: 'Your subscription is blocked. Please update your payment method to continue.',
      });
    }

    // Verificar grace period si está en PAST_DUE
    if (subscription.status === $Enums.tenantsubscription_status.PAST_DUE) {
      if (subscription.gracePeriodEndsAt && subscription.gracePeriodEndsAt < new Date()) {
        // Grace period expirado, bloquear
        throw new ForbiddenException({
          success: false,
          error_key: 'billing.grace_period_expired',
          message: 'Your grace period has expired. Please update your payment method to continue.',
        });
      }
      // Grace period activo, permitir acceso pero registrar warning
      this.logger.warn(`Tenant ${tenantId} accessing with PAST_DUE status (grace period active)`);
    }

    // Verificar si trial expiró
    if (subscription.status === $Enums.tenantsubscription_status.TRIAL) {
      if (subscription.trialEndsAt && subscription.trialEndsAt < new Date()) {
        throw new ForbiddenException({
          success: false,
          error_key: 'billing.trial_expired',
          message: 'Your trial has expired. Please subscribe to continue.',
        });
      }
    }

    return true;
  }
}

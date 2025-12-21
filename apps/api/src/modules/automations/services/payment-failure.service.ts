import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { N8nEventService } from '../../n8n-integration/services/n8n-event.service';
import { SubscriptionBlockingService } from './subscription-blocking.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio para gestionar pagos fallidos y grace periods
 * 
 * Jobs programados:
 * - Diario a las 10 AM: Verificar pagos fallidos y grace periods expirados
 */
@Injectable()
export class PaymentFailureService {
  private readonly logger = new Logger(PaymentFailureService.name);
  private readonly gracePeriodDays = parseInt(process.env.STRIPE_GRACE_PERIOD_DAYS || '7', 10);

  constructor(
    private prisma: PrismaService,
    private n8nEventService: N8nEventService,
    private blockingService: SubscriptionBlockingService,
  ) {}

  /**
   * Job diario para verificar pagos fallidos y grace periods
   * Se ejecuta todos los días a las 10:00 AM
   */
  @Cron('0 10 * * *') // 10:00 AM todos los días
  async handlePaymentFailures() {
    this.logger.log('Starting payment failure check...');

    try {
      await this.checkPaymentFailures();
      await this.handleGracePeriodExpired();
      await this.checkPaymentRecovered();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in payment failure job: ${errorMessage}`);
    }
  }

  /**
   * Verifica suscripciones con pagos fallidos y envía notificaciones
   */
  private async checkPaymentFailures(): Promise<void> {
    // Buscar suscripciones en estado PAST_DUE
        const pastDueSubscriptions = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.PAST_DUE,
        blockedAt: null, // Solo las que aún no están bloqueadas
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    for (const subscription of pastDueSubscriptions) {
      try {
        // Enviar notificación de pago fallido (si no se envió antes)
        await this.n8nEventService.emitPaymentFailed(subscription.tenantId, {
          subscriptionId: subscription.id,
          gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString(),
          daysRemaining: subscription.gracePeriodEndsAt
            ? Math.ceil(
                (subscription.gracePeriodEndsAt.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 0,
        });

        this.logger.warn(
          `Payment failure notification sent for tenant ${subscription.tenantId}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send payment failure notification for tenant ${subscription.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Maneja suscripciones cuyo grace period ha expirado
   */
  private async handleGracePeriodExpired(): Promise<void> {
    const now = new Date();

    // Buscar suscripciones en PAST_DUE cuyo grace period expiró
        const expiredGracePeriods = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.PAST_DUE,
        gracePeriodEndsAt: {
          lte: now,
        },
        blockedAt: null, // Solo las que aún no están bloqueadas
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    for (const subscription of expiredGracePeriods) {
      try {
        // Bloquear el tenant
        await this.blockingService.blockTenant(
          subscription.tenantId,
          'Grace period expired - payment failed',
        );

        // Actualizar suscripción
                await this.prisma.tenantsubscription.update({
          where: { id: subscription.id },
          data: {
            status: $Enums.tenantsubscription_status.BLOCKED,
            blockedAt: now,
          },
        });

        this.logger.warn(
          `Grace period expired for tenant ${subscription.tenantId}. Tenant blocked.`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to handle expired grace period for tenant ${subscription.tenantId}: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Verifica si hay suscripciones bloqueadas que se han recuperado (pago exitoso)
   */
  private async checkPaymentRecovered(): Promise<void> {
    // Buscar suscripciones bloqueadas que tienen lastPaymentAt reciente
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recoveredSubscriptions = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.BLOCKED,
        lastPaymentAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    for (const subscription of recoveredSubscriptions) {
      try {
        // Verificar que el pago fue exitoso (status debería ser ACTIVE)
        // Si lastPaymentAt es reciente, asumimos que el pago fue exitoso
                const currentSubscription = await this.prisma.tenantsubscription.findUnique({
          where: { id: subscription.id },
        });

        if (currentSubscription && currentSubscription.status === $Enums.tenantsubscription_status.ACTIVE) {
          // Desbloquear el tenant
          await this.blockingService.unblockTenant(subscription.tenantId);

          this.logger.log(
            `Payment recovered for tenant ${subscription.tenantId}. Tenant unblocked.`,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to handle payment recovery for tenant ${subscription.tenantId}: ${errorMessage}`,
        );
      }
    }
  }
}


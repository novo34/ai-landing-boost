import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { N8nEventService } from '../../n8n-integration/services/n8n-event.service';
import { SubscriptionBlockingService } from './subscription-blocking.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio para gestionar la expiración de trials
 * 
 * Jobs programados:
 * - Diario a las 9 AM: Verificar trials expirando y expirados
 */
@Injectable()
export class TrialExpirationService {
  private readonly logger = new Logger(TrialExpirationService.name);
  private readonly trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '14', 10);

  constructor(
    private prisma: PrismaService,
    private n8nEventService: N8nEventService,
    private blockingService: SubscriptionBlockingService,
  ) {}

  /**
   * Job diario para verificar trials expirando y expirados
   * Se ejecuta todos los días a las 9:00 AM
   */
  @Cron('0 9 * * *') // 9:00 AM todos los días
  async handleTrialExpiration() {
    this.logger.log('Starting trial expiration check...');

    try {
      await this.checkExpiringTrials();
      await this.handleExpiredTrials();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in trial expiration job: ${errorMessage}`);
    }
  }

  /**
   * Verifica trials que están por expirar y envía notificaciones
   */
  private async checkExpiringTrials(): Promise<void> {
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Buscar suscripciones en trial que expiran en 3 días
        const expiringIn3Days = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.TRIAL,
        trialEndsAt: {
          gte: threeDaysFromNow,
          lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000), // Próximas 24 horas
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

    // Buscar suscripciones en trial que expiran en 1 día
        const expiringIn1Day = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.TRIAL,
        trialEndsAt: {
          gte: oneDayFromNow,
          lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
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

    // Enviar notificaciones para trials expirando en 3 días
    for (const subscription of expiringIn3Days) {
      if (!subscription.trialEndsAt) continue;

      const daysRemaining = Math.ceil(
        (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      try {
        await this.n8nEventService.emitTrialExpiring(subscription.tenantId, {
          subscriptionId: subscription.id,
          trialEndsAt: subscription.trialEndsAt.toISOString(),
          daysRemaining,
        });

        this.logger.log(
          `Trial expiring notification sent for tenant ${subscription.tenantId} (${daysRemaining} days remaining)`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send trial expiring notification for tenant ${subscription.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Enviar notificaciones urgentes para trials expirando en 1 día
    for (const subscription of expiringIn1Day) {
      if (!subscription.trialEndsAt) continue;

      const daysRemaining = Math.ceil(
        (subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      try {
        await this.n8nEventService.emitTrialExpiring(subscription.tenantId, {
          subscriptionId: subscription.id,
          trialEndsAt: subscription.trialEndsAt.toISOString(),
          daysRemaining,
          urgent: true,
        });

        this.logger.log(
          `Urgent trial expiring notification sent for tenant ${subscription.tenantId} (${daysRemaining} days remaining)`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to send urgent trial expiring notification for tenant ${subscription.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * Maneja trials que ya han expirado
   */
  private async handleExpiredTrials(): Promise<void> {
    const now = new Date();

    // Buscar suscripciones en trial que ya expiraron
        const expiredTrials = await this.prisma.tenantsubscription.findMany({
      where: {
        status: $Enums.tenantsubscription_status.TRIAL,
        trialEndsAt: {
          lte: now,
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

    for (const subscription of expiredTrials) {
      try {
        // Marcar como TRIAL_EXPIRED
                await this.prisma.tenantsubscription.update({
          where: { id: subscription.id },
          data: {
            status: $Enums.tenantsubscription_status.TRIAL_EXPIRED,
          },
        });

        // Bloquear el tenant si no hay suscripción activa
        await this.blockingService.blockTenant(
          subscription.tenantId,
          'Trial expired without active subscription',
        );

        this.logger.warn(
          `Trial expired for tenant ${subscription.tenantId}. Tenant blocked.`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to handle expired trial for tenant ${subscription.tenantId}: ${errorMessage}`,
        );
      }
    }
  }
}


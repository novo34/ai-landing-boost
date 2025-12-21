import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { $Enums } from '@prisma/client';

/**
 * Servicio para bloquear y desbloquear tenants según el estado de suscripción
 */
@Injectable()
export class SubscriptionBlockingService {
  private readonly logger = new Logger(SubscriptionBlockingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Bloquea un tenant y aplica restricciones
   */
  async blockTenant(tenantId: string, reason: string): Promise<void> {
    try {
      // Actualizar estado del tenant a SUSPENDED
            await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: $Enums.tenant_status.SUSPENDED,
        },
      });

      // Actualizar suscripción a BLOCKED
            const subscription = await this.prisma.tenantsubscription.findUnique({
        where: { tenantId },
      });

      if (subscription) {
                await this.prisma.tenantsubscription.update({
          where: { id: subscription.id },
          data: {
            status: $Enums.tenantsubscription_status.BLOCKED,
            blockedAt: new Date(),
          },
        });
      }

      this.logger.warn(`Tenant ${tenantId} blocked. Reason: ${reason}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to block tenant ${tenantId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Desbloquea un tenant y restaura funcionalidades
   */
  async unblockTenant(tenantId: string): Promise<void> {
    try {
      // Actualizar estado del tenant a ACTIVE
            await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: $Enums.tenant_status.ACTIVE,
        },
      });

      // Actualizar suscripción según el estado real
            const subscription = await this.prisma.tenantsubscription.findUnique({
        where: { tenantId },
      });

      if (subscription) {
        // Determinar el estado correcto de la suscripción
        let newStatus: $Enums.tenantsubscription_status = $Enums.tenantsubscription_status.ACTIVE;
        
        if (subscription.trialEndsAt && subscription.trialEndsAt > new Date()) {
          newStatus = $Enums.tenantsubscription_status.TRIAL;
        } else if (subscription.trialEndsAt && subscription.trialEndsAt <= new Date()) {
          newStatus = $Enums.tenantsubscription_status.TRIAL_EXPIRED;
        }

                await this.prisma.tenantsubscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            blockedAt: null,
            gracePeriodEndsAt: null,
          },
        });
      }

      this.logger.log(`Tenant ${tenantId} unblocked and restored`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to unblock tenant ${tenantId}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Verifica si un tenant está bloqueado
   */
  async isBlocked(tenantId: string): Promise<boolean> {
    try {
            const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true },
      });

      if (!tenant) {
        return false;
      }

      return tenant.status === $Enums.tenant_status.SUSPENDED;
    } catch (error) {
      this.logger.error(`Failed to check if tenant ${tenantId} is blocked: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Aplica restricciones a un tenant bloqueado
   * Por ahora solo actualiza el estado, pero puede extenderse para:
   * - Limitar número de mensajes
   * - Desactivar agentes
   * - Bloquear creación de nuevos recursos
   */
  async applyRestrictions(tenantId: string): Promise<void> {
    const isBlocked = await this.isBlocked(tenantId);
    
    if (!isBlocked) {
      return; // No aplicar restricciones si no está bloqueado
    }

    // Aquí se pueden agregar restricciones adicionales:
    // - Desactivar agentes automáticamente
    // - Limitar envío de mensajes
    // - Bloquear creación de nuevos recursos
    
    this.logger.debug(`Restrictions applied to tenant ${tenantId}`);
  }
}


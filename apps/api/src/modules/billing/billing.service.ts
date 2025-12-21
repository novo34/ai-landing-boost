import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Obtiene todos los planes de suscripción disponibles
   */
  async getPlans() {
        const plans = await this.prisma.subscriptionplan.findMany({
      orderBy: { priceCents: 'asc' },
    });

    return {
      success: true,
      data: plans,
    };
  }

  /**
   * Obtiene la información de suscripción del tenant actual
   */
  async getCurrentSubscription(tenantId: string) {
        const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId },
      include: {
        subscriptionplan: true,
      },
    });

    // Si no hay suscripción, crear una de prueba (trial)
    if (!subscription) {
      // Buscar el plan más básico o crear uno por defecto
            let plan = await this.prisma.subscriptionplan.findFirst({
        orderBy: { priceCents: 'asc' },
      });

      if (!plan) {
        // Crear un plan básico por defecto si no existe ninguno
                plan = await this.prisma.subscriptionplan.create({
          data: createData({
            name: 'Starter',
            slug: 'starter',
            description: 'Plan básico para empezar',
            currency: 'EUR',
            priceCents: 2900, // 29 EUR
            interval: 'MONTHLY',
            maxAgents: 1,
            maxChannels: 2,
          }),
        });
      }

      // Obtener el tenant para determinar el país
            const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'tenants.not_found',
        });
      }

      // Crear suscripción de prueba
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 días de prueba

            const newSubscription = await this.prisma.tenantsubscription.create({
        data: createData({
          tenantId,
          planId: plan.id,
          status: 'TRIAL',
          trialEndsAt,
          country: tenant.country || 'ES',
        }),
        include: {
          subscriptionplan: true,
        },
      });

      return {
        success: true,
        data: {
          subscription: newSubscription,
          isTrial: true,
          daysLeftInTrial: this.calculateDaysLeft(trialEndsAt),
        },
      };
    }

    // Calcular días restantes en trial si está en trial
    const isTrial = subscription.status === 'TRIAL' && subscription.trialEndsAt;
    const daysLeftInTrial = isTrial && subscription.trialEndsAt
      ? this.calculateDaysLeft(subscription.trialEndsAt)
      : null;

    return {
      success: true,
      data: {
        subscription,
        isTrial: !!isTrial,
        daysLeftInTrial,
      },
    };
  }

  /**
   * Calcula los días restantes hasta una fecha
   */
  private calculateDaysLeft(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }

  /**
   * Crea una checkout session de Stripe para suscribirse a un plan
   */
  async createCheckoutSession(tenantId: string, planId: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/app/billing?success=true`;
    const cancelUrl = `${frontendUrl}/app/billing?canceled=true`;

    const session = await this.stripeService.createCheckoutSession(
      tenantId,
      planId,
      successUrl,
      cancelUrl,
    );

    return {
      success: true,
      data: { checkoutUrl: session.url },
    };
  }

  /**
   * Crea una portal session de Stripe para gestionar la suscripción
   */
  async createPortalSession(tenantId: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${frontendUrl}/app/billing`;

    const session = await this.stripeService.createPortalSession(tenantId, returnUrl);

    return {
      success: true,
      data: { portalUrl: session.url },
    };
  }

  /**
   * Obtiene el uso actual del tenant (agentes, canales, mensajes)
   */
  async getUsage(tenantId: string) {
    const subscriptionResult = await this.getCurrentSubscription(tenantId);
    const plan = subscriptionResult.data.subscription.subscriptionplan;

    // Contar agentes activos
    const agentsCount = await this.prisma.agent.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    // Contar canales activos
    const channelsCount = await this.prisma.channel.count({
      where: { tenantId, status: 'ACTIVE' },
    });

    // Contar mensajes del mes actual (cuando exista el modelo Message)
    // Por ahora retornamos 0
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const messagesCount = 0;
    // const messagesCount = await this.prisma.message.count({
    //   where: {
    //     conversation: { tenantId },
    //     createdAt: { gte: startOfMonth },
    //   },
    // });

    return {
      success: true,
      data: {
        agents: {
          current: agentsCount,
          limit: plan.maxAgents || null,
          percentage: plan.maxAgents ? (agentsCount / plan.maxAgents) * 100 : 0,
        },
        channels: {
          current: channelsCount,
          limit: plan.maxChannels || null,
          percentage: plan.maxChannels ? (channelsCount / plan.maxChannels) * 100 : 0,
        },
        message: {
          current: messagesCount,
          limit: null, // Futuro
        },
      },
    };
  }

  /**
   * Verifica si el tenant puede crear un recurso según los límites del plan
   */
  async checkPlanLimits(tenantId: string, resource: 'agents' | 'channels'): Promise<boolean> {
    const subscriptionResult = await this.getCurrentSubscription(tenantId);
    const plan = subscriptionResult.data.subscription.subscriptionplan;
    const usage = await this.getUsage(tenantId);

    let limitReached = false;

    if (resource === 'agents') {
      const limit = plan.maxAgents;
      if (limit && usage.data.agents.current >= limit) {
        limitReached = true;
      }
    }

    if (resource === 'channels') {
      const limit = plan.maxChannels;
      if (limit && usage.data.channels.current >= limit) {
        limitReached = true;
      }
    }

    // Notificar si se alcanzó el límite
    if (limitReached) {
      try {
        const memberships = await this.prisma.tenantmembership.findMany({
          where: {
            tenantId,
            role: { in: ['OWNER', 'ADMIN'] },
          },
          select: { userId: true },
        });

        for (const membership of memberships) {
          await this.notificationsService.createNotification(
            tenantId,
            membership.userId,
            $Enums.notification_type.BILLING_LIMIT_REACHED,
            'notifications.billing.limit_reached',
            `notifications.billing.limit_reached_description_${resource}`,
            '/app/billing',
            {
              resource,
              limit: resource === 'agents' ? plan.maxAgents : plan.maxChannels,
              current: resource === 'agents' ? usage.data.agents.current : usage.data.channels.current,
            },
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to send limit reached notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return !limitReached;
  }

  /**
   * Cancela la suscripción (marca para cancelar al final del período)
   */
  async cancelSubscription(tenantId: string) {
    await this.stripeService.cancelSubscription(tenantId);

    // Notificar cancelación
    try {
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { userId: true },
      });

      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantId,
          membership.userId,
          $Enums.notification_type.BILLING_SUBSCRIPTION_CANCELLED,
          'notifications.billing.subscription_cancelled',
          'notifications.billing.subscription_cancelled_description',
          '/app/billing',
          {},
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send cancellation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
    };
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(tenantId: string) {
    await this.stripeService.reactivateSubscription(tenantId);

    return {
      success: true,
      message: 'Subscription reactivated successfully',
    };
  }
}


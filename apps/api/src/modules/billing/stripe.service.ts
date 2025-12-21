import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { N8nEventService } from '../n8n-integration/services/n8n-event.service';
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private n8nEventService: N8nEventService,
    private notificationsService: NotificationsService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('⚠️ STRIPE_SECRET_KEY not configured. Stripe features will be disabled.');
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async createCheckoutSession(
    tenantId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new BadRequestException({
        success: false,
        error_key: 'billing.stripe_not_configured',
      });
    }

        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        const plan = await this.prisma.subscriptionplan.findUnique({ where: { id: planId } });

    if (!tenant || !plan) {
      throw new NotFoundException({
        success: false,
        error_key: 'billing.tenant_or_plan_not_found',
      });
    }

    // Crear o obtener Stripe Customer
    const customerId = await this.getOrCreateStripeCustomer(tenantId, tenant);

    // Crear checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.name,
              description: plan.description || '',
            },
            unit_amount: plan.priceCents,
            recurring: {
              interval: plan.interval === 'MONTHLY' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId,
        planId,
      },
    });

    return session;
  }

  async createPortalSession(tenantId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    if (!this.stripe) {
      throw new BadRequestException({
        success: false,
        error_key: 'billing.stripe_not_configured',
      });
    }

        const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new BadRequestException({
        success: false,
        error_key: 'billing.no_active_subscription',
      });
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async getOrCreateStripeCustomer(tenantId: string, tenant: { id: string; name: string }): Promise<string> {
        const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId },
    });

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Crear customer en Stripe
    const customer = await this.stripe.customers.create({
      metadata: {
        tenantId,
      },
    });

    // Guardar customer ID
    if (subscription) {
            await this.prisma.tenantsubscription.update({
        where: { tenantId },
        data: { stripeCustomerId: customer.id },
      });
    }

    return customer.id;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;

    if (!tenantId || !planId) {
      this.logger.warn('Checkout session completed without tenantId or planId in metadata');
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);

        await this.prisma.tenantsubscription.update({
      where: { tenantId },
      data: {
        planId,
        status: subscription.status === 'active' ? $Enums.tenantsubscription_status.ACTIVE : $Enums.tenantsubscription_status.TRIAL,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        lastPaymentAt: new Date(),
      },
    });

    this.logger.log(`✅ Checkout completed for tenant ${tenantId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const tenantSubscription = await this.prisma.tenantsubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!tenantSubscription) {
      this.logger.warn(`Subscription ${subscription.id} not found in database`);
      return;
    }

        await this.prisma.tenantsubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    this.logger.log(`✅ Subscription updated for tenant ${tenantSubscription.tenantId}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const tenantSubscription = await this.prisma.tenantsubscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!tenantSubscription) {
      return;
    }

        await this.prisma.tenantsubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: $Enums.tenantsubscription_status.CANCELLED,
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`✅ Subscription cancelled for tenant ${tenantSubscription.tenantId}`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

        const tenantSubscription = await this.prisma.tenantsubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!tenantSubscription) {
      return;
    }

    // Si estaba bloqueado, reactivar
        await this.prisma.tenantsubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: $Enums.tenantsubscription_status.ACTIVE,
        lastPaymentAt: new Date(),
        blockedAt: null,
        gracePeriodEndsAt: null,
      },
    });

    this.logger.log(`✅ Payment succeeded for tenant ${tenantSubscription.tenantId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

        const tenantSubscription = await this.prisma.tenantsubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!tenantSubscription) {
      return;
    }

    const gracePeriodDays = parseInt(process.env.STRIPE_GRACE_PERIOD_DAYS || '7', 10);
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + gracePeriodDays);

        await this.prisma.tenantsubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: $Enums.tenantsubscription_status.PAST_DUE,
        gracePeriodEndsAt,
      },
    });

    this.logger.warn(`⚠️ Payment failed for tenant ${tenantSubscription.tenantId}. Grace period until ${gracePeriodEndsAt}`);

    // Notificar a OWNER y ADMIN sobre fallo de pago
    try {
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId: tenantSubscription.tenantId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { userId: true },
      });

      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantSubscription.tenantId,
          membership.userId,
          $Enums.notification_type.BILLING_PAYMENT_FAILED,
          'notifications.billing.payment_failed',
          'notifications.billing.payment_failed_description',
          '/app/billing',
          {
            invoiceId: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
          },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to send payment failure notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Emitir evento de pago fallido a n8n
    try {
      await this.n8nEventService.emitPaymentFailed(tenantSubscription.tenantId, {
        subscriptionId: tenantSubscription.id,
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn(`Failed to emit payment_failed event to n8n: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapStripeStatus(status: string): $Enums.tenantsubscription_status {
    const mapping: Record<string, $Enums.tenantsubscription_status> = {
      active: $Enums.tenantsubscription_status.ACTIVE,
      trialing: $Enums.tenantsubscription_status.TRIAL,
      past_due: $Enums.tenantsubscription_status.PAST_DUE,
      canceled: $Enums.tenantsubscription_status.CANCELLED,
      unpaid: $Enums.tenantsubscription_status.BLOCKED,
    };
    return mapping[status] || $Enums.tenantsubscription_status.ACTIVE;
  }

  /**
   * Cancela una suscripción (marca para cancelar al final del período)
   */
  async cancelSubscription(tenantId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException({
        success: false,
        error_key: 'billing.stripe_not_configured',
      });
    }

    const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException({
        success: false,
        error_key: 'billing.subscription_not_found',
      });
    }

    // Cancelar suscripción en Stripe (cancel_at_period_end = true)
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Actualizar en BD
    await this.prisma.tenantsubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    this.logger.log(`✅ Subscription marked for cancellation at period end for tenant ${tenantId}`);
  }

  /**
   * Reactiva una suscripción cancelada
   */
  async reactivateSubscription(tenantId: string): Promise<void> {
    if (!this.stripe) {
      throw new BadRequestException({
        success: false,
        error_key: 'billing.stripe_not_configured',
      });
    }

    const subscription = await this.prisma.tenantsubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException({
        success: false,
        error_key: 'billing.subscription_not_found',
      });
    }

    // Reactivar suscripción en Stripe (cancel_at_period_end = false)
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Actualizar en BD
    await this.prisma.tenantsubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        status: $Enums.tenantsubscription_status.ACTIVE,
      },
    });

    this.logger.log(`✅ Subscription reactivated for tenant ${tenantId}`);
  }

  // Método público para validar webhook signature
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}


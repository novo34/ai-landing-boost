# AI-SPEC-08: Integración Stripe Completa

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-08  
> **Prioridad:** 🔴 CRÍTICA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── billing/
│   │   ├── billing.module.ts                    [MODIFICAR]
│   │   ├── billing.service.ts                   [MODIFICAR]
│   │   ├── billing.controller.ts                [MODIFICAR]
│   │   ├── stripe.service.ts                    [CREAR]
│   │   ├── webhooks/
│   │   │   └── stripe-webhook.controller.ts    [CREAR]
│   │   └── guards/
│   │       └── plan-limits.guard.ts             [CREAR]
└── prisma/
    └── schema.prisma                             [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar campos y estados adicionales

```prisma
// Modificar enum
enum SubscriptionStatus {
  TRIAL
  TRIAL_EXPIRED
  ACTIVE
  PAST_DUE
  CANCELLED
  BLOCKED
}

// Modificar TenantSubscription
model TenantSubscription {
  // ... campos existentes
  gracePeriodEndsAt DateTime?  // Fecha fin de grace period
  blockedAt        DateTime?  // Fecha de bloqueo
  lastPaymentAt    DateTime?  // Último pago exitoso
  nextBillingDate  DateTime?  // Próxima facturación
}
```

---

### 2. Crear Stripe Service

**Archivo:** `apps/api/src/modules/billing/stripe.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async createCheckoutSession(tenantId: string, planId: string, successUrl: string, cancelUrl: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    
    if (!tenant || !plan) {
      throw new NotFoundException('Tenant or plan not found');
    }

    // Crear o obtener Stripe Customer
    let customerId = await this.getOrCreateStripeCustomer(tenantId, tenant);

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

  async createPortalSession(tenantId: string, returnUrl: string) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new BadRequestException('No active subscription with Stripe');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
  }

  async handleWebhookEvent(event: Stripe.Event) {
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
    }
  }

  private async getOrCreateStripeCustomer(tenantId: string, tenant: any): Promise<string> {
    const subscription = await this.prisma.tenantSubscription.findUnique({
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
    await this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    const planId = session.metadata?.planId;

    if (!tenantId || !planId) return;

    const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);

    await this.prisma.tenantSubscription.update({
      where: { tenantId },
      data: {
        planId,
        status: subscription.status === 'active' ? 'ACTIVE' : 'TRIAL',
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        lastPaymentAt: new Date(),
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const tenantSubscription = await this.prisma.tenantSubscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!tenantSubscription) return;

    await this.prisma.tenantSubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    const tenantSubscription = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!tenantSubscription) return;

    // Si estaba bloqueado, reactivar
    await this.prisma.tenantSubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: 'ACTIVE',
        lastPaymentAt: new Date(),
        blockedAt: null,
        gracePeriodEndsAt: null,
      },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    const tenantSubscription = await this.prisma.tenantSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!tenantSubscription) return;

    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + parseInt(process.env.STRIPE_GRACE_PERIOD_DAYS || '7'));

    await this.prisma.tenantSubscription.update({
      where: { id: tenantSubscription.id },
      data: {
        status: 'PAST_DUE',
        gracePeriodEndsAt,
      },
    });
  }

  private mapStripeStatus(status: string): SubscriptionStatus {
    const mapping = {
      'active': 'ACTIVE',
      'trialing': 'TRIAL',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELLED',
      'unpaid': 'BLOCKED',
    };
    return mapping[status] || 'ACTIVE';
  }
}
```

---

### 3. Modificar Billing Service

**Archivo:** `apps/api/src/modules/billing/billing.service.ts`

**Acción:** Agregar métodos para checkout, portal, usage, y restricciones

```typescript
// Agregar al constructor
constructor(
  private prisma: PrismaService,
  private stripeService: StripeService,
) {}

// Agregar métodos nuevos
async createCheckoutSession(tenantId: string, planId: string) {
  const successUrl = `${process.env.FRONTEND_URL}/app/billing?success=true`;
  const cancelUrl = `${process.env.FRONTEND_URL}/app/billing?canceled=true`;
  
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

async createPortalSession(tenantId: string) {
  const returnUrl = `${process.env.FRONTEND_URL}/app/billing`;
  
  const session = await this.stripeService.createPortalSession(tenantId, returnUrl);

  return {
    success: true,
    data: { portalUrl: session.url },
  };
}

async getUsage(tenantId: string) {
  const subscription = await this.getCurrentSubscription(tenantId);
  const plan = subscription.data.subscription.plan;

  // Contar agentes activos
  const agentsCount = await this.prisma.agent.count({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
  });

  // Contar canales activos
  const channelsCount = await this.prisma.channel.count({
    where: {
      tenantId,
      status: 'ACTIVE',
    },
  });

  // Contar mensajes del mes actual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const messagesCount = await this.prisma.message.count({
    where: {
      conversation: {
        tenantId,
      },
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

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
      messages: {
        current: messagesCount,
        limit: null, // Futuro
      },
    },
  };
}

async checkPlanLimits(tenantId: string, resource: 'agents' | 'channels'): Promise<boolean> {
  const subscription = await this.getCurrentSubscription(tenantId);
  const plan = subscription.data.subscription.plan;
  const usage = await this.getUsage(tenantId);

  if (resource === 'agents') {
    const limit = plan.maxAgents;
    if (limit && usage.data.agents.current >= limit) {
      return false;
    }
  }

  if (resource === 'channels') {
    const limit = plan.maxChannels;
    if (limit && usage.data.channels.current >= limit) {
      return false;
    }
  }

  return true;
}
```

---

### 4. Crear Stripe Webhook Controller

**Archivo:** `apps/api/src/modules/billing/webhooks/stripe-webhook.controller.ts`

```typescript
import { Controller, Post, Req, Res, Headers, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { StripeService } from '../stripe.service';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private stripeService: StripeService) {}

  @Post()
  @Public()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    await this.stripeService.handleWebhookEvent(event);

    res.json({ received: true });
  }
}
```

---

### 5. Crear Plan Limits Guard

**Archivo:** `apps/api/src/modules/billing/guards/plan-limits.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(private billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const resource = request.body?.resource || request.params?.resource;

    if (!resource || !['agents', 'channels'].includes(resource)) {
      return true;
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
```

---

## Tablas Prisma

Ver sección "1. Modificar Prisma Schema" arriba.

---

## DTOs

### CreateCheckoutDto

**Archivo:** `apps/api/src/modules/billing/dto/create-checkout.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}
```

---

## Controllers

Modificar `billing.controller.ts` para agregar endpoints nuevos:

```typescript
@Post('checkout')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async createCheckout(@CurrentTenant() tenant: any, @Body() dto: CreateCheckoutDto) {
  return this.billingService.createCheckoutSession(tenant.id, dto.planId);
}

@Post('portal')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async createPortal(@CurrentTenant() tenant: any) {
  return this.billingService.createPortalSession(tenant.id);
}

@Get('usage')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async getUsage(@CurrentTenant() tenant: any) {
  return this.billingService.getUsage(tenant.id);
}
```

---

## Services

Ver secciones 2 y 3 arriba.

---

## Guards

Ver sección 5 arriba.

---

## Validaciones

- **Webhook signature:** Validar siempre con `stripe.webhooks.constructEvent`
- **Checkout session:** Validar que plan existe y tenant tiene permisos
- **Portal session:** Validar que hay suscripción activa con Stripe
- **Plan limits:** Validar antes de crear agentes/canales

---

## Errores Esperados

```typescript
- 'billing.plan_not_found'
- 'billing.no_active_subscription'
- 'billing.stripe_error'
- 'billing.agents_limit_reached'
- 'billing.channels_limit_reached'
- 'billing.webhook_signature_invalid'
```

---

## Test Plan

### Unit Tests

1. **StripeService:**
   - `createCheckoutSession` crea session correctamente
   - `createPortalSession` crea portal session
   - `handleWebhookEvent` procesa eventos correctamente
   - `mapStripeStatus` mapea estados correctamente

2. **BillingService:**
   - `getUsage` calcula uso correctamente
   - `checkPlanLimits` valida límites correctamente
   - `createCheckoutSession` valida permisos

### Integration Tests

1. **Flujo completo checkout:**
   - Mock Stripe API
   - Crear checkout session
   - Simular webhook de éxito
   - Verificar suscripción actualizada

2. **Flujo completo impago:**
   - Simular webhook de pago fallido
   - Verificar estado PAST_DUE
   - Simular grace period
   - Verificar bloqueo después de grace period

---

## Checklist Final

- [ ] Prisma schema actualizado
- [ ] Migración Prisma creada
- [ ] StripeService implementado
- [ ] BillingService actualizado
- [ ] StripeWebhookController creado
- [ ] PlanLimitsGuard creado
- [ ] DTOs creados
- [ ] Variables de entorno documentadas
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Frontend actualizado con checkout/portal
- [ ] Frontend muestra límites y uso
- [ ] Webhook endpoint configurado en Stripe Dashboard

---

## Dependencias de Paquetes

```json
{
  "dependencies": {
    "stripe": "^14.0.0"
  },
  "devDependencies": {
    "@types/stripe": "^8.0.0"
  }
}
```

---

## Notas de Implementación

- **Raw body:** Next.js/Express necesita configurar raw body para webhooks
- **Idempotencia:** Usar `idempotency_key` o verificar eventos duplicados
- **Testing:** Usar Stripe CLI para testing local de webhooks
- **Error handling:** Manejar todos los errores de Stripe gracefully

---

**Última actualización:** 2025-01-XX








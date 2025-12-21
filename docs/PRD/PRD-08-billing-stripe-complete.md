# PRD-08: Billing Stripe Completo (Webhooks, Checkout, Portal, Impagos)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente  
> **Bloque:** A - Fundamentos  
> **Dependencias:** PRD-03, PRD-06

---

## Objetivo

Completar la integración con Stripe para permitir pagos reales, gestión de suscripciones, webhooks para sincronización de estados, y sistema de restricciones automáticas por plan e impago.

---

## Alcance INCLUIDO

- ✅ Integración completa con Stripe API
- ✅ Creación de Checkout Sessions para suscripciones
- ✅ Stripe Customer Portal para gestión de pagos
- ✅ Webhooks de Stripe para sincronización de eventos
- ✅ Manejo de estados de suscripción (active, trialing, past_due, canceled)
- ✅ Sistema de restricciones por plan (maxAgents, maxChannels)
- ✅ Bloqueo automático por impago
- ✅ Reactivación automática al regularizar pago
- ✅ Soporte para EUR y CHF
- ✅ UI para upgrade/downgrade de planes
- ✅ UI para gestión de método de pago

---

## Alcance EXCLUIDO

- ❌ Facturas detalladas (Stripe las genera automáticamente)
- ❌ Múltiples métodos de pago simultáneos (Stripe maneja esto)
- ❌ Descuentos y cupones (queda para futuro)
- ❌ Add-ons y productos adicionales (queda para futuro)
- ❌ Facturación proforma (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Checkout Session para Suscripciones

**Descripción:** Los usuarios deben poder iniciar un checkout de Stripe para suscribirse a un plan.

**Flujo:**
1. Usuario (OWNER/ADMIN) accede a página de billing
2. Selecciona un plan y hace clic en "Suscribirse" o "Upgrade"
3. Backend crea Checkout Session de Stripe
4. Usuario es redirigido a Stripe Checkout
5. Usuario completa pago en Stripe
6. Stripe redirige a success/cancel URL
7. Webhook de Stripe notifica al backend
8. Backend actualiza suscripción y crea/actualiza Stripe Customer

**Validaciones:**
- Solo OWNER/ADMIN puede iniciar checkout
- Plan debe existir y estar activo
- Si ya hay suscripción activa, se maneja upgrade/downgrade

---

### RF-02: Stripe Customer Portal

**Descripción:** Los usuarios deben poder gestionar su método de pago, ver facturas, y cancelar suscripción desde el portal de Stripe.

**Flujo:**
1. Usuario hace clic en "Gestionar suscripción" en billing page
2. Backend crea Portal Session de Stripe
3. Usuario es redirigido a Stripe Customer Portal
4. Usuario puede:
   - Actualizar método de pago
   - Ver historial de facturas
   - Cancelar suscripción (con opción de cancelar al final del período)
   - Reactivar suscripción cancelada
5. Usuario es redirigido de vuelta a la app

---

### RF-03: Webhooks de Stripe

**Descripción:** El sistema debe procesar eventos de Stripe para mantener sincronizada la suscripción.

**Eventos a manejar:**
- `checkout.session.completed` → Suscripción creada/activada
- `customer.subscription.created` → Suscripción creada
- `customer.subscription.updated` → Suscripción actualizada (upgrade/downgrade)
- `customer.subscription.deleted` → Suscripción cancelada
- `invoice.payment_succeeded` → Pago exitoso
- `invoice.payment_failed` → Pago fallido (marcar como past_due)
- `customer.subscription.trial_will_end` → Trial por expirar (notificación)

**Flujo:**
1. Stripe envía webhook a endpoint `/webhooks/stripe`
2. Backend valida firma del webhook (importante para seguridad)
3. Backend procesa evento según tipo
4. Backend actualiza `TenantSubscription` en BD
5. Backend puede enviar evento a n8n si está configurado

---

### RF-04: Restricciones por Plan

**Descripción:** El sistema debe validar y aplicar límites según el plan de suscripción.

**Límites a validar:**
- `maxAgents` → Número máximo de agentes activos
- `maxChannels` → Número máximo de canales configurados
- `maxMessages` → Límite de mensajes por mes (opcional, futuro)

**Validaciones:**
- Al crear agente → Verificar que no se excede `maxAgents`
- Al crear canal → Verificar que no se excede `maxChannels`
- Middleware/interceptor que valida límites antes de crear recursos

**Comportamiento:**
- Si se excede límite → Error 403 con mensaje claro
- UI muestra límites actuales y uso
- UI muestra advertencia cuando se acerca al límite (80%)

---

### RF-05: Bloqueo por Impago

**Descripción:** Si una suscripción está en `past_due` por cierto tiempo, se deben aplicar restricciones automáticas.

**Flujo:**
1. Webhook `invoice.payment_failed` marca suscripción como `PAST_DUE`
2. Sistema inicia "grace period" (configurable, default 7 días)
3. Durante grace period:
   - Usuario puede seguir usando el sistema normalmente
   - Se envían notificaciones de pago pendiente
4. Después de grace period:
   - Bloquear creación de nuevos agentes
   - Bloquear creación de nuevos canales
   - Limitar envío de mensajes automáticos (solo respuestas simples)
   - Mostrar banner de advertencia en UI
5. Si se regulariza pago:
   - Webhook `invoice.payment_succeeded` marca como `ACTIVE`
   - Se eliminan todas las restricciones
   - Sistema vuelve a funcionar normalmente

---

### RF-06: Gestión de Trial

**Descripción:** El sistema debe manejar correctamente la transición de trial a suscripción pagada.

**Flujo:**
1. Usuario se registra → Se crea suscripción con status `TRIAL`
2. Durante trial:
   - Usuario puede usar el sistema completamente
   - Se muestran notificaciones de días restantes
3. Al expirar trial:
   - Si no hay método de pago → Marcar como `TRIAL_EXPIRED`
   - Aplicar restricciones (similar a impago)
   - Permitir checkout para activar suscripción
4. Si usuario se suscribe durante trial:
   - Webhook actualiza suscripción a `ACTIVE`
   - Trial termina inmediatamente
   - Período de facturación comienza

---

## Requisitos Técnicos

### RT-01: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...  # o sk_live_... en producción
STRIPE_PUBLISHABLE_KEY=pk_test_...  # o pk_live_... en producción
STRIPE_WEBHOOK_SECRET=whsec_...  # Secret del webhook endpoint
STRIPE_WEBHOOK_ENDPOINT=/api/v1/webhooks/stripe

# Configuración
STRIPE_GRACE_PERIOD_DAYS=7  # Días de gracia antes de bloquear por impago
STRIPE_TRIAL_DAYS=14  # Días de trial por defecto
```

---

### RT-02: Modelo de Base de Datos

**Modificaciones a Prisma Schema:**

```prisma
// Agregar estados adicionales
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
  gracePeriodEndsAt DateTime?  // Fecha fin de grace period para impago
  blockedAt        DateTime?  // Fecha en que se bloqueó por impago
  lastPaymentAt    DateTime?  // Última fecha de pago exitoso
  nextBillingDate  DateTime?  // Próxima fecha de facturación
}
```

---

### RT-03: Endpoints API

**Billing:**

```
POST   /api/v1/billing/checkout              → Crear checkout session
POST   /api/v1/billing/portal                → Crear portal session
GET    /api/v1/billing/current               → Info suscripción (existente)
GET    /api/v1/billing/usage                 → Uso actual (agentes, canales, mensajes)
POST   /api/v1/billing/cancel                → Cancelar suscripción (marca cancelAtPeriodEnd)
POST   /api/v1/billing/reactivate            → Reactivar suscripción cancelada
```

**Webhooks (público, sin auth):**

```
POST   /api/v1/webhooks/stripe               → Endpoint para webhooks de Stripe
```

---

### RT-04: Librería Stripe

**Dependencias:**

```json
{
  "dependencies": {
    "stripe": "^14.0.0",
    "@types/stripe": "^8.0.0"
  }
}
```

---

## Flujos UX

### Flujo 1: Suscripción Inicial

```
[Billing Page]
  ↓
[Seleccionar Plan]
  ↓
[Click "Suscribirse"]
  ↓
[Loading...]
  ↓
[Redirect a Stripe Checkout]
  ↓
[Completar pago en Stripe]
  ↓
[Redirect a /billing?success=true]
  ↓
[Mostrar confirmación]
  ↓
[Webhook actualiza suscripción]
```

### Flujo 2: Upgrade de Plan

```
[Billing Page]
  ↓
[Ver plan actual]
  ↓
[Click "Upgrade" en plan superior]
  ↓
[Confirmar cambio]
  ↓
[Redirect a Stripe Checkout]
  ↓
[Pago de diferencia/prorrateo]
  ↓
[Webhook actualiza plan]
  ↓
[Mostrar confirmación de upgrade]
```

### Flujo 3: Impago y Bloqueo

```
[Webhook: invoice.payment_failed]
  ↓
[Backend marca como PAST_DUE]
  ↓
[Grace period inicia (7 días)]
  ↓
[Notificaciones de pago pendiente]
  ↓
[Después de grace period]
  ↓
[Backend aplica restricciones]
  ↓
[Banner de advertencia en UI]
  ↓
[Usuario no puede crear agentes/canales]
  ↓
[Usuario regulariza pago]
  ↓
[Webhook: invoice.payment_succeeded]
  ↓
[Backend elimina restricciones]
  ↓
[Sistema vuelve a normal]
```

---

## Estructura de DB

Ver RT-02 para modificaciones al schema.

**Relaciones:**
- `TenantSubscription` 1:1 `Tenant`
- `TenantSubscription` N:1 `SubscriptionPlan`

---

## Endpoints API

Ver RT-03 para lista completa.

**Formato de respuestas:**

```typescript
// Checkout session
{
  success: true,
  data: {
    checkoutUrl: "https://checkout.stripe.com/..."
  }
}

// Portal session
{
  success: true,
  data: {
    portalUrl: "https://billing.stripe.com/..."
  }
}

// Usage
{
  success: true,
  data: {
    agents: { current: 2, limit: 5 },
    channels: { current: 1, limit: 3 },
    messages: { current: 1500, limit: 10000 }
  }
}
```

---

## Eventos n8n

**Eventos que se pueden enviar a n8n:**

- `billing.subscription_created` → Suscripción creada
- `billing.subscription_updated` → Plan actualizado
- `billing.subscription_cancelled` → Suscripción cancelada
- `billing.payment_succeeded` → Pago exitoso
- `billing.payment_failed` → Pago fallido
- `billing.trial_expiring` → Trial por expirar (3 días antes)
- `billing.trial_expired` → Trial expirado
- `billing.subscription_blocked` → Suscripción bloqueada por impago
- `billing.subscription_reactivated` → Suscripción reactivada

**Payload ejemplo:**

```json
{
  "event": "billing.payment_failed",
  "timestamp": "2025-01-XX...",
  "data": {
    "tenantId": "tenant_xxx",
    "subscriptionId": "sub_xxx",
    "invoiceId": "in_xxx",
    "amount": 2900,
    "currency": "EUR",
    "gracePeriodEndsAt": "2025-01-XX..."
  }
}
```

---

## Criterios de Aceptación

### CA-01: Checkout Session
- [ ] Usuario puede crear checkout session para suscribirse
- [ ] Checkout session redirige correctamente a Stripe
- [ ] Después de pago, usuario es redirigido a success URL
- [ ] Webhook actualiza suscripción correctamente
- [ ] Stripe Customer se crea/actualiza correctamente

### CA-02: Customer Portal
- [ ] Usuario puede crear portal session
- [ ] Portal session redirige correctamente a Stripe
- [ ] Usuario puede gestionar método de pago desde portal
- [ ] Usuario puede ver facturas desde portal
- [ ] Usuario puede cancelar suscripción desde portal

### CA-03: Webhooks
- [ ] Webhook endpoint valida firma de Stripe
- [ ] Todos los eventos relevantes se procesan correctamente
- [ ] Estados de suscripción se actualizan en BD
- [ ] Eventos se envían a n8n si está configurado
- [ ] Webhooks idempotentes (no procesar eventos duplicados)

### CA-04: Restricciones por Plan
- [ ] No se pueden crear más agentes que el límite del plan
- [ ] No se pueden crear más canales que el límite del plan
- [ ] UI muestra límites y uso actual
- [ ] UI muestra advertencia al acercarse al límite
- [ ] Errores son claros y sugieren upgrade

### CA-05: Bloqueo por Impago
- [ ] Suscripción se marca como PAST_DUE al fallar pago
- [ ] Grace period se respeta (7 días)
- [ ] Restricciones se aplican después de grace period
- [ ] Banner de advertencia se muestra en UI
- [ ] Restricciones se eliminan al regularizar pago
- [ ] Suscripción vuelve a ACTIVE al pagar

### CA-06: Trial
- [ ] Trial se crea automáticamente al registrarse
- [ ] Notificaciones de días restantes se muestran
- [ ] Trial expira correctamente si no hay pago
- [ ] Restricciones se aplican al expirar trial
- [ ] Suscripción se activa correctamente durante trial

---

## Consideraciones de Seguridad

- **Webhook signature:** Validar siempre la firma de Stripe (crítico)
- **Idempotencia:** Usar `idempotency_key` o verificar eventos ya procesados
- **Rate limiting:** Aplicar rate limiting a endpoints de billing
- **Logs:** Registrar todos los eventos de billing (auditoría)
- **Encriptación:** No almacenar datos sensibles de tarjetas (Stripe los maneja)

---

## Dependencias

- PRD-03: Prisma setup (para migraciones)
- PRD-06: Guards y CORS (para proteger endpoints)
- Cuenta de Stripe configurada (test y producción)
- Webhook endpoint configurado en Stripe Dashboard

---

## Referencias

- `docs/03-tenant-dashboard-and-billing.md` - Billing base existente
- `IA-Specs/01-saas-architecture-and-stack.mdc` - Stack tecnológico
- Stripe API Documentation
- Stripe Webhooks Guide

---

## Notas de Implementación

- **Modo test vs producción:** Usar claves diferentes según NODE_ENV
- **Webhook testing:** Usar Stripe CLI para testing local
- **Error handling:** Manejar todos los errores de Stripe gracefully
- **UI/UX:** Mostrar estados de carga durante checkout/portal
- **Notificaciones:** Enviar emails para eventos importantes (pago fallido, trial expirando)

---

**Última actualización:** 2025-01-XX








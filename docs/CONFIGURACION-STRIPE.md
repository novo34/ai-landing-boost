# Configuración de Stripe - Guía Completa

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-08

---

## 📋 Índice

1. [Configuración Inicial en Stripe Dashboard](#1-configuración-inicial-en-stripe-dashboard)
2. [Variables de Entorno](#2-variables-de-entorno)
3. [Configuración del Webhook Endpoint](#3-configuración-del-webhook-endpoint)
4. [Configuración de URLs de Redirect](#4-configuración-de-urls-de-redirect)
5. [Verificación y Testing](#5-verificación-y-testing)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Configuración Inicial en Stripe Dashboard

### 1.1 Crear Cuenta en Stripe

1. Ir a [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Crear cuenta (o iniciar sesión si ya existe)
3. Completar el proceso de verificación

### 1.2 Obtener API Keys

1. En el Dashboard de Stripe, ir a **Developers** → **API keys**
2. En modo **Test** (desarrollo):
   - Copiar **Publishable key** (empieza con `pk_test_...`)
   - Copiar **Secret key** (empieza con `sk_test_...`) - hacer clic en "Reveal test key"
3. En modo **Live** (producción):
   - Activar cuenta de producción
   - Copiar **Publishable key** (empieza con `pk_live_...`)
   - Copiar **Secret key** (empieza con `sk_live_...`)

**⚠️ IMPORTANTE:**
- Nunca compartir las Secret Keys
- Usar Test keys en desarrollo
- Usar Live keys solo en producción

---

## 2. Variables de Entorno

### 2.1 Backend (`apps/api/.env`)

Agregar las siguientes variables al archivo `.env` del backend:

```env
# ============================================
# Stripe Configuration
# ============================================

# API Keys de Stripe
# Modo Test (desarrollo):
STRIPE_SECRET_KEY=sk_test_tu_secret_key_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key_aqui

# Modo Live (producción):
# STRIPE_SECRET_KEY=sk_live_tu_secret_key_aqui
# STRIPE_PUBLISHABLE_KEY=pk_live_tu_publishable_key_aqui

# Webhook Secret (se obtiene después de configurar el webhook endpoint)
# Ver sección 3.2
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui

# Configuración
STRIPE_GRACE_PERIOD_DAYS=7  # Días de gracia antes de bloquear por impago
STRIPE_TRIAL_DAYS=14        # Días de trial por defecto
```

### 2.2 Frontend (`apps/web/.env.local`)

Agregar la Publishable Key al frontend (solo la pública, nunca la secreta):

```env
# Stripe Publishable Key (solo la pública)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key_aqui
```

**Nota:** El frontend solo necesita la Publishable Key para mostrar el checkout de Stripe.

---

## 3. Configuración del Webhook Endpoint

### 3.1 Configurar Endpoint en Stripe Dashboard

1. En el Dashboard de Stripe, ir a **Developers** → **Webhooks**
2. Hacer clic en **"Add endpoint"**
3. Configurar:
   - **Endpoint URL:** 
     - Desarrollo local: `http://localhost:3001/webhooks/stripe` (usar Stripe CLI, ver 3.3)
     - Producción: `https://tu-dominio.com/webhooks/stripe`
   - **Description:** "AI Landing Boost - Webhooks"
   - **Events to send:** Seleccionar los siguientes eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end` (opcional)
4. Hacer clic en **"Add endpoint"**

### 3.2 Obtener Webhook Secret

1. Después de crear el endpoint, hacer clic en él
2. En la sección **"Signing secret"**, hacer clic en **"Reveal"**
3. Copiar el secret (empieza con `whsec_...`)
4. Agregarlo a `apps/api/.env` como `STRIPE_WEBHOOK_SECRET`

### 3.3 Testing Local con Stripe CLI

Para testing local, usar Stripe CLI en lugar de configurar un endpoint público:

1. **Instalar Stripe CLI:**
   ```bash
   # Windows (con Chocolatey)
   choco install stripe

   # macOS
   brew install stripe/stripe-cli/stripe

   # Linux
   # Ver: https://stripe.com/docs/stripe-cli
   ```

2. **Autenticar:**
   ```bash
   stripe login
   ```

3. **Forward webhooks al servidor local:**
   ```bash
   stripe listen --forward-to localhost:3001/webhooks/stripe
   ```

4. **Obtener webhook secret del CLI:**
   - El CLI mostrará un secret que empieza con `whsec_...`
   - Usar ese secret en `STRIPE_WEBHOOK_SECRET` para desarrollo local

5. **Trigger eventos de prueba:**
   ```bash
   # Simular checkout completado
   stripe trigger checkout.session.completed

   # Simular pago exitoso
   stripe trigger invoice.payment_succeeded

   # Simular pago fallido
   stripe trigger invoice.payment_failed
   ```

---

## 4. Configuración de URLs de Redirect

### 4.1 URLs de Success y Cancel

Las URLs de redirect se configuran automáticamente en el código usando `FRONTEND_URL`:

```typescript
// En BillingService.createCheckoutSession()
const successUrl = `${process.env.FRONTEND_URL}/app/billing?success=true`;
const cancelUrl = `${process.env.FRONTEND_URL}/app/billing?canceled=true`;
```

**Asegurarse de que `FRONTEND_URL` esté configurado en `apps/api/.env`:**

```env
FRONTEND_URL=http://localhost:3000  # Desarrollo
# FRONTEND_URL=https://tu-dominio.com  # Producción
```

### 4.2 Customer Portal Return URL

Similar al checkout, se usa `FRONTEND_URL`:

```typescript
// En BillingService.createPortalSession()
const returnUrl = `${process.env.FRONTEND_URL}/app/billing`;
```

---

## 5. Verificación y Testing

### 5.1 Verificar Configuración

1. **Verificar variables de entorno:**
   ```bash
   cd apps/api
   # Verificar que todas las variables estén configuradas
   cat .env | grep STRIPE
   ```

2. **Verificar que el servidor inicia sin errores:**
   ```bash
   cd apps/api
   pnpm start:dev
   ```

3. **Verificar que StripeService se inicializa:**
   - Buscar en los logs: `✅ Stripe Service initialized` (o similar)
   - Si aparece warning: `⚠️ STRIPE_SECRET_KEY not configured`, verificar `.env`

### 5.2 Testing de Checkout

1. **Crear un plan de prueba en la BD:**
   ```sql
   -- Ejecutar en la base de datos o usar Prisma Studio
   INSERT INTO SubscriptionPlan (id, name, slug, currency, priceCents, interval, createdAt, updatedAt)
   VALUES ('plan_test', 'Test Plan', 'test-plan', 'EUR', 1000, 'MONTHLY', NOW(), NOW());
   ```

2. **Probar endpoint de checkout:**
   ```bash
   # POST /billing/checkout
   curl -X POST http://localhost:3001/billing/checkout \
     -H "Content-Type: application/json" \
     -H "Cookie: access_token=tu_token" \
     -d '{"planId": "plan_test"}'
   ```

3. **Verificar respuesta:**
   - Debe retornar `checkoutUrl` con URL de Stripe
   - Abrir la URL en el navegador
   - Completar checkout con tarjeta de prueba: `4242 4242 4242 4242`

### 5.3 Testing de Webhooks

1. **Usar Stripe CLI (recomendado para desarrollo):**
   ```bash
   stripe listen --forward-to localhost:3001/webhooks/stripe
   ```

2. **En otra terminal, trigger eventos:**
   ```bash
   stripe trigger checkout.session.completed
   ```

3. **Verificar logs del servidor:**
   - Debe aparecer: `Processing Stripe webhook event: checkout.session.completed`
   - Debe aparecer: `✅ Checkout completed for tenant xxx`

4. **Verificar en la base de datos:**
   - La suscripción debe actualizarse con `stripeSubscriptionId`
   - El estado debe cambiar a `ACTIVE` o `TRIAL`

---

## 6. Troubleshooting

### 6.1 Error: "Webhook secret not configured"

**Problema:** `STRIPE_WEBHOOK_SECRET` no está configurado.

**Solución:**
1. Verificar que existe en `apps/api/.env`
2. Si usas Stripe CLI, usar el secret que muestra el CLI
3. Si usas endpoint en producción, obtener el secret del Dashboard

### 6.2 Error: "Webhook signature verification failed"

**Problema:** La firma del webhook no coincide.

**Soluciones:**
1. Verificar que `STRIPE_WEBHOOK_SECRET` es correcto
2. Verificar que el raw body está configurado (`rawBody: true` en `main.ts`)
3. Verificar que no hay middleware que modifique el body antes del webhook controller

### 6.3 Error: "Stripe secret key not configured"

**Problema:** `STRIPE_SECRET_KEY` no está configurado.

**Solución:**
1. Verificar que existe en `apps/api/.env`
2. Verificar que no tiene espacios extra
3. Reiniciar el servidor después de agregar la variable

### 6.4 Webhook no se procesa

**Problema:** El webhook llega pero no se procesa.

**Soluciones:**
1. Verificar logs del servidor para errores
2. Verificar que el evento está en la lista de eventos configurados en Stripe
3. Verificar que el endpoint está activo en Stripe Dashboard
4. Verificar que la URL del endpoint es correcta

### 6.5 Checkout no redirige correctamente

**Problema:** Después del checkout, no redirige a la URL correcta.

**Soluciones:**
1. Verificar que `FRONTEND_URL` está configurado correctamente
2. Verificar que la URL no tiene trailing slash
3. Verificar que la URL es accesible desde el navegador

### 6.6 Customer Portal no funciona

**Problema:** No se puede crear portal session.

**Soluciones:**
1. Verificar que hay una suscripción activa con `stripeCustomerId`
2. Verificar que el customer existe en Stripe
3. Verificar que `STRIPE_SECRET_KEY` es correcta

---

## 7. Checklist de Configuración

### Desarrollo

- [ ] Cuenta de Stripe creada
- [ ] API Keys de Test obtenidas
- [ ] `STRIPE_SECRET_KEY` configurado en `apps/api/.env`
- [ ] `STRIPE_PUBLISHABLE_KEY` configurado en `apps/web/.env.local`
- [ ] Stripe CLI instalado y configurado
- [ ] `STRIPE_WEBHOOK_SECRET` del CLI configurado
- [ ] `FRONTEND_URL` configurado
- [ ] Servidor inicia sin errores
- [ ] Webhook endpoint responde correctamente
- [ ] Checkout funciona con tarjeta de prueba

### Producción

- [ ] Cuenta de Stripe activada para producción
- [ ] API Keys de Live obtenidas
- [ ] `STRIPE_SECRET_KEY` (Live) configurado
- [ ] `STRIPE_PUBLISHABLE_KEY` (Live) configurado
- [ ] Webhook endpoint configurado en Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` del endpoint configurado
- [ ] `FRONTEND_URL` apunta a dominio de producción
- [ ] SSL/HTTPS configurado (requerido para webhooks)
- [ ] Testing completo con tarjetas de prueba
- [ ] Monitoreo de webhooks configurado

---

## 8. Tarjetas de Prueba de Stripe

Para testing, usar estas tarjetas de prueba:

| Tarjeta | Resultado |
|---------|-----------|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 0002` | Pago rechazado (card declined) |
| `4000 0000 0000 9995` | Pago fallido (insufficient funds) |

**Fecha de expiración:** Cualquier fecha futura (ej: 12/25)  
**CVC:** Cualquier 3 dígitos (ej: 123)  
**ZIP:** Cualquier código postal (ej: 12345)

---

## 9. Referencias

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

---

## 10. Soporte

Si encuentras problemas:

1. Revisar logs del servidor
2. Revisar logs de Stripe Dashboard (Webhooks → Logs)
3. Verificar que todas las variables de entorno están configuradas
4. Verificar que el código está actualizado
5. Consultar documentación de Stripe

---

**Última actualización:** 2025-01-XX


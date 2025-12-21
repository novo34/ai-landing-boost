# Gap Report: PRD-08 - Billing Stripe Completo

> **Fecha:** 2025-01-14  
> **PRD:** `docs/PRD/PRD-08-billing-stripe-complete.md`  
> **Estado según índice:** ✅ IMPLEMENTADO  
> **Estado real:** ⚠️ **PARCIAL** (90% completado)

---

## Resumen Ejecutivo

El PRD-08 está **mayormente implementado** con una integración completa de Stripe. La funcionalidad core está presente, pero faltan algunas validaciones y aplicaciones de guards.

**Estado:** ⚠️ **PARCIAL** - Funcional pero con gaps menores

---

## 1. Requisitos del Documento

### RF-01: Checkout Session para Suscripciones
### RF-02: Stripe Customer Portal
### RF-03: Webhooks de Stripe
### RF-04: Restricciones por Plan
### RF-05: Bloqueo por Impago
### RF-06: Gestión de Trial

---

## 2. Evidencia en Código

### ✅ Implementado Completamente

#### RF-01: Checkout Session

**Backend:**
- ✅ `apps/api/src/modules/billing/stripe.service.ts`:
  - `createCheckoutSession()` - Líneas 28-84
- ✅ `apps/api/src/modules/billing/billing.service.ts`:
  - `createCheckoutSession()` - Línea 138
- ✅ `apps/api/src/modules/billing/billing.controller.ts`:
  - `POST /billing/checkout` - Línea 38

**Funcionalidad:**
- ✅ Creación de checkout sessions
- ✅ Metadata con tenantId y planId
- ✅ Soporte para EUR y otras monedas
- ✅ URLs de éxito y cancelación

#### RF-02: Stripe Customer Portal

**Backend:**
- ✅ `apps/api/src/modules/billing/stripe.service.ts`:
  - `createPortalSession()` - Líneas 86-111
- ✅ `apps/api/src/modules/billing/billing.controller.ts`:
  - `POST /billing/portal` - Línea 52

**Funcionalidad:**
- ✅ Creación de portal sessions
- ✅ Validación de suscripción activa
- ✅ Return URL configurable

#### RF-03: Webhooks de Stripe

**Backend:**
- ✅ `apps/api/src/modules/billing/webhooks/stripe-webhook.controller.ts` - Controller completo
- ✅ `apps/api/src/modules/billing/stripe.service.ts`:
  - `handleWebhookEvent()` - Línea 113
  - `handleCheckoutCompleted()` - Línea 165
  - `handleSubscriptionUpdated()` - Línea 191
  - `handleSubscriptionDeleted()` - Línea 214
  - `handlePaymentSucceeded()` - Línea 234
  - `handlePaymentFailed()` - Línea 260
  - `constructWebhookEvent()` - Línea 419

**Eventos manejados:**
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

**Funcionalidad:**
- ✅ Validación de signature de webhook
- ✅ Procesamiento de eventos
- ✅ Actualización de estados de suscripción
- ✅ Notificaciones en caso de pago fallido

#### RF-04: Restricciones por Plan

**Backend:**
- ✅ `apps/api/src/modules/billing/guards/plan-limits.guard.ts` - Guard implementado
- ✅ `apps/api/src/modules/billing/billing.service.ts`:
  - `checkPlanLimits()` - Línea 230
  - `getUsage()` - Línea 200

**Aplicación del guard:**
- ✅ `apps/api/src/modules/agents/agents.controller.ts` - Verificado
- ✅ `apps/api/src/modules/channels/channels.controller.ts` - Verificado

**Funcionalidad:**
- ✅ Validación de límites de agentes
- ✅ Validación de límites de canales
- ✅ Endpoint de uso actual

#### RF-05: Bloqueo por Impago

**Backend:**
- ✅ `apps/api/src/modules/billing/stripe.service.ts`:
  - `handlePaymentFailed()` - Línea 260
  - Grace period implementado (7 días por defecto)
  - Actualización de estado a `PAST_DUE`
  - Notificaciones a OWNER/ADMIN
  - Evento n8n `payment_failed`

**Funcionalidad:**
- ✅ Grace period configurable
- ✅ Notificaciones de pago fallido
- ✅ Eventos n8n

**Frontend:**
- ⚠️ Falta banner de advertencia en UI cuando está en `PAST_DUE`

#### RF-06: Gestión de Trial

**Backend:**
- ✅ `apps/api/src/modules/billing/billing.service.ts`:
  - Creación automática de trial al registrar
  - Cálculo de días restantes
  - Transición a suscripción pagada

**Funcionalidad:**
- ✅ Trial de 14 días por defecto
- ✅ Cálculo de días restantes
- ✅ Transición automática vía webhooks

---

## 3. Lo que Falta Exactamente

### ⚠️ Gaps Menores

#### Gap 1: Aplicación de Bloqueo por Impago en Guards

**Estado:** ⚠️ **PARCIAL**

**Descripción:**
- El sistema marca suscripciones como `PAST_DUE` cuando falla el pago
- Pero no se encontró evidencia de que se bloqueen funcionalidades después del grace period

**Verificación necesaria:**
- [ ] Guard o middleware que verifique `blockedAt` o `gracePeriodEndsAt`
- [ ] Bloquear creación de agentes si está bloqueado
- [ ] Bloquear creación de canales si está bloqueado
- [ ] Limitar envío de mensajes automáticos

**Ubicación esperada:**
- `apps/api/src/common/guards/subscription-status.guard.ts` (no existe)
- O modificar `PlanLimitsGuard` para considerar estado de suscripción

**Prioridad:** 🟠 ALTA

---

#### Gap 2: UI para Upgrade/Downgrade de Planes

**Estado:** ⚠️ **PARCIAL**

**Descripción:**
- Backend tiene endpoints para checkout y portal
- Frontend muestra planes pero falta UI completa para cambiar de plan

**Verificación necesaria:**
- [ ] Botón "Upgrade" en cada plan
- [ ] Modal o página para confirmar cambio de plan
- [ ] Redirección a checkout de Stripe
- [ ] Manejo de downgrade (si está permitido)

**Ubicación esperada:**
- `apps/web/app/app/billing/page.tsx` - Verificar si tiene botones de upgrade

**Prioridad:** 🟡 MEDIA

---

#### Gap 3: UI para Gestión de Método de Pago

**Estado:** ⚠️ **NO VERIFICADO**

**Descripción:**
- Stripe Customer Portal permite gestionar métodos de pago
- Pero falta UI directa en la aplicación

**Verificación necesaria:**
- [ ] Botón "Gestionar método de pago" que abre portal
- [ ] Mostrar método de pago actual (últimos 4 dígitos)
- [ ] Indicador de método de pago válido/inválido

**Prioridad:** 🟡 MEDIA

---

#### Gap 4: Banner de Advertencia para Impago

**Estado:** ❌ **FALTANTE**

**Descripción:**
- Backend maneja impago correctamente
- Frontend NO muestra banner de advertencia

**Checklist:**
- [ ] Banner en dashboard cuando `status === 'PAST_DUE'`
- [ ] Banner cuando `gracePeriodEndsAt` está cerca
- [ ] Banner cuando trial está por expirar
- [ ] Link directo a billing/portal

**Prioridad:** 🟠 ALTA (UX)

---

#### Gap 5: Validación de Estado de Suscripción en Rutas Críticas

**Estado:** ⚠️ **NO VERIFICADO**

**Descripción:**
- Algunas rutas deberían verificar estado de suscripción
- No solo límites de plan, sino también si está bloqueada

**Verificación necesaria:**
- [ ] Guard que verifique `status !== 'BLOCKED'` y `blockedAt === null`
- [ ] Aplicar a rutas de creación de recursos
- [ ] Aplicar a rutas de envío de mensajes

**Prioridad:** 🟠 ALTA (seguridad)

---

## 4. Riesgos y Bugs

### 🟠 Altos

1. **Usuarios con suscripción bloqueada pueden crear recursos**
   - **Riesgo:** Si `blockedAt` no se verifica, usuarios bloqueados pueden seguir usando el sistema
   - **Impacto:** Pérdida de ingresos, violación de términos
   - **Mitigación:** Crear guard de estado de suscripción

2. **Falta UI de advertencia para impago**
   - **Riesgo:** Usuarios no saben que su pago falló
   - **Impacto:** Mala UX, posibles pérdidas de clientes
   - **Mitigación:** Implementar banners de advertencia

### 🟡 Medios

3. **Falta UI completa para cambio de planes**
   - **Riesgo:** Usuarios no pueden upgrade fácilmente
   - **Impacto:** Pérdida de ingresos potenciales

---

## 5. Checklist de Implementación

### Backend

- [x] StripeService implementado
- [x] Checkout sessions implementadas
- [x] Portal sessions implementadas
- [x] Webhooks implementados
- [x] PlanLimitsGuard implementado
- [x] Restricciones por plan implementadas
- [x] Manejo de impago implementado
- [x] Gestión de trial implementada
- [ ] **FALTA:** Guard de estado de suscripción (bloqueo)
- [ ] **FALTA:** Validación de bloqueo en rutas críticas

### Frontend

- [x] Página de billing implementada
- [x] Visualización de planes
- [x] Visualización de uso actual
- [ ] **FALTA:** UI para upgrade/downgrade
- [ ] **FALTA:** Banner de advertencia para impago
- [ ] **FALTA:** UI para gestión de método de pago
- [ ] **FALTA:** Banner de advertencia para trial por expirar

---

## 6. Estado Final

**Estado según código:** ⚠️ **PARCIAL (90%)**

**Desglose:**
- ✅ Checkout sessions: 100% implementado
- ✅ Portal sessions: 100% implementado
- ✅ Webhooks: 100% implementado
- ✅ Restricciones por plan: 95% implementado (falta validación de bloqueo)
- ✅ Bloqueo por impago: 80% implementado (falta aplicación de bloqueo)
- ✅ Gestión de trial: 100% implementado
- ⚠️ UI: 70% implementado (faltan banners y upgrade UI)

**Conclusión:**
El PRD-08 está funcionalmente completo en backend, pero falta hardening de validaciones de bloqueo y algunas UIs importantes. La integración con Stripe es sólida.

---

**Última actualización:** 2025-01-14 15:25  
**Próxima acción:** Implementar guard de estado de suscripción y banners de advertencia

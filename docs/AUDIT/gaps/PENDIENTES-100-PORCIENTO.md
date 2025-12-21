# Checklist: Lo que Falta para 100% - PRDs Auditados

> **Fecha:** 2025-01-14  
> **Objetivo:** Lista completa de lo que falta para llegar al 100% en cada PRD auditado

---

## PRD-07: Auth Advanced + SSO (85% → 100%)

### Gaps Pendientes

#### 🔴 Críticos (Seguridad)
- [ ] **Aplicar EmailVerifiedGuard a rutas específicas**
  - Crear recursos (agentes, canales, etc.)
  - Configuraciones críticas
  - Exportaciones de datos
  - **Archivos:** Controllers de agents, channels, settings, exports

#### 🟡 Medios (UX/UI)
- [ ] **UI para Gestión de Identidades SSO**
  - Sección "Identidades SSO" en página de seguridad
  - Lista de identidades asociadas (Google, Microsoft)
  - Botón para desasociar identidad
  - Validación: no permitir desasociar última identidad sin password
  - **Archivo:** `apps/web/app/app/settings/security/page.tsx`

- [ ] **UI Completa para Gestión de Invitaciones**
  - Página o sección en `/app/settings/team` para gestionar invitaciones
  - Lista de invitaciones pendientes
  - Botón "Invitar miembro" con modal
  - Formulario: email + rol
  - Cancelar invitaciones pendientes
  - Ver estado de invitaciones (PENDING, ACCEPTED, REJECTED, EXPIRED)
  - **Archivo:** `apps/web/app/app/settings/team/page.tsx` (verificar si está completo)

- [ ] **Banner/Notificación para Email No Verificado**
  - Banner en dashboard cuando `emailVerified: false`
  - Mensaje indicando que email no está verificado
  - Link a página de verificación
  - **Archivo:** Layout o componente de dashboard

#### 🟢 Bajos (Opcionales)
- [ ] **Eventos n8n para SSO e Invitaciones**
  - `user.registered` (con método)
  - `user.email_verified`
  - `user.sso_linked`
  - `team.invitation_sent`
  - `team.invitation_accepted`
  - `team.invitation_rejected`
  - **Archivo:** `apps/api/src/modules/auth/auth.service.ts` y `invitations.service.ts`

---

## PRD-08: Billing Stripe (90% → 100%)

### Gaps Pendientes

#### 🔴 Críticos (Seguridad)
- [ ] **Guard de Estado de Suscripción (Bloqueo)**
  - Crear `SubscriptionStatusGuard` que verifique:
    - `status !== 'BLOCKED'`
    - `blockedAt === null`
    - `gracePeriodEndsAt` no expirado (si aplica)
  - Aplicar a rutas de creación de recursos
  - Aplicar a rutas de envío de mensajes
  - **Archivo:** `apps/api/src/common/guards/subscription-status.guard.ts`

#### 🟠 Altos (UX/Seguridad)
- [ ] **Banner de Advertencia para Impago**
  - Banner en dashboard cuando `status === 'PAST_DUE'`
  - Banner cuando `gracePeriodEndsAt` está cerca
  - Banner cuando trial está por expirar
  - Link directo a billing/portal
  - **Archivo:** Layout o componente de dashboard

- [ ] **Aplicar Bloqueo por Impago en Guards**
  - Verificar `blockedAt` o `gracePeriodEndsAt` en guards existentes
  - Bloquear creación de agentes si está bloqueado
  - Bloquear creación de canales si está bloqueado
  - Limitar envío de mensajes automáticos
  - **Archivo:** Modificar `PlanLimitsGuard` o crear guard combinado

#### 🟡 Medios (UX)
- [ ] **UI para Upgrade/Downgrade de Planes**
  - Botón "Upgrade" en cada plan
  - Modal o página para confirmar cambio de plan
  - Redirección a checkout de Stripe
  - Manejo de downgrade (si está permitido)
  - **Archivo:** `apps/web/app/app/billing/page.tsx`

- [ ] **UI para Gestión de Método de Pago**
  - Botón "Gestionar método de pago" que abre portal
  - Mostrar método de pago actual (últimos 4 dígitos)
  - Indicador de método de pago válido/inválido
  - **Archivo:** `apps/web/app/app/billing/page.tsx`

---

## PRD-09: Team Management (95% → 100%)

### Gaps Pendientes

#### 🟡 Medios (Opcionales)
- [ ] **Notificación por Email al Cambiar Rol**
  - Enviar email al usuario cuando cambia su rol
  - Template de email para cambio de rol
  - **Archivo:** `apps/api/src/modules/team/team.service.ts` (método `changeMemberRole`)

#### 🟢 Bajos (Opcionales)
- [ ] **Última Actividad de Miembros**
  - Campo de última actividad en modelo
  - Actualizar última actividad en cada acción del usuario
  - Mostrar en UI
  - **Archivo:** Modelo Prisma + `apps/web/app/app/settings/team/page.tsx`

---

## PRD-10: WhatsApp Providers (95% → 100%)

### Gaps Pendientes

#### 🟡 Medios (Opcionales)
- [ ] **Reconexión Automática Programada**
  - Tarea programada (cron job) que verifique conexiones periódicamente
  - Reconexión automática cuando estado es `DISCONNECTED`
  - Configuración de intervalo de verificación
  - **Archivo:** Crear scheduler service o usar `@nestjs/schedule`

- [ ] **Verificación de Componente Wizard**
  - Verificar que el wizard tiene todos los pasos mencionados en PRD
  - Verificar flujo paso a paso
  - Verificar validación en cada paso
  - **Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`

---

## PRD-11: WhatsApp Webhooks (95% → 100%)

### Gaps Pendientes

#### 🟡 Medios (Robustez)
- [ ] **Manejo Explícito de Mensajes Multimedia**
  - Manejar mensajes multimedia (rechazar o ignorar con log)
  - Validar que solo se procesan mensajes de texto
  - Logging cuando se recibe mensaje no soportado
  - **Archivo:** `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`

- [ ] **Validación Adicional para Evolution API**
  - Whitelist de IPs de Evolution API (en producción)
  - Webhook secret si Evolution API lo soporta
  - Rate limiting por IP en webhooks
  - **Archivo:** `apps/api/src/modules/whatsapp/guards/webhook-signature.guard.ts`

---

## Resumen por Prioridad

### 🔴 Críticos (Seguridad) - 2 items
1. Aplicar EmailVerifiedGuard a rutas específicas (PRD-07)
2. Guard de Estado de Suscripción (PRD-08)

### 🟠 Altos (UX/Seguridad) - 3 items
1. Banner de advertencia para impago (PRD-08)
2. Aplicar bloqueo por impago en guards (PRD-08)
3. Notificación por email al cambiar rol (PRD-09)

### 🟡 Medios (UX/Robustez) - 6 items
1. UI para gestión de identidades SSO (PRD-07)
2. UI completa para gestión de invitaciones (PRD-07)
3. UI para upgrade/downgrade de planes (PRD-08)
4. UI para gestión de método de pago (PRD-08)
5. Reconexión automática programada (PRD-10)
6. Manejo explícito de mensajes multimedia (PRD-11)

### 🟢 Bajos (Opcionales) - 3 items
1. Eventos n8n para SSO e invitaciones (PRD-07)
2. Última actividad de miembros (PRD-09)
3. Verificación de componente wizard (PRD-10)

---

## Plan de Acción Recomendado

### Fase 1: Seguridad Crítica (🔴)
1. Aplicar EmailVerifiedGuard a rutas críticas
2. Crear y aplicar SubscriptionStatusGuard

### Fase 2: UX Crítica (🟠)
1. Banner de advertencia para impago
2. Aplicar bloqueo por impago en guards
3. Email al cambiar rol

### Fase 3: UX Mejoras (🟡)
1. UI para gestión de identidades SSO
2. UI completa para gestión de invitaciones
3. UI para upgrade/downgrade de planes
4. UI para gestión de método de pago

### Fase 4: Robustez (🟡)
1. Reconexión automática programada
2. Manejo explícito de mensajes multimedia
3. Validación adicional para Evolution API

### Fase 5: Opcionales (🟢)
1. Eventos n8n
2. Última actividad de miembros
3. Verificación de componente wizard

---

**Total de items pendientes:** 14  
**Críticos:** 2  
**Altos:** 3  
**Medios:** 6  
**Bajos:** 3

---

**Última actualización:** 2025-01-14 16:00  
**Estado:** ✅ **TODOS LOS FIXES APLICADOS** - Ver `ALL-FIXES-COMPLETED.md`

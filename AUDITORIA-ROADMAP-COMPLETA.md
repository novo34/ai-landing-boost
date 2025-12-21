# Auditoría Completa: Roadmap vs Estado Actual del SaaS

> **Fecha:** 2025-01-XX  
> **Versión:** 1.0  
> **Objetivo:** Comparar el roadmap completo con el estado actual de implementación

---

## Resumen Ejecutivo

### Estado General: **~25% COMPLETADO**

**Bloques Completados:**
- ✅ Bloque A (Fundamentos): ~60% completado
- ❌ Bloque B (WhatsApp): 0% completado
- ❌ Bloque C (Base de Conocimiento): 0% completado
- ❌ Bloque D (Agentes IA): 0% completado
- ❌ Bloque E (n8n): 0% completado
- ⚠️ Bloque F (Multi-idioma, Compliance): ~30% completado
- ❌ Bloque G (Extensiones): 0% completado

---

## BLOQUE A — Fundamentos del SaaS

### ✅ A1. Arquitectura base & repositorio monorepo

**Estado:** ✅ **COMPLETADO**

**Implementado:**
- ✅ Monorepo configurado con pnpm workspaces
- ✅ `apps/backend` → NestJS ✅
- ✅ `apps/web` → Next.js (App Router) ✅
- ✅ `packages/shared` → Preparado (tipos comunes)
- ✅ Configuración de entorno (`.env.example` para backend y frontend)
- ✅ Variables de entorno validadas
- ✅ Pipeline de despliegue preparado (scripts PowerShell)

**Archivos clave:**
- `pnpm-workspace.yaml` ✅
- `package.json` (raíz) ✅
- `apps/api/package.json` ✅
- `apps/web/package.json` ✅
- `apps/api/src/config/env.validation.ts` ✅

---

### ✅ A2. Modelo multi-tenant + migraciones

**Estado:** ✅ **COMPLETADO**

**Implementado:**
- ✅ Entidades base en Prisma:
  - `tenants` ✅
  - `users` ✅
  - `tenant_members` (TenantMembership) ✅
  - `tenant_settings` ✅
- ✅ Estrategia multi-tenant:
  - `tenant_id` en tablas de negocio ✅
  - `TenantContextGuard` implementado ✅
  - Extracción de tenant desde JWT ✅
- ✅ Migraciones Prisma:
  - Schema completo ✅
  - Scripts de migración ✅
  - Seed preparado ✅

**Archivos clave:**
- `apps/api/prisma/schema.prisma` ✅
- `apps/api/src/common/guards/tenant-context.guard.ts` ✅
- `apps/api/src/common/decorators/current-tenant.decorator.ts` ✅

---

### ⚠️ A3. Autenticación + SSO + gestión de usuarios

**Estado:** ⚠️ **PARCIALMENTE COMPLETADO (60%)**

**Implementado:**
- ✅ Registro y login:
  - Email + contraseña ✅
  - Verificación por email: ❌ **FALTA**
  - Invitación a equipo por email: ❌ **FALTA**
- ⚠️ SSO:
  - Botones "Continuar con Google": ❌ **FALTA** (solo TODO en código)
  - Botones "Continuar con Microsoft": ❌ **FALTA** (solo TODO en código)
  - Asociación de identidad SSO: ❌ **FALTA**
- ✅ Gestión de sesión:
  - Tokens JWT ✅
  - Cookies firmadas ✅
  - Middleware para proteger rutas ✅
- ✅ Roles:
  - `OWNER`, `ADMIN`, `AGENT`, `VIEWER` ✅
  - `RbacGuard` implementado ✅

**Archivos clave:**
- `apps/api/src/modules/auth/auth.service.ts` ✅ (con TODOs para SSO)
- `apps/api/src/modules/auth/auth.controller.ts` ✅
- `apps/api/src/common/guards/rbac.guard.ts` ✅

**Falta:**
- ❌ Integración Google OAuth2
- ❌ Integración Microsoft Azure AD
- ❌ Verificación de email
- ❌ Sistema de invitaciones

---

### ⚠️ A4. Billing & suscripciones (Stripe)

**Estado:** ⚠️ **PARCIALMENTE COMPLETADO (40%)**

**Implementado:**
- ✅ Modelos de base de datos:
  - `SubscriptionPlan` ✅
  - `TenantSubscription` ✅
  - Estados: `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELLED` ✅
- ✅ Lógica básica:
  - Creación automática de trial ✅
  - Cálculo de días restantes ✅
  - Endpoints básicos (`GET /billing/plans`, `GET /billing/current`) ✅
- ❌ Integración Stripe:
  - Webhooks Stripe: ❌ **FALTA**
  - Checkout sessions: ❌ **FALTA**
  - Portal sessions: ❌ **FALTA**
  - Manejo de eventos: ❌ **FALTA**
- ❌ Restricciones por plan:
  - Validación de límites (maxAgents, maxChannels): ❌ **FALTA**
  - Bloqueo por impago: ❌ **FALTA**

**Archivos clave:**
- `apps/api/src/modules/billing/billing.service.ts` ✅ (solo lógica básica)
- `apps/api/src/modules/billing/billing.controller.ts` ✅
- `apps/web/app/app/billing/page.tsx` ✅ (UI básica)

**Falta:**
- ❌ Integración real con Stripe
- ❌ Webhooks de Stripe
- ❌ Sistema de restricciones por plan
- ❌ Bloqueo automático por impago

---

### ✅ A5. Panel de administración del tenant

**Estado:** ✅ **COMPLETADO (80%)**

**Implementado:**
- ✅ Mobile-first UI con TailwindCSS + shadcn/ui ✅
- ✅ Dashboard básico:
  - Estado de suscripción ✅
  - Información de uso ✅
- ✅ Apartados:
  - Equipo: ⚠️ **UI preparada, falta lógica de invitaciones**
  - Plan y facturación: ✅
  - Ajustes generales: ✅
    - Idioma, zona horaria, país, moneda ✅
    - Logo, colores: ❌ **FALTA**

**Archivos clave:**
- `apps/web/app/app/page.tsx` ✅ (Dashboard)
- `apps/web/app/app/settings/page.tsx` ✅
- `apps/web/app/app/billing/page.tsx` ✅

**Falta:**
- ❌ Gestión completa de equipo (invitaciones funcionales)
- ❌ Personalización de logo y colores
- ❌ Métricas avanzadas de uso

---

## BLOQUE B — Módulo WhatsApp & Evolución API

### ❌ B1. Gestión de proveedores de WhatsApp

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Entidades:
  - `whatsapp_providers` ❌
  - `tenant_whatsapp_accounts` ❌
- ❌ Flujos:
  - Wizard "Conectar WhatsApp" ❌
  - Validación de números ❌
  - Gestión de credenciales cifradas ❌

**Nota:** Solo existe campo `whatsappProvider` en `TenantSettings` (string), pero no hay módulo funcional.

---

### ❌ B2. Webhooks de mensajes entrantes & salientes

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Endpoint `/webhooks/whatsapp/:providerId` ❌
- ❌ Recepción de mensajes entrantes ❌
- ❌ Resolución de tenant y agente ❌
- ❌ Almacenamiento en `conversations` y `messages` ❌
- ❌ Envío de mensajes salientes ❌
- ❌ Registro de estado de entrega ❌

**Nota:** No existe módulo de WhatsApp ni tablas de conversaciones.

---

## BLOQUE C — Base de Conocimiento (IA-first)

### ❌ C1. Modelo de base de conocimiento

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Entidades:
  - `knowledge_sources` ❌
  - `knowledge_chunks` ❌
  - `knowledge_collections` ❌
- ❌ Arquitectura:
  - Almacenamiento texto en MySQL ❌
  - Embeddings (vector store) ❌
  - Índices para búsqueda ❌

**Nota:** Solo existe página placeholder en frontend (`apps/web/app/app/knowledge-base/page.tsx`).

---

### ❌ C2. Interfaces para que el cliente alimente su conocimiento

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ CRUD de FAQs ❌
- ❌ Importación desde documentos (PDF, DOCX) ❌
- ❌ Scraping de sitios web ❌
- ❌ Configuración de idiomas soportados ❌

---

### ❌ C3. Pipeline de ingestión y actualización

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Normalización de texto ❌
- ❌ Troceado en chunks ❌
- ❌ Generación de embeddings ❌
- ❌ Detección de idioma ❌
- ❌ Consultas cross-language ❌

---

## BLOQUE D — Motor del Agente de Citas (WhatsApp Agent)

### ❌ D1. Diseño del "Agente" como entidad configurable

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Entidad `agents` ❌
- ❌ Configuración:
  - `language_strategy` ❌
  - `knowledge_collections` asociados ❌
  - `calendar_connectors` ❌
  - `personality_settings` ❌
  - `n8n_workflow_id` ❌
- ❌ UI para configuración ❌

---

### ❌ D2. Orquestación de conversación (memoria + IA)

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Tablas `conversations` y `messages` ❌
- ❌ Mecanismo de contexto ❌
- ❌ Algoritmo del turn:
  - Detección de idioma ❌
  - Búsqueda de conversación existente ❌
  - Construcción de contexto ❌
  - Llamada al orquestador IA ❌
  - Envío vía WhatsApp ❌

---

### ❌ D3. Integración con calendarios

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Integración Cal.com ❌
- ❌ Integración Google Calendar ❌
- ❌ Estructura `calendar_integrations` ❌
- ❌ `agent_calendar_rules` ❌
- ❌ Flujo de agendamiento ❌

**Nota:** Solo existe campo `calendarProvider` en `TenantSettings` (string), pero no hay módulo funcional.

---

## BLOQUE E — Integración con n8n como motor interno

### ❌ E1. Patrón de integración con n8n

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Modelo `integrations_n8n_flows` ❌
- ❌ Estrategia de eventos:
  - `on_new_lead` ❌
  - `on_booking_confirmed` ❌
  - `on_payment_failed` ❌
- ❌ Envío de payloads a n8n vía Webhook HTTP ❌

---

### ❌ E2. Preparar la plataforma para "sincronizar flujos"

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Guardar `workflow_id` y `target_event` en config del Agente ❌
- ❌ UI para activar/desactivar flujos n8n ❌
- ❌ Checkboxes para flujos predefinidos ❌

---

## BLOQUE F — Multi-idioma, detección de idioma, cumplimiento legal y automatizaciones

### ⚠️ F1. Multi-idioma completo (plataforma + agente)

**Estado:** ⚠️ **PARCIALMENTE COMPLETADO (50%)**

**Implementado:**
- ✅ Internacionalización en Next.js:
  - Sistema i18n con `LocaleProvider` ✅
  - Traducciones en `es` y `en` ✅
  - Selector de idioma en UI ✅
- ❌ Agente:
  - Detección automática de idioma: ❌ **FALTA**
  - Respuesta en idioma detectado: ❌ **FALTA**
  - Soporte multi-idioma en base de conocimiento: ❌ **FALTA**

**Archivos clave:**
- `apps/web/lib/i18n/client.tsx` ✅
- `apps/web/lib/i18n/locales/es/` ✅
- `apps/web/lib/i18n/locales/en/` ✅

**Falta:**
- ❌ Detección de idioma en mensajes del agente
- ❌ Respuesta automática en idioma correcto
- ❌ Más idiomas (de-CH, fr, etc.)

---

### ❌ F2. Cumplimiento GDPR + FADP (Suiza)

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Consentimiento explícito para uso de datos ❌
- ❌ Opción de "olvidar cliente" (borrado/anónimo) ❌
- ❌ Retención configurable por tenant ❌
- ❌ Página legal (aviso legal, privacidad, cookies) ❌
- ❌ Segmentación región (EU/CH) ❌
- ❌ Políticas por región ❌

**Nota:** Existe campo `dataRegion` en `Tenant`, pero no hay lógica de cumplimiento implementada.

---

### ❌ F3. Automatizaciones operativas

**Estado:** ❌ **NO IMPLEMENTADO**

**Falta:**
- ❌ Estados automáticos de trial:
  - Notificaciones al expirar ❌
  - Limitaciones si no hay método de pago ❌
- ❌ Impago:
  - Reducción de capacidades del agente ❌
  - Bloqueo de nuevas conversaciones ❌
- ❌ Configuración por owner:
  - Duración trial ❌
  - Grace period de impago ❌
  - Mensajes automáticos predefinidos ❌

---

## BLOQUE G — Extensiones futuras

### ❌ G. Soporte multicanal

**Estado:** ❌ **NO IMPLEMENTADO (pero arquitectura preparada)**

**Falta:**
- ❌ Tabla `channels` ❌
- ❌ Tabla `channel_agents` ❌
- ❌ Integración voz (Twilio, Vonage) ❌
- ❌ Chat web embebible ❌

**Nota:** Solo existe página placeholder en frontend (`apps/web/app/app/channels/page.tsx`).

---

## Resumen de Entidades de Base de Datos

### ✅ Implementadas:
- `User` ✅
- `Tenant` ✅
- `TenantMembership` ✅
- `TenantSettings` ✅
- `SubscriptionPlan` ✅
- `TenantSubscription` ✅
- `MarketingLead` ✅
- `RoiEstimate` ✅

### ❌ Faltantes (según roadmap):
- `whatsapp_providers` ❌
- `tenant_whatsapp_accounts` ❌
- `knowledge_sources` ❌
- `knowledge_chunks` ❌
- `knowledge_collections` ❌
- `agents` ❌
- `conversations` ❌
- `messages` ❌
- `calendar_integrations` ❌
- `agent_calendar_rules` ❌
- `integrations_n8n_flows` ❌
- `channels` ❌
- `channel_agents` ❌

---

## Resumen de Módulos Backend (NestJS)

### ✅ Implementados:
- `AuthModule` ✅ (parcial: falta SSO)
- `UsersModule` ✅
- `TenantsModule` ✅
- `TenantSettingsModule` ✅
- `BillingModule` ✅ (parcial: falta Stripe)
- `MarketingLeadsModule` ✅
- `PrismaModule` ✅

### ❌ Faltantes:
- `WhatsAppModule` ❌
- `KnowledgeBaseModule` ❌
- `AgentsModule` ❌
- `ConversationsModule` ❌
- `CalendarModule` ❌
- `N8nIntegrationModule` ❌
- `ChannelsModule` ❌
- `GdprModule` ❌

---

## Resumen de Páginas Frontend (Next.js)

### ✅ Implementadas:
- Landing page (marketing) ✅
- Login/Register ✅
- Dashboard (`/app`) ✅
- Settings (`/app/settings`) ✅
- Billing (`/app/billing`) ✅

### ⚠️ Placeholders (sin funcionalidad):
- Knowledge Base (`/app/knowledge-base`) ⚠️
- Channels (`/app/channels`) ⚠️

### ❌ Faltantes:
- Gestión de agentes ❌
- Conversaciones ❌
- Calendarios ❌
- Equipo (invitaciones funcionales) ❌

---

## Prioridades Recomendadas

### 🔴 CRÍTICO (Bloque A - Completar fundamentos):
1. **A3 - SSO completo** (Google + Microsoft)
2. **A4 - Integración Stripe completa** (webhooks, checkout, portal)
3. **A5 - Gestión de equipo** (invitaciones funcionales)

### 🟠 ALTA (Bloque B - WhatsApp):
4. **B1 - Gestión de proveedores WhatsApp**
5. **B2 - Webhooks de mensajes**

### 🟡 MEDIA (Bloque C - Base de Conocimiento):
6. **C1 - Modelo de base de conocimiento**
7. **C2 - Interfaces CRUD**

### 🟢 BAJA (Bloques D, E, F, G):
8. **D1-D3 - Agentes IA**
9. **E1-E2 - Integración n8n**
10. **F2-F3 - Compliance y automatizaciones**

---

## Métricas de Completitud

| Bloque | Completitud | Estado |
|--------|------------|--------|
| A1 - Arquitectura | 100% | ✅ |
| A2 - Multi-tenant | 100% | ✅ |
| A3 - Auth + SSO | 60% | ⚠️ |
| A4 - Billing | 40% | ⚠️ |
| A5 - Panel Tenant | 80% | ✅ |
| B1 - Proveedores WA | 0% | ❌ |
| B2 - Webhooks WA | 0% | ❌ |
| C1 - Modelo KB | 0% | ❌ |
| C2 - Interfaces KB | 0% | ❌ |
| C3 - Pipeline KB | 0% | ❌ |
| D1 - Agentes | 0% | ❌ |
| D2 - Orquestación | 0% | ❌ |
| D3 - Calendarios | 0% | ❌ |
| E1 - n8n Patrón | 0% | ❌ |
| E2 - n8n UI | 0% | ❌ |
| F1 - Multi-idioma | 50% | ⚠️ |
| F2 - GDPR/FADP | 0% | ❌ |
| F3 - Automatizaciones | 0% | ❌ |
| G - Extensiones | 0% | ❌ |

**TOTAL GENERAL: ~25% COMPLETADO**

---

## Conclusión

El SaaS tiene una **base sólida de fundamentos** (Bloque A ~60% completado), pero **falta toda la funcionalidad core del negocio**:
- ❌ WhatsApp (Bloque B)
- ❌ Base de Conocimiento (Bloque C)
- ❌ Agentes IA (Bloque D)
- ❌ Integración n8n (Bloque E)
- ❌ Compliance completo (Bloque F)

**Recomendación:** Priorizar completar Bloque A (SSO y Stripe) antes de avanzar a los bloques de negocio (B, C, D).

---

**Generado:** 2025-01-XX  
**Última actualización:** 2025-01-XX








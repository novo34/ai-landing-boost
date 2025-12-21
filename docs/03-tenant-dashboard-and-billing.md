# Dashboard SaaS + Settings + Billing + RBAC - FASE 2

> **Fecha:** 2025-01-XX  
> **Estado:** Implementado  
> **Fase:** 2 - Dashboard SaaS con Settings, Billing y RBAC básico

---

## Resumen Ejecutivo

Esta fase implementa el panel interno del SaaS multi-tenant con:
- RBAC básico (roles por tenant) y guard de permisos
- Modelo de configuración de Tenant (TenantSettings)
- Modelo de Billing base (listo para integración Stripe)
- Panel interno en Next.js con layout profesional, nav lateral y vistas completas
- Todo mobile-first y multi-idioma

---

## Plan de Implementación

### PASO 1 - Backend NestJS + Prisma

#### 1.1. RBAC básico

**Estado:** ✅ Implementado

**Ubicación:** `apps/api/src/common/guards/rbac.guard.ts`

**Características:**
- Decorador `@Roles(...roles: TenantRole[])` para especificar roles requeridos
- Guard que verifica el rol del usuario en el tenant actual
- Integrado con `JwtAuthGuard` y `TenantContextGuard`
- Lanza `ForbiddenException` si el usuario no tiene el rol requerido

**Uso:**
```typescript
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
@Get('endpoint')
async myEndpoint() {
  // Solo OWNER o ADMIN pueden acceder
}
```

#### 1.2. Modelos de configuración de Tenant (TenantSettings)

**Estado:** ✅ Implementado

**Modelo Prisma:**
```prisma
model TenantSettings {
  id             String   @id @default(cuid())
  tenantId       String   @unique
  defaultLocale  String   @default("es")
  timeZone       String   @default("Europe/Madrid")
  country        String
  dataRegion     String
  whatsappProvider   String   @default("NONE")
  calendarProvider   String   @default("NONE")
  businessType    String?
  industryNotes   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Módulo NestJS:**
- `apps/api/src/modules/tenant-settings/`
- Endpoints:
  - `GET /tenants/settings` - Obtiene settings del tenant (todos los roles)
  - `PUT /tenants/settings` - Actualiza settings (solo OWNER/ADMIN)

#### 1.3. Modelos de Billing base

**Estado:** ✅ Implementado

**Modelos Prisma:**
```prisma
enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

model SubscriptionPlan {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  currency    String
  priceCents  Int
  interval    BillingInterval
  maxAgents   Int?
  maxChannels Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TenantSubscription {
  id              String            @id @default(cuid())
  tenantId        String            @unique
  planId          String
  status          SubscriptionStatus @default(TRIAL)
  trialEndsAt     DateTime?
  currentPeriodEnd DateTime?
  cancelAtPeriodEnd Boolean          @default(false)
  country         String
  stripeCustomerId    String?
  stripeSubscriptionId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Módulo NestJS:**
- `apps/api/src/modules/billing/`
- Endpoints:
  - `GET /billing/plans` - Lista planes públicos (sin auth)
  - `GET /billing/current` - Info de suscripción del tenant (OWNER/ADMIN)

**Lógica:**
- Si no hay suscripción, crea una de prueba (trial) automáticamente
- Calcula flags útiles: `isTrial`, `daysLeftInTrial`
- Listo para integración Stripe (campos `stripeCustomerId`, `stripeSubscriptionId`)

---

### PASO 2 - Frontend Next.js (apps/web) – Panel interno

#### 2.1. Layout /app y navegación

**Estado:** ✅ Implementado

**Ubicación:** `apps/web/app/app/layout.tsx`

**Características:**
- Verificación de autenticación con `checkAuth()`
- Sidebar fijo en desktop (`AppSidebar`)
- Nav tipo bottom en mobile (`AppNavMobile`)
- Layout responsive y mobile-first

**Componentes:**
- `apps/web/components/app/app-sidebar.tsx` - Sidebar desktop
- `apps/web/components/app/app-nav-mobile.tsx` - Navegación móvil

**Secciones de navegación:**
- Dashboard (`/app`)
- Settings (`/app/settings`)
- Billing (`/app/billing`)
- Knowledge Base (`/app/knowledge-base`) - Placeholder
- Channels (`/app/channels`) - Placeholder

#### 2.2. Páginas implementadas

**Dashboard (`/app/page.tsx`):**
- ✅ Info básica del usuario y tenant
- ✅ Estado de trial/suscripción (llamando a `/billing/current`)
- ✅ KPIs placeholder (Leads, Agentes, Canales)
- ✅ Mobile-first: cards apiladas en mobile, grid en desktop

**Settings (`/app/settings/page.tsx`):**
- ✅ Formulario para editar configuración del tenant
- ✅ Campos: país, región de datos, idioma, zona horaria, proveedores
- ✅ Carga datos desde `GET /tenants/settings`
- ✅ Guarda cambios vía `PUT /tenants/settings`
- ✅ Validación y toasts de éxito/error
- ✅ i18n completo

**Billing (`/app/billing/page.tsx`):**
- ✅ Muestra info de `GET /billing/current`
- ✅ Plan actual, precio, currency
- ✅ Estado de trial (badge, días restantes)
- ✅ Estado de suscripción
- ✅ Lista de planes (`GET /billing/plans`) con cards
- ✅ Botones placeholder para "Configurar método de pago" y "Cambiar de plan"
- ✅ Nota: Integración real con Stripe en siguiente fase

**Knowledge Base (`/app/knowledge-base/page.tsx`):**
- ✅ Placeholder con explicación
- ✅ Texto traducible (i18n)
- ✅ Preparado para futura implementación

**Channels (`/app/channels/page.tsx`):**
- ✅ Placeholder con explicación
- ✅ Texto traducible (i18n)
- ✅ Preparado para futura implementación

#### 2.3. Cliente API y i18n

**Cliente API (`apps/web/lib/api/client.ts`):**
- ✅ Métodos para `/billing/current` y `/billing/plans`
- ✅ Métodos para `/tenants/settings` (GET/PUT)
- ✅ Manejo automático de cookies HttpOnly
- ✅ Manejo de errores y refresh tokens

**i18n:**
- ✅ Claves añadidas en `apps/web/lib/i18n/locales/es/common.json`
- ✅ Claves añadidas en `apps/web/lib/i18n/locales/en/common.json`
- ✅ Namespaces: `nav.*`, `dashboard.*`, `settings.*`, `billing.*`
- ✅ Sin textos hardcodeados en componentes

---

## Modelos Prisma Añadidos

### TenantSettings
- Configuración por tenant: idioma, zona horaria, país, región de datos
- Proveedores: WhatsApp (META_API, EVOLUTION_API, NONE) y Calendario (CAL_COM, GOOGLE, CUSTOM, NONE)
- Información de negocio: businessType, industryNotes

### SubscriptionPlan
- Planes de suscripción con precio, currency, intervalo
- Límites: maxAgents, maxChannels

### TenantSubscription
- Suscripción del tenant con estado (TRIAL, ACTIVE, PAST_DUE, CANCELLED)
- Campos para Stripe: stripeCustomerId, stripeSubscriptionId
- Información de trial y período actual

---

## Endpoints Nuevos

### Tenant Settings

**GET /tenants/settings**
- **Auth:** JWT + TenantContext + RBAC (todos los roles)
- **Response:** Configuración del tenant actual

**PUT /tenants/settings**
- **Auth:** JWT + TenantContext + RBAC (OWNER/ADMIN)
- **Body:** `UpdateTenantSettingsDto`
- **Response:** Configuración actualizada

### Billing

**GET /billing/plans**
- **Auth:** Público (sin auth)
- **Response:** Lista de planes disponibles

**GET /billing/current**
- **Auth:** JWT + TenantContext + RBAC (OWNER/ADMIN)
- **Response:** Información de suscripción del tenant con flags útiles

---

## Estructura UX de /app

```
/app
├── layout.tsx          # Layout con sidebar y nav mobile
├── page.tsx            # Dashboard (overview)
├── settings/
│   └── page.tsx        # Configuración del tenant
├── billing/
│   └── page.tsx        # Información de suscripción y planes
├── knowledge-base/
│   └── page.tsx        # Placeholder
└── channels/
    └── page.tsx        # Placeholder
```

**Navegación:**
- Desktop: Sidebar fijo a la izquierda
- Mobile: Bottom navigation bar
- Responsive: Se adapta automáticamente según breakpoint

---

## RBAC Implementado

**Roles disponibles:**
- `OWNER` - Dueño del tenant
- `ADMIN` - Administrador
- `AGENT` - Agente (usuario estándar)
- `VIEWER` - Solo lectura

**Guards:**
- `JwtAuthGuard` - Verifica autenticación JWT
- `TenantContextGuard` - Extrae y valida tenant del request
- `RbacGuard` - Verifica roles con decorador `@Roles()`

**Uso en endpoints:**
- Settings GET: Todos los roles pueden ver
- Settings PUT: Solo OWNER/ADMIN pueden editar
- Billing GET: Solo OWNER/ADMIN pueden ver

---

## Pendientes para Siguiente Fase

### Integración Stripe
- [ ] Webhooks de Stripe (checkout, portal, suscripciones)
- [ ] Endpoint para crear checkout session
- [ ] Endpoint para crear portal session
- [ ] Manejo de eventos de Stripe (suscripción activada, cancelada, etc.)

### Gestión Avanzada de Límites
- [ ] Validación de límites por plan (maxAgents, maxChannels)
- [ ] Middleware para verificar límites antes de crear recursos
- [ ] UI para mostrar límites y uso actual

### Knowledge Base
- [ ] CRUD de documentos
- [ ] Gestión de fuentes y idiomas
- [ ] Integración con vectorización (opcional)

### Channels
- [ ] Gestión de canales (WhatsApp, voz, webchat)
- [ ] Configuración de instancias
- [ ] Monitoreo de estado

---

## Comandos para Probar

### Backend

```bash
cd apps/api

# Verificar que compila
npm run lint
npm run build

# Ejecutar migraciones (si hay cambios en schema)
npx prisma generate
npx prisma migrate dev --name add_tenant_dashboard_billing
```

### Frontend

```bash
cd apps/web

# Verificar que compila
npm run lint
npm run build

# Ejecutar en desarrollo
npm run dev
```

### Flujo Manual

1. **Registrar usuario nuevo:**
   - Ir a `/register`
   - Completar formulario
   - Se crea tenant y trial automáticamente

2. **Acceder a /app:**
   - Ver sidebar/nav
   - Ver datos del usuario, tenant y trial
   - Ver KPIs placeholder

3. **Ir a Settings:**
   - Modificar país, región de datos, idioma, proveedor de WhatsApp
   - Guardar y ver toasts

4. **Ir a Billing:**
   - Ver plan actual y estado
   - Ver lista de planes
   - Ver placeholders de botones de pago

5. **Ver placeholders:**
   - Knowledge Base y Channels muestran mensajes explicativos

---

## Decisiones de Diseño

### 1. RBAC Básico vs Permisos Granulares

**Decisión:** Implementar RBAC básico por roles (OWNER, ADMIN, AGENT, VIEWER) sin sistema de permisos granulares.

**Razón:** Según las especificaciones, los permisos granulares pueden venir en fases futuras. El RBAC básico es suficiente para esta fase y permite control de acceso efectivo.

### 2. Billing sin Stripe

**Decisión:** Implementar modelos y endpoints de billing sin integración real con Stripe.

**Razón:** La integración con Stripe requiere configuración de webhooks, manejo de eventos, etc. Esta fase prepara la estructura base y deja la integración para la siguiente fase.

### 3. Placeholders para Knowledge Base y Channels

**Decisión:** Crear páginas placeholder con explicaciones en lugar de implementación completa.

**Razón:** Estas funcionalidades son complejas y requieren modelos adicionales, integraciones externas, etc. Los placeholders permiten tener la estructura completa del dashboard sin bloquear la fase actual.

### 4. TenantSettings Auto-creación

**Decisión:** Si un tenant no tiene settings, se crean automáticamente con valores por defecto.

**Razón:** Mejora la UX al evitar errores 404 y permite que los tenants nuevos tengan configuración desde el inicio.

### 5. Trial Automático

**Decisión:** Si un tenant no tiene suscripción, se crea automáticamente una de prueba (trial) con 14 días.

**Razón:** Permite que todos los tenants nuevos tengan acceso inmediato sin necesidad de configuración manual.

---

## Referencias

- `IA-Specs/03-multitenancy-rbac-y-privacidad.mdc` - Estándares de multitenancy y RBAC
- `IA-Specs/05-frontend-standards.mdc` - Estándares frontend
- `IA-Specs/06-backend-standards.mdc` - Estándares backend
- `docs/02-auth-and-tenants.md` - Documentación de autenticación
- `docs/02b-auth-security-hardening.md` - Documentación de seguridad

---

## Checklist de Verificación

- [x] RBAC básico implementado y funcionando
- [x] Modelos Prisma de TenantSettings, SubscriptionPlan, TenantSubscription
- [x] Módulos NestJS de TenantSettings y Billing
- [x] Endpoints protegidos con RBAC
- [x] Layout de dashboard con sidebar y nav mobile
- [x] Página de Dashboard con info de usuario, tenant y trial
- [x] Página de Settings funcional
- [x] Página de Billing funcional
- [x] Páginas placeholder de Knowledge Base y Channels
- [x] i18n completo (es/en)
- [x] Mobile-first verificado
- [x] Cliente API actualizado
- [x] Documentación completa

---

**Última actualización:** 2025-01-XX (FASE 2 completada)

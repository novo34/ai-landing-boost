# 📊 Plan de Optimización de Rendimiento - AutomAI SaaS

**Fecha:** 2025-01-27  
**Objetivo:** Identificar y corregir lentitud general del SaaS (navegación, cambios de página, UI)

---

## FASE 0 — Inventario del Sistema

### 🗺️ Rutas Principales

#### Rutas Públicas
- `/` - Landing page (marketing)
- `/login` - Login
- `/register` - Registro
- `/verify-email` - Verificación de email
- `/accept-invitation` - Aceptar invitación
- `/legal/*` - Páginas legales (aviso-legal, cookies, privacidad, terminos)
- `/test-page` - Página de prueba (carga rápida ✅)
- `/test-simple` - Página simple de prueba

#### Rutas Privadas (App)
- `/app` - Dashboard principal (redirige según rol)
- `/app/admin` - Admin dashboard
- `/app/agents` - Lista de agentes
- `/app/agent` - Agente individual
- `/app/conversations` - Conversaciones
- `/app/channels` - Canales
- `/app/analytics` - Analytics
- `/app/appointments` - Citas
- `/app/billing` - Facturación
- `/app/knowledge-base` - Base de conocimiento
- `/app/settings/*` - Configuración (branding, calendar, gdpr, n8n, security, team, whatsapp)
- `/app/docs/*` - Documentación
- `/app/viewer` - Visor

#### Rutas Privadas (Platform)
- `/platform` - Dashboard de plataforma
- `/platform/tenants` - Gestión de tenants
- `/platform/leads` - Leads
- `/platform/instances` - Instancias
- `/platform/plans` - Planes
- `/platform/billing` - Facturación plataforma
- `/platform/operations/*` - Operaciones (agents, channels, conversations, leads, n8n, settings)
- `/platform/tickets` - Tickets
- `/platform/documentation/*` - Documentación plataforma
- `/platform/audit` - Auditoría
- `/platform/chat` - Chat
- `/platform/n8n-flows` - Flujos N8N
- `/platform/regions` - Regiones

### 📐 Layouts

1. **RootLayout** (`apps/web/app/layout.tsx`)
   - Detecta locale con `detectLocale()` (async)
   - Incluye providers: `TooltipProvider`, `LocaleProvider`
   - Componentes globales: `CookieConsent`, `Toaster`, `Sonner`
   - Fuentes: Inter, Space Grotesk

2. **MarketingLayout** (`apps/web/app/(marketing)/layout.tsx`)
   - Layout simple, solo pasa children

3. **AppLayout** (`apps/web/app/app/layout.tsx`)
   - Client component
   - Verifica autenticación con `apiClient.getCurrentUserWithRole()`
   - Carga branding del tenant
   - Sidebar + navegación móvil
   - Componentes: `AppSidebar`, `AppNavMobile`, `NotificationsCenter`, `GlobalSearch`, `SubscriptionWarningBanner`

4. **PlatformLayout** (`apps/web/app/platform/layout.tsx`)
   - Client component
   - Verifica acceso a plataforma con `apiClient.getCurrentUserWithRole()`
   - Sidebar: `PlatformSidebar`

5. **AuthLayout** (`apps/web/app/(auth)/layout.tsx`)
   - Layout para páginas de autenticación

6. **SettingsLayout** (`apps/web/app/app/settings/layout.tsx`)
   - Layout anidado para settings

7. **DocsLayout** (`apps/web/app/app/docs/layout.tsx`)
   - Layout para documentación

8. **PlatformDocsLayout** (`apps/web/app/platform/documentation/layout.tsx`)
   - Layout para documentación de plataforma

### 🔧 Middleware

**Archivo:** `apps/web/middleware.ts`
- **Estado:** DESHABILITADO (comentado para diagnóstico)
- **Funcionalidad original:** Validaciones de seguridad para ngrok, autenticación básica, whitelist de IPs
- **Matcher:** Vacío (no aplica a ninguna ruta actualmente)

### 🎯 Providers Globales

1. **TooltipProvider** (`@/components/ui/tooltip`)
   - Wrapper para tooltips
   - Ubicación: RootLayout

2. **LocaleProvider** (`@/lib/i18n/client`)
   - Gestión de i18n en client components
   - Cache de traducciones
   - Carga inicial: common, landing, platform
   - Ubicación: RootLayout

3. **CookieConsent** (`@/components/cookie-consent`)
   - Componente client-side
   - Lee/escribe localStorage
   - Ubicación: RootLayout

4. **Toaster** (`@/components/ui/toaster`)
   - Sistema de notificaciones toast
   - Ubicación: RootLayout

5. **Sonner** (`@/components/ui/sonner`)
   - Sistema alternativo de notificaciones
   - Ubicación: RootLayout

### 🔍 Funciones Críticas

1. **detectLocale()** (`@/lib/i18n/index.ts`)
   - Async function
   - Lee cookies y headers
   - Cache por request (ya optimizado)
   - Se ejecuta en:
     - RootLayout (cada request)
     - Marketing page (cada request)

2. **getCurrentUserWithRole()** (`@/lib/api/client`)
   - Llamada API a `/session/me`
   - Se ejecuta en:
     - AppLayout (useEffect)
     - PlatformLayout (useEffect)
   - Tiene cache en el cliente

3. **getTenantSettings()** (`@/lib/api/client`)
   - Llamada API para branding
   - Se ejecuta en AppLayout (useEffect)

### 📡 API Endpoints Principales

1. `/api/session/me` - Sesión actual (usuario, roles, tenants)
2. `/api/proxy/[...path]` - Proxy para API backend
3. Backend API (NestJS): `http://localhost:3001`
   - `/api/v1/session/me`
   - `/api/v1/tenants/settings`
   - Y otros endpoints...

### 🗄️ Base de Datos

- **ORM:** Prisma
- **DB:** MySQL
- **Pool:** Automático (Prisma)
- **Queries principales:**
  - `user.findUnique()` - Login, sesión
  - `user.findFirst()` - Verificaciones
  - `tenantmembership` - Relaciones usuario-tenant
  - Queries con includes anidados

### 📦 Componentes Dinámicos

**Landing page** usa `dynamic()` imports para:
- Navigation
- HeroSection
- ProductSection
- HowItWorksSection
- BenefitsSection
- ROICalculatorSection
- FAQSection
- Footer

Todos con `ssr: true` (necesarios para SEO).

---

## 🎯 Áreas de Investigación (Prioridad)

1. **RootLayout + detectLocale()** - Se ejecuta en cada request
2. **AppLayout/PlatformLayout** - Verificaciones de auth en client (useEffect)
3. **Providers globales** - TooltipProvider, LocaleProvider, CookieConsent, Toaster, Sonner
4. **API calls** - getCurrentUserWithRole, getTenantSettings
5. **Dynamic imports** - Landing page con múltiples dynamic imports
6. **Prisma queries** - Verificar N+1, índices, queries pesadas

---

## 📝 Notas

- Middleware está deshabilitado (no es el problema actual)
- `/test-page` carga rápido (Next.js funciona bien)
- El problema es específico del SaaS (no Next.js/Node)
- Ya hay optimización de cache en `detectLocale()`

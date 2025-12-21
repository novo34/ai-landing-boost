# Autenticación y Multitenancy - FASE 1B

> **Fecha:** 2025-12-09  
> **Estado:** Implementado  
> **Fase:** 1B - Autenticación básica + modelo de Tenants y Usuarios

---

## Resumen

Esta fase implementa la autenticación básica con JWT y el modelo de multitenancy inicial, dejando la arquitectura preparada para RBAC, SSO y billing futuro.

---

## Modelos de Base de Datos

### User

Modelo para usuarios del sistema.

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?  // nullable para usuarios SSO-only
  name         String?
  locale       String?  // ej: "es-ES", "en"
  timeZone     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships TenantMembership[]
}
```

**Características:**
- Email único como identificador principal
- `passwordHash` nullable para permitir usuarios SSO-only en el futuro
- Relación con `TenantMembership` para acceso a múltiples tenants

### Tenant

Modelo para empresas/organizaciones (tenants).

```prisma
model Tenant {
  id            String        @id @default(cuid())
  name          String
  slug          String        @unique // para subdominio o URL amigable
  country       String?       // "ES", "CH", etc.
  defaultLocale String?
  dataRegion    String?       // "EU", "CH", …
  trialEndsAt   DateTime?
  status        TenantStatus  @default(ACTIVE)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  memberships TenantMembership[]
}
```

**Características:**
- `slug` único para URLs amigables o subdominios
- `status` para controlar estado (ACTIVE, TRIAL, SUSPENDED, CANCELLED)
- `trialEndsAt` para gestionar períodos de prueba
- `dataRegion` para cumplimiento GDPR/nLPD (data residency)

### TenantMembership

Relación muchos-a-muchos entre User y Tenant con rol.

```prisma
model TenantMembership {
  id        String     @id @default(cuid())
  userId    String
  tenantId  String
  role      TenantRole @default(AGENT)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
}
```

**Características:**
- Índice único en `[userId, tenantId]` para evitar duplicados
- Rol por membership (OWNER, ADMIN, AGENT, VIEWER)
- Cascade delete para mantener integridad

### Enums

**TenantStatus:**
- `ACTIVE` - Tenant activo
- `TRIAL` - En período de prueba
- `SUSPENDED` - Suspendido
- `CANCELLED` - Cancelado

**TenantRole:**
- `OWNER` - Dueño del tenant
- `ADMIN` - Administrador
- `AGENT` - Agente (usuario estándar)
- `VIEWER` - Solo lectura

---

## Diagrama de Relaciones

```
User
  │
  ├── TenantMembership (many-to-many)
  │     │
  │     ├── role: TenantRole
  │     │
  │     └── Tenant
  │           ├── name, slug, status
  │           ├── trialEndsAt
  │           └── dataRegion
```

**Flujo de registro:**
1. Usuario se registra → se crea `User`
2. Se crea `Tenant` inicial automáticamente
3. Se crea `TenantMembership` con rol `OWNER`

---

## Endpoints de API

### Autenticación

#### `POST /auth/register`

Registra un nuevo usuario y crea su tenant inicial.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Juan Pérez",
  "tenantName": "Mi Empresa"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  }
}
```

**Comportamiento:**
- Crea `User` con password hasheado (bcrypt)
- Genera `slug` único desde `tenantName` o email
- Crea `Tenant` con status `TRIAL` y 14 días de prueba
- Crea `TenantMembership` con rol `OWNER`
- Emite cookies HttpOnly con `access_token` y `refresh_token`

**Nota:** Los tokens se envían automáticamente como cookies HttpOnly y no se incluyen en el body de la respuesta por seguridad.

#### `POST /auth/login`

Inicia sesión con email y contraseña.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  }
}
```

**Comportamiento:**
- Valida email y contraseña
- Selecciona el primer tenant activo/trial del usuario
- Emite cookies HttpOnly con `access_token` y `refresh_token`

**Nota:** Los tokens se envían automáticamente como cookies HttpOnly y no se incluyen en el body de la respuesta por seguridad.

#### `POST /auth/refresh`

Renueva el access token usando el refresh token desde cookie.

**Request:**
- No requiere body. El `refresh_token` se lee automáticamente desde la cookie HttpOnly.

**Response:**
```json
{
  "success": true
}
```

**Nota:** Los nuevos tokens (`access_token` y `refresh_token`) se envían automáticamente como cookies HttpOnly. Se realiza rotación del refresh token por seguridad.

#### `POST /auth/logout`

Cierra sesión (placeholder por ahora).

**Response:**
```json
{
  "success": true
}
```

**TODO:** Implementar revocación de refresh tokens si se persisten en BD.

---

### Usuarios

#### `GET /users/me`

Obtiene el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "locale": "es-ES",
    "memberships": [
      {
        "tenant": {
          "id": "clx456...",
          "name": "Mi Empresa",
          "slug": "mi-empresa",
          "status": "TRIAL"
        },
        "role": "OWNER"
      }
    ]
  }
}
```

---

### Tenants

#### `GET /tenants/my`

Lista todos los tenants del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx456...",
      "name": "Mi Empresa",
      "slug": "mi-empresa",
      "country": "ES",
      "defaultLocale": "es-ES",
      "dataRegion": "EU",
      "status": "TRIAL",
      "trialEndsAt": "2025-12-23T00:00:00.000Z",
      "role": "OWNER",
      "membershipId": "clx789...",
      "joinedAt": "2025-12-09T00:00:00.000Z"
    }
  ]
}
```

#### `GET /tenants/current?tenantId=xxx`

Obtiene el tenant actual (requiere `tenantId` en query).

**Headers:**
```
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>  // Opcional, también puede venir en query
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx456...",
    "name": "Mi Empresa",
    "slug": "mi-empresa",
    "status": "TRIAL",
    "role": "OWNER",
    "membershipId": "clx789..."
  }
}
```

**Validación:**
- Verifica que el usuario tiene un `TenantMembership` para ese tenant
- Retorna 403 si no tiene acceso

---

## Contexto de Tenant

### TenantContextGuard

Guard implementado en `apps/api/src/common/guards/tenant-context.guard.ts` que:

1. Extrae `tenant_id` del header `x-tenant-id`
2. Verifica que el usuario autenticado tiene un `TenantMembership` para ese tenant
3. Adjunta `tenantId` y `tenantRole` al `Request` para uso en servicios

**Uso:**
```typescript
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Get('endpoint')
async myEndpoint(@CurrentTenant() tenant: { id: string; role: string }) {
  // tenant.id y tenant.role disponibles
}
```

**Nota:** Por ahora, el guard no es obligatorio en todas las rutas. Se aplicará según se vayan implementando módulos de negocio.

**TODO:** En el futuro, el `tenant_id` debería venir del JWT en lugar del header para mayor seguridad.

---

## Frontend

### Páginas Implementadas

#### `/login`

Página de inicio de sesión con:
- Formulario de email y contraseña
- Validación básica
- Integración con `apiClient.login()`
- Redirección a `/app` en éxito

#### `/register`

Página de registro con:
- Formulario completo (email, password, name, tenantName)
- Validación de contraseñas coincidentes
- Integración con `apiClient.register()`
- Redirección a `/app` en éxito

#### `/app`

Dashboard básico (shell) con:
- Verificación de autenticación
- Visualización de perfil de usuario
- Lista de tenants del usuario
- Botón de logout

### Cliente API

Cliente centralizado en `apps/web/lib/api/client.ts` que:

- Maneja tokens JWT (access + refresh)
- Intercepta requests para añadir `Authorization` header
- Maneja refresh automático de tokens
- Redirige a `/login` si no está autenticado
- Añade header `x-tenant-id` si está disponible

**Nota:** Usa cookies HttpOnly para tokens. Los tokens no se almacenan en `localStorage` ni son accesibles desde JavaScript por seguridad.

---

## Configuración

### Variables de Entorno

**Backend (`apps/api/.env`):**
```env
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"  # Opcional, usa JWT_SECRET si no se define
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:3000"
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Migración de Base de Datos

### Ejecutar Migración

```bash
cd apps/api
npx prisma format
npx prisma migrate dev --name add_auth_and_tenants
npx prisma generate
```

**Nombre de migración:** `add_auth_and_tenants`

---

## Próximos Pasos (Futuro)

### FASE 1C - RBAC Completo
- Implementar permisos granulares
- RBACGuard completo
- Decorator `@RequirePermission()`

### FASE 2 - SSO
- Integración con Google OAuth
- Integración con Microsoft Azure AD
- Métodos `loginWithGoogle()` y `loginWithMicrosoft()` en `AuthService`

### FASE 3 - Billing
- Integración con Stripe
- Modelos de suscripción
- Webhooks de Stripe

### FASE 4 - Módulos de Negocio
- Aplicar `TenantContextGuard` a todos los módulos
- Añadir `tenantId` a entidades de negocio
- Implementar filtrado por tenant en queries

---

## Notas de Seguridad

⚠️ **Importante:**

1. **Tokens en cookies HttpOnly:** ✅ Implementado. Los tokens se manejan automáticamente mediante cookies HttpOnly, Secure en producción, SameSite=Lax.

2. **JWT_SECRET:** Cambiar el secret por defecto en producción.

3. **Refresh tokens:** Se realiza rotación automática en cada refresh. No se persisten en BD por ahora. Implementar revocación si es necesario en el futuro.

4. **Rate limiting:** ✅ Implementado con `@nestjs/throttler`:
   - `POST /auth/register`: 3 registros por minuto
   - `POST /auth/login`: 5 intentos por minuto
   - `POST /auth/refresh`: 20 refreshes por 10 minutos

5. **Validación de entrada:** Todos los DTOs usan `class-validator` para validación. Contraseñas requieren: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.

6. **CORS:** Configurado estrictamente para `FRONTEND_URL` con `credentials: true`.

7. **Helmet:** Configurado con headers de seguridad apropiados.

**Ver documentación detallada en:** `docs/02b-auth-security-hardening.md`

---

## Referencias

- `IA-Specs/03-multitenancy-rbac-y-privacidad.mdc` - Estándares de multitenancy
- `IA-Specs/04-seguridad-y-compliance.mdc` - Estándares de seguridad
- `IA-Specs/05-frontend-standards.mdc` - Estándares frontend
- `IA-Specs/06-backend-standards.mdc` - Estándares backend


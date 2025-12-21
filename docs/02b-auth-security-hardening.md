# Endurecimiento de Seguridad - Autenticación (FASE 1C)

> **Fecha:** 2025-12-09  
> **Estado:** Implementado  
> **Fase:** 1C - Endurecimiento completo de autenticación y seguridad base

---

## Resumen

Esta fase endurece completamente la autenticación y seguridad base, migrando de tokens en `localStorage` a cookies HttpOnly, implementando rate limiting, fortaleciendo validación de contraseñas, y configurando CORS y Helmet correctamente. La implementación está lista para producción sin TODOs pendientes en esta área.

---

## Cambios Implementados

### 1. Migración a Cookies HttpOnly

#### Backend (NestJS)

**Antes:**
- Tokens devueltos en el body de la respuesta
- Cliente almacenaba tokens en `localStorage`

**Ahora:**
- `POST /auth/login`: Emite cookies `access_token` y `refresh_token` HttpOnly
- `POST /auth/register`: Emite cookies `access_token` y `refresh_token` HttpOnly
- `POST /auth/refresh`: Lee `refresh_token` desde cookie, emite nuevas cookies (rotación)
- `POST /auth/logout`: Limpia cookies en la respuesta

**Configuración de cookies:**
```typescript
{
  httpOnly: true,           // No accesible desde JavaScript
  secure: isProduction,     // Solo HTTPS en producción
  sameSite: 'lax',          // Protección CSRF
  expires: accessTokenExpires, // 15-30 minutos (configurable)
  path: '/',
}
```

**Variables de entorno:**
- `JWT_EXPIRES_IN`: Expiración del access token (default: `15m`)
- `JWT_REFRESH_EXPIRES_IN`: Expiración del refresh token (default: `7d`)
- `NODE_ENV`: Controla si `secure` está activo

#### Frontend (Next.js)

**Cambios:**
- Eliminado uso de `localStorage` para tokens
- Cliente API usa `credentials: 'include'` automáticamente
- Método `checkAuth()` verifica autenticación llamando a `/users/me`
- Método `isAuthenticated()` deprecado (no puede verificar cookies HttpOnly)

**Cliente API actualizado:**
```typescript
// Antes
async login(email: string, password: string) {
  const response = await this.post('/auth/login', { email, password });
  this.setTokens(response.data.accessToken, response.data.refreshToken);
  return response;
}

// Ahora
async login(email: string, password: string) {
  // Los tokens se guardan automáticamente en cookies HttpOnly
  const response = await this.post('/auth/login', { email, password });
  return response; // Solo contiene info del usuario, no tokens
}
```

---

### 2. Configuración de CORS y Helmet

#### CORS (`apps/api/src/main.ts`)

```typescript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = frontendUrl.split(',').map((url) => url.trim());

app.enableCors({
  origin: (origin, callback) => {
    // Permitir requests sin origin solo en desarrollo
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Verificar si el origin está en la lista permitida
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Necesario para cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
});
```

**Variable de entorno:**
- `FRONTEND_URL`: URL del frontend (puede ser múltiple separado por comas)

#### Helmet

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Compatible con cookies
  }),
);
```

---

### 3. Rate Limiting

Implementado con `@nestjs/throttler` en `apps/api/src/app.module.ts`:

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 60000,    // 1 minuto
    limit: 10,     // 10 requests por minuto
  },
  {
    name: 'medium',
    ttl: 600000,   // 10 minutos
    limit: 50,     // 50 requests por 10 minutos
  },
  {
    name: 'long',
    ttl: 3600000,  // 1 hora
    limit: 200,    // 200 requests por hora
  },
]),
```

**Límites específicos en endpoints de auth:**

```typescript
@Post('register')
@Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 registros por minuto

@Post('login')
@Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto

@Post('refresh')
@Throttle({ medium: { limit: 20, ttl: 600000 } }) // 20 refreshes por 10 minutos
```

---

### 4. Fortalecimiento de Contraseñas

#### Backend (`apps/api/src/modules/auth/dto/register.dto.ts`)

```typescript
@IsString()
@MinLength(8, { message: 'auth.password_min_length' })
@MaxLength(100)
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  { message: 'auth.password_requirements' }
)
password: string;
```

**Requisitos:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (`@$!%*?&`)

#### Hash de Contraseñas

```typescript
// Coste configurable mediante variable de entorno
const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);
```

**Variable de entorno:**
- `BCRYPT_ROUNDS`: Coste de bcrypt (default: `12`, recomendado para producción)

#### Frontend

Validación en tiempo real en el formulario de registro para mejorar UX.

---

### 5. Revisión de Multi-tenancy y Guards

#### TenantContextGuard

**Mejoras:**
- Documentación mejorada con ejemplos de uso
- Validación clara de membership
- Adjunta `tenantId` y `tenantRole` al request

**Uso:**
```typescript
@UseGuards(JwtAuthGuard, TenantContextGuard)
@Get('endpoint')
async myEndpoint(@CurrentTenant() tenant: { id: string; role: string }) {
  // tenant.id y tenant.role disponibles
}
```

**Comportamiento:**
- Si `x-tenant-id` está presente: valida membership y adjunta al request
- Si `x-tenant-id` no está presente: permite acceso pero no adjunta tenantId

---

### 6. Estado de Sesión en Frontend

#### Verificación de Autenticación

**Antes:**
```typescript
if (!apiClient.isAuthenticated()) {
  router.push('/login');
}
```

**Ahora:**
```typescript
const isAuthenticated = await apiClient.checkAuth();
if (!isAuthenticated) {
  router.push('/login');
}
```

**Método `checkAuth()`:**
- Llama a `/users/me` con cookies automáticamente
- Retorna `true` si hay sesión válida, `false` en caso contrario
- Maneja errores 401 automáticamente (intenta refresh)

#### Manejo de Sesión Expirada

El cliente API maneja automáticamente:
1. Si recibe 401, intenta refresh token
2. Si refresh falla, redirige a `/login`
3. Muestra mensaje amigable si es necesario

---

## Diagrama de Flujo de Autenticación

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST /auth/login { email, password }
       ▼
┌─────────────┐
│   Backend   │
│  (NestJS)   │
└──────┬──────┘
       │ 1. Validar credenciales
       │ 2. Generar tokens JWT
       │ 3. Emitir cookies HttpOnly
       ▼
┌─────────────┐
│  Response   │
│ { user }    │
│ + Cookies   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Cliente   │
│  (Next.js)  │
└──────┬──────┘
       │ Cookies se guardan automáticamente
       │ (no accesibles desde JavaScript)
       ▼
┌─────────────┐
│  Requests   │
│  automáticos│
│  con cookies│
└─────────────┘
```

**Flujo de Refresh:**
```
Cliente → POST /auth/refresh (con cookie refresh_token)
         ↓
Backend → Valida refresh_token
         ↓
         Genera nuevos tokens
         ↓
         Emite nuevas cookies (rotación)
         ↓
Cliente ← Cookies actualizadas automáticamente
```

---

## Variables de Entorno

### Backend (`apps/api/.env`)

```env
# Base de datos
DATABASE_URL="mysql://user:password@localhost:3306/dbname"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"  # Opcional, usa JWT_SECRET si no se define
JWT_EXPIRES_IN="15m"                          # Expiración access token
JWT_REFRESH_EXPIRES_IN="7d"                   # Expiración refresh token

# Seguridad
BCRYPT_ROUNDS="12"                            # Coste de bcrypt (12 recomendado para producción)

# CORS
FRONTEND_URL="http://localhost:3000"           # URL del frontend (puede ser múltiple separado por comas)
NODE_ENV="development"                        # "production" activa cookies Secure

# Puerto
PORT="3001"
```

### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Cómo Probar

### 1. Login

```bash
# Request
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"Password123!"}' \
  -c cookies.txt

# Response
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  }
}

# Cookies guardadas en cookies.txt:
# - access_token (HttpOnly, Secure en producción)
# - refresh_token (HttpOnly, Secure en producción)
```

### 2. Refresh

```bash
# Request (usa cookies del login)
curl -X POST http://localhost:3001/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# Response
{
  "success": true
}

# Nuevas cookies emitidas (rotación)
```

### 3. Acceso a Endpoint Protegido

```bash
# Request (usa cookies automáticamente)
curl -X GET http://localhost:3001/users/me \
  -b cookies.txt

# Response
{
  "success": true,
  "data": {
    "id": "clx123...",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "memberships": [...]
  }
}
```

### 4. Logout

```bash
# Request
curl -X POST http://localhost:3001/auth/logout \
  -b cookies.txt \
  -c cookies.txt

# Response
{
  "success": true
}

# Cookies limpiadas
```

### 5. Prueba de Rate Limiting

```bash
# Intentar login 6 veces en menos de 1 minuto
for i in {1..6}; do
  curl -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# La 6ª petición debería retornar 429 Too Many Requests
```

---

## Consideraciones para Producción

### 1. Cookies Secure

En producción, asegúrate de que:
- `NODE_ENV=production` está configurado
- El backend está detrás de HTTPS
- Las cookies se emiten con `secure: true`

### 2. FRONTEND_URL

Configura `FRONTEND_URL` con la URL real del frontend:
```env
FRONTEND_URL="https://app.tudominio.com"
```

Para múltiples orígenes:
```env
FRONTEND_URL="https://app.tudominio.com,https://www.tudominio.com"
```

### 3. JWT Secrets

**NUNCA** uses los secrets por defecto en producción:
```env
JWT_SECRET="cambiar-por-secret-aleatorio-y-largo"
JWT_REFRESH_SECRET="cambiar-por-secret-diferente-y-largo"
```

Genera secrets seguros:
```bash
# Generar secret aleatorio
openssl rand -base64 32
```

### 4. BCRYPT_ROUNDS

Para producción, usa al menos 12 rounds:
```env
BCRYPT_ROUNDS="12"
```

**Nota:** Más rounds = más seguro pero más lento. 12 es un buen balance.

### 5. Rate Limiting

Ajusta los límites según tu tráfico esperado:
- Para SaaS con muchos usuarios: considera límites más altos
- Para APIs públicas: considera límites más bajos

### 6. Monitoreo

Considera añadir:
- Logging de intentos de login fallidos
- Alertas para rate limiting excesivo
- Métricas de autenticación

---

## Seguridad Adicional (Futuro)

Estas mejoras están fuera del alcance de esta fase pero se pueden implementar en el futuro:

1. **Revocación de Refresh Tokens:**
   - Persistir refresh tokens en BD
   - Marcar como revocados en logout
   - Validar revocación en refresh

2. **2FA (Two-Factor Authentication):**
   - TOTP (Google Authenticator, etc.)
   - SMS (menos seguro)

3. **Password Reset:**
   - Endpoint `POST /auth/forgot-password`
   - Endpoint `POST /auth/reset-password`
   - Tokens de reset con expiración corta

4. **Session Management:**
   - Listar sesiones activas
   - Revocar sesiones específicas
   - Notificaciones de nuevos logins

5. **Audit Logging:**
   - Registrar todos los intentos de login
   - Registrar cambios de contraseña
   - Registrar cambios de permisos

---

## Referencias

- `docs/02-auth-and-tenants.md` - Documentación base de autenticación
- `apps/api/src/modules/auth/` - Código fuente del módulo de auth
- `apps/web/lib/api/client.ts` - Cliente API del frontend
- `apps/api/src/main.ts` - Configuración de CORS y Helmet
- `apps/api/src/app.module.ts` - Configuración de rate limiting

---

## Checklist de Implementación

- [x] Migración a cookies HttpOnly
- [x] Configuración de CORS estricta
- [x] Configuración de Helmet
- [x] Rate limiting en endpoints de auth
- [x] Validación robusta de contraseñas
- [x] Coste adecuado de bcrypt
- [x] Eliminación de localStorage para tokens
- [x] Actualización de cliente API
- [x] Actualización de páginas frontend
- [x] Revisión de TenantContextGuard
- [x] Documentación actualizada
- [x] Sin TODOs pendientes en esta área

---

**Estado:** ✅ **PRODUCTION READY** para autenticación y seguridad base.


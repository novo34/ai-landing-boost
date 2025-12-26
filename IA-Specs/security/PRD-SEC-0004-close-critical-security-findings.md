# PRD-SEC-0004: Cierre de Hallazgos Críticos de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Prioridad:** P0 (Security)  
**Estado:** Pendiente de Implementación

---

## 1. Problema y Contexto

### 1.1 Resumen Ejecutivo
Este PRD consolida la solución de tres hallazgos críticos de seguridad identificados en la auditoría del monorepo:

1. **H1 (P0):** Refresh tokens sin persistencia, rotación ni revocación, con fallback de secreto inseguro
2. **H2 (P1):** Middleware de seguridad de Next.js deshabilitado (basic auth, allowlist, headers)
3. **H3 (P1):** Lockfiles de múltiples gestores presentes (npm, bun) coexistiendo con pnpm

### 1.2 Puntos Críticos Actuales / Evidencia

#### H1 - Refresh Tokens
- **Evidencia:** Refresh tokens se firman/verifican con `JWT_REFRESH_SECRET || JWT_SECRET || 'your-secret-key-change-in-production'`
- **Evidencia:** No hay tabla de persistencia ni revocación/rotación
- **Archivo afectado:** `apps/api/src/modules/auth/auth.service.ts` (líneas 228-307)

#### H2 - Middleware Deshabilitado
- **Evidencia:** Middleware devuelve `NextResponse.next()` inmediatamente
- **Evidencia:** El `matcher` está vacío (no hay basic auth, allowlist ni headers)
- **Archivo afectado:** `apps/web/middleware.ts` (líneas 10-101)

#### H3 - Lockfiles Múltiples
- **Evidencia:** Persisten lockfiles de npm en raíz (`package-lock.json`) y `apps/api/package-lock.json`
- **Evidencia:** Coexisten con `pnpm-lock.yaml` y posiblemente `bun.lockb`
- **Impacto:** Instalaciones no reproducibles y versiones divergentes en CI/dev

---

## 2. Objetivos

### 2.1 Objetivo Principal
**Cerrar los tres hallazgos críticos pendientes:**
1. Refresh tokens sin persistencia/rotación/revocación y con fallback de secreto inseguro
2. Middleware de seguridad de Next.js deshabilitado
3. Lockfiles de múltiples gestores presentes

### 2.2 Metas (Imprescindibles)

#### Meta 1: Refresh Tokens Hardening
- Implementar persistencia, rotación y revocación de refresh tokens
- Usar solo `JWT_REFRESH_SECRET` obligatorio (sin fallback)
- Validar longitud mínima (≥32 caracteres)

#### Meta 2: Middleware de Seguridad
- Reactivar middleware de Next.js con:
  - Basic auth opcional (si está configurada)
  - Allowlist de IPs
  - Headers de entorno
- Matcher activo para rutas `app`

#### Meta 3: Unificación de Gestor
- Unificar gestor en pnpm
- Eliminar lockfiles de npm/bun
- Proteger con `.gitignore`

### 2.3 NO-Objetivos
- ❌ Rediseñar el flujo de access tokens ni UI
- ❌ Cambiar providers OAuth existentes
- ❌ Modificar estructura de workspace
- ❌ Cambiar configuración de CORS (manejado en backend)

---

## 3. Usuarios y Actores Afectados

### 3.1 Historias de Usuarios/Operadores

#### Historia 1: Usuario Autenticado
**Como** usuario autenticado,  
**Quiero** que si mi refresh token se roba y hago logout,  
**Para que** el token robado no siga funcionando.

**Criterio de aceptación:**
- Al hacer logout, el refresh token activo se revoca en BD
- Un token robado no puede usarse después del logout
- El sistema registra intentos de uso de tokens revocados

#### Historia 2: Operador de Infraestructura
**Como** operador,  
**Cuando** expongo la app vía ngrok,  
**Quiero** que pida basic auth y respete allowlist de IPs,  
**Para que** la aplicación no esté expuesta públicamente sin controles.

**Criterio de aceptación:**
- Si `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` están configurados, se requiere basic auth
- Si `NGROK_ALLOWED_IPS` está configurado, solo IPs permitidas pueden acceder
- Headers `X-Environment` y `X-Security-Warning` se agregan en ngrok

#### Historia 3: Desarrollador/CI
**Como** dev/CI,  
**Quiero** instalaciones reproducibles con un solo lockfile (pnpm),  
**Para que** las dependencias sean consistentes entre entornos.

**Criterio de aceptación:**
- Solo existe `pnpm-lock.yaml` en el repositorio
- `package-lock.json` y `bun.lockb` están eliminados y en `.gitignore`
- CI valida que no se reintroduzcan lockfiles de otros gestores

---

## 4. Criterios de Aceptación

### CA-001: Refresh Tokens con Persistencia y Rotación
**Given:** Un usuario hace login y recibe un refresh token  
**When:** El usuario llama a `/auth/refresh`  
**Then:**
- El token se verifica en BD (hash SHA-256)
- Se rechaza si no existe, está expirado o revocado
- Se genera un nuevo par de tokens (access + refresh)
- El token anterior se marca como revocado con `replacedByTokenId`
- Se rechazan tokens firmados con secretos por defecto o sin persistencia en BD

### CA-002: Logout Revoca Refresh Token
**Given:** Un usuario tiene un refresh token activo  
**When:** El usuario llama a `/auth/logout`  
**Then:**
- El refresh token activo se revoca en BD (`revokedAt` se establece)
- Intentos posteriores de usar el token revocado fallan con 401/403

### CA-003: Middleware Aplica Seguridad
**Given:** La aplicación está expuesta vía ngrok  
**When:** Se accede a cualquier ruta de la app  
**Then:**
- Si `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` están configurados, se requiere basic auth
- Si `NGROK_ALLOWED_IPS` está configurado, IPs fuera de la lista reciben 403
- Headers `X-Environment` y `X-Security-Warning` se agregan
- El matcher aplica a todas las rutas excepto API, assets estáticos y favicon

### CA-004: Unificación de Lockfiles
**Given:** El repositorio se clona  
**When:** Se ejecuta `pnpm install`  
**Then:**
- Solo existe `pnpm-lock.yaml` en la raíz
- No existen `package-lock.json`, `bun.lockb` ni `apps/api/package-lock.json`
- Los lockfiles de otros gestores están en `.gitignore`

### CA-005: Construcciones y Pruebas
**Given:** Se completa la implementación  
**When:** Se ejecutan las pruebas  
**Then:**
- `pnpm --filter @ai-landing-boost/api test` pasa
- `pnpm --filter @ai-landing-boost/web build` pasa
- Flujo manual: login → refresh nuevo → refresh con token previo (esperado 401/403) → logout → refresh (esperado 401/403)

---

## 5. Especificación Técnica

### 5.1 Backend (API)

#### 5.1.1 Prisma Model
**Archivo:** `apps/api/prisma/schema.prisma`

Añadir modelo `refreshtoken`:
```prisma
model refreshtoken {
  id                String    @id @default(cuid())
  userId            String
  tenantId          String?   // Opcional, para multi-tenant
  tokenHash         String    @db.VarChar(64) // SHA-256 hash (64 chars hex)
  expiresAt         DateTime
  revokedAt         DateTime? // NULL = activo, NOT NULL = revocado
  replacedByTokenId String?   // ID del token que lo reemplazó (rotación)
  userAgent         String?   // Opcional, para auditoría
  ip                String?   // Opcional, para auditoría
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user   user    @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tokenHash], map: "Refreshtoken_tokenHash_key")
  @@index([userId], map: "Refreshtoken_userId_idx")
  @@index([tokenHash], map: "Refreshtoken_tokenHash_idx")
  @@index([expiresAt], map: "Refreshtoken_expiresAt_idx")
  @@index([revokedAt], map: "Refreshtoken_revokedAt_idx")
  @@index([userId, revokedAt], map: "Refreshtoken_userId_revokedAt_idx")
  @@map("Refreshtoken")
}
```

**Actualizar modelos relacionados:**
```prisma
model user {
  // ... campos existentes ...
  refreshtoken refreshtoken[]
}

model tenant {
  // ... campos existentes ...
  refreshtoken refreshtoken[]
}
```

#### 5.1.2 Validación de Entorno
**Archivo:** `apps/api/src/config/env.validation.ts`

**Cambios requeridos:**
- Exigir `JWT_REFRESH_SECRET` (sin fallback)
- Prohibir valores por defecto (`'your-secret-key-change-in-production'`, etc.)
- Validar longitud mínima ≥32 caracteres
- Fail fast al boot si no está configurado

**Ejemplo de validación:**
```typescript
// JWT_REFRESH_SECRET es obligatorio
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno.');
}

// No aceptar valores por defecto
const defaultSecrets = [
  'your-secret-key-change-in-production',
  'your-super-secret-jwt-key-change-in-production-min-32-chars',
];
if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64');
}

// Validar longitud mínima
if (process.env.JWT_REFRESH_SECRET.length < 32) {
  console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
}
```

#### 5.1.3 Servicio de Autenticación
**Archivo:** `apps/api/src/modules/auth/auth.service.ts`

##### Método `generateTokens()`
**Cambios:**
1. Crear `jti` (JWT ID) único para cada refresh token
2. Firmar refresh token solo con `JWT_REFRESH_SECRET` (sin fallback)
3. Almacenar hash SHA-256 del token + metadatos en tabla `refreshtoken`
4. Incluir `jti` en el payload del JWT para referencia

**Pseudocódigo:**
```typescript
private async generateTokens(userId: string, email: string, tenantId: string): Promise<AuthTokens> {
  const payload = {
    sub: userId,
    email,
    tenantId,
    jti: randomUUID(), // JWT ID único
  };

  // Access token (sin cambios)
  const accessToken = this.jwtService.sign(payload, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  // Refresh token (solo con JWT_REFRESH_SECRET)
  const refreshSecret = process.env.JWT_REFRESH_SECRET!; // Obligatorio
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  const refreshToken = this.jwtService.sign(payload, {
    secret: refreshSecret,
    expiresIn: refreshExpiresIn,
  });

  // Persistir en BD
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresInMs = this.parseExpiresIn(refreshExpiresIn);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await this.prisma.refreshtoken.create({
    data: {
      userId,
      tenantId: tenantId || null,
      tokenHash,
      expiresAt,
      // userAgent y ip opcionales (si están disponibles en el request)
    },
  });

  return { accessToken, refreshToken };
}
```

##### Método `refresh()`
**Cambios:**
1. Verificar JWT con `JWT_REFRESH_SECRET` (sin fallback)
2. Buscar `tokenHash` en BD
3. Rechazar si no existe, está expirado o `revokedAt` no es NULL
4. Rotar: generar nuevo par de tokens, crear nuevo registro y marcar `replacedByTokenId` + `revokedAt` en el anterior
5. Devolver nuevos tokens

**Pseudocódigo:**
```typescript
async refresh(refreshToken: string): Promise<{ success: boolean; tokens: AuthTokens }> {
  // 1. Verificar JWT con JWT_REFRESH_SECRET (obligatorio, sin fallback)
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  const payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });

  // 2. Buscar tokenHash en BD
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const tokenRecord = await this.prisma.refreshtoken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // 3. Validaciones
  if (!tokenRecord) {
    throw new UnauthorizedException({ error_key: 'auth.refresh_token_not_found' });
  }
  if (tokenRecord.revokedAt) {
    throw new UnauthorizedException({ error_key: 'auth.refresh_token_revoked' });
  }
  if (tokenRecord.expiresAt < new Date()) {
    throw new UnauthorizedException({ error_key: 'auth.refresh_token_expired' });
  }

  // 4. Rotar: generar nuevos tokens
  const newTokens = await this.generateTokens(
    tokenRecord.userId,
    tokenRecord.user.email,
    tokenRecord.tenantId || payload.tenantId
  );

  // 5. Marcar token anterior como revocado y reemplazado
  const newTokenHash = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
  const newTokenRecord = await this.prisma.refreshtoken.findUnique({
    where: { tokenHash: newTokenHash },
  });

  await this.prisma.refreshtoken.update({
    where: { id: tokenRecord.id },
    data: {
      revokedAt: new Date(),
      replacedByTokenId: newTokenRecord?.id || null,
    },
  });

  return { success: true, tokens: newTokens };
}
```

##### Método `logout()`
**Cambios:**
1. Si se recibe refresh token (cookie/header), buscar por `tokenHash` y revocar en BD
2. Opcional: endpoint para revocar todos los tokens del usuario

**Pseudocódigo:**
```typescript
async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
  if (refreshToken) {
    // Revocar token específico
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await this.prisma.refreshtoken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord && tokenRecord.userId === userId && !tokenRecord.revokedAt) {
      await this.prisma.refreshtoken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }
  } else {
    // Revocar todos los tokens activos del usuario
    await this.prisma.refreshtoken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  return { success: true };
}
```

#### 5.1.4 Controller
**Archivo:** `apps/api/src/modules/auth/auth.controller.ts`

**Cambios:**
- Mantener `@Throttle` en endpoint `/auth/refresh` (rate limiting)
- Asegurar lectura de cookie `refresh_token` y propagación al servicio para revocación

#### 5.1.5 Logs y Métricas
**Recomendaciones:**
- Agregar logs de intentos fallidos de refresh token
- Registrar rotaciones y revocaciones
- Métricas básicas de uso de refresh tokens

#### 5.1.6 Migración Prisma
**Comando:**
```bash
cd apps/api
pnpm prisma migrate dev --name add_refresh_token_persistence
```

**Documentación:**
- Documentar en `README.md` o `SETUP.md` los pasos de `prisma migrate`

### 5.2 Interfaz (Web)

#### 5.2.1 Middleware
**Archivo:** `apps/web/middleware.ts`

**Cambios requeridos:**
1. **Restaurar lógica de seguridad:**
   - Descomentar código de basic auth, allowlist e inyección de headers
   - Eliminar retorno inmediato `NextResponse.next()`

2. **Activar matcher:**
   ```typescript
   export const config = {
     matcher: [
       '/((?!api|_next/static|_next/image|favicon.ico).*)',
     ],
   };
   ```

3. **Basic auth condicionada:**
   - Solo aplicar si `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` están configurados
   - Verificar header `Authorization: Basic <credentials>`
   - Retornar 401 con `WWW-Authenticate` si falla

4. **Allowlist de IPs:**
   - Solo aplicar si `NGROK_ALLOWED_IPS` está configurado
   - Obtener IP del cliente desde headers (`x-forwarded-for`, `x-real-ip`)
   - Retornar 403 si IP no está en allowlist

5. **Headers de entorno:**
   - Agregar `X-Environment: development-ngrok` para ngrok
   - Agregar `X-Environment: production` para producción
   - Agregar `X-Security-Warning` para ngrok

6. **Mantener `measureSync`:**
   - No eliminar la medición de performance

**Estructura esperada:**
```typescript
export function middleware(request: NextRequest) {
  return measureSync('middleware', () => {
    const hostname = request.headers.get('host') || '';
    const isNgrok = hostname.includes('ngrok') || 
                    hostname.includes('ngrok-free') || 
                    hostname.includes('ngrok.io');
    
    if (isNgrok) {
      // Basic auth si está configurado
      const authUser = process.env.NGROK_AUTH_USER;
      const authPass = process.env.NGROK_AUTH_PASS;
      if (authUser && authPass) {
        // ... validación de basic auth ...
      }
      
      // Allowlist de IPs si está configurado
      const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim());
      if (allowedIPs && allowedIPs.length > 0) {
        // ... validación de IPs ...
      }
      
      // Headers de seguridad
      const response = NextResponse.next();
      response.headers.set('X-Environment', 'development-ngrok');
      response.headers.set('X-Security-Warning', 'Este es un entorno de desarrollo expuesto públicamente');
      return response;
    }
    
    // Producción: headers mínimos
    if (process.env.NODE_ENV === 'production') {
      const response = NextResponse.next();
      response.headers.set('X-Environment', 'production');
      return response;
    }
    
    return NextResponse.next();
  }, 'SERVER', { path: request.nextUrl.pathname });
}
```

### 5.3 Higiene Monorepo

#### 5.3.1 Eliminación de Lockfiles
**Archivos a eliminar:**
- `package-lock.json` (raíz)
- `bun.lockb` (raíz)
- `apps/api/package-lock.json`

**Comandos:**
```bash
# Regenerar pnpm-lock.yaml primero
pnpm install

# Eliminar lockfiles redundantes
rm package-lock.json
rm bun.lockb
rm apps/api/package-lock.json

# Verificar que solo existe pnpm-lock.yaml
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules
# (debe retornar nada)
```

#### 5.3.2 Actualización de .gitignore
**Archivo:** `.gitignore`

**Agregar:**
```
# Lockfiles de otros gestores (no permitidos)
package-lock.json
bun.lockb
**/package-lock.json
```

**Verificar:**
- `pnpm-lock.yaml` NO debe estar en `.gitignore`

#### 5.3.3 Documentación
**Archivos a actualizar:**
- `README.md`: Mencionar uso exclusivo de pnpm
- `SETUP.md` o guías de desarrollo: Instrucciones de `pnpm install`
- Recomendar limpieza de `node_modules` si se cambia de gestor

**Ejemplo:**
```markdown
## Instalación

Este proyecto usa **pnpm** como gestor de paquetes exclusivo.

```bash
# Instalar dependencias
pnpm install

# Si cambias de gestor, limpia node_modules primero
rm -rf node_modules apps/**/node_modules
pnpm install
```
```

---

## 6. Pruebas / Verificación

### 6.1 Backend

#### Prueba 1: Tests Unitarios
```bash
pnpm --filter @ai-landing-boost/api test
```

**Resultado esperado:** Todos los tests pasan

#### Prueba 2: Flujo Manual de Autenticación
**Pasos:**
1. Login: `POST /auth/login` → Obtener `refresh_token` en cookie
2. Refresh válido: `POST /auth/refresh` → Debe generar nuevos tokens
3. Refresh con token previo: `POST /auth/refresh` con token anterior → Debe fallar con 401/403
4. Logout: `POST /auth/logout` → Debe revocar token
5. Refresh después de logout: `POST /auth/refresh` con token revocado → Debe fallar con 401/403

**Resultado esperado:**
- Paso 2: ✅ Éxito
- Paso 3: ❌ 401/403 (token anterior revocado)
- Paso 4: ✅ Éxito
- Paso 5: ❌ 401/403 (token revocado en logout)

### 6.2 Frontend

#### Prueba 1: Build
```bash
pnpm --filter @ai-landing-boost/web build
```

**Resultado esperado:** Build exitoso sin errores

#### Prueba 2: Acceso vía ngrok
**Configuración:**
```bash
# .env.local
NGROK_AUTH_USER=admin
NGROK_AUTH_PASS=secret123
NGROK_ALLOWED_IPS=192.168.1.100,10.0.0.50
```

**Escenarios:**
1. **Sin credenciales:** Acceder a URL ngrok → Debe pedir basic auth (401)
2. **Con credenciales incorrectas:** Acceder con credenciales incorrectas → Debe rechazar (401)
3. **Con credenciales correctas:** Acceder con credenciales correctas → Debe permitir acceso
4. **IP fuera de allowlist:** Acceder desde IP no permitida → Debe rechazar (403)
5. **Headers presentes:** Verificar headers `X-Environment` y `X-Security-Warning` en respuesta

**Resultado esperado:**
- Escenario 1: ❌ 401 con `WWW-Authenticate`
- Escenario 2: ❌ 401
- Escenario 3: ✅ Acceso permitido
- Escenario 4: ❌ 403
- Escenario 5: ✅ Headers presentes

### 6.3 Monorepo

#### Prueba 1: Instalación Limpia
```bash
# Limpiar
rm -rf node_modules apps/**/node_modules

# Instalar
pnpm install

# Verificar lockfiles
ls -la | grep -E "package-lock|bun.lock|pnpm-lock"
# Debe mostrar solo pnpm-lock.yaml
```

**Resultado esperado:**
- Solo existe `pnpm-lock.yaml`
- No se regeneran `package-lock.json` ni `bun.lockb`

#### Prueba 2: CI Check (si está implementado)
**Crear PR con `package-lock.json`:**
- Debe fallar el check de validación de lockfiles
- Mensaje de error debe indicar usar `pnpm install`

---

## 7. Fuera de Alcance

### 7.1 Cambios No Incluidos
- ❌ Cambios en UI de login
- ❌ Modificaciones en flujos SSO (Google/Microsoft)
- ❌ Cambios en integración con Stripe
- ❌ Refactorizar almacenamiento en caché/sesión en el frontend
- ❌ Cambios en estructura de workspace
- ❌ Modificaciones en configuración de CORS

### 7.2 Mejoras Futuras (No en este PRD)
- Job de limpieza automática de tokens expirados
- Dashboard de administración para revocar tokens
- Alertas de seguridad para uso sospechoso de tokens
- Rate limiting más granular por IP/usuario

---

## 8. Dependencias y Orden de Implementación

### 8.1 Orden Recomendado
1. **H3 (P0 Chore):** Unificar lockfiles (pnpm) - **PRIMERO**
2. **H1 (P0 Security):** Hardening de refresh tokens - **SEGUNDO**
3. **H2 (P1 Security):** Re-habilitar middleware - **TERCERO**

**⚠️ NO cambiar este orden.** Cada fase puede depender de la anterior.

### 8.2 Dependencias Técnicas
- **H1 requiere:** Prisma migrado, validación de entorno funcionando
- **H2 requiere:** Middleware de Next.js disponible, variables de entorno configuradas
- **H3 requiere:** Ninguna (independiente)

### 8.3 Bloqueadores
- Ninguno externo. Todos los cambios son internos al monorepo.

---

## 9. Referencias

### 9.1 Documentos Relacionados
- **PRD-SEC-0001:** Unificación de Gestor de Paquetes (PNPM)
- **PRD-SEC-0002:** Hardening del Flujo de Refresh Tokens
- **PRD-SEC-0003:** Re-habilitación del Middleware de Seguridad Next.js
- **SPEC-SEC-0001:** Especificación Técnica - Lockfiles
- **SPEC-SEC-0002:** Especificación Técnica - Refresh Tokens
- **SPEC-SEC-0003:** Especificación Técnica - Middleware
- **TEST-PLAN-SEC:** Plan de Pruebas - Hallazgos de Seguridad
- **ROLLOUT-PLAN-SEC:** Plan de Rollout - Hallazgos de Seguridad

### 9.2 Hallazgos de Auditoría
- **H1 (P0):** Refresh tokens sin hardening
- **H2 (P1):** Middleware de seguridad deshabilitado
- **H3 (P1):** Múltiples lockfiles

### 9.3 Archivos Afectados
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/config/env.validation.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/middleware.ts`
- `.gitignore`
- `README.md` / `SETUP.md`

---

## 10. Definición de "Done"

### Checklist de Completitud

#### H1 - Refresh Tokens
- [ ] Tabla `refreshtoken` creada en Prisma y migrada
- [ ] `JWT_REFRESH_SECRET` es obligatorio (validación en `env.validation.ts`)
- [ ] `generateTokens()` persiste refresh tokens en BD
- [ ] `refresh()` verifica token en BD, rota y revoca anterior
- [ ] `logout()` revoca refresh token en BD
- [ ] Tests unitarios pasan
- [ ] Flujo manual verificado (login → refresh → logout → refresh falla)

#### H2 - Middleware
- [ ] Middleware restaurado con lógica de seguridad
- [ ] Matcher activo para rutas `app`
- [ ] Basic auth funciona si está configurado
- [ ] Allowlist de IPs funciona si está configurado
- [ ] Headers `X-Environment` y `X-Security-Warning` agregados
- [ ] Build de Next.js pasa
- [ ] Pruebas manuales vía ngrok verificadas

#### H3 - Lockfiles
- [ ] `package-lock.json` eliminado (raíz)
- [ ] `bun.lockb` eliminado (raíz)
- [ ] `apps/api/package-lock.json` eliminado
- [ ] Solo existe `pnpm-lock.yaml`
- [ ] `.gitignore` actualizado con exclusiones
- [ ] README/SETUP documenta uso de pnpm
- [ ] Instalación limpia verificada

#### General
- [ ] Todos los tests pasan
- [ ] Builds pasan
- [ ] Documentación actualizada
- [ ] Code review completado
- [ ] Pruebas de seguridad verificadas

---

**Versión:** 1.0  
**Última actualización:** 2025-12-26  
**Estado:** Pendiente de Implementación


# SPEC-SEC-0004: Cierre de Hallazgos Críticos de Seguridad - Especificación Técnica

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**PRD Relacionado:** PRD-SEC-0004  
**Prioridad:** P0 (Security)

---

## 1. Diseño Técnico

### 1.1 Arquitectura General

Este SPEC consolida la implementación técnica de tres hallazgos críticos:

1. **H1:** Hardening de Refresh Tokens (Backend)
2. **H2:** Re-habilitación de Middleware de Seguridad (Frontend)
3. **H3:** Unificación de Gestor de Paquetes (Monorepo)

### 1.2 Componentes Afectados

```
/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   └── schema.prisma                    [MODIFICAR: agregar model refreshtoken]
│   │   └── src/
│   │       ├── config/
│   │       │   └── env.validation.ts            [MODIFICAR: validar JWT_REFRESH_SECRET]
│   │       └── modules/
│   │           └── auth/
│   │               ├── auth.service.ts          [MODIFICAR: generateTokens, refresh, logout]
│   │               └── auth.controller.ts       [VERIFICAR: throttle y lectura de cookies]
│   └── web/
│       └── middleware.ts                        [MODIFICAR: restaurar lógica de seguridad]
├── .gitignore                                   [MODIFICAR: agregar exclusiones de lockfiles]
├── README.md                                    [MODIFICAR: documentar pnpm]
└── package-lock.json                            [ELIMINAR]
    bun.lockb                                    [ELIMINAR]
    apps/api/package-lock.json                   [ELIMINAR]
```

---

## 2. Backend – Tokens de Actualización

### 2.1 Prisma Schema

#### 2.1.1 Modelo Refreshtoken

**Archivo:** `apps/api/prisma/schema.prisma`

**Agregar modelo completo:**

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
  @@index([tenantId], map: "Refreshtoken_tenantId_idx")
  @@map("Refreshtoken")
}
```

#### 2.1.2 Actualizar Modelos Relacionados

**Agregar relaciones en modelos existentes:**

```prisma
model user {
  // ... campos existentes ...
  refreshtoken refreshtoken[]
  // ... resto de campos ...
}

model tenant {
  // ... campos existentes ...
  refreshtoken refreshtoken[]
  // ... resto de campos ...
}
```

#### 2.1.3 Generar Migración

**Comando:**
```bash
cd apps/api
pnpm prisma migrate dev --name add_refresh_token_persistence
```

**Verificar migración generada:**
- Debe crear tabla `Refreshtoken` con todos los campos
- Debe crear índices y foreign keys
- Debe actualizar modelos `user` y `tenant`

**Documentar en README/SETUP:**
```markdown
## Migraciones de Base de Datos

Para aplicar migraciones de Prisma:

```bash
cd apps/api
pnpm prisma migrate dev
```

Para producción:
```bash
pnpm prisma migrate deploy
```
```

### 2.2 Validación de Entorno

#### 2.2.1 Modificar env.validation.ts

**Archivo:** `apps/api/src/config/env.validation.ts`

**Cambios requeridos:**

1. **Agregar JWT_REFRESH_SECRET a lista de requeridos:**
```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', // ✅ AGREGAR
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
```

2. **Validar que JWT_REFRESH_SECRET no sea valor por defecto:**
```typescript
  // ✅ Validar que JWT_REFRESH_SECRET no sea valor por defecto
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }
```

3. **Validar longitud mínima (≥32 caracteres):**
```typescript
  // ✅ Validar longitud mínima de JWT_REFRESH_SECRET
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
    // En producción, esto debería ser un error
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_REFRESH_SECRET must be at least 32 characters long in production'
      );
    }
  }
```

4. **Asegurar que no hay fallback a JWT_SECRET:**
```typescript
  // ✅ Verificar que JWT_REFRESH_SECRET es independiente de JWT_SECRET
  if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be different from JWT_SECRET');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_REFRESH_SECRET must be different from JWT_SECRET in production'
      );
    }
  }
```

**Código completo de validación:**
```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Validar JWT_REFRESH_SECRET
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }

  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_REFRESH_SECRET must be at least 32 characters long in production'
      );
    }
  }

  if (process.env.JWT_REFRESH_SECRET === process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be different from JWT_SECRET');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_REFRESH_SECRET must be different from JWT_SECRET in production'
      );
    }
  }

  console.log('✅ Environment variables validated');
}
```

### 2.3 Servicio de Autenticación

#### 2.3.1 Modificar generateTokens()

**Archivo:** `apps/api/src/modules/auth/auth.service.ts`

**Cambios requeridos:**

1. **Importar dependencias necesarias:**
```typescript
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
```

2. **Modificar método generateTokens():**
```typescript
private async generateTokens(
  userId: string,
  email: string,
  tenantId: string,
): Promise<AuthTokens> {
  // Crear jti (JWT ID) único para cada refresh token
  const jti = randomUUID();
  
  const payload = {
    sub: userId,
    email,
    tenantId,
    jti, // JWT ID único
  };

  // Access token (sin cambios)
  // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
  const accessToken = this.jwtService.sign(payload, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  // ✅ Refresh token: solo con JWT_REFRESH_SECRET (obligatorio, sin fallback)
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  // @ts-expect-error - expiresIn accepts string values like '15m', '7d' which are valid
  const refreshToken = this.jwtService.sign(payload, {
    secret: refreshSecret,
    expiresIn: refreshExpiresIn,
  });

  // ✅ Persistir refresh token en BD (hash SHA-256)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  // Calcular expiresAt desde refreshExpiresIn (ej: '7d' = 7 días)
  const expiresInMs = this.parseExpiresIn(refreshExpiresIn);
  const expiresAt = new Date(Date.now() + expiresInMs);

  await this.prisma.refreshtoken.create({
    data: {
      userId,
      tenantId: tenantId || null,
      tokenHash,
      expiresAt,
      // userAgent y ip opcionales (si están disponibles en el request)
      // Se pueden agregar si se pasan como parámetros al método
    },
  });

  this.logger.log(`Refresh token persistido para usuario ${userId}, tenant ${tenantId || 'N/A'}`);

  return {
    accessToken,
    refreshToken,
  };
}
```

3. **Agregar método parseExpiresIn() si no existe:**
```typescript
/**
 * Parsea expiresIn string (ej: '7d', '15m') a milisegundos
 */
private parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default a 7 días si no se puede parsear
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || 86400000);
}
```

#### 2.3.2 Modificar refresh()

**Archivo:** `apps/api/src/modules/auth/auth.service.ts`

**Reemplazar método refresh() completo:**

```typescript
async refresh(refreshToken: string): Promise<{ success: boolean; tokens: AuthTokens }> {
  try {
    // ✅ JWT_REFRESH_SECRET es obligatorio (validado en validateEnv)
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;
    
    // 1. Verificar firma JWT
    const payload = this.jwtService.verify(refreshToken, {
      secret: refreshSecret,
    });

    // 2. Verificar token en BD (hash SHA-256)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await this.prisma.refreshtoken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            tenantmembership: {
              where: {
                tenantId: payload.tenantId,
              },
              take: 1,
            },
          },
        },
      },
    });

    // 3. Validar que el token existe en BD
    if (!tokenRecord) {
      this.logger.warn(`Refresh token no encontrado en BD para hash: ${tokenHash.substring(0, 8)}...`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.refresh_token_not_found',
      });
    }

    // 4. Validar que no esté revocado
    if (tokenRecord.revokedAt) {
      this.logger.warn(`Refresh token revocado intentó usarse para usuario ${tokenRecord.userId}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.refresh_token_revoked',
      });
    }

    // 5. Validar que no haya expirado
    if (tokenRecord.expiresAt < new Date()) {
      this.logger.warn(`Refresh token expirado intentó usarse para usuario ${tokenRecord.userId}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.refresh_token_expired',
      });
    }

    // 6. Validar que el usuario existe
    const user = tokenRecord.user;
    if (!user) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.user_not_found',
      });
    }

    // 7. Validar tenant
    const tenantId = payload.tenantId || user.tenantmembership[0]?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.no_tenant_available',
      });
    }

    // 8. ✅ Rotación real: generar nuevos tokens y revocar el anterior
    const newTokens = await this.generateTokens(user.id, user.email, tenantId);
    
    // Obtener el ID del nuevo token para la rotación
    const newTokenHash = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
    const newTokenRecord = await this.prisma.refreshtoken.findUnique({
      where: { tokenHash: newTokenHash },
    });

    // Revocar el token anterior y marcar que fue reemplazado
    await this.prisma.refreshtoken.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: newTokenRecord?.id || null,
      },
    });

    this.logger.log(
      `Refresh token rotado para usuario ${user.id}, token anterior revocado: ${tokenRecord.id}`
    );

    return {
      success: true,
      tokens: newTokens,
    };
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    
    this.logger.error(`Error en refresh: ${error.message}`, error.stack);
    throw new UnauthorizedException({
      success: false,
      error_key: 'auth.invalid_refresh_token',
    });
  }
}
```

#### 2.3.3 Modificar logout()

**Archivo:** `apps/api/src/modules/auth/auth.service.ts`

**Reemplazar método logout() completo:**

```typescript
async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
  try {
    if (refreshToken) {
      // ✅ Revocar token específico
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const tokenRecord = await this.prisma.refreshtoken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord && tokenRecord.userId === userId && !tokenRecord.revokedAt) {
        await this.prisma.refreshtoken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });

        this.logger.log(`Refresh token revocado para usuario ${userId}, motivo: logout`);
      }
    } else {
      // ✅ Revocar todos los tokens activos del usuario
      const result = await this.prisma.refreshtoken.updateMany({
        where: {
          userId,
          revokedAt: null, // Solo tokens activos
        },
        data: {
          revokedAt: new Date(),
        },
      });

      this.logger.log(
        `Todos los refresh tokens revocados para usuario ${userId}, cantidad: ${result.count}, motivo: logout`
      );
    }

    return { success: true };
  } catch (error) {
    this.logger.error(`Error en logout: ${error.message}`, error.stack);
    // No fallar el logout si hay error, solo loguear
    return { success: true };
  }
}
```

### 2.4 Controller

#### 2.4.1 Verificar auth.controller.ts

**Archivo:** `apps/api/src/modules/auth/auth.controller.ts`

**Verificaciones requeridas:**

1. **Mantener throttle en endpoint /auth/refresh:**
```typescript
@Post('refresh')
@Public()
@Throttle({ medium: { limit: 20, ttl: 600000 } }) // 20 refreshes por 10 minutos
@HttpCode(HttpStatus.OK)
async refresh(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      error_key: 'auth.refresh_token_required',
    });
  }

  const result = await this.authService.refresh(refreshToken);
  this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  return {
    success: result.success,
  };
}
```

2. **Asegurar lectura de cookie refresh_token en logout:**
```typescript
@Post('logout')
@Public() // Permitir logout incluso sin token válido (para limpiar cookies)
@HttpCode(HttpStatus.OK)
async logout(
  @Req() req: Request,
  @Res({ passthrough: false }) res: Response,
  @CurrentUser() user?: { id: string },
) {
  const refreshToken = req.cookies?.refresh_token;
  const userId = user?.id;

  if (userId && refreshToken) {
    await this.authService.logout(userId, refreshToken);
  } else if (userId) {
    // Revocar todos los tokens del usuario si no hay refresh token específico
    await this.authService.logout(userId);
  }

  // Limpiar cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  return {
    success: true,
  };
}
```

---

## 3. Interfaz – Middleware Next.js

### 3.1 Restaurar Middleware

**Archivo:** `apps/web/middleware.ts`

**Cambios requeridos:**

1. **Restaurar lógica de seguridad completa:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { measureSync } from './lib/perf/perfLogger';

/**
 * Middleware de seguridad para Next.js
 * Aplica validaciones de seguridad especialmente para ngrok
 */

export function middleware(request: NextRequest) {
  return measureSync('middleware', () => {
    const hostname = request.headers.get('host') || '';
    const isNgrok = hostname.includes('ngrok') || 
                    hostname.includes('ngrok-free') || 
                    hostname.includes('ngrok.io');
    
    // Si estamos usando ngrok, aplicar validaciones de seguridad
    if (isNgrok) {
      // Verificar autenticación básica si está configurada
      const authUser = process.env.NGROK_AUTH_USER;
      const authPass = process.env.NGROK_AUTH_PASS;
      
      if (authUser && authPass) {
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return new NextResponse('Autenticación requerida', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Basic realm="Acceso restringido - Desarrollo"',
            },
          });
        }
        
        // Decodificar y verificar credenciales
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
        const [user, pass] = credentials.split(':');
        
        if (user !== authUser || pass !== authPass) {
          return new NextResponse('Credenciales inválidas', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Basic realm="Acceso restringido - Desarrollo"',
            },
          });
        }
      } else {
        // Advertir si ngrok está activo pero no hay credenciales configuradas
        console.warn('⚠️ ngrok detectado pero NGROK_AUTH_USER/NGROK_AUTH_PASS no configurados');
      }
      
      // Verificar lista blanca de IPs si está configurada
      const allowedIPs = process.env.NGROK_ALLOWED_IPS?.split(',').map(ip => ip.trim());
      if (allowedIPs && allowedIPs.length > 0) {
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        request.headers.get('x-real-ip') ||
                        request.ip ||
                        'unknown';
        
        if (!allowedIPs.includes(clientIP) && !allowedIPs.includes('*')) {
          return new NextResponse('Acceso denegado - IP no autorizada', {
            status: 403,
          });
        }
      }
      
      // Agregar headers de seguridad adicionales para ngrok
      const response = NextResponse.next();
      response.headers.set('X-Environment', 'development-ngrok');
      response.headers.set('X-Security-Warning', 'Este es un entorno de desarrollo expuesto públicamente');
      
      return response;
    }
    
    // Para producción, aplicar headers de seguridad estándar
    if (process.env.NODE_ENV === 'production') {
      const response = NextResponse.next();
      response.headers.set('X-Environment', 'production');
      return response;
    }
    
    return NextResponse.next();
  }, 'SERVER', { path: request.nextUrl.pathname });
}

// ✅ Matcher activo: aplicar a todas las rutas excepto API, assets estáticos y favicon
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Puntos críticos:**
- ✅ No retornar `NextResponse.next()` inmediatamente
- ✅ Activar matcher con patrón correcto
- ✅ Mantener `measureSync` para performance
- ✅ Basic auth condicional (solo si está configurado)
- ✅ Allowlist de IPs condicional (solo si está configurado)
- ✅ Headers de entorno agregados

---

## 4. Monorepo – Archivos de Bloqueo

### 4.1 Eliminar Lockfiles Redundantes

**Comandos a ejecutar:**

```bash
# 1. Regenerar pnpm-lock.yaml primero (asegurar que está actualizado)
cd /path/to/repo
pnpm install

# 2. Eliminar lockfiles redundantes
rm package-lock.json
rm bun.lockb
rm apps/api/package-lock.json

# 3. Verificar que solo existe pnpm-lock.yaml
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules
# (debe retornar nada)

# 4. Verificar instalación funciona
pnpm install --frozen-lockfile
# (debe funcionar sin errores)
```

**Archivos a eliminar:**
- `/package-lock.json` (raíz)
- `/bun.lockb` (raíz)
- `/apps/api/package-lock.json`

### 4.2 Actualizar .gitignore

**Archivo:** `.gitignore`

**Agregar al final del archivo:**

```
# Lockfiles de otros gestores (no permitidos)
package-lock.json
bun.lockb
**/package-lock.json
```

**Verificar:**
- `pnpm-lock.yaml` NO debe estar en `.gitignore`
- Los patrones deben estar al final del archivo

### 4.3 Documentar Uso Exclusivo de pnpm

**Archivo:** `README.md` o `SETUP.md`

**Agregar sección:**

```markdown
## Instalación

Este proyecto usa **pnpm** como gestor de paquetes exclusivo.

### Requisitos
- Node.js >= 20
- pnpm >= 8.0.0

### Instalación de Dependencias

```bash
# Instalar dependencias
pnpm install
```

### Si Cambias de Gestor

Si anteriormente usaste `npm` o `bun`, limpia `node_modules` antes de instalar con pnpm:

```bash
# Limpiar node_modules
rm -rf node_modules apps/**/node_modules

# Instalar con pnpm
pnpm install
```

### Verificación

Para verificar que solo se usa pnpm:

```bash
# Debe mostrar solo pnpm-lock.yaml
ls -la | grep -E "package-lock|bun.lock|pnpm-lock"
```

**Nota:** Los lockfiles de otros gestores (`package-lock.json`, `bun.lockb`) están excluidos del repositorio y no deben ser commitados.
```

---

## 5. Pruebas

### 5.1 Backend

#### 5.1.1 Tests Unitarios

**Comando:**
```bash
pnpm --filter @ai-landing-boost/api test
```

**Resultado esperado:** Todos los tests pasan

#### 5.1.2 Flujo Manual de Autenticación

**Pasos:**

1. **Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

**Verificar:**
- Se recibe `access_token` y `refresh_token` en cookies
- Se crea registro en tabla `Refreshtoken` con hash del token

2. **Refresh válido:**
```bash
curl -X POST http://localhost:3001/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

**Verificar:**
- Se generan nuevos tokens
- Token anterior se marca como revocado (`revokedAt` no es NULL)
- Token anterior tiene `replacedByTokenId` apuntando al nuevo token

3. **Refresh con token previo (debe fallar):**
```bash
# Usar el refresh_token anterior (antes del refresh)
curl -X POST http://localhost:3001/auth/refresh \
  -H "Cookie: refresh_token=<token_anterior>" \
  -c cookies.txt
```

**Resultado esperado:** 401/403 Unauthorized

4. **Logout:**
```bash
curl -X POST http://localhost:3001/auth/logout \
  -b cookies.txt
```

**Verificar:**
- Token activo se marca como revocado en BD
- Cookies se limpian

5. **Refresh después de logout (debe fallar):**
```bash
# Intentar usar el refresh_token revocado
curl -X POST http://localhost:3001/auth/refresh \
  -H "Cookie: refresh_token=<token_revocado>" \
  -c cookies.txt
```

**Resultado esperado:** 401/403 Unauthorized

### 5.2 Frontend

#### 5.2.1 Build

**Comando:**
```bash
pnpm --filter @ai-landing-boost/web build
```

**Resultado esperado:** Build exitoso sin errores

#### 5.2.2 Validar Acceso vía ngrok

**Configuración en `.env.local`:**
```bash
NGROK_AUTH_USER=admin
NGROK_AUTH_PASS=secret123
NGROK_ALLOWED_IPS=192.168.1.100,10.0.0.50
```

**Escenarios de prueba:**

1. **Sin credenciales:**
```bash
curl -I https://your-ngrok-url.ngrok.io
```

**Resultado esperado:** 401 Unauthorized con header `WWW-Authenticate`

2. **Con credenciales incorrectas:**
```bash
curl -I https://your-ngrok-url.ngrok.io \
  -u wrong:credentials
```

**Resultado esperado:** 401 Unauthorized

3. **Con credenciales correctas:**
```bash
curl -I https://your-ngrok-url.ngrok.io \
  -u admin:secret123
```

**Resultado esperado:** 200 OK con headers `X-Environment: development-ngrok` y `X-Security-Warning`

4. **IP fuera de allowlist:**
```bash
# Desde una IP no permitida
curl -I https://your-ngrok-url.ngrok.io \
  -u admin:secret123
```

**Resultado esperado:** 403 Forbidden

5. **Verificar headers:**
```bash
curl -I https://your-ngrok-url.ngrok.io \
  -u admin:secret123 | grep -i "x-environment\|x-security"
```

**Resultado esperado:**
```
X-Environment: development-ngrok
X-Security-Warning: Este es un entorno de desarrollo expuesto públicamente
```

### 5.3 Monorepo

#### 5.3.1 Instalación Limpia

**Comandos:**
```bash
# Limpiar
rm -rf node_modules apps/**/node_modules

# Instalar
pnpm install

# Verificar lockfiles
ls -la | grep -E "package-lock|bun.lock|pnpm-lock"
```

**Resultado esperado:**
- Solo existe `pnpm-lock.yaml`
- No se regeneran `package-lock.json` ni `bun.lockb`

#### 5.3.2 Verificar .gitignore

**Comando:**
```bash
# Intentar agregar package-lock.json (debe ser ignorado)
echo "test" > package-lock.json
git status | grep package-lock.json
```

**Resultado esperado:** `package-lock.json` no aparece en `git status`

---

## 6. Checklist de Implementación

### 6.1 Backend (H1)

- [ ] Modelo `refreshtoken` agregado a `schema.prisma`
- [ ] Relaciones agregadas en modelos `user` y `tenant`
- [ ] Migración Prisma generada y aplicada
- [ ] `JWT_REFRESH_SECRET` agregado a validación de entorno
- [ ] Validación de valores por defecto implementada
- [ ] Validación de longitud mínima implementada
- [ ] `generateTokens()` modifica para persistir refresh tokens
- [ ] `refresh()` implementa rotación real
- [ ] `logout()` revoca tokens en BD
- [ ] Controller verifica throttle y lectura de cookies
- [ ] Tests unitarios pasan
- [ ] Flujo manual verificado

### 6.2 Frontend (H2)

- [ ] Middleware restaurado con lógica de seguridad
- [ ] Matcher activo con patrón correcto
- [ ] Basic auth condicional implementada
- [ ] Allowlist de IPs implementada
- [ ] Headers `X-Environment` y `X-Security-Warning` agregados
- [ ] `measureSync` mantenido
- [ ] Build de Next.js pasa
- [ ] Pruebas manuales vía ngrok verificadas

### 6.3 Monorepo (H3)

- [ ] `package-lock.json` eliminado (raíz)
- [ ] `bun.lockb` eliminado (raíz)
- [ ] `apps/api/package-lock.json` eliminado
- [ ] Solo existe `pnpm-lock.yaml`
- [ ] `.gitignore` actualizado con exclusiones
- [ ] README/SETUP documenta uso de pnpm
- [ ] Instalación limpia verificada

---

## 7. Orden de Implementación

### 7.1 Secuencia Recomendada

1. **H3 (P0 Chore):** Unificar lockfiles (pnpm) - **PRIMERO**
   - Eliminar lockfiles redundantes
   - Actualizar `.gitignore`
   - Documentar pnpm

2. **H1 (P0 Security):** Hardening de refresh tokens - **SEGUNDO**
   - Crear modelo Prisma
   - Generar migración
   - Modificar validación de entorno
   - Modificar servicio de autenticación
   - Verificar controller

3. **H2 (P1 Security):** Re-habilitar middleware - **TERCERO**
   - Restaurar lógica de middleware
   - Activar matcher
   - Verificar build

### 7.2 Dependencias

- **H1 requiere:** Prisma migrado, validación de entorno funcionando
- **H2 requiere:** Middleware de Next.js disponible, variables de entorno configuradas
- **H3 requiere:** Ninguna (independiente)

---

## 8. Referencias

### 8.1 Documentos Relacionados
- **PRD-SEC-0004:** Cierre de Hallazgos Críticos de Seguridad
- **SPEC-SEC-0001:** Unificación de Gestor de Paquetes (PNPM)
- **SPEC-SEC-0002:** Hardening del Flujo de Refresh Tokens
- **SPEC-SEC-0003:** Re-habilitación del Middleware de Seguridad Next.js
- **TEST-PLAN-SEC:** Plan de Pruebas - Hallazgos de Seguridad

### 8.2 Archivos Afectados
- `apps/api/prisma/schema.prisma`
- `apps/api/src/config/env.validation.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/web/middleware.ts`
- `.gitignore`
- `README.md` / `SETUP.md`

---

**Versión:** 1.0  
**Última actualización:** 2025-12-26  
**Estado:** Listo para Implementación


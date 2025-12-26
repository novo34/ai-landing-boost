# SPEC-SEC-0002: Hardening del Flujo de Refresh Tokens - Especificación Técnica

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**PRD Relacionado:** PRD-SEC-0002  
**Prioridad:** P0 (Security)

---

## 1. Diseño Técnico

### 1.1 Arquitectura

#### 1.1.1 Componentes Principales
```
apps/api/src/modules/auth/
├── auth.service.ts           [MODIFICAR: generateTokens, refresh, logout]
├── auth.controller.ts        [VERIFICAR: endpoints /refresh y /logout]
└── guards/                   [NO CAMBIAR]

apps/api/prisma/
└── schema.prisma             [AGREGAR: model refreshtoken]

apps/api/src/
├── main.ts                   [VERIFICAR: validación de env vars]
└── config/
    └── env.validation.ts     [MODIFICAR: validar JWT_REFRESH_SECRET sin fallback]

apps/api/src/common/
└── jobs/                      [NUEVO: refresh-token-cleanup.job.ts]
```

### 1.2 Flujo de Datos

#### 1.2.1 Generación de Tokens (Login/Register)
```
Usuario → login() → generateTokens()
  ├── Generar JWT access token
  ├── Generar JWT refresh token
  ├── Hash refresh token (SHA-256)
  ├── Persistir en BD: refreshtoken
  │   ├── userId
  │   ├── tokenHash
  │   ├── expiresAt
  │   └── createdAt
  └── Retornar tokens al cliente
```

#### 1.2.2 Refresh de Tokens
```
Cliente → /auth/refresh → refresh()
  ├── Verificar JWT (firma y expiración)
  ├── Hash token recibido
  ├── Buscar en BD por tokenHash
  ├── Validar: existe, no revocado, no expirado
  ├── SI VÁLIDO:
  │   ├── Marcar token anterior como revocado
  │   ├── Generar nuevo par de tokens
  │   ├── Persistir nuevo refresh token
  │   ├── Asociar nuevo con anterior (replacedByTokenId)
  │   └── Retornar nuevos tokens
  └── SI INVÁLIDO:
      └── Rechazar con 401 Unauthorized
```

#### 1.2.3 Logout
```
Cliente → /auth/logout → logout()
  ├── Si refreshToken proporcionado:
  │   ├── Hash token
  │   ├── Buscar en BD
  │   └── Marcar como revocado
  └── Si no proporcionado:
      └── Revocar todos los tokens del usuario
```

---

## 2. Detalles de Configuración

### 2.1 Variables de Entorno

#### 2.1.1 JWT_REFRESH_SECRET (OBLIGATORIO)
```bash
# .env
JWT_REFRESH_SECRET=<secret-min-32-chars>
```

**Validación:**
- Debe existir (no puede ser undefined o vacío)
- No acepta fallback a `JWT_SECRET`
- No acepta valores por defecto
- Longitud mínima: 32 caracteres (recomendado: 64+)
- Generación segura: `openssl rand -base64 64`

#### 2.1.2 JWT_REFRESH_EXPIRES_IN (Opcional)
```bash
# .env
JWT_REFRESH_EXPIRES_IN=7d  # Por defecto: 7 días
```

### 2.2 Configuración de Prisma

#### 2.2.1 Modelo Refreshtoken
```prisma
model refreshtoken {
  id                String   @id @default(cuid())
  userId            String
  tenantId          String?  // Opcional, para multi-tenant
  tokenHash         String   @db.VarChar(64) // SHA-256 hash (64 chars hex)
  expiresAt         DateTime
  revokedAt         DateTime? // NULL = activo, NOT NULL = revocado
  replacedByTokenId String?  // ID del token que lo reemplazó (rotación)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user   user   @relation(fields: [userId], references: [id], onDelete: Cascade)
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

**Relaciones:**
- `user.refreshtoken[]` - Un usuario puede tener múltiples refresh tokens
- `tenant.refreshtoken[]` - Opcional, para multi-tenant

**Actualizar modelos existentes:**
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

### 2.3 Configuración de NestJS

#### 2.3.1 ScheduleModule (para job de limpieza)
```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ... otros módulos ...
    ScheduleModule.forRoot(), // Agregar si no existe
  ],
})
export class AppModule {}
```

---

## 3. Cambios a Esquema

### 3.1 Migración de Prisma

#### 3.1.1 Crear Migración
```bash
cd apps/api
pnpm prisma migrate dev --name add_refresh_token_persistence
```

#### 3.1.2 SQL Generado (Referencia)
```sql
-- CreateTable
CREATE TABLE `Refreshtoken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `replacedByTokenId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Refreshtoken_tokenHash_key`(`tokenHash`),
    INDEX `Refreshtoken_userId_idx`(`userId`),
    INDEX `Refreshtoken_tokenHash_idx`(`tokenHash`),
    INDEX `Refreshtoken_expiresAt_idx`(`expiresAt`),
    INDEX `Refreshtoken_revokedAt_idx`(`revokedAt`),
    INDEX `Refreshtoken_userId_revokedAt_idx`(`userId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Refreshtoken` ADD CONSTRAINT `Refreshtoken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (si tenantId no es NULL)
ALTER TABLE `Refreshtoken` ADD CONSTRAINT `Refreshtoken_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

### 3.2 Cambios en Código

#### 3.2.1 auth.service.ts - Validación de Secreto
```typescript
// Al inicio de la clase o en constructor
constructor(
  // ... otros servicios ...
) {
  // Validar JWT_REFRESH_SECRET al instanciar
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno.'
    );
  }
  
  // Validar que no sea valor por defecto
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }
}
```

#### 3.2.2 auth.service.ts - generateTokens() Modificado
```typescript
private async generateTokens(
  userId: string,
  email: string,
  tenantId: string,
): Promise<AuthTokens> {
  const payload = {
    sub: userId,
    email,
    tenantId,
  };

  // Generar access token (sin cambios)
  const accessToken = this.jwtService.sign(payload, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  // Generar refresh token
  const refreshToken = this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET!, // ! porque ya validamos que existe
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  // Hash del refresh token (SHA-256)
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Calcular expiresAt
  const expiresInDays = parseInt(
    (process.env.JWT_REFRESH_EXPIRES_IN || '7d').replace('d', ''),
    10
  );
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Persistir en BD
  await this.prisma.refreshtoken.create({
    data: {
      userId,
      tenantId,
      tokenHash,
      expiresAt,
    },
  });

  this.logger.log(`Refresh token generado para usuario ${userId}`);

  return {
    accessToken,
    refreshToken,
  };
}
```

#### 3.2.3 auth.service.ts - refresh() Modificado
```typescript
async refresh(refreshToken: string): Promise<{ success: boolean; tokens: AuthTokens }> {
  try {
    // 1. Verificar JWT (firma y expiración)
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET!,
    });

    // 2. Hash del token recibido
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // 3. Buscar en BD
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

    // 4. Validar existencia
    if (!tokenRecord) {
      this.logger.warn(`Refresh token no encontrado en BD, tokenHash: ${tokenHash.substring(0, 8)}...`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.invalid_refresh_token',
      });
    }

    // 5. Validar no revocado
    if (tokenRecord.revokedAt) {
      this.logger.warn(`Intento de usar refresh token revocado, tokenHash: ${tokenRecord.tokenHash.substring(0, 8)}...`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.refresh_token_revoked',
      });
    }

    // 6. Validar no expirado
    if (tokenRecord.expiresAt < new Date()) {
      this.logger.warn(`Intento de usar refresh token expirado, tokenHash: ${tokenRecord.tokenHash.substring(0, 8)}...`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.refresh_token_expired',
      });
    }

    // 7. Validar usuario existe
    if (!tokenRecord.user) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.user_not_found',
      });
    }

    // 8. Obtener tenantId
    const tenantId = payload.tenantId || tokenRecord.user.tenantmembership[0]?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'auth.no_tenant_available',
      });
    }

    // 9. Marcar token anterior como revocado
    await this.prisma.refreshtoken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // 10. Generar nuevo par de tokens
    const newTokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tenantId
    );

    // 11. Asociar nuevo token con anterior
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newTokens.refreshToken)
      .digest('hex');

    await this.prisma.refreshtoken.update({
      where: { tokenHash: newTokenHash },
      data: { replacedByTokenId: tokenRecord.id },
    });

    this.logger.log(
      `Refresh token rotado para usuario ${tokenRecord.user.id}, token anterior revocado`
    );

    return {
      success: true,
      tokens: newTokens,
    };
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    this.logger.error(`Error en refresh: ${error.message}`);
    throw new UnauthorizedException({
      success: false,
      error_key: 'auth.invalid_refresh_token',
    });
  }
}
```

#### 3.2.4 auth.service.ts - logout() Modificado
```typescript
async logout(userId?: string, refreshToken?: string): Promise<{ success: boolean }> {
  try {
    // Si no se proporciona userId ni refreshToken, no hacer nada (solo limpiar cookies en controller)
    // Esto permite compatibilidad con el comportamiento actual
    
    if (refreshToken) {
      // Revocar token específico
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenRecord = await this.prisma.refreshtoken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord && !tokenRecord.revokedAt) {
        await this.prisma.refreshtoken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });

        this.logger.log(`Refresh token revocado para usuario ${tokenRecord.userId}, motivo: logout`);
      }
    } else if (userId) {
      // Revocar todos los tokens activos del usuario
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
    } else {
      // Si no hay userId ni refreshToken, no hacer nada (solo limpiar cookies en controller)
      this.logger.warn('Logout llamado sin userId ni refreshToken - solo se limpian cookies');
    }

    return { success: true };
  } catch (error) {
    this.logger.error(`Error en logout: ${error.message}`);
    // No fallar el logout si hay error, solo loguear
    return { success: true };
  }
}
```

**NOTA IMPORTANTE:** El controller actual (`auth.controller.ts`) NO pasa parámetros a `logout()`. Debe modificarse para extraer `refreshToken` de cookies y `userId` del JWT (si está presente). Ver Sección 3.2.7.

#### 3.2.5 Job de Limpieza (Nuevo)
```typescript
// apps/api/src/common/jobs/refresh-token-cleanup.job.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenCleanupJob {
  private readonly logger = new Logger(RefreshTokenCleanupJob.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM) // Ejecutar diariamente a las 2 AM
  async handleCron() {
    this.logger.log('Iniciando limpieza de refresh tokens expirados y revocados...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Eliminar tokens expirados Y revocados hace más de 30 días
      const result = await this.prisma.refreshtoken.deleteMany({
        where: {
          AND: [
            { expiresAt: { lt: new Date() } }, // Expirados
            {
              OR: [
                { revokedAt: { lt: thirtyDaysAgo } }, // Revocados hace más de 30 días
                { revokedAt: { not: null } }, // O cualquier revocado (si queremos ser más agresivos)
              ],
            },
          ],
        },
      });

      this.logger.log(
        `Limpieza completada. Tokens eliminados: ${result.count}`
      );
    } catch (error) {
      this.logger.error(`Error en limpieza de refresh tokens: ${error.message}`);
    }
  }
}
```

**Registrar en módulo:**
```typescript
// apps/api/src/common/common.module.ts o app.module.ts
import { RefreshTokenCleanupJob } from './jobs/refresh-token-cleanup.job';

@Module({
  providers: [
    // ... otros providers ...
    RefreshTokenCleanupJob,
  ],
})
export class CommonModule {}
```

#### 3.2.7 auth.controller.ts - logout() Modificado
**NOTA:** El controller actual NO pasa parámetros a `logout()`. Debe modificarse para extraer `refreshToken` de cookies y `userId` del JWT (si está presente).

```typescript
// En apps/api/src/modules/auth/auth.controller.ts
import { JwtService } from '@nestjs/jwt'; // Agregar si no está importado

@Post('logout')
@Public()
@Throttle({ short: { limit: 20, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async logout(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
  try {
    // Extraer refreshToken de cookies
    const refreshToken = req.cookies?.refresh_token;
    
    // Intentar extraer userId del JWT si está presente (opcional)
    let userId: string | undefined;
    try {
      const accessToken = req.cookies?.access_token;
      if (accessToken) {
        const payload = this.jwtService.decode(accessToken) as { sub?: string };
        userId = payload?.sub;
      }
    } catch (error) {
      // Si no hay token válido, continuar sin userId
    }
    
    const result = await this.authService.logout(userId, refreshToken);
    this.clearAuthCookies(res);
    return result;
  } catch (error) {
    // Si hay error, igual limpiar cookies
    this.clearAuthCookies(res);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
```

**NOTA:** Requiere inyectar `JwtService` en el constructor del controller si no está ya inyectado:
```typescript
constructor(
  private readonly authService: AuthService,
  private readonly jwtService: JwtService, // Agregar si no está
) {}
```

#### 3.2.6 env.validation.ts - Validación Mejorada
**NOTA:** `JWT_REFRESH_SECRET` ya está en la lista de `required` en `env.validation.ts` (línea 40), pero la validación actual no rechaza valores por defecto ni fallbacks. Se debe reforzar:

```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', // ✅ Ya está en required, pero necesita validación estricta adicional
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

  // ✅ AGREGAR: Validación estricta de JWT_REFRESH_SECRET (reforzar validación existente)
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno.');
  }

  // ✅ AGREGAR: Validar que JWT_REFRESH_SECRET no sea valor por defecto
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }

  // ✅ AGREGAR: Validar longitud mínima
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
  }

  // ... resto de validaciones existentes (JWT_SECRET, DATABASE_URL, etc.) ...
}
```

**IMPORTANTE:** También eliminar fallbacks en `auth.service.ts`:
- Línea 231 (en `refresh()`): Cambiar `secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '...'` por `secret: process.env.JWT_REFRESH_SECRET!`
- Línea 300 (en `generateTokens()`): Cambiar `secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '...'` por `secret: process.env.JWT_REFRESH_SECRET!`

---

## 4. Estrategia de Compatibilidad

### 4.1 Migración de Tokens Existentes
**Problema:** Tokens generados antes de la implementación no están en BD

**Estrategia:**
1. **Periodo de gracia (opcional, 7 días):**
   - Si token no está en BD pero JWT es válido, aceptarlo
   - Generar nuevo token y persistirlo
   - Después de 7 días, rechazar todos los tokens no persistidos

2. **Invalidación forzada (recomendado):**
   - Al deployar, invalidar todos los tokens existentes
   - Forzar re-login de todos los usuarios
   - Más seguro pero causa interrupción

**Implementación de periodo de gracia:**
```typescript
// En refresh(), después de buscar en BD
if (!tokenRecord) {
  // Periodo de gracia: si JWT es válido pero no está en BD, aceptarlo
  // pero generar nuevo token persistido
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    // ... include ...
  });

  if (user) {
    this.logger.warn(
      `Token antiguo detectado (no persistido), generando nuevo token persistido para usuario ${user.id}`
    );
    // Generar nuevo token persistido
    const newTokens = await this.generateTokens(user.id, user.email, payload.tenantId);
    return { success: true, tokens: newTokens };
  }
  
  // Si no hay usuario, rechazar
  throw new UnauthorizedException({
    success: false,
    error_key: 'auth.invalid_refresh_token',
  });
}
```

### 4.2 Compatibilidad Hacia Atrás
- **Frontend:** No requiere cambios, sigue enviando refresh token igual
- **API:** Endpoints `/auth/refresh` y `/auth/logout` mantienen misma interfaz

---

## 5. Estrategia de Seguridad

### 5.1 Amenazas Identificadas
- **T1:** Token robado puede usarse indefinidamente
- **T2:** No hay forma de revocar tokens comprometidos
- **T3:** Secretos por defecto permiten falsificación
- **T4:** Sin rotación, token anterior sigue válido

### 5.2 Controles de Seguridad
- **C1:** Persistencia permite revocación inmediata
- **C2:** Rotación invalida token anterior automáticamente
- **C3:** Hash de tokens previene exposición en logs
- **C4:** Validación estricta de secretos previene uso de defaults
- **C5:** Limpieza periódica reduce superficie de ataque

### 5.3 Defaults Seguros
- **JWT_REFRESH_SECRET:** Obligatorio, sin fallback
- **Expiración:** 7 días por defecto (configurable)
- **Hash:** SHA-256 (irreversible)
- **Revocación:** Inmediata en logout

---

## 6. Plan de Pruebas

### 6.1 Pruebas Unitarias

#### UT-001: Validación de JWT_REFRESH_SECRET
```typescript
describe('AuthService - JWT_REFRESH_SECRET validation', () => {
  it('debe fallar si JWT_REFRESH_SECRET no está configurado', () => {
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => new AuthService(...)).toThrow('JWT_REFRESH_SECRET es obligatorio');
  });

  it('debe fallar si JWT_REFRESH_SECRET es valor por defecto', () => {
    process.env.JWT_REFRESH_SECRET = 'your-secret-key-change-in-production';
    expect(() => new AuthService(...)).toThrow('JWT_REFRESH_SECRET no puede ser un valor por defecto');
  });
});
```

#### UT-002: Generación de Tokens con Persistencia
```typescript
describe('AuthService - generateTokens', () => {
  it('debe persistir refresh token en BD', async () => {
    const tokens = await authService.generateTokens(userId, email, tenantId);
    
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const tokenRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash } });
    
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord.userId).toBe(userId);
    expect(tokenRecord.revokedAt).toBeNull();
  });
});
```

#### UT-003: Refresh con Rotación
```typescript
describe('AuthService - refresh', () => {
  it('debe invalidar token anterior al refrescar', async () => {
    const oldToken = '...'; // Token existente
    const result = await authService.refresh(oldToken);
    
    // Token anterior debe estar revocado
    const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    const oldRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash: oldTokenHash } });
    
    expect(oldRecord.revokedAt).not.toBeNull();
    
    // Nuevo token debe estar persistido
    const newTokenHash = crypto.createHash('sha256').update(result.tokens.refreshToken).digest('hex');
    const newRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash: newTokenHash } });
    
    expect(newRecord).toBeDefined();
    expect(newRecord.replacedByTokenId).toBe(oldRecord.id);
  });
});
```

### 6.2 Pruebas de Integración

#### IT-001: Flujo Completo de Login → Refresh → Logout
```typescript
describe('Auth Flow E2E', () => {
  it('debe permitir login, refresh y logout correctamente', async () => {
    // 1. Login
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email, password });
    
    const { refreshToken } = loginResponse.body.tokens;
    
    // 2. Verificar token persistido
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash } });
    expect(tokenRecord).toBeDefined();
    
    // 3. Refresh
    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    
    expect(refreshResponse.status).toBe(200);
    
    // 4. Verificar token anterior revocado
    const oldRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash } });
    expect(oldRecord.revokedAt).not.toBeNull();
    
    // 5. Logout
    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshResponse.body.tokens.accessToken}`)
      .send({ refreshToken: refreshResponse.body.tokens.refreshToken });
    
    expect(logoutResponse.status).toBe(200);
    
    // 6. Verificar token revocado
    const newTokenHash = crypto.createHash('sha256').update(refreshResponse.body.tokens.refreshToken).digest('hex');
    const newRecord = await prisma.refreshtoken.findUnique({ where: { tokenHash: newTokenHash } });
    expect(newRecord.revokedAt).not.toBeNull();
  });
});
```

#### IT-002: Rechazo de Token Revocado
```typescript
describe('Auth - Token Revocation', () => {
  it('debe rechazar refresh token revocado', async () => {
    // 1. Login
    const loginResponse = await request(app).post('/auth/login').send({ email, password });
    const { refreshToken } = loginResponse.body.tokens;
    
    // 2. Revocar token manualmente
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshtoken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    
    // 3. Intentar refresh
    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error_key).toBe('auth.refresh_token_revoked');
  });
});
```

### 6.3 Pruebas de Seguridad

#### SEC-001: Token Robado No Funciona Después de Logout
```typescript
describe('Security - Stolen Token', () => {
  it('token robado no debe funcionar después de logout', async () => {
    // 1. Login legítimo
    const loginResponse = await request(app).post('/auth/login').send({ email, password });
    const stolenToken = loginResponse.body.tokens.refreshToken;
    
    // 2. Usuario legítimo hace logout
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.tokens.accessToken}`)
      .send({ refreshToken: stolenToken });
    
    // 3. Atacante intenta usar token robado
    const attackResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: stolenToken });
    
    expect(attackResponse.status).toBe(401);
  });
});
```

---

## 7. Checklist de Verificación

### 7.1 Pre-Implementación
- [ ] Verificar que `JWT_REFRESH_SECRET` está configurado en `.env`
- [ ] Verificar que `JWT_REFRESH_SECRET` no es valor por defecto
- [ ] Backup de base de datos (para rollback si es necesario)
- [ ] Verificar que `@nestjs/schedule` está instalado

### 7.2 Implementación
- [ ] Agregar modelo `refreshtoken` a `schema.prisma`
- [ ] Ejecutar migración: `pnpm prisma migrate dev`
- [ ] Modificar `generateTokens()` para persistir tokens
- [ ] Modificar `refresh()` para verificar y rotar tokens
- [ ] Modificar `logout()` para revocar tokens
- [ ] Crear job de limpieza
- [ ] Actualizar validación de env vars
- [ ] Registrar job en módulo

### 7.3 Validación
- [ ] Ejecutar tests unitarios: `pnpm test`
- [ ] Ejecutar tests de integración: `pnpm test:e2e`
- [ ] Probar flujo completo manualmente:
  - [ ] Login genera token persistido
  - [ ] Refresh rota token correctamente
  - [ ] Logout revoca tokens
  - [ ] Token revocado no funciona
- [ ] Verificar logs de auditoría
- [ ] Verificar job de limpieza se ejecuta

### 7.4 Comandos de Verificación

```bash
# Verificar migración
cd apps/api
pnpm prisma migrate status

# Verificar schema
pnpm prisma validate

# Generar Prisma Client
pnpm prisma generate

# Ejecutar tests
pnpm test
pnpm test:e2e

# Verificar tokens en BD (después de login)
pnpm prisma studio
# Buscar tabla Refreshtoken
```

---

## 8. Plan de Rollback

### 8.1 Escenario: Migración Falla
**Síntomas:** Migración de Prisma falla o causa errores

**Acción:**
1. Revertir migración: `pnpm prisma migrate resolve --rolled-back <migration_name>`
2. Eliminar cambios en código (git revert)
3. Investigar causa del fallo
4. Corregir y reintentar

### 8.2 Escenario: Tokens No Funcionan
**Síntomas:** Usuarios no pueden hacer refresh después del deploy

**Acción:**
1. Verificar logs de errores
2. Si es problema de validación, ajustar periodo de gracia
3. Si es problema de BD, verificar índices y conexión
4. Rollback de código si es necesario

### 8.3 Escenario: Performance Degradado
**Síntomas:** Latencia en `/auth/refresh` > 50ms

**Acción:**
1. Verificar índices en BD
2. Considerar cache de tokens activos (Redis)
3. Optimizar consultas si es necesario

---

## 9. Referencias Técnicas

### 9.1 Documentación
- [NestJS JWT](https://docs.nestjs.com/security/authentication#jwt-functionality)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)

### 9.2 Archivos Relacionados
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/config/env.validation.ts`

---

**Fin de la SPEC**


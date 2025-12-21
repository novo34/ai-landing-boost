# AI-SPEC-48: Multi-Tenant Isolation & Platform Owner Governance

**Versión:** 1.0  
**Fecha:** 2025-01-27  
**Autor:** Principal Security Engineer + SaaS Architect  
**Estado:** 📋 DRAFT

---

## 📐 Arquitectura de Seguridad Multi-Tenant

### Principio Fundamental: Default Deny

**Regla absoluta:** Si falta `tenantId` o hay mismatch → **DENEGAR ACCESO**.

```typescript
// ✅ CORRECTO: Default Deny
if (!tenantId || !hasMembership(userId, tenantId)) {
  throw new ForbiddenException('Access denied');
}

// ❌ PROHIBIDO: Default Allow
if (tenantId && hasMembership(userId, tenantId)) {
  // Permitir acceso
} else {
  // Permitir acceso de todos modos ❌
}
```

---

## 🔐 Tenant Context Strategy (Fuente de Verdad)

### Prioridad de Determinación de tenantId

**Orden de prioridad (CORREGIDO):**

1. **JWT Payload (Prioridad 1 - Fuente de Verdad)**
   ```typescript
   // JWT contiene tenantId firmado, no puede ser falsificado
   const tenantId = user.tenantId; // Del JWT payload
   ```

2. **Header x-tenant-id (Prioridad 2 - Override Controlado)**
   ```typescript
   // Solo si usuario tiene membership en ambos tenants
   const headerTenantId = request.headers['x-tenant-id'];
   if (headerTenantId && headerTenantId !== jwtTenantId) {
     // Validar membership antes de permitir override
     if (!hasMembership(userId, headerTenantId)) {
       throw new ForbiddenException();
     }
     // Registrar en audit log
     auditLog.record('TENANT_OVERRIDE', { userId, from: jwtTenantId, to: headerTenantId });
   }
   ```

3. **Fallback: Primer Tenant del Usuario**
   ```typescript
   // Solo si no hay tenantId en JWT ni header
   const firstTenant = user.tenantmembership[0]?.tenantId;
   ```

### Implementación en TenantContextGuard

**Archivo:** `apps/api/src/common/guards/tenant-context.guard.ts`

```typescript
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Debe venir del JwtAuthGuard

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error_key: 'auth.unauthorized',
      });
    }

    // PRIORIDAD 1: JWT (Fuente de Verdad)
    let tenantId = user.tenantId; // Del JWT payload

    // PRIORIDAD 2: Header x-tenant-id (Override Controlado)
    const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
      // Si header difiere de JWT, validar membership y registrar
      if (headerTenantId !== tenantId) {
        // Validar que usuario tiene membership en headerTenantId
        const hasMembership = await this.validateMembership(user.userId, headerTenantId);
        if (!hasMembership) {
          throw new ForbiddenException({
            success: false,
            error_key: 'tenants.no_access',
          });
        }
        // Registrar override en audit log
        await this.auditLog.record('TENANT_OVERRIDE', {
          userId: user.userId,
          from: tenantId,
          to: headerTenantId,
          endpoint: request.url,
          method: request.method,
        });
      }
      tenantId = headerTenantId;
    }

    // PRIORIDAD 3: Fallback (solo si no hay tenantId)
    if (!tenantId && user.tenantmembership && user.tenantmembership.length > 0) {
      const activeMembership = user.tenantmembership.find(
        (m: any) => m.tenant.status === 'ACTIVE' || m.tenant.status === 'TRIAL'
      );
      tenantId = activeMembership?.tenantId || user.tenantmembership[0]?.tenantId;
    }

    // Default Deny: Si no hay tenantId, denegar (excepto endpoints sin tenant)
    if (!tenantId) {
      // Permitir solo si el endpoint está marcado como @AllowNoTenant()
      const allowNoTenant = this.reflector.get<boolean>('allowNoTenant', context.getHandler());
      if (!allowNoTenant) {
        throw new ForbiddenException({
          success: false,
          error_key: 'tenants.no_tenant_available',
        });
      }
      return true;
    }

    // CRÍTICO: Validar membership antes de permitir acceso
    const membership = await this.prisma.tenantmembership.findFirst({
      where: {
        userId: user.userId,
        tenantId: tenantId,
      },
    });

    if (!membership) {
      // Log de seguridad
      this.logger.warn('[TenantContext] Access denied - No membership', {
        userId: user.userId,
        tenantId,
        endpoint: request.url,
        method: request.method,
      });
      throw new ForbiddenException({
        success: false,
        error_key: 'tenants.no_access',
      });
    }

    // Adjuntar tenantId y rol al request
    request.tenantId = tenantId;
    request.tenantRole = membership.role;

    return true;
  }

  private async validateMembership(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.prisma.tenantmembership.findFirst({
      where: { userId, tenantId },
    });
    return !!membership;
  }
}
```

---

## 🛡️ Policy "Default Deny"

### Reglas Absolutas

1. **Si falta tenantId → DENEGAR**
   ```typescript
   if (!tenantId) {
     throw new ForbiddenException('Tenant ID required');
   }
   ```

2. **Si tenantId no pertenece a usuario → DENEGAR**
   ```typescript
   const membership = await validateMembership(userId, tenantId);
   if (!membership) {
     throw new ForbiddenException('Access denied');
   }
   ```

3. **Si query no incluye tenantId → DENEGAR**
   ```typescript
   // ❌ PROHIBIDO
   const resource = await prisma.resource.findUnique({
     where: { id: resourceId }, // Falta tenantId
   });

   // ✅ CORRECTO
   const resource = await prisma.resource.findFirst({
     where: { id: resourceId, tenantId }, // Incluye tenantId
   });
   ```

### Implementación en Servicios

**Helper centralizado:** `apps/api/src/common/prisma/tenant-scoped-query.helper.ts`

```typescript
/**
 * Helper para garantizar que queries incluyen tenantId
 */
export function requireTenantScoped<T extends { tenantId?: string }>(
  tenantId: string,
  where: T,
): T & { tenantId: string } {
  if (!tenantId) {
    throw new BadRequestException({
      success: false,
      error_key: 'tenants.tenant_id_required',
    });
  }

  return {
    ...where,
    tenantId, // Siempre incluir tenantId
  };
}

/**
 * Helper para validar que un recurso pertenece a un tenant
 */
export async function validateResourceBelongsToTenant(
  prisma: PrismaService,
  model: string,
  resourceId: string,
  tenantId: string,
): Promise<boolean> {
  const resource = await (prisma as any)[model].findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });

  return !!resource;
}
```

**Uso en servicios:**

```typescript
// ✅ CORRECTO
async getResource(id: string, tenantId: string) {
  const where = requireTenantScoped(tenantId, { id });
  const resource = await this.prisma.resource.findFirst({ where });
  
  if (!resource) {
    throw new NotFoundException(); // No revelar existencia
  }
  
  return resource;
}
```

---

## 🔒 Guards y Middleware Centralizados

### 1. TenantContextGuard (Mejorado)

**Archivo:** `apps/api/src/common/guards/tenant-context.guard.ts`

**Mejoras:**
- ✅ JWT como prioridad 1
- ✅ Header override con validación
- ✅ Audit log para overrides
- ✅ Default deny si falta tenantId

**Uso:**
```typescript
@Controller('agents')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class AgentsController {
  @Get()
  async getAgents(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.agentsService.getAgents(tenant.id);
  }
}
```

---

### 2. PlatformGuard (Existente, Verificar)

**Archivo:** `apps/api/src/common/guards/platform.guard.ts`

**Verificaciones:**
- ✅ Valida `platformRole` en base de datos
- ✅ Permite acceso cross-tenant solo para PLATFORM_OWNER
- ⚠️ Agregar audit log para operaciones cross-tenant

**Mejora propuesta:**
```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  // ... validación existente ...

  // Si es operación cross-tenant, registrar en audit log
  if (this.isCrossTenantOperation(request)) {
    await this.auditLog.record('CROSS_TENANT_ACCESS', {
      userId: user.userId,
      platformRole: userWithRole.platformRole,
      endpoint: request.url,
      method: request.method,
      tenantId: request.tenantId, // Si hay tenantId específico
    });
  }

  return true;
}
```

---

### 3. RbacGuard (Existente, Verificar)

**Archivo:** `apps/api/src/common/guards/rbac.guard.ts`

**Verificaciones:**
- ✅ Valida tenantRole contra roles requeridos
- ✅ Integra con TenantContextGuard
- ✅ Mensajes de error consistentes

**Estado:** ✅ CORRECTO

---

## 💾 DB Query Patterns (Scoped Queries)

### Reglas Obligatorias

1. **SIEMPRE usar `findFirst` con `tenantId` en WHERE:**
   ```typescript
   // ✅ CORRECTO
   const resource = await prisma.resource.findFirst({
     where: {
       id: resourceId,
       tenantId, // OBLIGATORIO
     },
   });
   ```

2. **NUNCA usar `findUnique` sin `tenantId`:**
   ```typescript
   // ❌ PROHIBIDO
   const resource = await prisma.resource.findUnique({
     where: { id: resourceId }, // Falta tenantId
   });
   ```

3. **Excepciones (entidades globales):**
   ```typescript
   // ✅ ACEPTABLE (User es entidad global)
   const user = await prisma.user.findUnique({
     where: { id: userId },
   });

   // ✅ ACEPTABLE (Tenant es entidad global)
   const tenant = await prisma.tenant.findUnique({
     where: { id: tenantId },
   });
   ```

### Helper para Queries Tenant-Scoped

**Archivo:** `apps/api/src/common/prisma/tenant-scoped-query.helper.ts`

```typescript
/**
 * Garantiza que una query incluye tenantId
 */
export function withTenantId<T extends Record<string, any>>(
  tenantId: string,
  where: T,
): T & { tenantId: string } {
  if (!tenantId) {
    throw new BadRequestException('Tenant ID is required');
  }

  return {
    ...where,
    tenantId,
  };
}

/**
 * Valida que un recurso pertenece a un tenant antes de operar
 */
export async function validateResourceTenant(
  prisma: PrismaService,
  model: string,
  resourceId: string,
  tenantId: string,
): Promise<void> {
  const resource = await (prisma as any)[model].findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });

  if (!resource) {
    throw new NotFoundException(); // No revelar existencia
  }
}
```

### Linter Rule (ESLint)

**Archivo:** `.eslintrc.js` (agregar regla personalizada)

```javascript
// Regla para detectar findUnique sin tenantId
rules: {
  'no-find-unique-without-tenant': 'error',
}
```

**Implementación:** Crear plugin ESLint que detecte:
```typescript
// ❌ Detectado por linter
prisma.resource.findUnique({ where: { id } });

// ✅ OK
prisma.resource.findFirst({ where: { id, tenantId } });
```

---

## 👑 PLATFORM_OWNER Governance

### Endpoints Permitidos

**Lista explícita de endpoints cross-tenant:**

1. **Métricas Globales:**
   - `GET /platform/metrics` - Métricas agregadas de toda la plataforma
   - `GET /platform/operations/stats` - Estadísticas de operaciones

2. **Gestión de Tenants:**
   - `GET /platform/tenants` - Listar todos los tenants
   - `GET /platform/tenants/:id` - Ver detalles de un tenant
   - `PUT /platform/tenants/:id/suspend` - Suspender tenant
   - `PUT /platform/tenants/:id/reactivate` - Reactivar tenant
   - `DELETE /platform/tenants/:id` - Eliminar tenant (soft delete)

3. **Auditoría:**
   - `GET /platform/audit-logs` - Ver logs de auditoría
   - `GET /platform/audit-logs/:id` - Ver log específico

### Validación Estricta

**Todos los endpoints de plataforma deben:**
1. ✅ Tener `@UseGuards(JwtAuthGuard, PlatformGuard)`
2. ✅ Validar `platformRole = 'PLATFORM_OWNER'`
3. ✅ Registrar en audit log
4. ✅ NO permitir acceso a datos específicos de tenants sin endpoint explícito

### Audit Log para Operaciones Cross-Tenant

**Archivo:** `apps/api/src/common/audit/audit-logger.service.ts`

```typescript
@Injectable()
export class AuditLoggerService {
  constructor(private prisma: PrismaService) {}

  async record(
    action: string,
    data: {
      userId: string;
      platformRole?: string;
      tenantId?: string;
      resourceType?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
      ip?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    await this.prisma.auditlog.create({
      data: {
        userId: data.userId,
        platformRole: data.platformRole,
        tenantId: data.tenantId,
        action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata || {},
        ipAddress: data.ip,
        userAgent: data.userAgent,
        timestamp: new Date(),
      },
    });
  }
}
```

**Uso:**
```typescript
// En PlatformService
async listTenants(filters: any) {
  // Registrar acceso cross-tenant
  await this.auditLogger.record('LIST_TENANTS', {
    userId: platformUser.userId,
    platformRole: platformUser.platformRole,
    metadata: { filters },
  });

  // ... lógica de negocio ...
}
```

---

## 🚫 Estrategia Anti-IDOR

### Validación en Múltiples Capas

**Capa 1: Controller (Validación de Formato)**
```typescript
@Get(':id')
async getResource(
  @Param('id', ParseUUIDPipe) id: string, // Validar formato
  @CurrentTenant() tenant: { id: string; role: string },
) {
  return this.service.getResource(id, tenant.id);
}
```

**Capa 2: Service (Validación de Pertenencia)**
```typescript
async getResource(id: string, tenantId: string) {
  // Validar que recurso pertenece a tenant
  const resource = await this.prisma.resource.findFirst({
    where: { id, tenantId },
  });

  if (!resource) {
    throw new NotFoundException(); // No revelar existencia
  }

  return resource;
}
```

**Capa 3: Database (Filtrado por tenantId)**
```typescript
// Query siempre filtra por tenantId
where: { id, tenantId }
```

### Patrón de Validación Centralizado

**Helper:** `apps/api/src/common/validation/resource-tenant.helper.ts`

```typescript
/**
 * Valida que un recurso pertenece a un tenant
 * Lanza NotFoundException si no pertenece (no revela existencia)
 */
export async function validateResourceTenant(
  prisma: PrismaService,
  model: string,
  resourceId: string,
  tenantId: string,
): Promise<void> {
  const resource = await (prisma as any)[model].findFirst({
    where: { id: resourceId, tenantId },
    select: { id: true },
  });

  if (!resource) {
    throw new NotFoundException({
      success: false,
      error_key: `${model}.not_found`,
    });
  }
}
```

**Uso:**
```typescript
async updateResource(id: string, tenantId: string, dto: UpdateDto) {
  // Validar pertenencia
  await validateResourceTenant(this.prisma, 'resource', id, tenantId);

  // Actualizar
  return this.prisma.resource.update({
    where: { id, tenantId },
    data: dto,
  });
}
```

---

## 🧪 Estrategia de Tests

### Suite de Tests de Aislamiento

**Archivo:** `apps/api/src/modules/security/__tests__/multi-tenant-isolation.spec.ts`

```typescript
describe('Multi-Tenant Isolation', () => {
  let app: INestApplication;
  let tenantA: Tenant;
  let tenantB: Tenant;
  let userA: User;
  let userB: User;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Setup: Crear tenants y usuarios de prueba
    tenantA = await createTestTenant('Tenant A');
    tenantB = await createTestTenant('Tenant B');
    userA = await createTestUser('userA@test.com', tenantA.id);
    userB = await createTestUser('userB@test.com', tenantB.id);
    tokenA = await getAuthToken(userA.id, tenantA.id);
    tokenB = await getAuthToken(userB.id, tenantB.id);
  });

  describe('Agents Isolation', () => {
    it('should prevent tenant A from accessing tenant B agents', async () => {
      // Crear agente en tenant B
      const agentB = await createAgent(tenantB.id, 'Agent B');

      // Usuario A intenta acceder a agente de tenant B
      const response = await request(app.getHttpServer())
        .get(`/agents/${agentB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA.id) // Intentar con tenant A
        .expect(404); // Debe fallar

      expect(response.body.success).toBe(false);
    });

    it('should allow tenant A to access their own agents', async () => {
      const agentA = await createAgent(tenantA.id, 'Agent A');

      const response = await request(app.getHttpServer())
        .get(`/agents/${agentA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantA.id)
        .expect(200);

      expect(response.body.data.id).toBe(agentA.id);
    });
  });

  describe('Header Spoofing Prevention', () => {
    it('should prevent spoofing x-tenant-id header without membership', async () => {
      // Usuario A intenta usar tenant B sin membership
      const response = await request(app.getHttpServer())
        .get('/agents')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-tenant-id', tenantB.id) // Header de tenant B
        .expect(403); // Debe fallar

      expect(response.body.error_key).toBe('tenants.no_access');
    });
  });

  describe('Platform Owner Access', () => {
    it('should allow PLATFORM_OWNER to access cross-tenant data', async () => {
      const platformOwner = await createPlatformOwner('owner@test.com');
      const token = await getAuthToken(platformOwner.id);

      const response = await request(app.getHttpServer())
        .get('/platform/tenants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.tenants.length).toBeGreaterThan(0);
    });

    it('should log cross-tenant access in audit log', async () => {
      const platformOwner = await createPlatformOwner('owner@test.com');
      const token = await getAuthToken(platformOwner.id);

      await request(app.getHttpServer())
        .get('/platform/tenants')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verificar que se registró en audit log
      const auditLog = await prisma.auditlog.findFirst({
        where: {
          userId: platformOwner.id,
          action: 'LIST_TENANTS',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.platformRole).toBe('PLATFORM_OWNER');
    });
  });
});
```

### Tests de Guards

**Archivo:** `apps/api/src/common/guards/__tests__/tenant-context.guard.spec.ts`

```typescript
describe('TenantContextGuard', () => {
  it('should use JWT tenantId as priority 1', async () => {
    // ...
  });

  it('should allow header override if user has membership', async () => {
    // ...
  });

  it('should deny access if header tenantId has no membership', async () => {
    // ...
  });

  it('should deny access if no tenantId available', async () => {
    // ...
  });
});
```

---

## 📊 Observabilidad (Logs y Auditoría)

### Logging Estructurado

**Middleware:** `apps/api/src/common/middleware/tenant-logging.middleware.ts`

```typescript
@Injectable()
export class TenantLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Inyectar tenantId en todos los logs
    const tenantId = req.tenantId || 'none';
    
    // Agregar tenantId a contexto de logging
    req.logContext = {
      tenantId,
      userId: req.user?.userId,
      endpoint: req.url,
      method: req.method,
    };

    next();
  }
}
```

**Uso en servicios:**
```typescript
this.logger.log('Operation completed', {
  tenantId: this.request.tenantId,
  userId: this.request.user.userId,
  // ... otros campos
});
```

### Audit Log Schema

**Prisma Schema:**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  platformRole String? // PLATFORM_OWNER, PLATFORM_ADMIN, etc.
  tenantId    String?  // Tenant accedido (si es cross-tenant)
  action      String   // LIST_TENANTS, SUSPEND_TENANT, etc.
  resourceType String? // TENANT, USER, etc.
  resourceId  String?  // ID del recurso afectado
  metadata    Json?    // Datos adicionales
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([tenantId])
  @@index([action])
  @@index([timestamp])
}
```

---

## ✅ Checklist de Implementación

### Fase 1: Correcciones Críticas
- [ ] P0-01: Corregir TenantContextGuard (JWT prioridad 1)
- [ ] P0-02: Corregir query en appointments.service.ts:187
- [ ] P1-04: Corregir idempotency check en email-queue.service.ts

### Fase 2: Mejoras de Seguridad
- [ ] P1-05: Mejorar queries en InvitationsService
- [ ] P1-06: Mejorar queries en TeamService
- [ ] P2-01: Crear helpers centralizados
- [ ] P2-02: Implementar AuditLogger

### Fase 3: Tests y Observabilidad
- [ ] P2-09: Implementar tests de aislamiento
- [ ] P2-12: Agregar tenantId a logs
- [ ] P2-11: Implementar rate limiting por tenant

### Fase 4: Optimizaciones
- [ ] P2-04: Validar tenantId en webhooks
- [ ] P2-05: Verificar cache keys
- [ ] P2-06: Auditar exportaciones
- [ ] P2-07: Validar paths en storage

---

**Próximos Pasos:**
1. Revisar Plan de Implementación: `MULTI-TENANT-ISOLATION-IMPLEMENTATION-PLAN.md`
2. Iniciar Fase 1: Correcciones Críticas
3. Code review de cambios

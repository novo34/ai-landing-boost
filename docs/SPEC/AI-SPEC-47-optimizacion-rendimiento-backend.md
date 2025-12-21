# AI-SPEC-47: Optimización de Rendimiento Backend

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-47  
> **Prioridad:** 🟡 ALTA  
> **Alineado con:** `IA-Specs/06-backend-standards.mdc`

---

## Arquitectura

### Módulos NestJS a Modificar

```
apps/api/src/
├── modules/
│   ├── session/
│   │   └── session.service.ts                    [MODIFICAR] - Optimizar queries
│   ├── tenants/
│   │   └── tenants.service.ts                    [MODIFICAR] - Optimizar queries + cache
│   ├── team/
│   │   └── team.service.ts                       [MODIFICAR] - Optimizar queries N+1
│   ├── gdpr/
│   │   └── gdpr.service.ts                       [MODIFICAR] - Optimizar queries
│   ├── billing/
│   │   └── billing.service.ts                    [MODIFICAR] - Optimizar queries + cache
│   ├── analytics/
│   │   └── analytics.service.ts                  [MODIFICAR] - Optimizar queries + cache
│   └── ... (otros services según auditoría)
├── common/
│   ├── cache/
│   │   ├── cache.service.ts                      [CREAR] - Servicio de cache
│   │   └── cache.module.ts                       [CREAR] - Módulo de cache
│   └── prisma/
│       └── prisma-performance.middleware.ts       [CREAR] - Middleware de instrumentación
└── prisma/
    └── schema.prisma                              [MODIFICAR] - Agregar índices
```

---

## Archivos a Crear/Modificar

### 1. Crear Servicio de Cache

**Archivo:** `apps/api/src/common/cache/cache.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Obtiene un valor del cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Guarda un valor en el cache con TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  /**
   * Elimina un valor del cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}
```

**Archivo:** `apps/api/src/common/cache/cache.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

---

### 2. Crear Middleware de Instrumentación Prisma

**Archivo:** `apps/api/src/common/prisma/prisma-performance.middleware.ts`

```typescript
import { Prisma } from '@prisma/client';

/**
 * Middleware de Prisma para medir tiempo de queries
 * Solo activo en development
 */
export function createPrismaPerformanceMiddleware() {
  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<any>,
  ) => {
    if (process.env.NODE_ENV !== 'development') {
      return next(params);
    }

    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;

    // Log queries lentas (>50ms)
    if (duration > 50) {
      const model = params.model || 'unknown';
      const action = params.action;
      console.log(
        `[PERF][PRISMA] ${model}.${action} ... ${duration}ms`,
        params.args ? { args: JSON.stringify(params.args).substring(0, 200) } : {},
      );
    }

    return result;
  };
}
```

**Modificar:** `apps/api/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaPerformanceMiddleware } from '../common/prisma/prisma-performance.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Agregar middleware de performance
    this.$use(createPrismaPerformanceMiddleware());
    
    await this.$connect();
    // ... resto del código
  }
}
```

---

### 3. Modificar Prisma Schema - Agregar Índices

**Archivo:** `apps/api/prisma/schema.prisma`

**Índices a agregar (según auditoría):**

```prisma
model Agent {
  id        String   @id @default(cuid())
  tenantId  String
  status    String
  createdAt DateTime @default(now())
  
  // Índices para optimizar queries frecuentes
  @@index([tenantId, status]) // Query: WHERE tenantId = X AND status = 'ACTIVE'
  @@index([createdAt])        // Query: ORDER BY createdAt
}

model Channel {
  id        String   @id @default(cuid())
  tenantId  String
  status    String
  type      String
  createdAt DateTime @default(now())
  
  @@index([tenantId, status])
  @@index([tenantId, type])
}

model Conversation {
  id        String   @id @default(cuid())
  tenantId  String
  status    String
  agentId   String?
  createdAt DateTime @default(now())
  
  @@index([tenantId, status])
  @@index([tenantId, agentId])
  @@index([createdAt])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  createdAt      DateTime @default(now())
  
  @@index([conversationId, createdAt]) // Para queries de mensajes ordenados
}

model TenantMembership {
  userId   String
  tenantId String
  role     String
  
  @@index([userId])
  @@index([tenantId, role]) // Para queries de miembros por rol
}

// Agregar índices en otras tablas según auditoría
```

**Crear migración:**
```bash
cd apps/api
npx prisma migrate dev --name add_performance_indexes
```

---

### 4. Optimizar Session Service

**Archivo:** `apps/api/src/modules/session/session.service.ts`

**Antes (posible N+1):**
```typescript
async getSession(userId: string, tenantId?: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantmembership: {
        include: {
          tenant: true, // Puede ser pesado
        },
      },
    },
  });
  // ...
}
```

**Después (optimizado):**
```typescript
async getSession(userId: string, tenantId?: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      timeZone: true,
      platformRole: true,
      tenantmembership: {
        select: {
          role: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      },
    },
  });
  // ...
}
```

---

### 5. Optimizar Tenants Service con Cache

**Archivo:** `apps/api/src/modules/tenants/tenants.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getTenantSettings(tenantId: string) {
    const cacheKey = `tenant-settings:${tenantId}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Query optimizada con select
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        defaultLocale: true,
        timeZone: true,
        country: true,
        dataRegion: true,
        whatsappProvider: true,
        calendarProvider: true,
        businessType: true,
        industryNotes: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    // Guardar en cache (5 minutos)
    if (settings) {
      this.cache.set(cacheKey, settings, 5 * 60 * 1000);
    }
    
    return settings;
  }

  async updateTenantSettings(tenantId: string, data: UpdateTenantSettingsDto) {
    const settings = await this.prisma.tenantSettings.update({
      where: { tenantId },
      data,
    });
    
    // Invalidar cache
    this.cache.delete(`tenant-settings:${tenantId}`);
    
    return settings;
  }
}
```

---

### 6. Optimizar Team Service (Eliminar N+1)

**Archivo:** `apps/api/src/modules/team/team.service.ts`

**Antes (N+1):**
```typescript
async getTeamMembers(tenantId: string) {
  const memberships = await this.prisma.tenantMembership.findMany({
    where: { tenantId },
  });
  
  const members = [];
  for (const membership of memberships) {
    const user = await this.prisma.user.findUnique({
      where: { id: membership.userId },
    }); // N+1 query
    members.push({ ...membership, user });
  }
  return members;
}
```

**Después (optimizado):**
```typescript
async getTeamMembers(tenantId: string) {
  const memberships = await this.prisma.tenantMembership.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          timeZone: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return memberships.map(m => ({
    id: m.id,
    role: m.role,
    userId: m.userId,
    tenantId: m.tenantId,
    user: m.user,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}
```

---

### 7. Optimizar GDPR Service

**Archivo:** `apps/api/src/modules/gdpr/gdpr.service.ts`

**Optimizaciones:**
- Usar `select` en lugar de `include`
- Evitar includes anidados innecesarios
- Agregar índices si es necesario

```typescript
async getConsents(tenantId: string) {
  return this.prisma.gdprConsent.findMany({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      type: true,
      status: true,
      consentDate: true,
      createdAt: true,
      updatedAt: true,
      // No incluir relaciones pesadas si no son necesarias
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
```

---

### 8. Optimizar Billing Service con Cache

**Archivo:** `apps/api/src/modules/billing/billing.service.ts`

```typescript
async getCurrentSubscription(tenantId: string) {
  const cacheKey = `billing-current:${tenantId}`;
  
  const cached = this.cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const subscription = await this.prisma.subscription.findFirst({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      planId: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  // Cache por 1 minuto (datos de facturación cambian poco)
  if (subscription) {
    this.cache.set(cacheKey, subscription, 60 * 1000);
  }
  
  return subscription;
}
```

---

### 9. Optimizar Analytics Service con Cache

**Archivo:** `apps/api/src/modules/analytics/analytics.service.ts`

```typescript
async getKPIs(tenantId: string) {
  const cacheKey = `analytics-kpis:${tenantId}`;
  
  const cached = this.cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Queries optimizadas en paralelo
  const [leads, agents, channels, conversations, messages] = await Promise.all([
    this.prisma.marketingLead.count({
      where: { tenantId },
    }),
    this.prisma.agent.count({
      where: { tenantId, status: 'ACTIVE' },
    }),
    this.prisma.channel.count({
      where: { tenantId, status: 'ACTIVE' },
    }),
    this.prisma.conversation.count({
      where: { tenantId, status: 'ACTIVE' },
    }),
    this.prisma.message.count({
      where: {
        conversation: { tenantId },
        createdAt: {
          gte: new Date(new Date().setDate(1)), // Primer día del mes
        },
      },
    }),
  ]);
  
  const kpis = {
    leads,
    agents,
    channels,
    conversations,
    messages,
    // ... otros cálculos
  };
  
  // Cache por 5 minutos
  this.cache.set(cacheKey, kpis, 5 * 60 * 1000);
  
  return kpis;
}
```

---

## Proceso de Implementación

### Paso 1: Auditoría

1. Habilitar middleware de Prisma
2. Ejecutar endpoints críticos
3. Revisar logs `[PERF][PRISMA]`
4. Identificar queries > 100ms
5. Documentar en `docs/perf-backend-audit.md`

### Paso 2: Optimizaciones Incrementales

1. **Endpoints críticos primero:**
   - `/session/me`
   - `/tenants/settings`
   - `/billing/current`
   - `/analytics/kpis`

2. **Para cada endpoint:**
   - Identificar queries lentas
   - Optimizar (eliminar N+1, usar select, agregar índices)
   - Agregar cache si aplica
   - Medir antes/después
   - Documentar cambios

### Paso 3: Índices

1. Crear migración de Prisma
2. Agregar índices identificados
3. Aplicar migración
4. Verificar mejoras

### Paso 4: Validación

1. Ejecutar endpoints optimizados
2. Comparar tiempos antes/después
3. Verificar que no hay regresiones
4. Documentar resultados

---

## Testing

### Tests de Performance

```typescript
describe('TenantsService Performance', () => {
  it('should get tenant settings in < 100ms', async () => {
    const start = Date.now();
    await service.getTenantSettings(tenantId);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  it('should use cache on second call', async () => {
    await service.getTenantSettings(tenantId);
    const start = Date.now();
    await service.getTenantSettings(tenantId);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10); // Cache debería ser < 10ms
  });
});
```

---

## Documentación

### Archivo: `docs/perf-backend-optimizations.md`

Documentar:
- Queries optimizadas
- Índices agregados
- Cache implementado
- Tiempos antes/después
- Mejoras medidas

---

## Referencias

- `IA-Specs/06-backend-standards.mdc` - Estándares de backend
- `PRD-47-optimizacion-rendimiento-backend.md` - PRD relacionado
- Documentación de Prisma: https://www.prisma.io/docs/guides/performance-and-optimization
- Documentación de índices Prisma: https://www.prisma.io/docs/concepts/components/prisma-schema/indexes

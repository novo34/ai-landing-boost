# PRD-47: Optimización de Rendimiento Backend

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🟡 ALTA  
> **Estado:** Pendiente  
> **Bloque:** Optimizaciones de Rendimiento  
> **Dependencias:** PRD-46 (Platform Owner), Fix #1 (Deduplicación de Requests) ✅

---

## Objetivo

Optimizar el rendimiento del backend (API NestJS + Prisma/MySQL) para reducir los tiempos de respuesta de endpoints críticos de 100-250ms a menos de 100ms, mejorando la percepción de velocidad del SaaS.

---

## Contexto

### Problema Identificado

**Evidencia de logs de performance:**
- Endpoints lentos (100-250ms promedio):
  - `/team/members`: ~250ms
  - `/gdpr/consents`: ~217ms
  - `/gdpr/retention-policies`: ~219ms
  - `/tenants/settings`: ~150ms
  - `/billing/current`: ~150ms
  - `/analytics/kpis`: ~125ms

**Causas raíz probables:**
- Queries Prisma con N+1 (múltiples queries en lugar de una)
- Falta de índices en campos frecuentemente consultados
- Queries con includes anidados pesados
- Falta de cache en backend
- Queries que cargan más datos de los necesarios

**Impacto:**
- Navegación se siente lenta
- UI tarda en reaccionar
- Percepción de lentitud general del SaaS

---

## Alcance INCLUIDO

- ✅ Auditoría de queries Prisma lentas
- ✅ Identificación de problemas N+1
- ✅ Optimización de queries con includes anidados
- ✅ Implementación de índices en campos críticos
- ✅ Cache en backend para endpoints frecuentes
- ✅ Paginación server-side donde aplique
- ✅ Select solo de campos necesarios
- ✅ Instrumentación de queries (medición de tiempo)
- ✅ Documentación de optimizaciones aplicadas

---

## Alcance EXCLUIDO

- ❌ Cambios en el schema de Prisma (solo índices)
- ❌ Refactor masivo de código existente
- ❌ Cambios en la lógica de negocio
- ❌ Optimizaciones de base de datos a nivel de servidor MySQL
- ❌ Implementación de Redis (queda para futura mejora)

---

## Requisitos Funcionales

### RF-01: Auditoría de Queries Lentas

**Descripción:** Identificar queries Prisma que tardan más de 100ms.

**Proceso:**
1. Habilitar query logging en Prisma (solo en development)
2. Instrumentar endpoints críticos para medir tiempo de queries
3. Identificar queries que superan 100ms
4. Documentar queries problemáticas con:
   - Endpoint que las ejecuta
   - Tiempo promedio
   - Campos consultados
   - Includes anidados

**Endpoints prioritarios:**
- `/session/me` (aunque ya está optimizado, verificar)
- `/tenants/settings`
- `/team/members`
- `/gdpr/consents`
- `/gdpr/retention-policies`
- `/billing/current`
- `/analytics/kpis`
- `/agents`
- `/appointments`
- `/knowledge/collections`
- `/knowledge/sources`

---

### RF-02: Eliminación de N+1 Queries

**Descripción:** Identificar y eliminar problemas de N+1 queries.

**Problema N+1:**
```typescript
// ❌ MAL - N+1 queries
const agents = await prisma.agent.findMany({ where: { tenantId } });
for (const agent of agents) {
  const channel = await prisma.channel.findFirst({ 
    where: { agentId: agent.id } 
  }); // Query por cada agente
}
```

**Solución:**
```typescript
// ✅ BIEN - Una query con include
const agents = await prisma.agent.findMany({
  where: { tenantId },
  include: { channels: true }, // Una sola query
});
```

**Acciones:**
1. Identificar loops que hacen queries dentro
2. Reemplazar con includes o joins
3. Usar `Promise.all()` cuando sea necesario
4. Verificar que no se creen nuevos N+1

---

### RF-03: Optimización de Includes Anidados

**Descripción:** Optimizar queries con includes anidados pesados.

**Problema:**
```typescript
// ❌ MAL - Incluye demasiados datos
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    tenantmembership: {
      include: {
        tenant: {
          include: {
            agents: {
              include: {
                channels: true,
                knowledgeCollections: true,
              },
            },
          },
        },
      },
    },
  },
});
```

**Solución:**
```typescript
// ✅ BIEN - Solo lo necesario
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    tenantmembership: {
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    },
  },
});
```

**Reglas:**
- Usar `select` en lugar de `include` cuando sea posible
- Solo seleccionar campos necesarios
- Evitar includes anidados profundos (>2 niveles)
- Separar queries cuando sea necesario

---

### RF-04: Implementación de Índices

**Descripción:** Agregar índices en campos frecuentemente consultados.

**Índices a evaluar (según queries identificadas):**
- `tenant_id` en todas las tablas (ya debería existir)
- `status` en tablas con filtros frecuentes (Agent, Channel, Conversation)
- `createdAt` en tablas con filtros por fecha
- `email` en User (ya existe como unique)
- Campos de foreign keys frecuentemente usados

**Proceso:**
1. Identificar campos usados en WHERE frecuentemente
2. Verificar si ya tienen índices
3. Crear migración de Prisma para agregar índices
4. Documentar índices creados

**Ejemplo:**
```prisma
model Agent {
  id        String   @id @default(cuid())
  tenantId  String
  status    String
  createdAt DateTime @default(now())
  
  @@index([tenantId, status]) // Índice compuesto
  @@index([createdAt])
}
```

---

### RF-05: Cache en Backend

**Descripción:** Implementar cache para endpoints frecuentes y datos que cambian poco.

**Endpoints candidatos para cache:**
- `/session/me` (TTL: 5 minutos)
- `/tenants/settings` (TTL: 5 minutos)
- `/billing/current` (TTL: 1 minuto)
- `/analytics/kpis` (TTL: 5 minutos)

**Implementación:**
- Cache en memoria (Map) para desarrollo
- Cache con TTL configurable
- Invalidación de cache en updates
- Headers HTTP para cache del cliente (opcional)

**Ejemplo:**
```typescript
// Cache simple en memoria
private cache = new Map<string, { data: any; expires: number }>();

async getTenantSettings(tenantId: string) {
  const cacheKey = `tenant-settings:${tenantId}`;
  const cached = this.cache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  
  const data = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
  });
  
  this.cache.set(cacheKey, {
    data,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutos
  });
  
  return data;
}
```

---

### RF-06: Paginación Server-Side

**Descripción:** Implementar paginación en endpoints que retornan listas grandes.

**Endpoints candidatos:**
- `/agents` (si puede haber muchos)
- `/appointments` (si puede haber muchos)
- `/conversations` (si puede haber muchos)
- `/team/members` (si puede haber muchos)

**Implementación:**
```typescript
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 50,
  @CurrentTenant() tenant: Tenant,
) {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    this.prisma.agent.findMany({
      where: { tenantId: tenant.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.agent.count({
      where: { tenantId: tenant.id },
    }),
  ]);
  
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

---

### RF-07: Instrumentación de Queries

**Descripción:** Medir tiempo de queries Prisma para identificar cuellos de botella.

**Implementación:**
- Middleware de Prisma para log de queries lentas
- Logs solo en development
- Formato: `[PERF][PRISMA] Query ... X ms`

**Ejemplo:**
```typescript
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development' && duration > 50) {
    console.log(`[PERF][PRISMA] ${params.model}.${params.action} ... ${duration}ms`);
  }
  
  return result;
});
```

---

## Requisitos Técnicos

### RT-01: Modificaciones en Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acciones:**
- Agregar índices en campos identificados como lentos
- Verificar índices existentes
- Documentar índices agregados

**No modificar:**
- Estructura de modelos
- Relaciones existentes
- Campos existentes

---

### RT-02: Modificaciones en Services

**Archivos:** Múltiples services en `apps/api/src/modules/*/`

**Acciones:**
- Optimizar queries identificadas como lentas
- Eliminar N+1 queries
- Agregar cache donde aplique
- Implementar paginación donde aplique
- Usar `select` en lugar de `include` cuando sea posible

---

### RT-03: Middleware de Prisma

**Archivo:** `apps/api/src/prisma/prisma.service.ts` o nuevo archivo

**Acciones:**
- Agregar middleware de Prisma para instrumentación
- Log de queries lentas (>50ms)
- Solo en development

---

### RT-04: Cache Service (Opcional)

**Archivo:** `apps/api/src/common/cache/cache.service.ts` (nuevo)

**Acciones:**
- Implementar cache simple en memoria
- TTL configurable
- Invalidación de cache
- Métodos: get, set, delete, clear

---

## Criterios de Aceptación

### CA-01: Reducción de Tiempos

- ✅ Endpoints críticos < 100ms (objetivo)
- ✅ Mejora mínima del 30% en tiempos promedio
- ✅ Sin regresiones en funcionalidad

### CA-02: Eliminación de N+1

- ✅ No hay loops con queries dentro
- ✅ Todas las queries usan includes o joins apropiados
- ✅ Verificado con logs de Prisma

### CA-03: Índices Implementados

- ✅ Índices agregados en campos identificados
- ✅ Migración de Prisma creada y aplicada
- ✅ Documentación de índices creados

### CA-04: Cache Funcionando

- ✅ Cache implementado en endpoints candidatos
- ✅ TTL configurado correctamente
- ✅ Invalidación de cache en updates

### CA-05: Instrumentación Activa

- ✅ Logs de queries lentas funcionando
- ✅ Métricas documentadas
- ✅ Evidencia de mejoras

---

## Métricas de Éxito

### Antes (Baseline)

| Endpoint | Tiempo Promedio |
|----------|----------------|
| `/team/members` | ~250ms |
| `/gdpr/consents` | ~217ms |
| `/gdpr/retention-policies` | ~219ms |
| `/tenants/settings` | ~150ms |
| `/billing/current` | ~150ms |
| `/analytics/kpis` | ~125ms |

### Después (Objetivo)

| Endpoint | Tiempo Objetivo | Mejora Mínima |
|----------|----------------|---------------|
| `/team/members` | < 150ms | 40% |
| `/gdpr/consents` | < 100ms | 54% |
| `/gdpr/retention-policies` | < 100ms | 54% |
| `/tenants/settings` | < 100ms | 33% |
| `/billing/current` | < 100ms | 33% |
| `/analytics/kpis` | < 100ms | 20% |

---

## Priorización

### Fase 1: Endpoints Críticos (ALTA)
1. `/session/me` (ya optimizado, verificar)
2. `/tenants/settings`
3. `/billing/current`
4. `/analytics/kpis`

### Fase 2: Endpoints Lentos (MEDIA)
1. `/team/members`
2. `/gdpr/consents`
3. `/gdpr/retention-policies`

### Fase 3: Endpoints Restantes (BAJA)
1. `/agents`
2. `/appointments`
3. `/knowledge/*`

---

## Riesgos y Mitigaciones

### Riesgo 1: Cambios rompen funcionalidad existente
**Mitigación:** Tests antes/después, cambios pequeños e incrementales

### Riesgo 2: Índices aumentan tiempo de escritura
**Mitigación:** Solo agregar índices en campos de lectura frecuente, no en campos de escritura frecuente

### Riesgo 3: Cache desactualizado
**Mitigación:** Invalidación de cache en todos los updates, TTL corto

---

## Dependencias

- ✅ Fix #1 (Deduplicación de Requests) - COMPLETADO
- ⏳ Instrumentación de performance - COMPLETADO
- ⏳ Acceso a logs de Prisma

---

## Referencias

- `IA-Specs/06-backend-standards.mdc` - Estándares de backend
- `docs/perf-findings.md` - Análisis de rendimiento
- `docs/perf-results-final.md` - Resultados del Fix #1
- Documentación de Prisma: https://www.prisma.io/docs

---

## Notas

- Este PRD se enfoca en optimizaciones incrementales, no refactor masivo
- Todos los cambios deben ser medibles (antes/después)
- Mantener compatibilidad con código existente
- Documentar todas las optimizaciones aplicadas

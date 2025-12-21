# Plan de Implementación: Multi-Tenant Isolation & Platform Owner Governance

**Versión:** 1.0  
**Fecha:** 2025-01-27  
**Estado:** 📋 READY FOR IMPLEMENTATION

---

## 📅 Resumen de Fases

| Fase | Duración | Prioridad | Estado |
|------|----------|-----------|--------|
| **Fase 1: Correcciones Críticas** | 1 semana | P0 | ⏳ PENDIENTE |
| **Fase 2: Mejoras de Seguridad** | 2 semanas | P1 | ⏳ PENDIENTE |
| **Fase 3: Tests y Observabilidad** | 2 semanas | P1/P2 | ⏳ PENDIENTE |
| **Fase 4: Optimizaciones** | 2 semanas | P2 | ⏳ PENDIENTE |

**Total estimado:** 7 semanas

---

## 🚨 Fase 1: Correcciones Críticas (Semana 1)

### Tarea 1.1: Corregir TenantContextGuard (P0-01)

**Prioridad:** P0 - CRÍTICA  
**Estimación:** 4 horas  
**Archivo:** `apps/api/src/common/guards/tenant-context.guard.ts`

**Cambios:**
1. Cambiar prioridad: JWT primero, header después
2. Validar membership antes de permitir header override
3. Registrar en audit log cuando header difiere de JWT
4. Agregar logging de seguridad

**Código a modificar:**
```typescript
// ANTES (líneas 38-72)
// Prioridad 1: Header x-tenant-id
let tenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];
// Prioridad 2: tenantId del JWT
if (!tenantId && user.tenantId) {
  tenantId = user.tenantId;
}

// DESPUÉS
// Prioridad 1: JWT (Fuente de Verdad)
let tenantId = user.tenantId;

// Prioridad 2: Header x-tenant-id (Override Controlado)
const headerTenantId = request.headers['x-tenant-id'] || request.headers['X-Tenant-Id'];
if (headerTenantId && typeof headerTenantId === 'string') {
  if (headerTenantId !== tenantId) {
    // Validar membership antes de permitir override
    const hasMembership = await this.validateMembership(user.userId, headerTenantId);
    if (!hasMembership) {
      throw new ForbiddenException({
        success: false,
        error_key: 'tenants.no_access',
      });
    }
    // Registrar en audit log
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
```

**Tests:**
- [ ] Test: JWT tiene prioridad sobre header
- [ ] Test: Header override funciona si hay membership
- [ ] Test: Header override falla sin membership
- [ ] Test: Audit log registra override

**Checklist de QA:**
- [ ] Verificar que JWT es prioridad 1
- [ ] Verificar que header override requiere membership
- [ ] Verificar que audit log registra overrides
- [ ] Verificar que logs de seguridad funcionan

---

### Tarea 1.2: Corregir query en appointments.service.ts (P0-02)

**Prioridad:** P0 - CRÍTICA  
**Estimación:** 1 hora  
**Archivo:** `apps/api/src/modules/appointments/appointments.service.ts`

**Cambios:**
```typescript
// ANTES (línea 187)
const conversation = await this.prisma.conversation.findUnique({
  where: { id: dto.conversationId },
  select: { whatsappAccountId: true },
});

// DESPUÉS
const conversation = await this.prisma.conversation.findFirst({
  where: {
    id: dto.conversationId,
    tenantId, // OBLIGATORIO
  },
  select: { whatsappAccountId: true },
});
```

**Tests:**
- [ ] Test: Query falla si conversationId pertenece a otro tenant
- [ ] Test: Query funciona si conversationId pertenece al tenant correcto

**Checklist de QA:**
- [ ] Verificar que query incluye tenantId
- [ ] Verificar que test de aislamiento pasa

---

### Tarea 1.3: Corregir idempotency check en email-queue.service.ts (P1-04)

**Prioridad:** P1 - ALTA  
**Estimación:** 1 hora  
**Archivo:** `apps/api/src/modules/email/services/email-queue.service.ts`

**Cambios:**
```typescript
// ANTES (línea 33)
const existing = await this.prisma.emailoutbox.findUnique({
  where: { idempotencyKey: dto.idempotencyKey },
});

// DESPUÉS
const existing = await this.prisma.emailoutbox.findFirst({
  where: {
    idempotencyKey: dto.idempotencyKey,
    tenantId: dto.tenantId, // OBLIGATORIO
  },
});
```

**Nota:** Verificar que `dto.tenantId` está disponible. Si no, obtener de `@CurrentTenant()`.

**Tests:**
- [ ] Test: Idempotency funciona dentro del mismo tenant
- [ ] Test: Idempotency no interfiere entre tenants diferentes

**Checklist de QA:**
- [ ] Verificar que idempotency incluye tenantId
- [ ] Verificar que diferentes tenants pueden usar mismo idempotencyKey

---

## 🔒 Fase 2: Mejoras de Seguridad (Semanas 2-3)

### Tarea 2.1: Crear helpers centralizados (P2-01)

**Prioridad:** P2 - MEDIA  
**Estimación:** 4 horas  
**Archivo:** `apps/api/src/common/prisma/tenant-scoped-query.helper.ts` (nuevo)

**Implementación:**
```typescript
/**
 * Helper para garantizar que queries incluyen tenantId
 */
export function requireTenantScoped<T extends Record<string, any>>(
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
    tenantId,
  };
}

/**
 * Valida que un recurso pertenece a un tenant
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

**Migración gradual:**
- [ ] Migrar InvitationsService
- [ ] Migrar TeamService
- [ ] Migrar otros servicios críticos

**Checklist de QA:**
- [ ] Verificar que helpers funcionan correctamente
- [ ] Verificar que tests pasan después de migración

---

### Tarea 2.2: Mejorar queries en InvitationsService (P1-05)

**Prioridad:** P1 - ALTA  
**Estimación:** 3 horas  
**Archivo:** `apps/api/src/modules/invitations/invitations.service.ts`

**Cambios:**
- Cambiar `findUnique` a `findFirst` con tenantId cuando sea posible
- Usar helper `requireTenantScoped` para queries
- Mantener validación de membership como capa adicional

**Líneas a modificar:**
- Línea 126: `teaminvitation.findUnique` → `findFirst` con tenantId
- Línea 179: `teaminvitation.findUnique` → `findFirst` con tenantId
- Línea 272: `teaminvitation.findUnique` → `findFirst` con tenantId
- Línea 359: `teaminvitation.findUnique` → `findFirst` con tenantId

**Tests:**
- [ ] Test: Queries incluyen tenantId
- [ ] Test: Aislamiento funciona correctamente

**Checklist de QA:**
- [ ] Verificar que todas las queries incluyen tenantId
- [ ] Verificar que tests pasan

---

### Tarea 2.3: Mejorar queries en TeamService (P1-06)

**Prioridad:** P1 - ALTA  
**Estimación:** 3 horas  
**Archivo:** `apps/api/src/modules/team/team.service.ts`

**Cambios:**
Similar a InvitationsService: cambiar `findUnique` a `findFirst` con tenantId cuando sea posible.

**Líneas a modificar:**
- Múltiples líneas con `tenantmembership.findUnique` → `findFirst` con validación

**Tests:**
- [ ] Test: Queries incluyen tenantId
- [ ] Test: Aislamiento funciona correctamente

**Checklist de QA:**
- [ ] Verificar que todas las queries incluyen tenantId
- [ ] Verificar que tests pasan

---

### Tarea 2.4: Implementar AuditLogger (P2-02)

**Prioridad:** P1 - ALTA  
**Estimación:** 6 horas  
**Archivo:** `apps/api/src/common/audit/audit-logger.service.ts` (nuevo)

**Implementación:**
1. Crear servicio `AuditLoggerService`
2. Crear schema Prisma para `AuditLog` (si no existe)
3. Integrar en PlatformService
4. Integrar en TenantContextGuard para overrides

**Schema Prisma:**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  platformRole String?
  tenantId    String?
  action      String
  resourceType String?
  resourceId  String?
  metadata    Json?
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  @@index([userId])
  @@index([tenantId])
  @@index([action])
  @@index([timestamp])
}
```

**Integración:**
- [ ] Integrar en PlatformService para operaciones cross-tenant
- [ ] Integrar en TenantContextGuard para tenant overrides
- [ ] Agregar endpoint para consultar audit logs (solo PLATFORM_OWNER)

**Tests:**
- [ ] Test: Audit log registra operaciones cross-tenant
- [ ] Test: Audit log registra tenant overrides
- [ ] Test: Solo PLATFORM_OWNER puede ver audit logs

**Checklist de QA:**
- [ ] Verificar que audit log funciona correctamente
- [ ] Verificar que logs se almacenan correctamente
- [ ] Verificar que endpoint de consulta funciona

---

## 🧪 Fase 3: Tests y Observabilidad (Semanas 4-5)

### Tarea 3.1: Implementar tests de aislamiento (P2-09)

**Prioridad:** P1 - ALTA  
**Estimación:** 8 horas  
**Archivo:** `apps/api/src/modules/security/__tests__/multi-tenant-isolation.spec.ts` (nuevo)

**Tests a implementar:**
1. **Tests de Aislamiento por Módulo:**
   - Agents isolation
   - Conversations isolation
   - Appointments isolation
   - Channels isolation
   - Knowledge Base isolation
   - Analytics isolation

2. **Tests de Header Spoofing:**
   - Prevenir spoofing sin membership
   - Permitir override con membership
   - Registrar en audit log

3. **Tests de PLATFORM_OWNER:**
   - Acceso cross-tenant permitido
   - Audit log registra operaciones
   - Solo PLATFORM_OWNER puede acceder

**Setup:**
- [ ] Crear helpers de test para crear tenants/usuarios
- [ ] Crear helpers para obtener tokens de autenticación
- [ ] Configurar base de datos de test

**Checklist de QA:**
- [ ] Todos los tests pasan
- [ ] Coverage >80% para código de seguridad
- [ ] Tests se ejecutan en CI/CD

---

### Tarea 3.2: Agregar tenantId a logs estructurados (P2-12)

**Prioridad:** P2 - MEDIA  
**Estimación:** 4 horas  
**Archivo:** `apps/api/src/common/middleware/tenant-logging.middleware.ts` (nuevo)

**Implementación:**
1. Crear middleware que inyecta tenantId en contexto de logging
2. Actualizar servicios para usar contexto de logging
3. Configurar formato de logs estructurados (JSON)

**Checklist de QA:**
- [ ] Verificar que todos los logs incluyen tenantId
- [ ] Verificar que formato JSON es correcto
- [ ] Verificar que logs se pueden parsear correctamente

---

### Tarea 3.3: Implementar rate limiting por tenant (P2-11)

**Prioridad:** P2 - MEDIA  
**Estimación:** 6 horas  
**Archivo:** `apps/api/src/common/guards/tenant-rate-limit.guard.ts` (nuevo)

**Implementación:**
1. Crear guard que limita rate por tenant
2. Usar Redis o memoria para almacenar contadores
3. Keys de rate limit deben incluir tenantId

**Checklist de QA:**
- [ ] Verificar que rate limiting funciona por tenant
- [ ] Verificar que diferentes tenants no interfieren
- [ ] Verificar que límites son correctos

---

## 🔧 Fase 4: Optimizaciones (Semanas 6-8)

### Tarea 4.1: Validar tenantId en webhooks (P2-04)

**Prioridad:** P2 - MEDIA  
**Estimación:** 4 horas  
**Archivo:** `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`

**Cambios:**
- Validar que `whatsappAccountId` del webhook pertenece al tenant correcto
- Agregar logging de seguridad para webhooks rechazados

**Checklist de QA:**
- [ ] Verificar que webhooks validan tenantId
- [ ] Verificar que webhooks rechazados se registran

---

### Tarea 4.2: Verificar cache keys incluyen tenantId (P2-05)

**Prioridad:** P2 - MEDIA  
**Estimación:** 3 horas  
**Archivo:** `apps/api/src/common/cache/cache.service.ts`

**Cambios:**
- Auditar todos los cache keys
- Verificar que incluyen tenantId
- Agregar validación en `cache.get()` que requiere tenantId

**Checklist de QA:**
- [ ] Verificar que todos los cache keys incluyen tenantId
- [ ] Verificar que cache no mezcla datos entre tenants

---

### Tarea 4.3: Auditar exportaciones/reportes (P2-06)

**Prioridad:** P2 - MEDIA  
**Estimación:** 4 horas  
**Archivos:**
- `apps/api/src/modules/analytics/analytics.service.ts`
- `apps/api/src/modules/analytics/pdf.service.ts`

**Cambios:**
- Verificar que todos los métodos de exportación filtran por tenantId
- Agregar tests de integración

**Checklist de QA:**
- [ ] Verificar que exportaciones filtran por tenantId
- [ ] Verificar que tests pasan

---

### Tarea 4.4: Validar paths en storage services (P2-07)

**Prioridad:** P2 - MEDIA  
**Estimación:** 4 horas  
**Archivos:**
- `apps/api/src/modules/storage/s3-storage.service.ts`
- `apps/api/src/modules/storage/local-storage.service.ts`

**Cambios:**
- Validar que filePath incluye `tenants/{tenantId}/`
- Rechazar paths que intentan acceder a otros tenants
- Sanitizar paths para prevenir directory traversal

**Checklist de QA:**
- [ ] Verificar que paths validan tenantId
- [ ] Verificar que directory traversal no funciona
- [ ] Verificar que tests pasan

---

## ✅ Checklist de QA Global

### Seguridad
- [ ] Todas las vulnerabilidades P0 corregidas
- [ ] Todas las vulnerabilidades P1 corregidas
- [ ] Tests de aislamiento implementados y pasando
- [ ] Audit log funcionando para operaciones cross-tenant

### Funcionalidad
- [ ] Todos los endpoints funcionan correctamente
- [ ] PLATFORM_OWNER puede acceder a datos cross-tenant
- [ ] Tenants no pueden acceder a datos de otros tenants
- [ ] Header override funciona correctamente con membership

### Performance
- [ ] Validaciones no agregan >100ms de latencia
- [ ] Cache funciona correctamente con tenantId
- [ ] Rate limiting funciona por tenant

### Documentación
- [ ] Documentación completa de patrones de seguridad
- [ ] Code review checklist implementado
- [ ] Linter rules para detectar queries sin tenantId

---

## 📊 Métricas de Éxito

### Seguridad
- **0** vulnerabilidades P0/P1 detectadas
- **100%** de endpoints tenant-scoped protegidos
- **100%** de queries tenant-scoped incluyen tenantId

### Tests
- **>80%** coverage para código de seguridad
- **100%** de tests de aislamiento pasando
- **0** falsos positivos en detección de acceso no autorizado

### Performance
- **<100ms** latencia adicional por validaciones
- **>99.9%** uptime de servicios de seguridad

---

## 🚀 Orden de Ejecución Recomendado

1. **Semana 1:** Fase 1 (Correcciones Críticas)
   - Tarea 1.1: TenantContextGuard
   - Tarea 1.2: appointments.service.ts
   - Tarea 1.3: email-queue.service.ts

2. **Semanas 2-3:** Fase 2 (Mejoras de Seguridad)
   - Tarea 2.1: Helpers centralizados
   - Tarea 2.2: InvitationsService
   - Tarea 2.3: TeamService
   - Tarea 2.4: AuditLogger

3. **Semanas 4-5:** Fase 3 (Tests y Observabilidad)
   - Tarea 3.1: Tests de aislamiento
   - Tarea 3.2: Logging estructurado
   - Tarea 3.3: Rate limiting por tenant

4. **Semanas 6-8:** Fase 4 (Optimizaciones)
   - Tarea 4.1: Webhooks
   - Tarea 4.2: Cache
   - Tarea 4.3: Exportaciones
   - Tarea 4.4: Storage

---

## 📝 Notas de Implementación

### Reglas Importantes
1. **NO hacer refactor masivo** - Solo cambios necesarios para seguridad
2. **NO romper compatibilidad** - Mantener APIs existentes
3. **Default Deny** - Si falta tenantId, denegar acceso
4. **Backend es fuente de verdad** - Frontend es solo UX

### Code Review Checklist
- [ ] ¿Todas las queries incluyen tenantId?
- [ ] ¿Guards están aplicados correctamente?
- [ ] ¿Tests de aislamiento pasan?
- [ ] ¿Audit log registra operaciones críticas?
- [ ] ¿Logs incluyen tenantId?

---

**Próximos Pasos:**
1. Revisar y aprobar plan
2. Asignar tareas a desarrolladores
3. Iniciar Fase 1: Correcciones Críticas
4. Code review de cada fase antes de merge

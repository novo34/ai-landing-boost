# PRD-48: Multi-Tenant Isolation & Platform Owner Governance

**Versión:** 1.0  
**Fecha:** 2025-01-27  
**Autor:** Principal Security Engineer + SaaS Architect  
**Estado:** 📋 DRAFT

---

## 📋 Resumen Ejecutivo

### Objetivo
Garantizar aislamiento estricto de datos entre tenants y gobernanza segura para PLATFORM_OWNER, eliminando vulnerabilidades de acceso cross-tenant y escalación de privilegios.

### Alcance
- Backend: Guards, middleware, validaciones, queries
- Frontend: Defensa adicional (UI/UX)
- Base de datos: Patrones de queries, índices
- Observabilidad: Logging, auditoría, métricas

### No Incluye
- Refactor masivo de arquitectura
- Cambios en modelos de datos (solo validaciones)
- Migración de datos existentes

---

## 🎯 Objetivos de Negocio

### OB-01: Cumplimiento Regulatorio
**Prioridad:** CRÍTICA  
**Descripción:** Garantizar cumplimiento de GDPR, CCPA y otras regulaciones de privacidad mediante aislamiento estricto de datos.

**Métricas:**
- 0 violaciones de aislamiento detectadas en auditorías
- 100% de queries tenant-scoped incluyen tenantId
- 100% de operaciones cross-tenant registradas en audit log

---

### OB-02: Seguridad de Datos
**Prioridad:** CRÍTICA  
**Descripción:** Prevenir acceso no autorizado a datos de otros tenants mediante validación estricta en todas las capas.

**Métricas:**
- 0 vulnerabilidades P0/P1 en auditorías de seguridad
- 100% de endpoints tenant-scoped protegidos con guards
- 100% de operaciones cross-tenant requieren PLATFORM_OWNER

---

### OB-03: Gobernanza de Plataforma
**Prioridad:** ALTA  
**Descripción:** Permitir que PLATFORM_OWNER gestione la plataforma de forma segura y auditada.

**Métricas:**
- 100% de operaciones cross-tenant registradas
- <100ms latencia adicional por validaciones de seguridad
- 0 falsos positivos en detección de acceso no autorizado

---

## 👥 Usuarios y Roles

### Usuario: Tenant Owner/Admin/Agent
**Necesidad:** Acceder solo a datos de su tenant, sin posibilidad de acceder a datos de otros tenants.

**Casos de Uso:**
- Listar agentes de su tenant
- Ver conversaciones de su tenant
- Gestionar configuraciones de su tenant

**Restricciones:**
- NO puede cambiar `x-tenant-id` header para acceder a otros tenants
- NO puede adivinar IDs de otros tenants
- NO puede manipular queries para filtrar por otros tenants

---

### Usuario: PLATFORM_OWNER
**Necesidad:** Gestionar toda la plataforma, ver métricas globales, gestionar tenants.

**Casos de Uso:**
- Ver métricas globales (total tenants, MRR, etc.)
- Listar todos los tenants
- Suspender/reactivar tenants
- Ver logs de auditoría

**Restricciones:**
- Debe tener `platformRole = 'PLATFORM_OWNER'`
- Todas las operaciones cross-tenant deben registrarse en audit log
- NO puede modificar datos de tenants sin autorización explícita

---

## 🔒 Requisitos Funcionales

### RF-01: Tenant Context Strategy (Fuente de Verdad)

**Prioridad:** P0 - CRÍTICA

**Descripción:**
Definir y documentar la estrategia de determinación de tenantId con fuente de verdad única.

**Requisitos:**
1. **JWT como fuente de verdad principal:**
   - `tenantId` en JWT payload es la fuente de verdad
   - JWT se valida en cada request
   - JWT no puede ser falsificado (firmado con secret)

2. **Header x-tenant-id como override controlado:**
   - Solo permite cambiar tenant si usuario tiene membership en ambos
   - Si header difiere de JWT, registrar en audit log
   - Validar membership antes de permitir override

3. **Fallback seguro:**
   - Si no hay tenantId en JWT ni header, usar primer tenant del usuario
   - Si usuario no tiene tenants, denegar acceso (excepto endpoints sin tenant)

**Validación:**
- ✅ JWT contiene tenantId válido
- ✅ Usuario tiene TenantMembership para tenantId
- ✅ Header x-tenant-id (si presente) pertenece a usuario

**Criterios de Aceptación:**
- [ ] JWT es prioridad 1 para determinar tenantId
- [ ] Header x-tenant-id solo funciona si usuario tiene membership
- [ ] Si header difiere de JWT, se registra en audit log
- [ ] Tests verifican que spoofing de header no funciona sin membership

---

### RF-02: Default Deny Policy

**Prioridad:** P0 - CRÍTICA

**Descripción:**
Implementar política "default deny": si falta tenantId o hay mismatch, denegar acceso.

**Requisitos:**
1. **Validación obligatoria:**
   - Todos los endpoints tenant-scoped requieren tenantId
   - Si falta tenantId → 403 Forbidden
   - Si tenantId no pertenece a usuario → 403 Forbidden

2. **Validación en múltiples capas:**
   - **Capa 1:** TenantContextGuard valida membership
   - **Capa 2:** Servicios validan tenantId en queries
   - **Capa 3:** Base de datos filtra por tenantId (siempre)

3. **Mensajes de error consistentes:**
   - No revelar existencia de recursos de otros tenants
   - 403/404 genérico sin detalles específicos

**Criterios de Aceptación:**
- [ ] TenantContextGuard deniega si falta tenantId
- [ ] Servicios validan tenantId antes de queries
- [ ] Queries siempre incluyen tenantId en WHERE
- [ ] Tests verifican que acceso sin tenantId falla

---

### RF-03: Guards y Middleware Centralizados

**Prioridad:** P1 - ALTA

**Descripción:**
Centralizar lógica de validación en guards reutilizables y middleware.

**Requisitos:**
1. **TenantContextGuard (mejorado):**
   - Prioridad: JWT → Header → Fallback
   - Validar membership antes de permitir acceso
   - Adjuntar tenantId y tenantRole al request

2. **PlatformGuard (existente, verificar):**
   - Validar platformRole
   - Permitir acceso cross-tenant solo para PLATFORM_OWNER
   - Registrar en audit log

3. **RbacGuard (existente, verificar):**
   - Validar tenantRole contra roles requeridos
   - Integrar con TenantContextGuard

**Criterios de Aceptación:**
- [ ] TenantContextGuard usa JWT como prioridad 1
- [ ] PlatformGuard valida platformRole correctamente
- [ ] RbacGuard valida tenantRole correctamente
- [ ] Tests verifican que guards funcionan correctamente

---

### RF-04: DB Query Patterns (Scoped Queries)

**Prioridad:** P0 - CRÍTICA

**Descripción:**
Garantizar que todas las queries tenant-scoped incluyen tenantId en WHERE.

**Requisitos:**
1. **Patrón obligatorio:**
   ```typescript
   // ✅ CORRECTO
   const resource = await prisma.resource.findFirst({
     where: {
       id: resourceId,
       tenantId, // OBLIGATORIO
     },
   });
   
   // ❌ PROHIBIDO
   const resource = await prisma.resource.findUnique({
     where: { id: resourceId }, // Falta tenantId
   });
   ```

2. **Helper centralizado:**
   ```typescript
   // Crear helper para queries tenant-scoped
   function requireTenantScoped(tenantId: string, where: any) {
     return { ...where, tenantId };
   }
   ```

3. **Validación en código:**
   - Linter rule para detectar findUnique sin tenantId
   - Code review checklist

**Criterios de Aceptación:**
- [ ] Todas las queries tenant-scoped incluyen tenantId
- [ ] Helper centralizado disponible
- [ ] Linter rule detecta queries sin tenantId
- [ ] Tests verifican que queries sin tenantId fallan

---

### RF-05: PLATFORM_OWNER Governance

**Prioridad:** P1 - ALTA

**Descripción:**
Gobernanza segura para PLATFORM_OWNER con auditoría completa.

**Requisitos:**
1. **Validación estricta:**
   - Solo usuarios con `platformRole = 'PLATFORM_OWNER'` pueden acceder
   - PlatformGuard valida en cada request
   - Queries cross-tenant solo en endpoints explícitos

2. **Auditoría completa:**
   - Registrar todas las operaciones cross-tenant
   - Incluir: userId, platformRole, tenantId accedido, acción, timestamp, IP
   - Almacenar en tabla `auditlog` o servicio externo

3. **Endpoints permitidos:**
   - `/platform/metrics` - Métricas globales
   - `/platform/tenants` - Listar/gestionar tenants
   - `/platform/operations/*` - Operaciones de plataforma
   - NO permitir acceso a datos específicos de tenants sin endpoint explícito

**Criterios de Aceptación:**
- [ ] PlatformGuard valida platformRole correctamente
- [ ] Todas las operaciones cross-tenant se registran
- [ ] Endpoints de plataforma están documentados
- [ ] Tests verifican que solo PLATFORM_OWNER puede acceder

---

### RF-06: Estrategia Anti-IDOR

**Prioridad:** P0 - CRÍTICA

**Descripción:**
Prevenir Insecure Direct Object Reference (IDOR) mediante validación estricta de IDs.

**Requisitos:**
1. **Validación de IDs:**
   - Todos los IDs en params/query/body deben validarse
   - Verificar que el recurso pertenece al tenant antes de operar
   - No confiar en IDs del cliente

2. **Patrón de validación:**
   ```typescript
   // ✅ CORRECTO
   async getResource(id: string, tenantId: string) {
     const resource = await prisma.resource.findFirst({
       where: { id, tenantId }, // Validar ambos
     });
     if (!resource) {
       throw new NotFoundException(); // No revelar existencia
     }
     return resource;
   }
   ```

3. **Validación en múltiples puntos:**
   - Controller: Validar que ID es válido (formato)
   - Service: Validar que recurso pertenece a tenant
   - DB: Query siempre filtra por tenantId

**Criterios de Aceptación:**
- [ ] Todos los endpoints validan IDs contra tenantId
- [ ] Tests verifican que IDOR no funciona
- [ ] Mensajes de error no revelan existencia de recursos

---

### RF-07: Estrategia de Tests

**Prioridad:** P1 - ALTA

**Descripción:**
Implementar tests automatizados para verificar aislamiento multi-tenant.

**Requisitos:**
1. **Tests de aislamiento:**
   ```typescript
   describe('Multi-Tenant Isolation', () => {
     it('should prevent tenant A from accessing tenant B data', async () => {
       // Crear tenant A y B
       // Usuario en tenant A intenta acceder a recurso de tenant B
       // Debe fallar con 403/404
     });
   });
   ```

2. **Tests de PLATFORM_OWNER:**
   ```typescript
   describe('Platform Owner Access', () => {
     it('should allow PLATFORM_OWNER to access cross-tenant data', async () => {
       // PLATFORM_OWNER puede acceder a datos de cualquier tenant
       // Debe registrar en audit log
     });
   });
   ```

3. **Tests de guards:**
   - Verificar que TenantContextGuard funciona correctamente
   - Verificar que PlatformGuard funciona correctamente
   - Verificar que RbacGuard funciona correctamente

**Criterios de Aceptación:**
- [ ] Suite de tests de aislamiento implementada
- [ ] Tests de PLATFORM_OWNER implementados
- [ ] Tests de guards implementados
- [ ] Coverage >80% para código de seguridad

---

### RF-08: Observabilidad y Auditoría

**Prioridad:** P1 - ALTA

**Descripción:**
Implementar logging estructurado y audit log para operaciones críticas.

**Requisitos:**
1. **Logging estructurado:**
   - Incluir tenantId en todos los logs
   - Formato JSON para fácil parsing
   - Niveles: ERROR, WARN, INFO, DEBUG

2. **Audit log:**
   - Registrar operaciones cross-tenant
   - Registrar cambios críticos (suspender tenant, etc.)
   - Almacenar: userId, platformRole, tenantId, acción, timestamp, IP, userAgent

3. **Métricas:**
   - Contador de requests por tenant
   - Contador de operaciones cross-tenant
   - Alertas para patrones sospechosos

**Criterios de Aceptación:**
- [ ] Logging estructurado implementado
- [ ] Audit log implementado
- [ ] Métricas de seguridad implementadas
- [ ] Dashboard de auditoría disponible

---

## 🚫 Requisitos No Funcionales

### RNF-01: Performance
- Validaciones de seguridad no deben agregar >100ms de latencia
- Queries con tenantId deben usar índices optimizados
- Cache debe incluir tenantId en keys

### RNF-02: Escalabilidad
- Solución debe escalar a 1000+ tenants
- Validaciones no deben crear cuellos de botella
- Audit log debe poder manejar alto volumen

### RNF-03: Mantenibilidad
- Código debe ser fácil de entender y mantener
- Documentación clara de patrones de seguridad
- Tests automatizados para prevenir regresiones

---

## 📊 Métricas de Éxito

### Seguridad
- **0** vulnerabilidades P0/P1 detectadas en auditorías
- **100%** de endpoints tenant-scoped protegidos
- **100%** de queries tenant-scoped incluyen tenantId

### Performance
- **<100ms** latencia adicional por validaciones
- **>99.9%** uptime de servicios de seguridad

### Cumplimiento
- **100%** de operaciones cross-tenant registradas
- **0** violaciones de aislamiento en auditorías

---

## 🚀 Fases de Implementación

### Fase 1: Correcciones Críticas (Semana 1)
- ✅ P0-01: Corregir TenantContextGuard
- ✅ P0-02: Corregir query en appointments.service.ts
- ✅ P1-04: Corregir idempotency check

### Fase 2: Mejoras de Seguridad (Semanas 2-3)
- ✅ P1-05, P1-06: Mejorar queries en InvitationsService y TeamService
- ✅ P2-01: Crear helpers centralizados
- ✅ P2-02: Implementar AuditLogger

### Fase 3: Tests y Observabilidad (Semanas 4-5)
- ✅ P2-09: Implementar tests de aislamiento
- ✅ P2-12: Agregar tenantId a logs
- ✅ P2-11: Implementar rate limiting por tenant

### Fase 4: Optimizaciones (Semanas 6-8)
- ✅ P2-04: Validar tenantId en webhooks
- ✅ P2-05: Verificar cache keys
- ✅ P2-06: Auditar exportaciones
- ✅ P2-07: Validar paths en storage

---

## ✅ Criterios de Aceptación Globales

1. ✅ Todas las vulnerabilidades P0 corregidas
2. ✅ Todas las vulnerabilidades P1 corregidas
3. ✅ Tests de aislamiento implementados y pasando
4. ✅ Audit log funcionando para operaciones cross-tenant
5. ✅ Documentación completa de patrones de seguridad
6. ✅ Code review checklist implementado
7. ✅ Linter rules para detectar queries sin tenantId

---

**Próximos Pasos:**
1. Revisar AI-Spec: `AI-SPEC-48-multi-tenant-isolation.md`
2. Revisar Plan de Implementación: `MULTI-TENANT-ISOLATION-IMPLEMENTATION-PLAN.md`
3. Iniciar Fase 1: Correcciones Críticas

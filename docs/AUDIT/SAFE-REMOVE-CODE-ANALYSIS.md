# Análisis de Código SAFE_REMOVE

**Versión:** 1.0  
**Fecha:** 2025-01-27  
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

Se identificó código que puede eliminarse de forma segura después de verificación. **NO se eliminará automáticamente** - requiere revisión manual y tests antes de eliminar.

---

## ✅ Código SAFE_REMOVE (Verificado)

### 1. Métodos Deprecated en ApiClient

**Archivo:** `apps/web/lib/api/client.ts`  
**Líneas:** 292-1384

**Métodos identificados:**
1. `checkAuth()` - Línea ~292
2. `getCurrentUserWithRole()` - Línea ~1280

**Estado:**
- ✅ Marcados como `@deprecated`
- ✅ **0 usos en código fuente** (verificado con grep)
- ✅ Reemplazados por `AuthManager.getState()`
- ✅ Documentado en `SESSION-AUTH-MIGRATION-COMPLETE.md`

**Evidencia de no uso:**
```bash
# Búsqueda de usos de checkAuth()
grep -r "checkAuth" apps/web --exclude-dir=node_modules
# Resultado: Solo definición en client.ts, 0 usos

# Búsqueda de usos de getCurrentUserWithRole()
grep -r "getCurrentUserWithRole" apps/web --exclude-dir=node_modules
# Resultado: Solo definición en client.ts, 0 usos
```

**Plan de eliminación:**
1. ✅ Verificar que no hay usos en código fuente (COMPLETADO)
2. ⏳ Ejecutar tests completos para verificar que nada se rompe
3. ⏳ Eliminar métodos después de tests exitosos
4. ⏳ Actualizar documentación

**Riesgo:** 🟢 **BAJO** - Métodos no se usan, pero mantener por compatibilidad durante 1-2 sprints más.

**Recomendación:** 
- **NO eliminar inmediatamente** - Mantener por compatibilidad
- **Eliminar en versión futura** después de verificación final
- **Agregar a changelog** cuando se elimine

---

## ⚠️ Código que NO debe eliminarse (Falsos Positivos)

### 1. Helpers de Roles

**Archivo:** `apps/web/lib/utils/roles.ts`

**Razón:** 
- ✅ Se usa en múltiples componentes
- ✅ Centraliza lógica de roles
- ✅ Evita duplicación

**Estado:** ✅ **MANTENER**

---

### 2. Guards y Decorators

**Archivos:**
- `apps/api/src/common/guards/tenant-context.guard.ts`
- `apps/api/src/common/guards/rbac.guard.ts`
- `apps/api/src/common/guards/platform.guard.ts`
- `apps/api/src/common/decorators/current-tenant.decorator.ts`

**Razón:**
- ✅ Se usan en todos los controladores
- ✅ Críticos para seguridad
- ✅ No hay duplicación

**Estado:** ✅ **MANTENER**

---

## 🔍 Búsqueda de Código Duplicado

### 1. Validaciones de Membership

**Hallazgo:** Múltiples servicios tienen lógica similar de validación de membership.

**Archivos afectados:**
- `apps/api/src/modules/invitations/invitations.service.ts`
- `apps/api/src/modules/team/team.service.ts`
- `apps/api/src/modules/tenants/tenants.service.ts`

**Duplicación:**
```typescript
// Patrón repetido en múltiples servicios
const membership = await this.prisma.tenantmembership.findUnique({
  where: { userId_tenantId: { userId, tenantId } },
});

if (!membership) {
  throw new ForbiddenException('No access');
}
```

**Recomendación:**
- ⚠️ **NO eliminar duplicación ahora** - Requiere refactor cuidadoso
- ✅ **Centralizar en Fase 2** - Crear helper `validateTenantMembership()`
- ✅ **Incluir en plan de implementación**

**Estado:** ⏳ **PLANIFICADO PARA FASE 2**

---

### 2. Queries findUnique sin tenantId

**Hallazgo:** Algunos servicios usan `findUnique` cuando deberían usar `findFirst` con tenantId.

**Archivos afectados:**
- `apps/api/src/modules/appointments/appointments.service.ts:187` (P0-02)
- `apps/api/src/modules/email/services/email-queue.service.ts:33` (P1-04)
- `apps/api/src/modules/invitations/invitations.service.ts` (múltiples líneas)

**Recomendación:**
- ✅ **Corregir en Fase 1** - Cambiar a `findFirst` con tenantId
- ✅ **NO es código muerto** - Es código con vulnerabilidad
- ✅ **Incluir en correcciones críticas**

**Estado:** ⏳ **PLANIFICADO PARA FASE 1**

---

## 📊 Resumen de Código SAFE_REMOVE

| Categoría | Archivos | Líneas | Estado | Riesgo | Acción |
|-----------|----------|--------|--------|--------|--------|
| Métodos Deprecated | `client.ts` | ~200 | ✅ Verificado | 🟢 BAJO | ⏳ Eliminar en versión futura |
| Código Duplicado | Múltiples | ~500 | ⚠️ Identificado | 🟡 MEDIO | ⏳ Centralizar en Fase 2 |
| Queries Vulnerables | Múltiples | ~10 | ⚠️ Identificado | 🔴 ALTO | ✅ Corregir en Fase 1 |

---

## ✅ Checklist de Eliminación Segura

### Para Métodos Deprecated:
- [x] Verificar que no hay usos en código fuente
- [ ] Ejecutar tests completos
- [ ] Verificar que no hay referencias en documentación externa
- [ ] Agregar a changelog
- [ ] Eliminar código
- [ ] Ejecutar tests nuevamente

### Para Código Duplicado:
- [ ] Crear helper centralizado
- [ ] Migrar un servicio a la vez
- [ ] Ejecutar tests después de cada migración
- [ ] Eliminar código duplicado
- [ ] Verificar que nada se rompe

---

## 🚫 Código que NO debe eliminarse

### 1. Endpoints Legacy
**Razón:** Pueden estar en uso por clientes existentes

### 2. Validaciones Redundantes
**Razón:** Defensa en profundidad - múltiples capas de seguridad

### 3. Logs de Debugging
**Razón:** Útiles para troubleshooting en producción

---

## 📝 Recomendaciones Finales

### Inmediatas (NO hacer):
- ❌ **NO eliminar métodos deprecated** - Mantener por compatibilidad
- ❌ **NO eliminar código duplicado** - Requiere refactor cuidadoso

### Corto Plazo (Fase 1-2):
- ✅ **Corregir queries vulnerables** - Cambiar a `findFirst` con tenantId
- ✅ **Crear helpers centralizados** - Para evitar duplicación futura

### Medio Plazo (Después de Fase 4):
- ✅ **Eliminar métodos deprecated** - Después de verificación final
- ✅ **Centralizar validaciones** - Después de tests exhaustivos

---

## 🔒 Seguridad

**IMPORTANTE:** 
- ✅ **NO eliminar código de seguridad** aunque parezca redundante
- ✅ **Defensa en profundidad** - Múltiples capas son buenas
- ✅ **Validar antes de eliminar** - Siempre ejecutar tests

---

**Próximos Pasos:**
1. ✅ Documentar código SAFE_REMOVE (COMPLETADO)
2. ⏳ Ejecutar tests antes de eliminar métodos deprecated
3. ⏳ Iniciar Fase 1: Correcciones Críticas (incluye corrección de queries)
4. ⏳ Planificar Fase 2: Centralización de validaciones

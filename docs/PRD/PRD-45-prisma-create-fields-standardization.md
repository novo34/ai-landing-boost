# PRD-45: Estandarización de Campos Obligatorios en Operaciones Prisma Create

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Estado:** [DRAFT]  
> **Referencia:** `IA-Specs/06-backend-standards.mdc`, `IA-Specs/00-governance-saas-core.mdc`

---

## Resumen Ejecutivo

### Problema Identificado

Las operaciones de creación (`create`) en Prisma están fallando o requiriendo corrección manual porque los campos obligatorios `id` (String) y `updatedAt` (DateTime) no se están proporcionando consistentemente en todo el código.

**Impacto:**
- Errores en tiempo de ejecución cuando se intenta crear entidades sin estos campos
- Inconsistencia en el código (algunos servicios los incluyen, otros no)
- Necesidad de scripts de corrección manual (`fix-create-errors.ps1`)
- Riesgo de bugs en producción si se olvidan estos campos

### Solución Propuesta

Implementar una solución sistemática de tres capas:

1. **Prevención:** Helper/utility centralizado que garantice que siempre se incluyan estos campos
2. **Corrección:** Auditoría y corrección de código existente
3. **Validación:** Tests automatizados y linting rules para prevenir regresiones

---

## Objetivos

### Objetivos Principales

1. ✅ **Eliminar errores de creación en Prisma** causados por campos faltantes
2. ✅ **Estandarizar** el uso de campos `id` y `updatedAt` en todas las operaciones `create`
3. ✅ **Prevenir regresiones** mediante helpers, tests y linting
4. ✅ **Mantener consistencia** con estándares SaaS del proyecto

### Objetivos Secundarios

1. Mejorar la experiencia de desarrollo (menos errores, más productividad)
2. Reducir la necesidad de scripts de corrección manual
3. Documentar mejores prácticas para el equipo

---

## Alcance

### Incluido

- ✅ Corrección de todas las operaciones `create` en servicios existentes
- ✅ Creación de helper/utility centralizado para operaciones `create`
- ✅ Tests automatizados para validar campos obligatorios
- ✅ Documentación de mejores prácticas
- ✅ Actualización de estándares backend

### Excluido

- ❌ Cambios en el schema de Prisma (mantener compatibilidad)
- ❌ Migración de datos existentes (no es necesario)
- ❌ Cambios en operaciones `update` (solo afecta `create`)
- ❌ Refactorización mayor de servicios (solo corrección de campos)

---

## Requisitos Funcionales

### RF-1: Helper Centralizado para Create Operations

**Descripción:** Crear un helper/utility que garantice que los campos `id` y `updatedAt` siempre se incluyan en operaciones `create`.

**Criterios de Aceptación:**
- Helper debe generar `id` usando `randomUUID()` si no se proporciona
- Helper debe establecer `updatedAt: new Date()` si no se proporciona
- Helper debe ser type-safe (TypeScript)
- Helper debe funcionar con todos los modelos de Prisma
- Helper debe mantener compatibilidad con código existente

**Ejemplo de Uso:**
```typescript
// Antes (propenso a errores)
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
  },
});

// Después (garantizado)
const user = await prisma.user.create({
  data: createData({
    email: 'test@example.com',
    name: 'Test User',
  }),
});
```

### RF-2: Corrección de Código Existente

**Descripción:** Auditar y corregir todas las operaciones `create` en el código existente para que incluyan `id` y `updatedAt`.

**Criterios de Aceptación:**
- Todas las operaciones `create` deben incluir `id` y `updatedAt`
- Corrección debe ser verificada mediante tests
- No debe romper funcionalidad existente
- Debe seguir estándares de código del proyecto

**Archivos a Corregir:**
- `apps/api/src/modules/**/*.service.ts` (todos los servicios)
- `apps/api/src/modules/**/*.controller.ts` (si hay creates directos)
- `apps/api/scripts/**/*.ts` (scripts de migración/seeding)

### RF-3: Tests Automatizados

**Descripción:** Crear tests que validen que todas las operaciones `create` incluyen campos obligatorios.

**Criterios de Aceptación:**
- Tests unitarios para el helper
- Tests de integración que validen creates en servicios
- Tests deben fallar si se olvidan campos obligatorios
- Tests deben estar incluidos en build-all

### RF-4: Documentación y Estándares

**Descripción:** Documentar mejores prácticas y actualizar estándares backend.

**Criterios de Aceptación:**
- Documentación en `IA-Specs/06-backend-standards.mdc`
- Ejemplos de uso en código
- Guía de migración para código existente

---

## Requisitos No Funcionales

### RNF-1: Performance

- Helper no debe agregar overhead significativo (< 1ms por operación)
- No debe afectar tiempos de respuesta de API

### RNF-2: Mantenibilidad

- Código debe ser fácil de entender y mantener
- Debe seguir convenciones del proyecto (kebab-case, TypeScript, etc.)

### RNF-3: Compatibilidad

- Debe ser compatible con código existente
- No debe romper funcionalidad actual
- Debe funcionar con todas las versiones de Prisma usadas en el proyecto

### RNF-4: Testing

- Cobertura de tests mínima: 80% para helper, 60% para correcciones
- Tests deben ejecutarse en build-all

---

## Restricciones y Consideraciones

### Restricciones Técnicas

1. **Schema de Prisma:** No podemos cambiar el schema para agregar defaults porque:
   - Requeriría migración de base de datos
   - Podría afectar datos existentes
   - Cambiaría el contrato de la API

2. **Compatibilidad:** Debe funcionar con:
   - Prisma Client actual
   - TypeScript 5.9+
   - Node.js 20+

### Consideraciones de Negocio

1. **Riesgo:** Bajo - solo afecta código interno, no usuarios finales
2. **Prioridad:** Media-Alta - previene bugs pero no bloquea funcionalidad actual
3. **Esfuerzo:** Medio - requiere auditoría y corrección sistemática

---

## Métricas de Éxito

### Métricas Principales

1. **Reducción de Errores:** 0 errores de creación por campos faltantes después de implementación
2. **Cobertura de Tests:** 100% de operaciones `create` cubiertas por tests
3. **Adopción:** 100% de servicios usando helper o incluyendo campos manualmente

### Métricas Secundarias

1. **Tiempo de Desarrollo:** Reducción de tiempo en debugging de errores de creación
2. **Mantenibilidad:** Reducción de scripts de corrección manual

---

## Plan de Implementación

### Fase 1: Auditoría y Análisis (1 día)

1. Auditar todas las operaciones `create` en el código
2. Identificar patrones y casos de uso
3. Documentar hallazgos

### Fase 2: Desarrollo del Helper (1 día)

1. Crear helper/utility centralizado
2. Implementar tests unitarios
3. Documentar uso

### Fase 3: Corrección de Código Existente (2-3 días)

1. Corregir todas las operaciones `create` encontradas
2. Usar helper donde sea posible
3. Verificar con tests

### Fase 4: Tests y Validación (1 día)

1. Crear tests de integración
2. Ejecutar build-all
3. Corregir cualquier fallo

### Fase 5: Documentación (0.5 días)

1. Actualizar estándares backend
2. Crear guía de mejores prácticas
3. Documentar cambios

---

## Riesgos y Mitigaciones

### Riesgo 1: Regresiones en Funcionalidad Existente

**Probabilidad:** Media  
**Impacto:** Alto  
**Mitigación:**
- Tests exhaustivos antes y después
- Code review cuidadoso
- Ejecutar build-all completo

### Riesgo 2: Resistencia a Adoptar Helper

**Probabilidad:** Baja  
**Impacto:** Medio  
**Mitigación:**
- Documentación clara
- Ejemplos de uso
- Integración en estándares

### Riesgo 3: Performance Overhead

**Probabilidad:** Baja  
**Impacto:** Bajo  
**Mitigación:**
- Benchmarking del helper
- Optimización si es necesario

---

## Dependencias

### Dependencias Técnicas

- Prisma Client (ya instalado)
- TypeScript (ya instalado)
- Jest/Vitest (ya instalado)

### Dependencias de Proceso

- Aprobación de este PRD
- Tiempo asignado para implementación
- Code review

---

## Referencias

- `IA-Specs/06-backend-standards.mdc` - Estándares backend
- `IA-Specs/00-governance-saas-core.mdc` - Gobernanza SaaS
- `IA-Specs/07-testing-y-quality-gates.mdc` - Testing y quality gates
- `apps/api/fix-create-errors.ps1` - Script de corrección existente
- `apps/api/prisma/schema.prisma` - Schema de Prisma

---

## Aprobaciones

- [ ] Product Owner
- [ ] Tech Lead
- [ ] Backend Team Lead

---

## Historial de Cambios

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 2025-01-XX | AI Assistant | Versión inicial |

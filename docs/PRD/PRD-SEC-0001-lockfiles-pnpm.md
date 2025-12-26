# PRD-SEC-0001: Unificación de Gestor de Paquetes (PNPM)

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Prioridad:** P0 (Chore)  
**Estado:** Pendiente de Implementación

---

## 1. Problema y Contexto

### 1.1 Hallazgo de Auditoría (H3)
El monorepo "AutomAI SaaS Monorepo" presenta múltiples lockfiles simultáneos, lo que genera:
- **Inconsistencias de dependencias** entre entornos (dev, CI, producción)
- **Confusión en el equipo** sobre qué gestor usar
- **Riesgo de dependencias desincronizadas** que pueden introducir vulnerabilidades
- **Problemas en CI/CD** por conflictos entre gestores

### 1.2 Estado Actual
- **Raíz del monorepo:**
  - `pnpm-lock.yaml` (gestor preferido según `package.json` y `pnpm-workspace.yaml`)
  - `package-lock.json` (npm, no debería existir)
  - `bun.lockb` (bun, no debería existir)
- **apps/api:**
  - `package-lock.json` (duplicado, no debería existir)

### 1.3 Impacto
- **Desarrolladores:** Incertidumbre sobre qué comando usar (`npm install` vs `pnpm install`)
- **CI/CD:** Posibles fallos por usar gestor incorrecto
- **Seguridad:** Dependencias desactualizadas o con versiones diferentes entre lockfiles
- **Mantenibilidad:** Complejidad innecesaria en el proyecto

---

## 2. Objetivos

### 2.1 Objetivos Principales
1. **Estandarizar pnpm como único gestor** en todo el monorepo
2. **Eliminar lockfiles redundantes** (npm y bun)
3. **Proteger contra reintroducción** de otros gestores mediante CI checks
4. **Documentar el uso de pnpm** en README y guías de desarrollo

### 2.2 NO-Objetivos
- ❌ Migrar dependencias existentes (solo limpiar lockfiles)
- ❌ Cambiar la estructura del workspace (ya está configurado para pnpm)
- ❌ Modificar `package.json` files (solo eliminar lockfiles)
- ❌ Implementar scripts de migración automática

---

## 3. Usuarios y Actores Afectados

### 3.1 Desarrolladores
- **Impacto:** Deben usar `pnpm install` en lugar de `npm install` o `bun install`
- **Acción requerida:** Actualizar workflows locales y documentación personal

### 3.2 CI/CD Pipeline
- **Impacto:** Pipeline debe validar que solo existe `pnpm-lock.yaml`
- **Acción requerida:** Agregar check en CI para rechazar PRs con otros lockfiles

### 3.3 DevOps/Infraestructura
- **Impacto:** Asegurar que contenedores y entornos usen pnpm
- **Acción requerida:** Verificar Dockerfiles y scripts de deployment

---

## 4. Requisitos Funcionales (FR)

### FR-001: Eliminación de Lockfiles Redundantes
**Descripción:** Eliminar todos los lockfiles excepto `pnpm-lock.yaml`

**Criterios:**
- Eliminar `package-lock.json` de la raíz
- Eliminar `bun.lockb` de la raíz
- Eliminar `apps/api/package-lock.json`
- Verificar que no existan otros lockfiles en subdirectorios

### FR-002: Protección en CI
**Descripción:** El pipeline de CI debe rechazar PRs que introduzcan lockfiles no permitidos

**Criterios:**
- Check que falle si se detecta `package-lock.json` o `bun.lockb` en el repo
- Check que falle si se detecta `package-lock.json` en `apps/api/`
- Mensaje de error claro indicando usar `pnpm install`

### FR-003: Actualización de .gitignore
**Descripción:** Asegurar que `.gitignore` ignore lockfiles de otros gestores

**Criterios:**
- `.gitignore` debe incluir `package-lock.json` y `bun.lockb`
- Verificar que `pnpm-lock.yaml` NO esté ignorado

### FR-004: Documentación
**Descripción:** Actualizar README y guías con instrucciones de uso de pnpm

**Criterios:**
- README.md debe indicar usar `pnpm install`
- Agregar sección "Gestión de Dependencias" si no existe
- Documentar comandos comunes: `pnpm install`, `pnpm add`, `pnpm remove`

---

## 5. Requisitos No Funcionales (NFR)

### NFR-001: Compatibilidad
- **Requiere:** Node.js >= 20.0.0 (ya especificado en `package.json`)
- **Requiere:** pnpm >= 8.0.0 (ya especificado en `package.json`)

### NFR-002: Performance
- **No debe afectar:** Tiempo de instalación de dependencias
- **Objetivo:** Mantener o mejorar tiempos actuales con pnpm

### NFR-003: Seguridad
- **Validar:** Que `pnpm-lock.yaml` esté actualizado y sin vulnerabilidades conocidas
- **Herramienta:** `pnpm audit` debe ejecutarse en CI

---

## 6. Riesgos y Mitigaciones

### R-001: Desarrolladores acostumbrados a npm
**Riesgo:** Algunos desarrolladores pueden seguir usando `npm install` localmente  
**Mitigación:**
- Documentación clara en README
- Pre-commit hook que advierta si se detecta `package-lock.json` (opcional)
- Comunicación al equipo sobre el cambio

### R-002: Dependencias desincronizadas
**Riesgo:** Eliminar lockfiles puede causar inconsistencias si hay diferencias  
**Mitigación:**
- Regenerar `pnpm-lock.yaml` desde `package.json` antes de eliminar otros
- Verificar que todas las dependencias estén en `package.json`
- Ejecutar `pnpm install` y verificar que no haya errores

### R-003: CI/CD roto
**Riesgo:** Pipeline puede fallar si espera otros lockfiles  
**Mitigación:**
- Verificar scripts de CI antes de eliminar lockfiles
- Actualizar CI para usar `pnpm` explícitamente
- Probar en branch de desarrollo antes de merge

---

## 7. Telemetría y Observabilidad

### 7.1 Logs Esperados
- **CI:** Logs de validación de lockfiles (éxito/fallo)
- **Local:** Advertencias si se detecta uso de otros gestores (opcional)

### 7.2 Métricas
- **No aplica:** Este cambio no requiere métricas específicas

---

## 8. Criterios de Aceptación

### CA-001: Lockfiles Eliminados
**Given:** El repositorio tiene múltiples lockfiles  
**When:** Se ejecuta la limpieza  
**Then:**
- Solo existe `pnpm-lock.yaml` en la raíz
- No existe `package-lock.json` en raíz ni en `apps/api/`
- No existe `bun.lockb` en la raíz
- El repositorio se puede clonar y ejecutar `pnpm install` sin errores

### CA-002: CI Protege contra Reintroducción
**Given:** Un PR introduce `package-lock.json` o `bun.lockb`  
**When:** El pipeline de CI se ejecuta  
**Then:**
- El check de validación de lockfiles falla
- El mensaje de error indica usar `pnpm install`
- El PR no puede mergearse hasta corregir

### CA-003: Documentación Actualizada
**Given:** El README y guías existen  
**When:** Se completa la implementación  
**Then:**
- README.md menciona usar `pnpm install`
- No hay referencias a `npm install` o `bun install` en documentación principal
- Guías de desarrollo actualizadas

### CA-004: .gitignore Configurado
**Given:** El `.gitignore` existe  
**When:** Se verifica la configuración  
**Then:**
- `package-lock.json` está en `.gitignore`
- `bun.lockb` está en `.gitignore`
- `pnpm-lock.yaml` NO está en `.gitignore`

---

## 9. Definición de "Done"

### Checklist de Completitud
- [ ] Todos los lockfiles redundantes eliminados
- [ ] `pnpm-lock.yaml` regenerado y verificado
- [ ] CI check implementado y funcionando
- [ ] `.gitignore` actualizado
- [ ] README.md actualizado con instrucciones de pnpm
- [ ] Pruebas locales: `pnpm install` funciona correctamente
- [ ] Pruebas en CI: Pipeline pasa con solo `pnpm-lock.yaml`
- [ ] Pruebas de protección: PR con `package-lock.json` es rechazado
- [ ] Documentación revisada y aprobada

---

## 10. Dependencias y Orden de Implementación

### 10.1 Dependencias
- **Ninguna:** Este cambio es independiente y debe ejecutarse primero (H3)

### 10.2 Orden de Implementación
1. **H3 (este PRD):** Unificar gestor de paquetes
2. **H1:** Hardening de refresh tokens (requiere pnpm estable)
3. **H2:** Re-habilitar middleware de seguridad (requiere pnpm estable)

### 10.3 Bloqueadores
- Ninguno. Este cambio no bloquea otros trabajos.

---

## 11. Referencias

- **Hallazgo de Auditoría:** H3 (P1)
- **Archivos Afectados:**
  - `package-lock.json` (raíz) - ELIMINAR
  - `bun.lockb` (raíz) - ELIMINAR
  - `apps/api/package-lock.json` - ELIMINAR
  - `.gitignore` - ACTUALIZAR
  - `.github/workflows/*.yml` o CI config - ACTUALIZAR
  - `README.md` - ACTUALIZAR

---

## 12. Aprobaciones

- [ ] **Staff Engineer:** _________________ Fecha: _______
- [ ] **Security Lead:** _________________ Fecha: _______
- [ ] **DevOps Lead:** _________________ Fecha: _______

---

**Fin del PRD**


# Matriz de Trazabilidad - Hallazgos de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Proyecto:** AutomAI SaaS Monorepo

---

## Resumen

Esta matriz mapea los hallazgos de auditoría (H1, H2, H3) con sus requisitos funcionales (FR), requisitos no funcionales (NFR), archivos afectados, tests asociados y criterios de aceptación.

---

## H3: Múltiples Lockfiles (P0 - Chore)

| ID | Requisito | Tipo | Archivos Afectados | Tests | Criterio de Aceptación |
|----|-----------|------|-------------------|-------|------------------------|
| **H3** | **Hallazgo:** Múltiples lockfiles en monorepo | - | `package-lock.json` (raíz), `bun.lockb` (raíz), `apps/api/package-lock.json` | - | - |
| **FR-001** | Eliminación de lockfiles redundantes | Funcional | `package-lock.json`, `bun.lockb`, `apps/api/package-lock.json` | IT-001 | CA-001 |
| **FR-002** | Protección en CI | Funcional | `.github/workflows/*.yml` | IT-002, IT-003 | CA-002 |
| **FR-003** | Actualización de .gitignore | Funcional | `.gitignore` | - | CA-004 |
| **FR-004** | Documentación | Funcional | `README.md` | - | CA-003 |
| **NFR-001** | Compatibilidad (Node >= 20, pnpm >= 8) | No Funcional | `package.json` | - | - |
| **NFR-002** | Performance (no afectar tiempos) | No Funcional | - | - | - |
| **NFR-003** | Seguridad (pnpm audit) | No Funcional | CI config | - | - |

### Archivos Afectados Detallados
- **Eliminar:**
  - `/package-lock.json`
  - `/bun.lockb`
  - `/apps/api/package-lock.json`
- **Modificar:**
  - `/.gitignore` - Agregar exclusiones
  - `/README.md` - Instrucciones de pnpm
  - `/.github/workflows/*.yml` - Check de lockfiles
- **Mantener:**
  - `/pnpm-lock.yaml` - Único lockfile permitido

### Tests Asociados
- **IT-001:** Instalación Limpia
- **IT-002:** CI Check Rechaza Lockfiles No Permitidos
- **IT-003:** CI Check Acepta Solo pnpm-lock.yaml
- **E2E-001:** Flujo Completo de Desarrollo

---

## H1: Refresh Tokens Sin Hardening (P0 - Security)

| ID | Requisito | Tipo | Archivos Afectados | Tests | Criterio de Aceptación |
|----|-----------|------|-------------------|-------|------------------------|
| **H1** | **Hallazgo:** Refresh tokens con secretos por defecto y sin persistencia/rotación/revocación | - | `apps/api/src/modules/auth/auth.service.ts` (L228-L307) | - | - |
| **FR-001** | Validación obligatoria de JWT_REFRESH_SECRET | Funcional | `apps/api/src/config/env.validation.ts` (reforzar), `apps/api/src/modules/auth/auth.service.ts` (eliminar fallbacks) | UT-001 | CA-001 |
| **FR-002** | Persistencia de refresh tokens | Funcional | `apps/api/prisma/schema.prisma`, `apps/api/src/modules/auth/auth.service.ts` | UT-002 | CA-002 |
| **FR-003** | Generación con persistencia | Funcional | `apps/api/src/modules/auth/auth.service.ts` (generateTokens) | UT-002 | CA-002 |
| **FR-004** | Verificación con persistencia | Funcional | `apps/api/src/modules/auth/auth.service.ts` (refresh) | IT-001 | CA-003 |
| **FR-005** | Rotación real de tokens | Funcional | `apps/api/src/modules/auth/auth.service.ts` (refresh) | UT-003, IT-001 | CA-004 |
| **FR-006** | Revocación en logout | Funcional | `apps/api/src/modules/auth/auth.service.ts` (logout), `apps/api/src/modules/auth/auth.controller.ts` (logout) | IT-001, SEC-001 | CA-005 |
| **FR-007** | Limpieza de tokens expirados | Funcional | `apps/api/src/common/jobs/refresh-token-cleanup.job.ts` | - | CA-007 |
| **FR-008** | Auditoría de tokens | Funcional | `apps/api/src/modules/auth/auth.service.ts` | - | - |
| **NFR-001** | Performance (< 50ms latencia) | No Funcional | - | PERF-001 | - |
| **NFR-002** | Seguridad (hash SHA-256) | No Funcional | `apps/api/src/modules/auth/auth.service.ts` | - | - |
| **NFR-003** | Escalabilidad (limpieza periódica) | No Funcional | `apps/api/src/common/jobs/refresh-token-cleanup.job.ts` | - | - |
| **NFR-004** | Compatibilidad (periodo de gracia) | No Funcional | `apps/api/src/modules/auth/auth.service.ts` | - | - |

### Archivos Afectados Detallados
- **Nuevo:**
  - `apps/api/src/common/jobs/refresh-token-cleanup.job.ts`
- **Modificar:**
  - `apps/api/prisma/schema.prisma` - Agregar modelo `refreshtoken`
  - `apps/api/src/modules/auth/auth.service.ts` - Modificar `generateTokens()`, `refresh()`, `logout()`
  - `apps/api/src/modules/auth/auth.controller.ts` - Modificar `logout()` para extraer `refreshToken` de cookies y `userId` del JWT
  - `apps/api/src/config/env.validation.ts` - Reforzar validación de `JWT_REFRESH_SECRET` (ya está en required, pero necesita validación estricta)
  - `apps/api/src/main.ts` - Verificar validación al boot (ya existe)
  - `apps/api/src/common/common.module.ts` o `app.module.ts` - Registrar RefreshTokenCleanupJob (ScheduleModule ya existe)
- **Migración:**
  - `apps/api/prisma/migrations/*/migration.sql` - Crear tabla `Refreshtoken`

### Tests Asociados
- **UT-001:** Validación de JWT_REFRESH_SECRET
- **UT-002:** Generación de Tokens con Persistencia
- **UT-003:** Refresh con Rotación
- **IT-001:** Flujo Completo de Login → Refresh → Logout
- **IT-002:** Rechazo de Token Revocado
- **SEC-001:** Token Robado No Funciona Después de Logout
- **PERF-001:** Latencia de Verificación

---

## H2: Middleware de Seguridad Deshabilitado (P1 - Security)

| ID | Requisito | Tipo | Archivos Afectados | Tests | Criterio de Aceptación |
|----|-----------|------|-------------------|-------|------------------------|
| **H2** | **Hallazgo:** Middleware comentado y matcher vacío | - | `apps/web/middleware.ts` (L10-L101) | - | - |
| **FR-001** | Restaurar código del middleware | Funcional | `apps/web/middleware.ts` | - | CA-001 |
| **FR-002** | Activar matcher correctamente | Funcional | `apps/web/middleware.ts` | IT-001 | CA-002 |
| **FR-003** | Autenticación básica para ngrok | Funcional | `apps/web/middleware.ts` | UT-002 | CA-003 |
| **FR-004** | Lista blanca de IPs para ngrok | Funcional | `apps/web/middleware.ts` | UT-003 | CA-004 |
| **FR-005** | Headers de seguridad | Funcional | `apps/web/middleware.ts` | IT-002 | CA-005 |
| **FR-006** | Optimización de performance | Funcional | `apps/web/middleware.ts` | PERF-001 | CA-006 |
| **NFR-001** | Performance (< 10ms latencia) | No Funcional | - | PERF-001 | - |
| **NFR-002** | Seguridad (Basic Auth, IP allowlist) | No Funcional | `apps/web/middleware.ts` | - | - |
| **NFR-003** | Compatibilidad (no romper funcionalidad) | No Funcional | - | IT-001 | - |

### Archivos Afectados Detallados
- **Modificar:**
  - `apps/web/middleware.ts` - Descomentar código, configurar matcher
- **Opcional (configuración):**
  - `apps/web/.env.local` - Variables `NGROK_AUTH_USER`, `NGROK_AUTH_PASS`, `NGROK_ALLOWED_IPS`
- **Documentación:**
  - `apps/web/README.md` - Documentar variables opcionales

### Tests Asociados
- **UT-001:** Detección de ngrok
- **UT-002:** Autenticación Básica
- **UT-003:** Lista Blanca de IPs
- **IT-001:** Matcher Excluye Rutas Correctas
- **IT-002:** Flujo Completo con ngrok
- **PERF-001:** Latencia del Middleware

---

## Mapeo de Tests a Criterios de Aceptación

### H3 (Lockfiles)
- **CA-001:** IT-001 (Instalación Limpia)
- **CA-002:** IT-002 (CI Rechaza), IT-003 (CI Acepta)
- **CA-003:** E2E-001 (Flujo Completo)
- **CA-004:** Verificación manual de .gitignore

### H1 (Refresh Tokens)
- **CA-001:** UT-001 (Validación de Secreto)
- **CA-002:** UT-002 (Generación con Persistencia)
- **CA-003:** IT-001 (Verificación con Persistencia)
- **CA-004:** UT-003, IT-001 (Rotación Real)
- **CA-005:** IT-001, SEC-001 (Revocación en Logout)
- **CA-006:** SEC-001 (Token Robado)
- **CA-007:** Verificación manual de job de limpieza

### H2 (Middleware)
- **CA-001:** Verificación manual (código descomentado)
- **CA-002:** IT-001 (Matcher Excluye Rutas)
- **CA-003:** UT-002 (Autenticación Básica)
- **CA-004:** UT-003 (Lista Blanca de IPs)
- **CA-005:** IT-002 (Headers de Seguridad)
- **CA-006:** PERF-001 (Performance)

---

## Dependencias entre Hallazgos

```
H3 (Lockfiles) → H1 (Refresh Tokens) → H2 (Middleware)
     ↓                    ↓                    ↓
  PRD-0001            PRD-0002            PRD-0003
  SPEC-0001           SPEC-0002           SPEC-0003
```

**Orden de Implementación:**
1. **H3** (independiente, debe ir primero)
2. **H1** (depende de H3)
3. **H2** (depende de H1 y H3)

---

## Métricas de Cobertura

### Cobertura de Requisitos
- **H3:** 4 FR + 3 NFR = 7 requisitos
- **H1:** 8 FR + 4 NFR = 12 requisitos
- **H2:** 6 FR + 3 NFR = 9 requisitos
- **Total:** 18 FR + 10 NFR = 28 requisitos

### Cobertura de Tests
- **H3:** 4 tests (1 IT, 2 IT, 1 E2E)
- **H1:** 7 tests (3 UT, 2 IT, 1 SEC, 1 PERF)
- **H2:** 6 tests (3 UT, 2 IT, 1 PERF)
- **Total:** 17 tests

### Cobertura de Archivos
- **H3:** 5 archivos afectados
- **H1:** 7 archivos afectados (1 nuevo, 6 modificados)
- **H2:** 3 archivos afectados (1 modificado, 2 opcionales)
- **Total:** 15 archivos únicos afectados

---

## Trazabilidad Completa

### H3 → Tests → CA
```
H3 → FR-001 → IT-001 → CA-001
H3 → FR-002 → IT-002, IT-003 → CA-002
H3 → FR-003 → Verificación manual → CA-004
H3 → FR-004 → E2E-001 → CA-003
```

### H1 → Tests → CA
```
H1 → FR-001 → UT-001 → CA-001
H1 → FR-002, FR-003 → UT-002 → CA-002
H1 → FR-004 → IT-001 → CA-003
H1 → FR-005 → UT-003, IT-001 → CA-004
H1 → FR-006 → IT-001, SEC-001 → CA-005
H1 → FR-006 → SEC-001 → CA-006
H1 → FR-007 → Verificación manual → CA-007
```

### H2 → Tests → CA
```
H2 → FR-001 → Verificación manual → CA-001
H2 → FR-002 → IT-001 → CA-002
H2 → FR-003 → UT-002 → CA-003
H2 → FR-004 → UT-003 → CA-004
H2 → FR-005 → IT-002 → CA-005
H2 → FR-006 → PERF-001 → CA-006
```

---

**Fin de la Matriz de Trazabilidad**


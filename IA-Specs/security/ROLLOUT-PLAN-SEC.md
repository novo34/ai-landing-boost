# Plan de Rollout - Hallazgos de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Proyecto:** AutomAI SaaS Monorepo

---

## Resumen Ejecutivo

Este plan describe la secuencia de implementación y despliegue de los tres hallazgos de seguridad, siguiendo el orden estricto: **H3 → H1 → H2**.

**Estrategia:** Implementación incremental con validación en cada paso, feature flags donde sea necesario, y plan de rollback para cada cambio.

---

## Fase 1: H3 - Unificación de Lockfiles (P0 - Chore)

### Commit 1: Limpieza de Lockfiles
**Tipo:** Chore  
**Branch:** `chore/sec-0001-unify-lockfiles`  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Eliminar `package-lock.json` (raíz)
- Eliminar `bun.lockb` (raíz)
- Eliminar `apps/api/package-lock.json`
- Regenerar `pnpm-lock.yaml`: `pnpm install`

**Validación:**
```bash
# Verificar que solo existe pnpm-lock.yaml
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules

# Verificar instalación
pnpm install --frozen-lockfile
```

**Puntos Críticos:**
- ⚠️ NO eliminar lockfiles antes de regenerar `pnpm-lock.yaml`
- ⚠️ Verificar que `pnpm install` funciona sin errores
- ⚠️ Commitear `pnpm-lock.yaml` actualizado

---

### Commit 2: Actualización de .gitignore
**Tipo:** Chore  
**Branch:** Mismo branch  
**Tiempo estimado:** 10 minutos

**Cambios:**
- Agregar `package-lock.json` a `.gitignore`
- Agregar `bun.lockb` a `.gitignore`
- Verificar que `pnpm-lock.yaml` NO está en `.gitignore`

**Validación:**
```bash
# Verificar exclusiones
grep -E "package-lock.json|bun.lockb" .gitignore

# Verificar que pnpm-lock.yaml no está ignorado
git check-ignore pnpm-lock.yaml
# (debe retornar nada)
```

---

### Commit 3: CI Check de Lockfiles
**Tipo:** Chore  
**Branch:** Mismo branch  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Crear o actualizar workflow de CI (`.github/workflows/validate-lockfiles.yml`)
- Agregar check que valide solo `pnpm-lock.yaml` existe
- Agregar check que rechace `package-lock.json` o `bun.lockb`

**Validación:**
```bash
# Probar check localmente (si es posible)
# Crear PR de prueba con package-lock.json
# Verificar que CI rechaza
```

**Puntos Críticos:**
- ⚠️ Verificar que CI check funciona antes de mergear
- ⚠️ Mensaje de error debe ser claro

---

### Commit 4: Documentación
**Tipo:** Docs  
**Branch:** Mismo branch  
**Tiempo estimado:** 15 minutos

**Cambios:**
- Actualizar `README.md` con instrucciones de pnpm
- Agregar sección "Gestión de Dependencias" si no existe
- Eliminar referencias a `npm install` o `bun install`

**Validación:**
- Revisar README actualizado
- Verificar que no hay referencias a otros gestores

---

### Merge y Validación Post-Deploy

**Pre-merge:**
- [ ] Todos los commits en branch
- [ ] CI pasa exitosamente
- [ ] Tests de integración pasan
- [ ] Revisión de código aprobada

**Post-merge:**
- [ ] Verificar que solo `pnpm-lock.yaml` existe en main
- [ ] Verificar que CI check funciona en main
- [ ] Notificar al equipo sobre el cambio

**Rollback Plan:**
- Si hay problemas, restaurar lockfiles desde backup (si existe)
- Revertir commits en orden inverso
- Comunicar al equipo sobre rollback

---

## Fase 2: H1 - Hardening de Refresh Tokens (P0 - Security)

### Commit 1: Validación de JWT_REFRESH_SECRET
**Tipo:** Security  
**Branch:** `feat/sec-0002-refresh-token-hardening`  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Modificar `apps/api/src/config/env.validation.ts`
- Agregar validación estricta de `JWT_REFRESH_SECRET`
- Rechazar valores por defecto
- Modificar `apps/api/src/modules/auth/auth.service.ts` (constructor)

**Validación:**
```bash
# Probar sin JWT_REFRESH_SECRET
unset JWT_REFRESH_SECRET
pnpm run start:dev
# Debe fallar con error claro

# Probar con valor por defecto
export JWT_REFRESH_SECRET='your-secret-key-change-in-production'
pnpm run start:dev
# Debe fallar con error claro
```

**Puntos Críticos:**
- ⚠️ Aplicación NO debe iniciar sin `JWT_REFRESH_SECRET`
- ⚠️ No aceptar fallback a `JWT_SECRET`
- ⚠️ Documentar variable en `.env.example`

---

### Commit 2: Modelo Prisma y Migración
**Tipo:** Database  
**Branch:** Mismo branch  
**Tiempo estimado:** 45 minutos

**Cambios:**
- Agregar modelo `refreshtoken` a `apps/api/prisma/schema.prisma`
- Actualizar modelos `user` y `tenant` con relación
- Crear migración: `pnpm prisma migrate dev --name add_refresh_token_persistence`
- Generar Prisma Client: `pnpm prisma generate`

**Validación:**
```bash
# Verificar migración
pnpm prisma migrate status

# Verificar schema
pnpm prisma validate

# Verificar tabla en BD
pnpm prisma studio
# Buscar tabla Refreshtoken
```

**Puntos Críticos:**
- ⚠️ Migración debe ser no-destructiva (solo agregar tabla)
- ⚠️ Verificar que índices se crean correctamente
- ⚠️ Backup de BD antes de migración (producción)

---

### Commit 3: Modificar generateTokens()
**Tipo:** Feature  
**Branch:** Mismo branch  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Modificar `generateTokens()` para persistir refresh token
- Hash del token antes de almacenar (SHA-256)
- Calcular `expiresAt` correctamente

**Validación:**
```bash
# Probar login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Verificar token en BD
pnpm prisma studio
# Buscar en tabla Refreshtoken
```

**Puntos Críticos:**
- ⚠️ Hash debe ser SHA-256 (64 caracteres hex)
- ⚠️ `expiresAt` debe calcularse correctamente
- ⚠️ Token debe asociarse con `userId` y `tenantId`

---

### Commit 4: Modificar refresh()
**Tipo:** Feature  
**Branch:** Mismo branch  
**Tiempo estimado:** 45 minutos

**Cambios:**
- Modificar `refresh()` para verificar token en BD
- Implementar rotación real (invalidar anterior, generar nuevo)
- Asociar nuevo token con anterior (`replacedByTokenId`)

**Validación:**
```bash
# Probar refresh
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# Verificar token anterior revocado en BD
# Verificar nuevo token persistido
```

**Puntos Críticos:**
- ⚠️ Token anterior debe estar revocado antes de generar nuevo
- ⚠️ Validar que token existe, no está revocado, y no expirado
- ⚠️ Manejar periodo de gracia para tokens antiguos (opcional)

---

### Commit 5: Modificar logout()
**Tipo:** Feature  
**Branch:** Mismo branch  
**Tiempo estimado:** 20 minutos

**Cambios:**
- Modificar `logout()` para revocar tokens
- Si `refreshToken` proporcionado, revocar solo ese
- Si no, revocar todos los tokens del usuario

**Validación:**
```bash
# Probar logout
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# Verificar token revocado en BD
```

**Puntos Críticos:**
- ⚠️ Tokens revocados deben tener `revokedAt = NOW()`
- ⚠️ Tokens revocados no deben funcionar para refresh

---

### Commit 6: Job de Limpieza
**Tipo:** Feature  
**Branch:** Mismo branch  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Crear `apps/api/src/common/jobs/refresh-token-cleanup.job.ts`
- Registrar job en módulo
- Configurar ejecución diaria (2 AM)

**Validación:**
```bash
# Verificar que job se registra
# Ejecutar manualmente para probar
# Verificar logs de limpieza
```

**Puntos Críticos:**
- ⚠️ Job debe ejecutarse sin bloquear operaciones
- ⚠️ Solo eliminar tokens expirados Y revocados antiguos (> 30 días)

---

### Commit 7: Tests y Logs
**Tipo:** Test  
**Branch:** Mismo branch  
**Tiempo estimado:** 1 hora

**Cambios:**
- Agregar tests unitarios (UT-001, UT-002, UT-003)
- Agregar tests de integración (IT-001, IT-002)
- Agregar tests de seguridad (SEC-001)
- Agregar logs de auditoría

**Validación:**
```bash
# Ejecutar tests
pnpm test
pnpm test:e2e

# Verificar cobertura > 80%
pnpm test:cov
```

---

### Merge y Validación Post-Deploy

**Pre-merge:**
- [ ] Todos los commits en branch
- [ ] Migración ejecutada en staging
- [ ] Tests pasando (cobertura > 80%)
- [ ] Validación manual de flujo completo
- [ ] Revisión de código aprobada

**Post-merge (Staging):**
- [ ] Verificar que aplicación inicia con `JWT_REFRESH_SECRET`
- [ ] Probar flujo completo: login → refresh → logout
- [ ] Verificar tokens en BD
- [ ] Verificar rotación funciona
- [ ] Verificar revocación funciona
- [ ] Verificar job de limpieza se ejecuta

**Post-merge (Producción):**
- [ ] Backup de BD antes de migración
- [ ] Ejecutar migración en horario de bajo tráfico
- [ ] Verificar que aplicación inicia correctamente
- [ ] Monitorear logs de errores
- [ ] Verificar métricas de performance

**Rollback Plan:**
- Si migración falla: revertir migración de Prisma
- Si hay problemas de performance: optimizar índices o considerar cache
- Si tokens no funcionan: verificar periodo de gracia o invalidar todos los tokens
- Comunicar al equipo sobre rollback y forzar re-login si es necesario

---

## Fase 3: H2 - Re-habilitación de Middleware (P1 - Security)

### Commit 1: Restaurar Código del Middleware
**Tipo:** Security  
**Branch:** `chore/sec-0003-restore-middleware`  
**Tiempo estimado:** 20 minutos

**Cambios:**
- Descomentar código de seguridad en `apps/web/middleware.ts`
- Eliminar comentarios temporales de diagnóstico
- Restaurar lógica original

**Validación:**
```bash
# Verificar que código está descomentado
grep -n "//" apps/web/middleware.ts | grep -v "// Si" | grep -v "// Para"
# (debe haber pocos comentarios)

# Probar compilación
cd apps/web
pnpm run build
```

**Puntos Críticos:**
- ⚠️ NO cambiar lógica, solo descomentar
- ⚠️ Verificar que código compila sin errores

---

### Commit 2: Configurar Matcher
**Tipo:** Security  
**Branch:** Mismo branch  
**Tiempo estimado:** 15 minutos

**Cambios:**
- Configurar `config.matcher` correctamente
- Patrón: `'/((?!api|_next/static|_next/image|favicon.ico).*)'`

**Validación:**
```bash
# Probar acceso a diferentes rutas
curl -I http://localhost:3000/
# Debe tener header X-Environment

curl -I http://localhost:3000/api/health
# NO debe tener header X-Environment

curl -I http://localhost:3000/_next/static/css/app.css
# NO debe tener header X-Environment
```

**Puntos Críticos:**
- ⚠️ Matcher debe excluir `/api/*`, `/_next/static/*`, `/_next/image/*`, `/favicon.ico`
- ⚠️ Verificar que middleware NO se ejecuta en rutas excluidas

---

### Commit 3: Optimizaciones de Performance
**Tipo:** Performance  
**Branch:** Mismo branch  
**Tiempo estimado:** 30 minutos

**Cambios:**
- Cachear validaciones cuando sea posible
- Optimizar detección de ngrok
- Optimizar validación de IPs (usar Set)

**Validación:**
```bash
# Medir latencia del middleware
# Ejecutar 100 requests y medir p95
# Debe ser < 10ms
```

**Puntos Críticos:**
- ⚠️ Latencia no debe exceder 10ms (p95)
- ⚠️ No hacer operaciones costosas en middleware

---

### Commit 4: Documentación
**Tipo:** Docs  
**Branch:** Mismo branch  
**Tiempo estimado:** 15 minutos

**Cambios:**
- Actualizar `apps/web/README.md` con variables opcionales
- Documentar `NGROK_AUTH_USER`, `NGROK_AUTH_PASS`, `NGROK_ALLOWED_IPS`
- Crear `.env.example` si no existe

**Validación:**
- Revisar documentación actualizada
- Verificar que variables están documentadas

---

### Merge y Validación Post-Deploy

**Pre-merge:**
- [ ] Todos los commits en branch
- [ ] Tests pasando
- [ ] Performance medida y aceptable
- [ ] Revisión de código aprobada

**Post-merge (Staging):**
- [ ] Verificar que middleware se ejecuta en rutas correctas
- [ ] Probar autenticación básica (si configurada)
- [ ] Probar lista blanca de IPs (si configurada)
- [ ] Verificar headers de seguridad
- [ ] Medir latencia del middleware

**Post-merge (Producción):**
- [ ] Verificar que middleware funciona en producción
- [ ] Monitorear logs de errores
- [ ] Verificar métricas de performance

**Rollback Plan:**
- Si performance degradado: revertir cambios y comentar middleware nuevamente
- Si bloquea acceso legítimo: ajustar configuración o deshabilitar validaciones específicas
- Si rutas bloqueadas incorrectamente: ajustar matcher

---

## Secuencia Completa de Implementación

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: H3 - Lockfiles (P0 Chore)                           │
│ Tiempo estimado: 1.5 horas                                   │
│ ─────────────────────────────────────────────────────────── │
│ Commit 1: Limpieza de lockfiles                              │
│ Commit 2: Actualizar .gitignore                             │
│ Commit 3: CI check                                           │
│ Commit 4: Documentación                                       │
│ └─→ Merge a main                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: H1 - Refresh Tokens (P0 Security)                   │
│ Tiempo estimado: 4-5 horas                                  │
│ ─────────────────────────────────────────────────────────── │
│ Commit 1: Validación de JWT_REFRESH_SECRET                   │
│ Commit 2: Modelo Prisma y migración                         │
│ Commit 3: Modificar generateTokens()                        │
│ Commit 4: Modificar refresh()                               │
│ Commit 5: Modificar logout()                                 │
│ Commit 6: Job de limpieza                                    │
│ Commit 7: Tests y logs                                       │
│ └─→ Merge a main → Deploy a staging → Validar → Producción │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: H2 - Middleware (P1 Security)                       │
│ Tiempo estimado: 1.5 horas                                  │
│ ─────────────────────────────────────────────────────────── │
│ Commit 1: Restaurar código del middleware                   │
│ Commit 2: Configurar matcher                                │
│ Commit 3: Optimizaciones de performance                      │
│ Commit 4: Documentación                                      │
│ └─→ Merge a main → Deploy a staging → Validar → Producción │
└─────────────────────────────────────────────────────────────┘
```

**Tiempo total estimado:** 7-8 horas de desarrollo + tiempo de validación y deploy

---

## Checklist de Validación Post-Deploy

### H3 (Lockfiles)
- [ ] Solo `pnpm-lock.yaml` existe en repositorio
- [ ] CI check funciona correctamente
- [ ] Documentación actualizada
- [ ] Equipo notificado

### H1 (Refresh Tokens)
- [ ] `JWT_REFRESH_SECRET` configurado en todas las instancias
- [ ] Migración ejecutada exitosamente
- [ ] Tokens se persisten correctamente
- [ ] Rotación funciona
- [ ] Revocación funciona
- [ ] Job de limpieza se ejecuta
- [ ] Performance aceptable (< 50ms)
- [ ] Logs de auditoría funcionando

### H2 (Middleware)
- [ ] Middleware restaurado y funcionando
- [ ] Matcher excluye rutas correctas
- [ ] Autenticación básica funciona (si configurada)
- [ ] Lista blanca de IPs funciona (si configurada)
- [ ] Headers de seguridad presentes
- [ ] Performance aceptable (< 10ms)
- [ ] Documentación actualizada

---

## Comunicación al Equipo

### Antes de Implementar
- Notificar sobre cambios planificados
- Proporcionar timeline estimado
- Solicitar feedback si es necesario

### Durante Implementación
- Actualizar sobre progreso
- Notificar sobre bloqueadores si los hay

### Después de Implementar
- Notificar sobre completitud
- Proporcionar instrucciones de configuración (si aplica)
- Documentar cambios en changelog

---

## Puntos Críticos a No Romper

### H3
- ⚠️ NO eliminar `pnpm-lock.yaml`
- ⚠️ NO permitir otros lockfiles en CI

### H1
- ⚠️ NO romper flujo de autenticación existente
- ⚠️ NO aceptar tokens sin persistencia después de periodo de gracia
- ⚠️ NO degradar performance significativamente

### H2
- ⚠️ NO aplicar middleware a `/api/*` o assets estáticos
- ⚠️ NO causar lentitud en carga de páginas
- ⚠️ NO bloquear acceso legítimo

---

**Fin del Plan de Rollout**


# Próximos Pasos - Implementación de Hallazgos de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Proyecto:** AutomAI SaaS Monorepo

---

## Resumen

Esta sección describe la secuencia exacta de implementación de los tres hallazgos de seguridad, con puntos críticos a no romper y orden estricto de ejecución.

---

## Secuencia de Implementación (ESTRICTA)

### Orden Obligatorio
```
1. H3 (P0 Chore) → Unificar lockfiles (pnpm)
2. H1 (P0 Security) → Hardening de refresh tokens
3. H2 (P1 Security) → Re-habilitar middleware
```

**⚠️ NO cambiar este orden.** Cada fase depende de la anterior.

---

## FASE 1: H3 - Unificación de Lockfiles

### Secuencia de Commits

#### Commit 1: `chore(sec): remove redundant lockfiles`
```bash
# 1. Regenerar pnpm-lock.yaml (asegurar que está actualizado)
cd /path/to/repo
pnpm install

# 2. Eliminar lockfiles redundantes
rm package-lock.json
rm bun.lockb
rm apps/api/package-lock.json

# 3. Verificar que solo existe pnpm-lock.yaml
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules
# (debe retornar nada)

# 4. Verificar instalación funciona
pnpm install --frozen-lockfile
# (debe funcionar sin errores)

# 5. Commitear
git add pnpm-lock.yaml
git commit -m "chore(sec): remove redundant lockfiles

- Remove package-lock.json (root)
- Remove bun.lockb (root)
- Remove apps/api/package-lock.json
- Regenerate pnpm-lock.yaml

Refs: PRD-SEC-0001, SPEC-SEC-0001"
```

**Puntos Críticos:**
- ⚠️ **NO eliminar lockfiles antes de regenerar pnpm-lock.yaml**
- ⚠️ **Verificar que pnpm install funciona sin errores**
- ⚠️ **Commitear pnpm-lock.yaml actualizado**

---

#### Commit 2: `chore(sec): update gitignore for lockfiles`
```bash
# 1. Actualizar .gitignore
cat >> .gitignore << EOF

# Lockfiles de otros gestores (no permitidos)
package-lock.json
bun.lockb
**/package-lock.json
EOF

# 2. Verificar que pnpm-lock.yaml NO está ignorado
git check-ignore pnpm-lock.yaml
# (debe retornar nada)

# 3. Commitear
git add .gitignore
git commit -m "chore(sec): update gitignore for lockfiles

- Add package-lock.json to .gitignore
- Add bun.lockb to .gitignore
- Ensure pnpm-lock.yaml is NOT ignored

Refs: PRD-SEC-0001, SPEC-SEC-0001"
```

---

#### Commit 3: `chore(ci): add lockfiles validation check`
```bash
# 1. Crear o actualizar workflow de CI
# .github/workflows/validate-lockfiles.yml

# 2. Commitear
git add .github/workflows/validate-lockfiles.yml
git commit -m "chore(ci): add lockfiles validation check

- Add CI check to reject package-lock.json and bun.lockb
- Add CI check to require pnpm-lock.yaml
- Fail PR if forbidden lockfiles are detected

Refs: PRD-SEC-0001, SPEC-SEC-0001"
```

**Validación:**
- Crear PR de prueba con `package-lock.json`
- Verificar que CI rechaza

---

#### Commit 4: `docs(sec): update README with pnpm instructions`
```bash
# 1. Actualizar README.md
# Agregar sección "Gestión de Dependencias" con instrucciones de pnpm

# 2. Commitear
git add README.md
git commit -m "docs(sec): update README with pnpm instructions

- Add 'Gestión de Dependencias' section
- Document pnpm commands
- Remove references to npm/bun

Refs: PRD-SEC-0001, SPEC-SEC-0001"
```

---

### Merge y Validación

**Pre-merge:**
```bash
# 1. Verificar que todos los commits están en branch
git log --oneline

# 2. Verificar que CI pasa
# (revisar en GitHub/GitLab)

# 3. Ejecutar tests
pnpm test

# 4. Crear PR
```

**Post-merge:**
```bash
# 1. Verificar que solo pnpm-lock.yaml existe
find . -name "package-lock.json" -o -name "bun.lockb" | grep -v node_modules

# 2. Verificar que CI check funciona
# (crear PR de prueba con package-lock.json)

# 3. Notificar al equipo
```

---

## FASE 2: H1 - Hardening de Refresh Tokens

### Secuencia de Commits

#### Commit 1: `feat(sec): require JWT_REFRESH_SECRET`
```bash
# 1. Modificar apps/api/src/config/env.validation.ts
# Agregar validación estricta de JWT_REFRESH_SECRET

# 2. Modificar apps/api/src/modules/auth/auth.service.ts
# Agregar validación en constructor

# 3. Verificar que aplicación NO inicia sin JWT_REFRESH_SECRET
unset JWT_REFRESH_SECRET
cd apps/api
pnpm run start:dev
# (debe fallar con error claro)

# 4. Commitear
git add apps/api/src/config/env.validation.ts
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(sec): require JWT_REFRESH_SECRET

- Make JWT_REFRESH_SECRET mandatory (no fallback)
- Reject default values
- Fail fast on boot if not configured

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Aplicación NO debe iniciar sin JWT_REFRESH_SECRET**
- ⚠️ **No aceptar fallback a JWT_SECRET o valores por defecto**
- ⚠️ **Documentar variable en .env.example**

---

#### Commit 2: `feat(db): add refreshtoken model and migration`
```bash
# 1. Modificar apps/api/prisma/schema.prisma
# Agregar modelo refreshtoken

# 2. Crear migración
cd apps/api
pnpm prisma migrate dev --name add_refresh_token_persistence

# 3. Generar Prisma Client
pnpm prisma generate

# 4. Verificar migración
pnpm prisma migrate status

# 5. Commitear
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/
git commit -m "feat(db): add refreshtoken model and migration

- Add refreshtoken model to Prisma schema
- Add indexes for performance
- Create migration

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Migración debe ser no-destructiva (solo agregar tabla)**
- ⚠️ **Verificar que índices se crean correctamente**
- ⚠️ **Backup de BD antes de migración (producción)**

---

#### Commit 3: `feat(auth): persist refresh tokens on generation`
```bash
# 1. Modificar apps/api/src/modules/auth/auth.service.ts
# Modificar generateTokens() para persistir refresh token

# 2. Probar login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Verificar token en BD
cd apps/api
pnpm prisma studio
# Buscar en tabla Refreshtoken

# 4. Commitear
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): persist refresh tokens on generation

- Hash refresh token before storing (SHA-256)
- Store tokenHash, userId, tenantId, expiresAt
- Log token generation

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Hash debe ser SHA-256 (64 caracteres hex)**
- ⚠️ **expiresAt debe calcularse correctamente**
- ⚠️ **Token debe asociarse con userId y tenantId**

---

#### Commit 4: `feat(auth): implement real token rotation`
```bash
# 1. Modificar apps/api/src/modules/auth/auth.service.ts
# Modificar refresh() para verificar en BD y rotar

# 2. Probar refresh
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# 3. Verificar token anterior revocado en BD
# Verificar nuevo token persistido

# 4. Commitear
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): implement real token rotation

- Verify token in database before refresh
- Revoke previous token before generating new
- Associate new token with previous (replacedByTokenId)
- Handle grace period for old tokens (optional)

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Token anterior debe estar revocado antes de generar nuevo**
- ⚠️ **Validar que token existe, no está revocado, y no expirado**
- ⚠️ **Manejar periodo de gracia para tokens antiguos (opcional)**

---

#### Commit 5: `feat(auth): implement token revocation on logout`
```bash
# 1. Modificar apps/api/src/modules/auth/auth.service.ts
# Modificar logout() para revocar tokens

# 2. Probar logout
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"..."}'

# 3. Verificar token revocado en BD

# 4. Commitear
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): implement token revocation on logout

- Revoke specific token if provided
- Revoke all user tokens if not provided
- Log revocation events

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Tokens revocados deben tener revokedAt = NOW()**
- ⚠️ **Tokens revocados no deben funcionar para refresh**

---

#### Commit 6: `feat(jobs): add refresh token cleanup job`
```bash
# 1. Crear apps/api/src/common/jobs/refresh-token-cleanup.job.ts

# 2. Registrar job en módulo
# apps/api/src/common/common.module.ts o app.module.ts

# 3. Verificar que job se registra
# Ejecutar manualmente para probar

# 4. Commitear
git add apps/api/src/common/jobs/refresh-token-cleanup.job.ts
git add apps/api/src/common/common.module.ts
git commit -m "feat(jobs): add refresh token cleanup job

- Clean up expired and old revoked tokens daily
- Run at 2 AM
- Log cleanup results

Refs: PRD-SEC-0002, SPEC-SEC-0002"
```

**Puntos Críticos:**
- ⚠️ **Job debe ejecutarse sin bloquear operaciones**
- ⚠️ **Solo eliminar tokens expirados Y revocados antiguos (> 30 días)**

---

#### Commit 7: `test(sec): add refresh token hardening tests`
```bash
# 1. Agregar tests unitarios
# apps/api/src/modules/auth/auth.service.spec.ts

# 2. Agregar tests de integración
# apps/api/test/auth.e2e-spec.ts

# 3. Ejecutar tests
cd apps/api
pnpm test
pnpm test:e2e

# 4. Verificar cobertura > 80%
pnpm test:cov

# 5. Commitear
git add apps/api/src/modules/auth/auth.service.spec.ts
git add apps/api/test/auth.e2e-spec.ts
git commit -m "test(sec): add refresh token hardening tests

- Add unit tests for token generation and rotation
- Add integration tests for full auth flow
- Add security tests for stolen token scenario
- Add performance tests

Refs: PRD-SEC-0002, SPEC-SEC-0002, TEST-PLAN-SEC"
```

---

### Merge y Validación

**Pre-merge:**
```bash
# 1. Verificar que todos los commits están en branch
git log --oneline

# 2. Ejecutar migración en staging
cd apps/api
pnpm prisma migrate deploy

# 3. Ejecutar tests
pnpm test
pnpm test:e2e

# 4. Validación manual de flujo completo
# Login → Refresh → Logout

# 5. Crear PR
```

**Post-merge (Staging):**
```bash
# 1. Verificar que aplicación inicia con JWT_REFRESH_SECRET
# 2. Probar flujo completo: login → refresh → logout
# 3. Verificar tokens en BD
# 4. Verificar rotación funciona
# 5. Verificar revocación funciona
# 6. Verificar job de limpieza se ejecuta
```

**Post-merge (Producción):**
```bash
# 1. Backup de BD antes de migración
# 2. Ejecutar migración en horario de bajo tráfico
# 3. Verificar que aplicación inicia correctamente
# 4. Monitorear logs de errores
# 5. Verificar métricas de performance
```

---

## FASE 3: H2 - Re-habilitación de Middleware

### Secuencia de Commits

#### Commit 1: `chore(sec): restore security middleware`
```bash
# 1. Descomentar código en apps/web/middleware.ts
# Eliminar comentarios temporales

# 2. Verificar que compila
cd apps/web
pnpm run build

# 3. Commitear
git add apps/web/middleware.ts
git commit -m "chore(sec): restore security middleware

- Uncomment security middleware code
- Remove temporary diagnostic comments
- Restore original security logic

Refs: PRD-SEC-0003, SPEC-SEC-0003"
```

**Puntos Críticos:**
- ⚠️ **NO cambiar lógica, solo descomentar**
- ⚠️ **Verificar que código compila sin errores**

---

#### Commit 2: `chore(sec): configure middleware matcher`
```bash
# 1. Configurar config.matcher en apps/web/middleware.ts
# Patrón: '/((?!api|_next/static|_next/image|favicon.ico).*)'

# 2. Probar acceso a diferentes rutas
curl -I http://localhost:3000/
# Debe tener header X-Environment

curl -I http://localhost:3000/api/health
# NO debe tener header X-Environment

# 3. Commitear
git add apps/web/middleware.ts
git commit -m "chore(sec): configure middleware matcher

- Configure matcher to exclude /api, /_next/static, /_next/image, /favicon.ico
- Apply middleware to all other routes

Refs: PRD-SEC-0003, SPEC-SEC-0003"
```

**Puntos Críticos:**
- ⚠️ **Matcher debe excluir /api/*, /_next/static/*, /_next/image/*, /favicon.ico**
- ⚠️ **Verificar que middleware NO se ejecuta en rutas excluidas**

---

#### Commit 3: `perf(sec): optimize middleware performance`
```bash
# 1. Optimizar validaciones en apps/web/middleware.ts
# Cachear detección de ngrok
# Optimizar validación de IPs (usar Set)

# 2. Medir latencia
# Ejecutar 100 requests y medir p95
# Debe ser < 10ms

# 3. Commitear
git add apps/web/middleware.ts
git commit -m "perf(sec): optimize middleware performance

- Cache ngrok detection
- Optimize IP validation with Set
- Ensure latency < 10ms (p95)

Refs: PRD-SEC-0003, SPEC-SEC-0003"
```

**Puntos Críticos:**
- ⚠️ **Latencia no debe exceder 10ms (p95)**
- ⚠️ **No hacer operaciones costosas en middleware**

---

#### Commit 4: `docs(sec): document middleware env vars`
```bash
# 1. Actualizar apps/web/README.md
# Documentar NGROK_AUTH_USER, NGROK_AUTH_PASS, NGROK_ALLOWED_IPS

# 2. Crear .env.example si no existe

# 3. Commitear
git add apps/web/README.md
git add apps/web/.env.example
git commit -m "docs(sec): document middleware env vars

- Document NGROK_AUTH_USER, NGROK_AUTH_PASS, NGROK_ALLOWED_IPS
- Add examples in .env.example

Refs: PRD-SEC-0003, SPEC-SEC-0003"
```

---

### Merge y Validación

**Pre-merge:**
```bash
# 1. Verificar que todos los commits están en branch
git log --oneline

# 2. Ejecutar tests
cd apps/web
pnpm test

# 3. Medir performance
# (ejecutar 100 requests y medir p95)

# 4. Crear PR
```

**Post-merge (Staging):**
```bash
# 1. Verificar que middleware se ejecuta en rutas correctas
# 2. Probar autenticación básica (si configurada)
# 3. Probar lista blanca de IPs (si configurada)
# 4. Verificar headers de seguridad
# 5. Medir latencia del middleware
```

**Post-merge (Producción):**
```bash
# 1. Verificar que middleware funciona en producción
# 2. Monitorear logs de errores
# 3. Verificar métricas de performance
```

---

## Puntos Críticos a No Romper

### H3 (Lockfiles)
- ⚠️ **NO eliminar pnpm-lock.yaml**
- ⚠️ **NO permitir otros lockfiles en CI**
- ⚠️ **NO romper instalación de dependencias**

### H1 (Refresh Tokens)
- ⚠️ **NO romper flujo de autenticación existente**
- ⚠️ **NO aceptar tokens sin persistencia después de periodo de gracia**
- ⚠️ **NO degradar performance significativamente (< 50ms)**
- ⚠️ **NO iniciar aplicación sin JWT_REFRESH_SECRET**

### H2 (Middleware)
- ⚠️ **NO aplicar middleware a /api/* o assets estáticos**
- ⚠️ **NO causar lentitud en carga de páginas (< 10ms)**
- ⚠️ **NO bloquear acceso legítimo**

---

## Checklist Final de Validación

### H3
- [ ] Solo `pnpm-lock.yaml` existe
- [ ] CI check funciona
- [ ] Documentación actualizada
- [ ] Equipo notificado

### H1
- [ ] `JWT_REFRESH_SECRET` configurado
- [ ] Migración ejecutada
- [ ] Tokens se persisten
- [ ] Rotación funciona
- [ ] Revocación funciona
- [ ] Job de limpieza funciona
- [ ] Performance aceptable
- [ ] Tests pasando

### H2
- [ ] Middleware restaurado
- [ ] Matcher funciona
- [ ] Autenticación básica funciona (si configurada)
- [ ] Lista blanca de IPs funciona (si configurada)
- [ ] Headers de seguridad presentes
- [ ] Performance aceptable
- [ ] Documentación actualizada

---

## Referencias

- **PRD-SEC-0001:** Unificación de Lockfiles
- **SPEC-SEC-0001:** Especificación Técnica de Lockfiles
- **PRD-SEC-0002:** Hardening de Refresh Tokens
- **SPEC-SEC-0002:** Especificación Técnica de Refresh Tokens
- **PRD-SEC-0003:** Re-habilitación de Middleware
- **SPEC-SEC-0003:** Especificación Técnica de Middleware
- **TRACEABILITY-MATRIX.md:** Matriz de Trazabilidad
- **TEST-PLAN-SEC.md:** Plan de Pruebas
- **ROLLOUT-PLAN-SEC.md:** Plan de Rollout Detallado

---

**Fin de Próximos Pasos**


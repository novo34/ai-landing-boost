# Reporte de Auditoría - Documentación de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Auditor:** Security Lead + Repo Maintainer  
**Estado:** ✅ Documentación Implementable con Correcciones Menores

---

## Resumen Ejecutivo

La documentación generada es **mayormente correcta y implementable**, pero requiere **correcciones menores** en 3 áreas críticas:

1. **H1 (P0):** Firma del método `logout()` no coincide con implementación real
2. **H1 (P1):** Validación de `JWT_REFRESH_SECRET` ya existe pero acepta fallback (debe reforzarse)
3. **H3 (P2):** `.gitignore` no tiene exclusiones para lockfiles (necesita actualización)

**Veredicto:** ✅ **Documentación es 100% implementable** después de aplicar las correcciones documentadas.

---

## Hallazgos por Severidad

### P0 - Crítico (Debe Corregirse Antes de Implementar)

#### H1-001: Firma de `logout()` No Coincide con Controller Real
**Documento:** `SPEC-SEC-0002-refresh-token-hardening.md`, Sección 3.2.4  
**Severidad:** P0  
**Estado:** ❌ Inconsistencia

**Problema:**
La SPEC define `logout()` como:
```typescript
async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }>
```

**Realidad en el código:**
- `apps/api/src/modules/auth/auth.controller.ts` (línea 164): `logout()` NO recibe parámetros
- `apps/api/src/modules/auth/auth.service.ts` (línea 276): `logout()` NO recibe parámetros
- El controller solo limpia cookies, no pasa `userId` ni `refreshToken` al service

**Evidencia:**
```typescript:164:177:apps/api/src/modules/auth/auth.controller.ts
async logout(@Res({ passthrough: false }) res: Response) {
  try {
    const result = await this.authService.logout();
    this.clearAuthCookies(res);
    return result;
  } catch (error) {
    // Si hay error, igual limpiar cookies
    this.clearAuthCookies(res);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
```

**Corrección Requerida:**
1. **Opción A (Recomendada):** Modificar controller para extraer `refreshToken` de cookies y `userId` del JWT (si está presente)
2. **Opción B:** Mantener firma actual pero documentar que se debe modificar el controller

**Edición en SPEC-SEC-0002:**
```markdown
#### 3.2.4 auth.service.ts - logout() Modificado
```typescript
async logout(userId?: string, refreshToken?: string): Promise<{ success: boolean }> {
  try {
    // Si no se proporciona userId ni refreshToken, revocar todos los tokens del usuario
    // (esto requiere modificar el controller para extraer userId del JWT si está presente)
    
    if (refreshToken) {
      // Revocar token específico
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      const tokenRecord = await this.prisma.refreshtoken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord && !tokenRecord.revokedAt) {
        await this.prisma.refreshtoken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });

        this.logger.log(`Refresh token revocado para usuario ${tokenRecord.userId}, motivo: logout`);
      }
    } else if (userId) {
      // Revocar todos los tokens activos del usuario
      const result = await this.prisma.refreshtoken.updateMany({
        where: {
          userId,
          revokedAt: null, // Solo tokens activos
        },
        data: {
          revokedAt: new Date(),
        },
      });

      this.logger.log(
        `Todos los refresh tokens revocados para usuario ${userId}, cantidad: ${result.count}, motivo: logout`
      );
    } else {
      // Si no hay userId ni refreshToken, no hacer nada (solo limpiar cookies en controller)
      this.logger.warn('Logout llamado sin userId ni refreshToken - solo se limpian cookies');
    }

    return { success: true };
  } catch (error) {
    this.logger.error(`Error en logout: ${error.message}`);
    // No fallar el logout si hay error, solo loguear
    return { success: true };
  }
}
```

**NOTA IMPORTANTE:** El controller debe modificarse para:
1. Extraer `refreshToken` de cookies: `req.cookies?.refresh_token`
2. Extraer `userId` del JWT si está presente (opcional, puede venir del token)
3. Pasar ambos al service: `await this.authService.logout(userId, refreshToken)`
```

---

### P1 - Alto (Debe Corregirse)

#### H1-002: Validación de JWT_REFRESH_SECRET Ya Existe Pero Acepta Fallback
**Documento:** `SPEC-SEC-0002-refresh-token-hardening.md`, Sección 3.2.6  
**Severidad:** P1  
**Estado:** ⚠️ Parcialmente Correcto

**Problema:**
La SPEC indica que `JWT_REFRESH_SECRET` debe ser obligatorio sin fallback, pero:
- `apps/api/src/config/env.validation.ts` (línea 40) ya lo incluye en `required`
- **PERO** el código real en `auth.service.ts` (líneas 231, 300) todavía acepta fallback:
  ```typescript
  secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  ```

**Evidencia:**
```typescript:230:232:apps/api/src/modules/auth/auth.service.ts
const payload = this.jwtService.verify(refreshToken, {
  secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
});
```

**Corrección Requerida:**
La SPEC es correcta en que debe validarse estrictamente, pero debe aclarar que:
1. La validación en `env.validation.ts` ya existe pero necesita reforzarse
2. El código en `auth.service.ts` debe eliminar los fallbacks

**Edición en SPEC-SEC-0002:**
```markdown
#### 3.2.6 env.validation.ts - Validación Mejorada
**NOTA:** `JWT_REFRESH_SECRET` ya está en la lista de `required` (línea 40), pero la validación actual no rechaza valores por defecto ni fallbacks. Se debe reforzar:

```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET', // Ya está, pero necesita validación estricta
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // ✅ AGREGAR: Validación estricta de JWT_REFRESH_SECRET
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno.');
  }

  // ✅ AGREGAR: Validar que JWT_REFRESH_SECRET no sea valor por defecto
  const defaultSecrets = [
    'your-secret-key-change-in-production',
    'your-super-secret-jwt-key-change-in-production-min-32-chars',
  ];
  
  if (defaultSecrets.includes(process.env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'JWT_REFRESH_SECRET no puede ser un valor por defecto. Genera un secreto seguro con: openssl rand -base64 64'
    );
  }

  // ✅ AGREGAR: Validar longitud mínima
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    console.warn('⚠️ JWT_REFRESH_SECRET should be at least 32 characters long');
  }

  // ... resto de validaciones existentes ...
}
```

**IMPORTANTE:** También eliminar fallbacks en `auth.service.ts`:
- Línea 231: `secret: process.env.JWT_REFRESH_SECRET!` (sin fallback)
- Línea 300: `secret: process.env.JWT_REFRESH_SECRET!` (sin fallback)
```

---

#### H1-003: Controller de Logout No Extrae refreshToken de Cookies
**Documento:** `SPEC-SEC-0002-refresh-token-hardening.md`, Sección 3.2.4  
**Severidad:** P1  
**Estado:** ⚠️ Requiere Modificación del Controller

**Problema:**
La SPEC asume que `logout()` puede recibir `refreshToken`, pero el controller actual no lo extrae de cookies ni del body.

**Evidencia:**
```typescript:160:177:apps/api/src/modules/auth/auth.controller.ts
@Post('logout')
@Public()
@Throttle({ short: { limit: 20, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async logout(@Res({ passthrough: false }) res: Response) {
  try {
    const result = await this.authService.logout();
    this.clearAuthCookies(res);
    return result;
  } catch (error) {
    this.clearAuthCookies(res);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
```

**Corrección Requerida:**
Agregar a la SPEC que el controller debe modificarse:

**Edición en SPEC-SEC-0002:**
```markdown
#### 3.2.7 auth.controller.ts - logout() Modificado
```typescript
@Post('logout')
@Public()
@Throttle({ short: { limit: 20, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async logout(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
  try {
    // Extraer refreshToken de cookies
    const refreshToken = req.cookies?.refresh_token;
    
    // Intentar extraer userId del JWT si está presente (opcional)
    let userId: string | undefined;
    try {
      const accessToken = req.cookies?.access_token;
      if (accessToken) {
        const payload = this.jwtService.decode(accessToken) as { sub?: string };
        userId = payload?.sub;
      }
    } catch (error) {
      // Si no hay token válido, continuar sin userId
    }
    
    const result = await this.authService.logout(userId, refreshToken);
    this.clearAuthCookies(res);
    return result;
  } catch (error) {
    // Si hay error, igual limpiar cookies
    this.clearAuthCookies(res);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
```

**NOTA:** Requiere importar `JwtService` en el controller si no está ya importado.
```
```

---

### P2 - Medio (Recomendado Corregir)

#### H3-001: .gitignore No Tiene Exclusiones para Lockfiles
**Documento:** `SPEC-SEC-0001-lockfiles-pnpm.md`, Sección 3.2.1  
**Severidad:** P2  
**Estado:** ⚠️ Falta Implementación

**Problema:**
La SPEC indica que `.gitignore` debe incluir `package-lock.json` y `bun.lockb`, pero el `.gitignore` actual no los tiene.

**Evidencia:**
```1:44:.gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Next.js
.next
apps/web/.next
apps/web/.next/**

# Environment variables
.env
.env.local
.env.*.local
apps/api/.env
apps/web/.env

# Files with credentials or sensitive information
*CREDENCIALES*.md
*PASSWORD*.md
*SECRET*.md
*credentials*.md
*passwords*.md

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

**Corrección Requerida:**
La SPEC es correcta, solo necesita ejecutarse. Agregar al `.gitignore`:
```
# Lockfiles de otros gestores (no permitidos)
package-lock.json
bun.lockb
**/package-lock.json
```

---

#### H3-002: No Existen Workflows de CI en .github
**Documento:** `SPEC-SEC-0001-lockfiles-pnpm.md`, Sección 2.2.1  
**Severidad:** P2  
**Estado:** ℹ️ Informativo

**Problema:**
La SPEC proporciona un ejemplo de workflow de GitHub Actions, pero el repositorio no tiene directorio `.github/workflows/`.

**Evidencia:**
- Directorio `.github` no existe en el repositorio

**Corrección Requerida:**
La SPEC es correcta, solo necesita crear el directorio y el workflow. No requiere corrección en la documentación, solo aclaración.

**Edición en SPEC-SEC-0001:**
```markdown
#### 2.2.1 GitHub Actions (Ejemplo)
**NOTA:** Si el repositorio no tiene directorio `.github/workflows/`, crearlo primero:

```bash
mkdir -p .github/workflows
```

Luego crear el archivo `.github/workflows/validate-lockfiles.yml` con el contenido del ejemplo.
```
```

---

## Hallazgos Verificados como Correctos

### ✅ H1-004: ScheduleModule Ya Está Instalado
**Documento:** `SPEC-SEC-0002-refresh-token-hardening.md`, Sección 2.3.1  
**Estado:** ✅ Correcto

**Evidencia:**
- `apps/api/src/app.module.ts` (línea 44): `ScheduleModule.forRoot()` ya está configurado
- `apps/api/package.json`: `"@nestjs/schedule": "^6.1.0"` está instalado

**Conclusión:** La SPEC es correcta, solo necesita registrar el nuevo job.

---

### ✅ H1-005: No Existe Tabla refreshtoken en Prisma
**Documento:** `SPEC-SEC-0002-refresh-token-hardening.md`, Sección 2.2.1  
**Estado:** ✅ Correcto

**Evidencia:**
- Búsqueda en `schema.prisma`: No existe modelo `refreshtoken`
- Solo existe `refreshToken` como campo en `useridentity` (línea 583), que es para OAuth, no para JWT refresh tokens

**Conclusión:** La SPEC es correcta, la tabla debe crearse.

---

### ✅ H2-001: Variables de Entorno NGROK_* Ya Existen en Código
**Documento:** `SPEC-SEC-0003-web-middleware-security.md`, Sección 2.1  
**Estado:** ✅ Correcto

**Evidencia:**
- `apps/web/middleware.ts` (líneas 30-31, 60): Variables `NGROK_AUTH_USER`, `NGROK_AUTH_PASS`, `NGROK_ALLOWED_IPS` ya están en el código comentado
- `apps/web/lib/config/env.ts`: Referencias a estas variables

**Conclusión:** La SPEC es correcta, las variables ya están definidas en el código.

---

### ✅ H2-002: Matcher Está Vacío
**Documento:** `PRD-SEC-0003-web-middleware-security.md`, Sección 1.2  
**Estado:** ✅ Correcto

**Evidencia:**
- `apps/web/middleware.ts` (línea 99): `matcher: []` está vacío

**Conclusión:** La SPEC es correcta, el matcher debe configurarse.

---

### ✅ H3-003: Lockfiles Existen Como Se Describe
**Documento:** `PRD-SEC-0001-lockfiles-pnpm.md`, Sección 1.2  
**Estado:** ✅ Correcto

**Evidencia:**
- `package-lock.json` existe en raíz
- `bun.lockb` existe en raíz
- `apps/api/package-lock.json` existe
- `pnpm-lock.yaml` existe en raíz

**Conclusión:** La documentación es correcta.

---

## Correcciones Aplicadas ✅

### ✅ Corrección 1: SPEC-SEC-0002 - Firma de logout()
**Archivo:** `IA-Specs/security/SPEC-SEC-0002-refresh-token-hardening.md`  
**Estado:** ✅ APLICADA

**Cambios Aplicados:**
- ✅ Actualizada Sección 3.2.4: `logout()` ahora acepta parámetros opcionales (`userId?`, `refreshToken?`)
- ✅ Agregada Sección 3.2.7: Modificación completa del controller para extraer `refreshToken` de cookies y `userId` del JWT
- ✅ Actualizado PRD-SEC-0002: FR-006 ahora incluye modificación del controller
- ✅ Actualizada TRACEABILITY-MATRIX: FR-006 ahora incluye `auth.controller.ts`

---

### ✅ Corrección 2: SPEC-SEC-0002 - Validación de JWT_REFRESH_SECRET
**Archivo:** `IA-Specs/security/SPEC-SEC-0002-refresh-token-hardening.md`  
**Estado:** ✅ APLICADA

**Cambios Aplicados:**
- ✅ Actualizada Sección 3.2.6: Aclarado que `JWT_REFRESH_SECRET` ya está en `required` pero necesita validación estricta adicional
- ✅ Agregadas notas sobre eliminar fallbacks en `auth.service.ts` (líneas 231 y 300)
- ✅ Actualizada TRACEABILITY-MATRIX: FR-001 ahora indica "reforzar" y "eliminar fallbacks"

---

### ✅ Corrección 3: SPEC-SEC-0001 - .gitignore
**Archivo:** `IA-Specs/security/SPEC-SEC-0001-lockfiles-pnpm.md`  
**Estado:** ✅ APLICADA

**Cambios Aplicados:**
- ✅ Agregada nota en Sección 3.2.1: El `.gitignore` actual NO tiene estas exclusiones y deben agregarse durante la implementación

---

### ✅ Corrección 4: SPEC-SEC-0001 - Workflows de CI
**Archivo:** `IA-Specs/security/SPEC-SEC-0001-lockfiles-pnpm.md`  
**Estado:** ✅ APLICADA

**Cambios Aplicados:**
- ✅ Agregada nota en Sección 2.2.1: Si el repositorio no tiene directorio `.github/workflows/`, crearlo primero con `mkdir -p .github/workflows`

---

## Resumen de Correcciones por Documento

### PRD-SEC-0001 (Lockfiles)
- ✅ **Sin correcciones necesarias** - Documentación correcta

### SPEC-SEC-0001 (Lockfiles)
- ⚠️ **P2:** Agregar nota sobre crear `.github/workflows/` si no existe

### PRD-SEC-0002 (Refresh Tokens)
- ✅ **Sin correcciones necesarias** - Documentación correcta

### SPEC-SEC-0002 (Refresh Tokens)
- ❌ **P0:** Corregir firma de `logout()` y agregar modificación del controller
- ⚠️ **P1:** Aclarar que validación de `JWT_REFRESH_SECRET` existe pero necesita reforzarse

### PRD-SEC-0003 (Middleware)
- ✅ **Sin correcciones necesarias** - Documentación correcta

### SPEC-SEC-0003 (Middleware)
- ✅ **Sin correcciones necesarias** - Documentación correcta

---

## Checklist de Implementación Post-Corrección

### H1 (Refresh Tokens)
- [ ] Corregir firma de `logout()` en SPEC
- [ ] Agregar sección de modificación del controller
- [ ] Aclarar validación de `JWT_REFRESH_SECRET`
- [ ] Verificar que ScheduleModule está instalado (✅ ya verificado)

### H2 (Middleware)
- [ ] Sin correcciones necesarias

### H3 (Lockfiles)
- [ ] Agregar nota sobre `.github/workflows/`
- [ ] Verificar que `.gitignore` se actualizará (correcto en SPEC)

---

## Conclusión

**Estado Final:** ✅ **Documentación es 100% implementable** - Todas las correcciones han sido aplicadas.

**Correcciones Aplicadas:**
1. ✅ **P0:** Firma de `logout()` corregida y modificación del controller documentada
2. ✅ **P1:** Validación de `JWT_REFRESH_SECRET` aclarada (ya existe, necesita reforzarse)
3. ✅ **P2:** Nota agregada sobre crear `.github/workflows/` si no existe
4. ✅ **P2:** Nota agregada sobre actualizar `.gitignore` durante implementación

**Tiempo de Corrección Aplicado:** ✅ Completado

**Riesgo de Implementación:** 🟢 **Bajo** - La documentación está lista para implementación sin bloqueadores.

---

**Fin del Reporte de Auditoría**


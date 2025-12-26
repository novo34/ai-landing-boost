# PRD-SEC-0002: Hardening del Flujo de Refresh Tokens

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Prioridad:** P0 (Security)  
**Estado:** Pendiente de Implementación

---

## 1. Problema y Contexto

### 1.1 Hallazgo de Auditoría (H1)
El módulo de autenticación (`apps/api/src/modules/auth/auth.service.ts`, líneas 228-307) presenta vulnerabilidades críticas en el manejo de refresh tokens:

1. **Secreto por defecto:** Acepta refresh tokens firmados con secretos por defecto o fallback inseguro
   ```typescript
   secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production'
   ```

2. **Sin persistencia:** Los refresh tokens no se almacenan en base de datos, solo se generan y verifican como JWT

3. **Sin rotación real:** Aunque se generan nuevos tokens en `refresh()`, el token anterior no se invalida

4. **Sin revocación:** El método `logout()` no invalida tokens, solo limpia cookies en el frontend

### 1.2 Impacto de Seguridad
- **P0 - Crítico:** Tokens robados pueden usarse indefinidamente hasta expiración (7 días por defecto)
- **P0 - Crítico:** No hay forma de revocar tokens comprometidos
- **P1 - Alto:** Secretos por defecto permiten falsificación de tokens si se conoce el secreto
- **P1 - Alto:** Sin rotación, un token robado sigue siendo válido incluso después de refresh

### 1.3 Estado Actual del Código
- **Archivo:** `apps/api/src/modules/auth/auth.service.ts`
- **Método `refresh()`:** Líneas 228-274
- **Método `generateTokens()`:** Líneas 282-308
- **Método `logout()`:** Líneas 276-280 (no hace nada)
- **Schema Prisma:** No existe tabla `refreshtoken`

---

## 2. Objetivos

### 2.1 Objetivos Principales
1. **Hacer obligatorio JWT_REFRESH_SECRET:** Fail fast al boot si no está configurado
2. **Implementar persistencia de refresh tokens:** Crear tabla `refreshtoken` en Prisma
3. **Implementar rotación real:** Invalidar token anterior al generar nuevo
4. **Implementar revocación:** Permitir invalidar tokens en `logout()` y por administración
5. **Agregar auditoría:** Logs de rotación y revocación de tokens

### 2.2 NO-Objetivos
- ❌ Cambiar el formato de JWT (seguir usando JWT estándar)
- ❌ Modificar la expiración de access tokens (15m por defecto)
- ❌ Implementar refresh token rotation automática en cada request (solo en endpoint `/refresh`)
- ❌ Cambiar el flujo de autenticación OAuth (Google/Microsoft)

---

## 3. Usuarios y Actores Afectados

### 3.1 Usuarios Finales
- **Impacto:** Ninguno visible. El flujo de login/refresh/logout funciona igual
- **Mejora:** Mayor seguridad en caso de robo de tokens

### 3.2 Desarrolladores
- **Impacto:** Deben configurar `JWT_REFRESH_SECRET` en todas las instancias
- **Acción requerida:** Actualizar `.env` y documentación de configuración

### 3.3 DevOps/Infraestructura
- **Impacto:** Deben asegurar que `JWT_REFRESH_SECRET` esté configurado en producción
- **Acción requerida:** Agregar variable a secrets management (Vault, AWS Secrets Manager, etc.)

### 3.4 Administradores de Seguridad
- **Impacto:** Pueden revocar tokens de usuarios comprometidos
- **Mejora:** Auditoría de tokens y capacidad de revocación masiva

---

## 4. Requisitos Funcionales (FR)

### FR-001: Validación Obligatoria de JWT_REFRESH_SECRET
**Descripción:** La aplicación debe fallar al iniciar si `JWT_REFRESH_SECRET` no está configurado

**Criterios:**
- Validación en `main.ts` o módulo de configuración al boot
- Error claro indicando que `JWT_REFRESH_SECRET` es obligatorio
- No aceptar fallback a `JWT_SECRET` o valores por defecto

### FR-002: Persistencia de Refresh Tokens
**Descripción:** Todos los refresh tokens deben almacenarse en base de datos

**Criterios:**
- Crear tabla `refreshtoken` en Prisma schema
- Campos: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedByTokenId`, `createdAt`, `updatedAt`
- Indexar por `userId` y `tokenHash` para búsquedas rápidas
- Hash del token antes de almacenar (SHA-256 o similar)

### FR-003: Generación de Refresh Tokens con Persistencia
**Descripción:** Al generar tokens, persistir el refresh token en BD

**Criterios:**
- En `generateTokens()`, después de crear JWT, guardar hash en BD
- Asociar token con `userId` y `tenantId`
- Establecer `expiresAt` según `JWT_REFRESH_EXPIRES_IN` (7d por defecto)

### FR-004: Verificación con Persistencia
**Descripción:** Al verificar refresh token, validar contra BD

**Criterios:**
- En `refresh()`, después de verificar JWT, buscar token en BD por hash
- Verificar que existe, no está revocado (`revokedAt IS NULL`), y no ha expirado
- Si no existe o está revocado, rechazar con `UnauthorizedException`

### FR-005: Rotación Real de Tokens
**Descripción:** Al refrescar, invalidar token anterior y generar nuevo

**Criterios:**
- En `refresh()`, después de validar token anterior:
  1. Marcar token anterior como revocado (`revokedAt = NOW()`)
  2. Generar nuevo par de tokens (access + refresh)
  3. Persistir nuevo refresh token
  4. Asociar nuevo token con anterior (`replacedByTokenId`)
- Retornar nuevos tokens al cliente

### FR-006: Revocación en Logout
**Descripción:** Al hacer logout, revocar todos los refresh tokens del usuario

**Criterios:**
- Modificar `auth.controller.ts` para extraer `refreshToken` de cookies y `userId` del JWT (si está presente)
- En `logout()`, recibir `refreshToken` (opcional, extraído de cookies) y `userId` (opcional, extraído del JWT)
- Si se proporciona token específico, revocar solo ese
- Si se proporciona userId pero no refreshToken, revocar todos los tokens activos del usuario
- Si no se proporciona ninguno, no hacer nada (solo limpiar cookies, comportamiento actual)
- Marcar tokens como revocados (`revokedAt = NOW()`)

### FR-007: Limpieza de Tokens Expirados
**Descripción:** Job periódico para eliminar tokens expirados y revocados antiguos

**Criterios:**
- Job que se ejecute diariamente (usar `@nestjs/schedule`)
- Eliminar tokens donde `expiresAt < NOW()` y `revokedAt IS NOT NULL` (más de 30 días)
- Log de cantidad de tokens eliminados

### FR-008: Auditoría de Tokens
**Descripción:** Logs de eventos importantes relacionados con tokens

**Criterios:**
- Log cuando se genera nuevo refresh token
- Log cuando se rota token (anterior revocado, nuevo generado)
- Log cuando se revoca token (logout o admin)
- Log cuando se rechaza token (no existe, revocado, expirado)

---

## 5. Requisitos No Funcionales (NFR)

### NFR-001: Performance
- **Latencia:** Verificación de token no debe agregar más de 50ms
- **Throughput:** Sistema debe soportar al menos 1000 refresh requests/segundo
- **Índices:** Tabla `refreshtoken` debe tener índices optimizados

### NFR-002: Seguridad
- **Hash:** Tokens deben hashearse antes de almacenar (SHA-256 mínimo)
- **Expiración:** Tokens expirados deben rechazarse inmediatamente
- **Revocación:** Tokens revocados deben rechazarse inmediatamente

### NFR-003: Escalabilidad
- **Limpieza:** Job de limpieza debe ejecutarse sin bloquear operaciones
- **Retención:** Tokens revocados se mantienen 30 días para auditoría, luego se eliminan

### NFR-004: Compatibilidad
- **Backward:** Tokens antiguos (sin persistencia) deben rechazarse gradualmente
- **Migración:** Script para migrar tokens existentes (si aplica) o invalidar todos

---

## 6. Riesgos y Mitigaciones

### R-001: Tokens Antiguos Siguen Válidos
**Riesgo:** Tokens generados antes de la implementación no están en BD y pueden seguir funcionando  
**Mitigación:**
- Implementar periodo de gracia: aceptar tokens antiguos si no están en BD pero JWT es válido
- Después de 7 días (expiración), todos los tokens antiguos expiran naturalmente
- Opcional: invalidar todos los tokens al deployar (forzar re-login)

### R-002: Performance en Verificación
**Riesgo:** Consulta a BD en cada refresh puede ser lenta  
**Mitigación:**
- Usar índices en `tokenHash` y `userId`
- Considerar cache de tokens activos (Redis) si es necesario
- Monitorear latencia y optimizar si excede 50ms

### R-003: Migración de Producción
**Riesgo:** Cambio de esquema puede causar downtime  
**Mitigación:**
- Migración de Prisma debe ser no-destructiva (agregar tabla, no modificar existentes)
- Deploy en horario de bajo tráfico
- Tener rollback plan listo

### R-004: Secretos No Configurados
**Riesgo:** Aplicación no inicia si falta `JWT_REFRESH_SECRET`  
**Mitigación:**
- Validación clara en startup con mensaje de error descriptivo
- Documentación actualizada con instrucciones de configuración
- Checklist de deployment incluye verificar secretos

---

## 7. Telemetría y Observabilidad

### 7.1 Logs Esperados
- **INFO:** "Refresh token generado para usuario {userId}"
- **INFO:** "Refresh token rotado para usuario {userId}, token anterior revocado"
- **INFO:** "Refresh token revocado para usuario {userId}, motivo: {logout|admin|compromised}"
- **WARN:** "Intento de usar refresh token revocado o expirado, tokenHash: {hash}"
- **WARN:** "Refresh token no encontrado en BD, tokenHash: {hash}"
- **ERROR:** "JWT_REFRESH_SECRET no configurado, aplicación no puede iniciar"

### 7.2 Métricas
- **Contador:** `auth.refresh_tokens.generated` (por usuario)
- **Contador:** `auth.refresh_tokens.rotated` (por usuario)
- **Contador:** `auth.refresh_tokens.revoked` (por motivo)
- **Contador:** `auth.refresh_tokens.rejected` (por razón: expirado, revocado, no encontrado)
- **Gauge:** `auth.refresh_tokens.active` (total de tokens activos)

### 7.3 Alertas
- **Crítica:** `JWT_REFRESH_SECRET` no configurado (aplicación no inicia)
- **Alta:** Tasa de rechazo de refresh tokens > 10% (posible ataque)
- **Media:** Job de limpieza falla más de 3 veces consecutivas

---

## 8. Criterios de Aceptación

### CA-001: Validación de Secreto Obligatorio
**Given:** La aplicación inicia sin `JWT_REFRESH_SECRET` configurado  
**When:** Se ejecuta `npm run start:dev` o `npm run start:prod`  
**Then:**
- La aplicación falla al iniciar con error claro
- El mensaje indica: "JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno."
- No se acepta fallback a `JWT_SECRET` o valores por defecto

### CA-002: Persistencia de Refresh Tokens
**Given:** Un usuario hace login  
**When:** Se genera par de tokens (access + refresh)  
**Then:**
- El refresh token se almacena en tabla `refreshtoken` con hash
- El registro incluye: `userId`, `tokenHash`, `expiresAt`, `createdAt`
- El `tokenHash` es SHA-256 del token JWT completo

### CA-003: Verificación con Persistencia
**Given:** Un usuario intenta refrescar su token  
**When:** Se llama al endpoint `/auth/refresh` con refresh token válido  
**Then:**
- Se verifica el JWT (firma y expiración)
- Se busca el token en BD por hash
- Si existe, no está revocado y no ha expirado, se acepta
- Si no existe, está revocado o expirado, se rechaza con 401

### CA-004: Rotación Real
**Given:** Un usuario refresca su token  
**When:** Se genera nuevo par de tokens  
**Then:**
- El token anterior se marca como revocado (`revokedAt = NOW()`)
- Se genera nuevo refresh token y se persiste
- El nuevo token tiene `replacedByTokenId` apuntando al anterior
- El token anterior ya no puede usarse para refresh

### CA-005: Revocación en Logout
**Given:** Un usuario hace logout  
**When:** Se llama al endpoint `/auth/logout`  
**Then:**
- Si se proporciona `refreshToken`, se revoca solo ese token
- Si no se proporciona, se revocan todos los tokens activos del usuario
- Los tokens revocados tienen `revokedAt = NOW()`
- Los tokens revocados no pueden usarse para refresh

### CA-006: Rechazo de Token Robado
**Given:** Un atacante roba un refresh token  
**When:** El usuario legítimo hace logout  
**Then:**
- El token robado se marca como revocado
- Intentos de usar el token robado son rechazados con 401
- El atacante no puede obtener nuevos tokens

### CA-007: Limpieza de Tokens Expirados
**Given:** Existen tokens expirados y revocados antiguos  
**When:** Se ejecuta el job de limpieza diario  
**Then:**
- Se eliminan tokens donde `expiresAt < NOW()` y `revokedAt < NOW() - 30 días`
- Se loguea cantidad de tokens eliminados
- Tokens activos o recientemente revocados no se eliminan

---

## 9. Definición de "Done"

### Checklist de Completitud
- [ ] Validación de `JWT_REFRESH_SECRET` obligatorio implementada
- [ ] Tabla `refreshtoken` creada en Prisma schema
- [ ] Migración de Prisma ejecutada exitosamente
- [ ] `generateTokens()` persiste refresh token en BD
- [ ] `refresh()` verifica token contra BD y rota correctamente
- [ ] `logout()` revoca tokens correctamente
- [ ] Job de limpieza implementado y programado
- [ ] Logs de auditoría implementados
- [ ] Tests unitarios pasando (cobertura > 80%)
- [ ] Tests de integración pasando
- [ ] Tests E2E de flujo completo pasando
- [ ] Documentación actualizada (env vars, migración)
- [ ] Validación en entorno de staging
- [ ] Plan de rollback documentado y probado

---

## 10. Dependencias y Orden de Implementación

### 10.1 Dependencias
- **H3 (PRD-SEC-0001):** Debe completarse primero (unificar gestor de paquetes)
- **Prisma:** Debe estar configurado y funcionando
- **NestJS Schedule:** Debe estar instalado para job de limpieza

### 10.2 Orden de Implementación
1. **H3:** Unificar gestor de paquetes (pnpm)
2. **H1 (este PRD):** Hardening de refresh tokens
3. **H2:** Re-habilitar middleware de seguridad

### 10.3 Bloqueadores
- Ninguno después de H3

---

## 11. Referencias

- **Hallazgo de Auditoría:** H1 (P0)
- **Archivos Afectados:**
  - `apps/api/src/modules/auth/auth.service.ts` - MODIFICAR (generateTokens, refresh, logout)
  - `apps/api/src/modules/auth/auth.controller.ts` - MODIFICAR (logout para extraer refreshToken y userId)
  - `apps/api/prisma/schema.prisma` - AGREGAR modelo `refreshtoken`
  - `apps/api/src/main.ts` - VERIFICAR validación de env vars (ya existe)
  - `apps/api/src/config/env.validation.ts` - REFORZAR validación de `JWT_REFRESH_SECRET` (ya está en required, pero necesita validación estricta)
  - `apps/api/src/common/common.module.ts` o `app.module.ts` - AGREGAR RefreshTokenCleanupJob (ScheduleModule ya existe)

---

## 12. Aprobaciones

- [ ] **Staff Engineer:** _________________ Fecha: _______
- [ ] **Security Lead:** _________________ Fecha: _______
- [ ] **DevOps Lead:** _________________ Fecha: _______

---

**Fin del PRD**


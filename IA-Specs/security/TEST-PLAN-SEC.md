# Plan de Pruebas - Hallazgos de Seguridad

**Versión:** 1.0  
**Fecha:** 2025-12-26  
**Proyecto:** AutomAI SaaS Monorepo

---

## Resumen Ejecutivo

Este plan de pruebas cubre los tres hallazgos de seguridad identificados en la auditoría:
- **H3 (P0):** Múltiples lockfiles en monorepo
- **H1 (P0):** Refresh tokens sin hardening
- **H2 (P1):** Middleware de seguridad deshabilitado

**Estrategia:** Pruebas unitarias, de integración, end-to-end y de seguridad para cada hallazgo.

---

## H3: Múltiples Lockfiles (P0 - Chore)

### Suite de Pruebas: Lockfiles Unification

#### IT-001: Instalación Limpia
**Tipo:** Integración  
**Prioridad:** Alta  
**Descripción:** Verificar que el proyecto se puede instalar desde cero usando solo pnpm

**Precondiciones:**
- Repositorio clonado
- `node_modules` y lockfiles eliminados
- pnpm >= 8.0.0 instalado

**Pasos:**
1. Eliminar `node_modules` y todos los lockfiles
2. Ejecutar `pnpm install`
3. Verificar que no hay errores
4. Verificar que `pnpm-lock.yaml` se genera correctamente
5. Verificar que solo existe `pnpm-lock.yaml` (no otros lockfiles)

**Datos de Prueba:**
- Repositorio limpio (sin `node_modules`)
- Sin lockfiles existentes

**Resultado Esperado:**
- Instalación exitosa sin errores
- Solo `pnpm-lock.yaml` existe en la raíz
- Todas las dependencias instaladas correctamente

**Criterio de Aceptación:** CA-001

---

#### IT-002: CI Check Rechaza Lockfiles No Permitidos
**Tipo:** Integración  
**Prioridad:** Alta  
**Descripción:** Verificar que CI rechaza PRs que introduzcan lockfiles no permitidos

**Precondiciones:**
- CI check implementado
- Repositorio con solo `pnpm-lock.yaml`

**Pasos:**
1. Crear branch de prueba
2. Agregar `package-lock.json` al repositorio
3. Crear PR
4. Verificar que CI check falla
5. Verificar mensaje de error indica usar `pnpm install`

**Datos de Prueba:**
- `package-lock.json` generado con `npm install`
- PR con cambios que incluyen `package-lock.json`

**Resultado Esperado:**
- CI check falla con código de salida != 0
- Mensaje de error claro: "Se detectaron lockfiles no permitidos. Por favor, elimina estos archivos y usa 'pnpm install'"
- PR no puede mergearse hasta corregir

**Criterio de Aceptación:** CA-002

---

#### IT-003: CI Check Acepta Solo pnpm-lock.yaml
**Tipo:** Integración  
**Prioridad:** Alta  
**Descripción:** Verificar que CI acepta PRs con solo pnpm-lock.yaml

**Precondiciones:**
- CI check implementado
- Repositorio con solo `pnpm-lock.yaml`

**Pasos:**
1. Crear branch de prueba
2. Modificar `package.json` (agregar dependencia de prueba)
3. Ejecutar `pnpm install`
4. Commitear solo `pnpm-lock.yaml` (no otros lockfiles)
5. Crear PR
6. Verificar que CI check pasa

**Datos de Prueba:**
- Nueva dependencia: `axios` (ejemplo)
- Solo `pnpm-lock.yaml` modificado

**Resultado Esperado:**
- CI check pasa exitosamente
- PR puede mergearse
- No hay errores de validación

**Criterio de Aceptación:** CA-002

---

#### E2E-001: Flujo Completo de Desarrollo
**Tipo:** End-to-End  
**Prioridad:** Media  
**Descripción:** Verificar que un desarrollador puede trabajar normalmente con pnpm

**Precondiciones:**
- Repositorio clonado
- pnpm instalado

**Pasos:**
1. Clonar repositorio
2. Ejecutar `pnpm install`
3. Verificar que dependencias se instalan
4. Agregar nueva dependencia: `pnpm add axios`
5. Verificar que `pnpm-lock.yaml` se actualiza
6. Commitear cambios (`package.json` y `pnpm-lock.yaml`)
7. Verificar que CI pasa

**Datos de Prueba:**
- Repositorio limpio
- Nueva dependencia: `axios`

**Resultado Esperado:**
- Flujo completo funciona sin problemas
- `pnpm-lock.yaml` se actualiza correctamente
- CI pasa sin errores

**Criterio de Aceptación:** CA-003

---

## H1: Refresh Tokens Sin Hardening (P0 - Security)

### Suite de Pruebas: Refresh Token Hardening

#### UT-001: Validación de JWT_REFRESH_SECRET
**Tipo:** Unitario  
**Prioridad:** Crítica  
**Descripción:** Verificar que la aplicación falla si JWT_REFRESH_SECRET no está configurado

**Precondiciones:**
- Código de validación implementado

**Pasos:**
1. Eliminar `JWT_REFRESH_SECRET` de variables de entorno
2. Intentar iniciar la aplicación
3. Verificar que falla con error claro

**Datos de Prueba:**
- `JWT_REFRESH_SECRET` no definido
- `JWT_REFRESH_SECRET = 'your-secret-key-change-in-production'` (valor por defecto)

**Resultado Esperado:**
- Aplicación no inicia
- Error: "JWT_REFRESH_SECRET es obligatorio. Por favor, configura esta variable de entorno."
- No acepta fallback a `JWT_SECRET` o valores por defecto

**Criterio de Aceptación:** CA-001

---

#### UT-002: Generación de Tokens con Persistencia
**Tipo:** Unitario  
**Prioridad:** Alta  
**Descripción:** Verificar que al generar tokens, el refresh token se persiste en BD

**Precondiciones:**
- Base de datos configurada
- Tabla `refreshtoken` creada
- Usuario de prueba existe

**Pasos:**
1. Ejecutar `generateTokens(userId, email, tenantId)`
2. Obtener refresh token generado
3. Hash del token (SHA-256)
4. Buscar en BD por `tokenHash`
5. Verificar que existe registro

**Datos de Prueba:**
- `userId`: "user-123"
- `email`: "test@example.com"
- `tenantId`: "tenant-456"

**Resultado Esperado:**
- Token generado correctamente
- Registro en BD con `userId`, `tokenHash`, `expiresAt`
- `revokedAt` es NULL (token activo)

**Criterio de Aceptación:** CA-002

---

#### UT-003: Refresh con Rotación
**Tipo:** Unitario  
**Prioridad:** Alta  
**Descripción:** Verificar que al refrescar, el token anterior se invalida y se genera nuevo

**Precondiciones:**
- Token existente en BD
- Usuario de prueba existe

**Pasos:**
1. Obtener refresh token existente
2. Ejecutar `refresh(refreshToken)`
3. Verificar que token anterior está revocado (`revokedAt != NULL`)
4. Verificar que nuevo token está persistido
5. Verificar que nuevo token tiene `replacedByTokenId` apuntando al anterior

**Datos de Prueba:**
- Refresh token válido existente
- Token no revocado ni expirado

**Resultado Esperado:**
- Token anterior marcado como revocado
- Nuevo token generado y persistido
- `replacedByTokenId` del nuevo token apunta al anterior
- Token anterior no puede usarse para refresh

**Criterio de Aceptación:** CA-004

---

#### IT-001: Flujo Completo de Login → Refresh → Logout
**Tipo:** Integración  
**Prioridad:** Crítica  
**Descripción:** Verificar flujo completo de autenticación con persistencia

**Precondiciones:**
- API corriendo
- Base de datos configurada
- Usuario de prueba existe

**Pasos:**
1. **Login:**
   - POST `/auth/login` con credenciales válidas
   - Verificar respuesta contiene `accessToken` y `refreshToken`
   - Verificar token persistido en BD

2. **Refresh:**
   - POST `/auth/refresh` con `refreshToken`
   - Verificar respuesta contiene nuevos tokens
   - Verificar token anterior revocado en BD
   - Verificar nuevo token persistido

3. **Logout:**
   - POST `/auth/logout` con `refreshToken`
   - Verificar respuesta exitosa
   - Verificar token revocado en BD

4. **Intento de Refresh Después de Logout:**
   - POST `/auth/refresh` con token revocado
   - Verificar rechazo con 401

**Datos de Prueba:**
- Usuario: `test@example.com` / `password123`
- Refresh token válido
- Refresh token revocado

**Resultado Esperado:**
- Login genera token persistido
- Refresh rota token correctamente
- Logout revoca token
- Token revocado no funciona

**Criterio de Aceptación:** CA-003, CA-004, CA-005

---

#### IT-002: Rechazo de Token Revocado
**Tipo:** Integración  
**Prioridad:** Alta  
**Descripción:** Verificar que tokens revocados son rechazados

**Precondiciones:**
- Token existente en BD
- Token marcado como revocado

**Pasos:**
1. Obtener refresh token válido
2. Revocar token manualmente en BD (`revokedAt = NOW()`)
3. Intentar refresh con token revocado
4. Verificar rechazo con 401

**Datos de Prueba:**
- Refresh token válido
- Token revocado en BD

**Resultado Esperado:**
- Request rechazado con 401
- `error_key: 'auth.refresh_token_revoked'`
- No se generan nuevos tokens

**Criterio de Aceptación:** CA-003

---

#### SEC-001: Token Robado No Funciona Después de Logout
**Tipo:** Seguridad  
**Prioridad:** Crítica  
**Descripción:** Verificar que un token robado no puede usarse después de logout

**Precondiciones:**
- API corriendo
- Usuario de prueba existe

**Pasos:**
1. **Login legítimo:**
   - POST `/auth/login` con credenciales válidas
   - Guardar `refreshToken` como "token robado"

2. **Logout legítimo:**
   - POST `/auth/logout` con `refreshToken`
   - Verificar logout exitoso

3. **Intento de uso de token robado:**
   - POST `/auth/refresh` con token robado
   - Verificar rechazo con 401

**Datos de Prueba:**
- Usuario: `test@example.com` / `password123`
- Refresh token robado (copiado antes de logout)

**Resultado Esperado:**
- Token robado no funciona después de logout
- Request rechazado con 401
- Atacante no puede obtener nuevos tokens

**Criterio de Aceptación:** CA-006

---

#### PERF-001: Latencia de Verificación
**Tipo:** Performance  
**Prioridad:** Media  
**Descripción:** Verificar que verificación de token no agrega latencia significativa

**Precondiciones:**
- API corriendo
- Token válido en BD

**Pasos:**
1. Ejecutar 100 requests de refresh
2. Medir latencia de cada request
3. Calcular p95 de latencia
4. Verificar que p95 < 50ms

**Datos de Prueba:**
- 100 refresh tokens válidos
- Base de datos con índices optimizados

**Resultado Esperado:**
- p95 de latencia < 50ms
- No hay degradación significativa

**Criterio de Aceptación:** NFR-001

---

## H2: Middleware de Seguridad Deshabilitado (P1 - Security)

### Suite de Pruebas: Middleware Security

#### UT-001: Detección de ngrok
**Tipo:** Unitario  
**Prioridad:** Media  
**Descripción:** Verificar que middleware detecta correctamente hostname de ngrok

**Precondiciones:**
- Middleware restaurado

**Pasos:**
1. Crear request con hostname `abc123.ngrok.io`
2. Ejecutar middleware
3. Verificar que `isNgrok = true`

**Datos de Prueba:**
- Hostname: `abc123.ngrok.io`
- Hostname: `abc123.ngrok-free.app`
- Hostname: `localhost:3000` (no ngrok)

**Resultado Esperado:**
- ngrok detectado correctamente
- Validaciones aplicadas solo para ngrok

---

#### UT-002: Autenticación Básica
**Tipo:** Unitario  
**Prioridad:** Alta  
**Descripción:** Verificar que autenticación básica funciona para ngrok

**Precondiciones:**
- Middleware restaurado
- `NGROK_AUTH_USER` y `NGROK_AUTH_PASS` configurados

**Pasos:**
1. **Sin credenciales:**
   - Request a ngrok sin header `Authorization`
   - Verificar rechazo con 401

2. **Con credenciales incorrectas:**
   - Request con `Authorization: Basic <credenciales_incorrectas>`
   - Verificar rechazo con 401

3. **Con credenciales correctas:**
   - Request con `Authorization: Basic <credenciales_correctas>`
   - Verificar acceso permitido (200)

**Datos de Prueba:**
- `NGROK_AUTH_USER = 'admin'`
- `NGROK_AUTH_PASS = 'password'`
- Credenciales correctas: `admin:password` (Base64: `YWRtaW46cGFzc3dvcmQ=`)
- Credenciales incorrectas: `admin:wrong` (Base64: `YWRtaW46d3Jvbmc=`)

**Resultado Esperado:**
- Sin credenciales → 401 con `WWW-Authenticate`
- Credenciales incorrectas → 401
- Credenciales correctas → 200

**Criterio de Aceptación:** CA-003

---

#### UT-003: Lista Blanca de IPs
**Tipo:** Unitario  
**Prioridad:** Alta  
**Descripción:** Verificar que lista blanca de IPs funciona para ngrok

**Precondiciones:**
- Middleware restaurado
- `NGROK_ALLOWED_IPS` configurado

**Pasos:**
1. **IP no autorizada:**
   - Request desde IP `192.168.1.200`
   - `NGROK_ALLOWED_IPS = '192.168.1.100,10.0.0.50'`
   - Verificar rechazo con 403

2. **IP autorizada:**
   - Request desde IP `192.168.1.100`
   - Verificar acceso permitido (200)

3. **Wildcard (*):**
   - `NGROK_ALLOWED_IPS = '*'`
   - Request desde cualquier IP
   - Verificar acceso permitido (200)

**Datos de Prueba:**
- `NGROK_ALLOWED_IPS = '192.168.1.100,10.0.0.50'`
- `NGROK_ALLOWED_IPS = '*'`
- IPs: `192.168.1.100` (autorizada), `192.168.1.200` (no autorizada)

**Resultado Esperado:**
- IP no autorizada → 403
- IP autorizada → 200
- Wildcard `*` → todas las IPs permitidas

**Criterio de Aceptación:** CA-004

---

#### IT-001: Matcher Excluye Rutas Correctas
**Tipo:** Integración  
**Prioridad:** Alta  
**Descripción:** Verificar que matcher excluye rutas que no deben pasar por middleware

**Precondiciones:**
- Next.js corriendo
- Middleware restaurado

**Pasos:**
1. **Rutas de páginas:**
   - GET `/` → Verificar que middleware se ejecuta (header `X-Environment` presente)

2. **Rutas de API:**
   - GET `/api/health` → Verificar que middleware NO se ejecuta (sin `X-Environment`)

3. **Assets estáticos:**
   - GET `/_next/static/css/app.css` → Verificar que middleware NO se ejecuta

4. **Imágenes optimizadas:**
   - GET `/_next/image?url=...` → Verificar que middleware NO se ejecuta

**Datos de Prueba:**
- Rutas: `/`, `/dashboard`, `/api/health`, `/_next/static/*`, `/_next/image/*`

**Resultado Esperado:**
- Páginas → middleware ejecutado
- API, assets, imágenes → middleware NO ejecutado

**Criterio de Aceptación:** CA-002

---

#### IT-002: Flujo Completo con ngrok
**Tipo:** Integración  
**Prioridad:** Media  
**Descripción:** Verificar flujo completo de acceso vía ngrok con todas las validaciones

**Precondiciones:**
- Next.js corriendo
- ngrok activo
- Variables configuradas

**Pasos:**
1. Configurar `NGROK_AUTH_USER`, `NGROK_AUTH_PASS`, `NGROK_ALLOWED_IPS`
2. Acceder vía ngrok con credenciales correctas y IP autorizada
3. Verificar acceso permitido
4. Verificar headers de seguridad presentes

**Datos de Prueba:**
- URL ngrok: `https://abc123.ngrok.io`
- Credenciales: `admin:password`
- IP autorizada: `192.168.1.100`

**Resultado Esperado:**
- Acceso permitido (200)
- Headers: `X-Environment: development-ngrok`, `X-Security-Warning`

**Criterio de Aceptación:** CA-005

---

#### PERF-001: Latencia del Middleware
**Tipo:** Performance  
**Prioridad:** Media  
**Descripción:** Verificar que middleware no agrega latencia significativa

**Precondiciones:**
- Next.js corriendo
- Middleware restaurado

**Pasos:**
1. Ejecutar 100 requests a página principal
2. Medir latencia de cada request
3. Calcular p95 de latencia
4. Verificar que p95 < 10ms

**Datos de Prueba:**
- 100 requests a `/`
- Middleware con todas las validaciones

**Resultado Esperado:**
- p95 de latencia < 10ms
- No hay degradación significativa en tiempo de carga

**Criterio de Aceptación:** CA-006

---

## Matriz de Ejecución

| Test ID | Prioridad | Tipo | Tiempo Estimado | Automatizable |
|---------|-----------|------|-----------------|--------------|
| IT-001 (H3) | Alta | Integración | 5 min | Sí |
| IT-002 (H3) | Alta | Integración | 10 min | Sí |
| IT-003 (H3) | Alta | Integración | 10 min | Sí |
| E2E-001 (H3) | Media | E2E | 15 min | Parcial |
| UT-001 (H1) | Crítica | Unitario | 5 min | Sí |
| UT-002 (H1) | Alta | Unitario | 10 min | Sí |
| UT-003 (H1) | Alta | Unitario | 10 min | Sí |
| IT-001 (H1) | Crítica | Integración | 15 min | Sí |
| IT-002 (H1) | Alta | Integración | 10 min | Sí |
| SEC-001 (H1) | Crítica | Seguridad | 15 min | Sí |
| PERF-001 (H1) | Media | Performance | 10 min | Sí |
| UT-001 (H2) | Media | Unitario | 5 min | Sí |
| UT-002 (H2) | Alta | Unitario | 10 min | Sí |
| UT-003 (H2) | Alta | Unitario | 10 min | Sí |
| IT-001 (H2) | Alta | Integración | 10 min | Sí |
| IT-002 (H2) | Media | Integración | 15 min | Parcial |
| PERF-001 (H2) | Media | Performance | 10 min | Sí |

**Total:** 17 tests, ~3 horas de ejecución manual, ~2 horas automatizado

---

## Criterios de Éxito

### H3 (Lockfiles)
- ✅ Todos los lockfiles redundantes eliminados
- ✅ CI check funciona correctamente
- ✅ Documentación actualizada

### H1 (Refresh Tokens)
- ✅ Validación de secreto funciona
- ✅ Persistencia de tokens funciona
- ✅ Rotación y revocación funcionan
- ✅ Tokens robados no funcionan después de logout
- ✅ Performance aceptable (< 50ms)

### H2 (Middleware)
- ✅ Middleware restaurado y funcionando
- ✅ Matcher excluye rutas correctas
- ✅ Autenticación básica funciona
- ✅ Lista blanca de IPs funciona
- ✅ Performance aceptable (< 10ms)

---

**Fin del Plan de Pruebas**


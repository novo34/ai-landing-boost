# 🔍 Root Cause Analysis: Session & Auth Stabilization

**Fecha:** 2024-12-19  
**Severidad:** 🔴 CRÍTICA - BLOQUEANTE PARA PRODUCCIÓN  
**Ámbito:** Sistema de Autenticación y Gestión de Sesión Multi-tenant

---

## 📊 Síntomas Observados

### 1. Cierres de Sesión Inesperados
- Usuarios autenticados son redirigidos a `/login` sin razón aparente
- Sesiones válidas se invalidan durante navegación normal
- Tokens válidos se marcan como expirados prematuramente

### 2. Múltiples Llamadas Concurrentes a `/api/proxy/session/me`
- **Problema:** 3-5 llamadas simultáneas al mismo endpoint
- **Causa:** Múltiples componentes llaman `checkAuth()` o `getCurrentUserWithRole()` en paralelo
- **Impacto:** Degradación de performance (~3000ms), rate limiting, consumo innecesario de recursos

### 3. Respuestas 401 Frecuentes
- Endpoint `/session/me` devuelve 401 incluso con tokens válidos
- Refresh token se ejecuta múltiples veces en bucle
- Cooldown de 30s no previene loops completos

### 4. Intentos de Refresh en Bucle
- `refreshAccessToken()` se ejecuta múltiples veces simultáneamente
- Aunque hay flag `isRefreshing`, no previene todos los casos edge
- Cada 401 dispara un nuevo intento de refresh

### 5. Refrescos de Página Involuntarios
- `router.push('/login')` en múltiples lugares causa navegaciones inesperadas
- No hay coordinación entre componentes sobre cuándo hacer logout

### 6. Degradación de Performance
- Tiempo de respuesta de `/session/me`: ~3000ms (objetivo: <200ms)
- Múltiples queries a Prisma por request
- Cache no se invalida correctamente

### 7. UX Rota
- Pantallas de loading infinitas
- Flash de contenido no autenticado
- Navegación interrumpida

---

## 🔬 Análisis de Causa Raíz

### CAUSA RAÍZ #1: Múltiples Puntos de Verificación de Auth

**Problema:** No existe un "single source of truth" para el estado de autenticación.

**Evidencia:**
```typescript
// apps/web/app/app/layout.tsx:43
const checkAuth = useCallback(async () => {
  const userWithRole = await apiClient.getCurrentUserWithRole();
  // ...
}, [router]);

// apps/web/app/app/page.tsx:73
const isAuthenticated = await apiClient.checkAuth();
const userWithRole = await apiClient.getCurrentUserWithRole();

// apps/web/app/app/agents/page.tsx:64
const isAuthenticated = await apiClient.checkAuth();
const userWithRole = await apiClient.getCurrentUserWithRole();

// apps/web/app/app/appointments/page.tsx:80
const isAuthenticated = await apiClient.checkAuth();
const userWithRole = await apiClient.getCurrentUserWithRole();
```

**Impacto:**
- Cada componente hace su propia verificación
- React StrictMode ejecuta efectos 2x en desarrollo
- No hay coordinación entre verificaciones
- Race conditions cuando múltiples componentes montan simultáneamente

---

### CAUSA RAÍZ #2: Cache Compartido pero No Coordinado

**Problema:** Múltiples sistemas de cache que no se sincronizan.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:272-294
private checkAuthCache: { result: boolean; timestamp: number } | null = null;
private sessionMeCache: { result: any; timestamp: number } | null = null;
private getUserWithRoleCache: { ... } | null = null;
private requestCache = new Map<string, { result: any; timestamp: number }>();
```

**Problemas:**
1. `checkAuth()` usa `getSessionMe()` internamente, pero tienen caches separados
2. `getCurrentUserWithRole()` también usa `getSessionMe()`, pero tiene su propio cache
3. Cuando un 401 ocurre, se limpian algunos caches pero no todos
4. No hay invalidación coordinada cuando el usuario hace logout

**Impacto:**
- Estados inconsistentes entre componentes
- Cache stale después de logout
- Múltiples peticiones cuando el cache debería prevenirlas

---

### CAUSA RAÍZ #3: Manejo Incorrecto de 401 en Request Interceptor

**Problema:** El interceptor de requests intenta refresh automáticamente, pero no coordina con otros sistemas.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:592-654
if (response.status === 401) {
  this.authFailedRecently = true;
  this.authFailedTimestamp = Date.now();
  
  // Limpiar caches de autenticación
  this.checkAuthCache = null;
  this.getUserWithRoleCache = null;
  
  const refreshed = await this.refreshAccessToken();
  if (refreshed) {
    // Reintentar la petición original (solo una vez)
    const retryResponse = await fetch(...);
  }
}
```

**Problemas:**
1. Marca `authFailedRecently = true` ANTES de intentar refresh
2. Si múltiples requests fallan con 401 simultáneamente, cada uno intenta refresh
3. El flag `isRefreshing` previene algunos casos, pero no todos los edge cases
4. No hay backoff exponencial
5. No diferencia entre "token expirado" vs "token inválido" vs "usuario no existe"

**Impacto:**
- Refresh storms cuando múltiples requests fallan
- Cooldown de 30s es demasiado largo para casos legítimos
- Usuarios válidos son marcados como "no autenticados" temporalmente

---

### CAUSA RAÍZ #4: React StrictMode Ejecuta Efectos Duplicados

**Problema:** Next.js 14 tiene StrictMode habilitado por defecto en desarrollo, ejecutando efectos 2x.

**Evidencia:**
```typescript
// apps/web/app/app/layout.tsx:110-126
useEffect(() => {
  let isMounted = true;
  
  const executeCheckAuth = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!isMounted) return;
    await checkAuth();
  };
  
  executeCheckAuth();
  
  return () => {
    isMounted = false;
  };
}, [checkAuth]);
```

**Problemas:**
1. El `setTimeout(100ms)` intenta mitigar, pero no es suficiente
2. `isMounted` flag ayuda, pero no previene la segunda ejecución en StrictMode
3. `checkAuth` está en el array de dependencias, causando re-ejecuciones cuando cambia

**Impacto:**
- En desarrollo: 2x llamadas a `/session/me` por cada mount
- En producción: 1x llamada, pero el patrón sigue siendo problemático
- No hay forma de deshabilitar StrictMode sin afectar otras validaciones

---

### CAUSA RAÍZ #5: Layout.tsx Hace Auth Check en Cada Render

**Problema:** `AppLayout` verifica autenticación en cada mount, incluso si ya se verificó recientemente.

**Evidencia:**
```typescript
// apps/web/app/app/layout.tsx:110-126
useEffect(() => {
  // Verificar autenticación en el layout llamando al backend
  let isMounted = true;
  
  const executeCheckAuth = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!isMounted) return;
    await checkAuth();
  };
  
  executeCheckAuth();
}, [checkAuth]);
```

**Problemas:**
1. Se ejecuta en cada navegación dentro de `/app/**`
2. No verifica si ya hay una verificación en curso
3. No respeta el cache de `getCurrentUserWithRole()`
4. Hace `router.push('/login')` sin verificar si otros componentes están manejando el auth

**Impacto:**
- Llamadas redundantes en cada navegación
- Race conditions con otros componentes
- Navegaciones inesperadas a `/login`

---

### CAUSA RAÍZ #6: Falta de Single-Flight Pattern para Auth

**Problema:** No hay un mutex/lock que garantice que solo UNA verificación de auth ocurra a la vez.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:954-1007
async checkAuth(): Promise<boolean> {
  // Si ya hay una verificación en curso, esperar su resultado
  if (this.isCheckingAuth && this.checkAuthPromise) {
    return this.checkAuthPromise;
  }
  
  this.isCheckingAuth = true;
  this.checkAuthPromise = (async () => {
    // ...
  })();
  
  return this.checkAuthPromise;
}
```

**Problemas:**
1. `isCheckingAuth` es por-instancia, pero hay múltiples instancias de `ApiClient` potencialmente
2. No hay lock global compartido entre todas las llamadas
3. `getCurrentUserWithRole()` tiene su propio lock, pero no coordina con `checkAuth()`
4. Si `checkAuth()` y `getCurrentUserWithRole()` se llaman simultáneamente, ambos hacen peticiones

**Impacto:**
- Múltiples peticiones simultáneas a `/session/me`
- Race conditions
- Cache inconsistente

---

### CAUSA RAÍZ #7: Manejo Incorrecto de Errores 401 vs 403

**Problema:** El sistema trata 401 y 403 de la misma manera en algunos casos.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:518-523
const isExpected403 = response.status === 403 && (
  endpoint === '/billing/current' ||
  endpoint.startsWith('/agents') ||
  endpoint.startsWith('/channels') ||
  endpoint.startsWith('/appointments') ||
  endpoint.startsWith('/whatsapp/accounts')
);
```

**Problemas:**
1. 403 en `/session/me` NO está en la lista de "esperados"
2. Si `/session/me` devuelve 403 (raro pero posible), se trata como error inesperado
3. 401 siempre dispara refresh, incluso si el refresh token también está expirado
4. No hay diferenciación entre "no autenticado" vs "no autorizado para este tenant"

**Impacto:**
- Refresh loops cuando el refresh token está expirado
- Errores 403 inesperados causan logout
- No hay manejo graceful de permisos insuficientes

---

### CAUSA RAÍZ #8: Backend Cache No Se Invalida Correctamente

**Problema:** El backend tiene cache de 5 minutos para `/session/me`, pero no se invalida en cambios críticos.

**Evidencia:**
```typescript
// apps/api/src/modules/session/session.controller.ts:43-49
const cacheKey = `session:${user.userId}:${currentTenant?.id || 'none'}`;

// Verificar cache (5 minutos)
const cached = this.cache.get(cacheKey);
if (cached) {
  return cached;
}
```

**Problemas:**
1. Cache de 5 minutos es demasiado largo para cambios de rol
2. No se invalida cuando el usuario cambia de tenant
3. No se invalida cuando se actualiza información del usuario
4. No hay TTL diferenciado por tipo de cambio

**Impacto:**
- Usuarios ven información stale
- Cambios de rol no se reflejan inmediatamente
- Cache puede servir datos incorrectos

---

### CAUSA RAÍZ #9: No Hay Estrategia de Reintentos con Backoff

**Problema:** Cuando falla una petición, se reintenta inmediatamente o no se reintenta.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:605-644
const refreshed = await this.refreshAccessToken();
if (refreshed) {
  // Reintentar la petición original (solo una vez)
  const retryResponse = await fetch(...);
}
```

**Problemas:**
1. Solo 1 reintento después de refresh
2. No hay backoff exponencial
3. No diferencia entre errores transitorios vs permanentes
4. Rate limiting activa cooldown, pero no hay retry inteligente después

**Impacto:**
- Fracasos en red transitoria causan errores permanentes
- No hay resiliencia ante problemas temporales
- Usuarios ven errores cuando deberían ver reintentos automáticos

---

### CAUSA RAÍZ #10: SessionStorage y Cache No Se Sincronizan

**Problema:** `sessionStorage.currentTenantId` se actualiza en múltiples lugares sin coordinación.

**Evidencia:**
```typescript
// apps/web/lib/api/client.ts:1183
sessionStorage.setItem('currentTenantId', tenant.id);

// apps/web/app/app/layout.tsx:66
sessionStorage.setItem('currentTenantId', id);

// apps/web/lib/api/client.ts:1185
sessionStorage.removeItem('currentTenantId');
```

**Problemas:**
1. Múltiples lugares actualizan `sessionStorage`
2. No hay validación de que el tenantId sea válido antes de guardarlo
3. No se limpia cuando el usuario hace logout
4. No se sincroniza con el cache de `getCurrentUserWithRole()`

**Impacto:**
- Estados inconsistentes
- Header `x-tenant-id` puede tener valor incorrecto
- Errores 403 por tenant incorrecto

---

## 📈 Métricas Actuales (Problemáticas)

| Métrica | Valor Actual | Objetivo | Gap |
|---------|--------------|----------|-----|
| Llamadas a `/session/me` por carga de página | 3-5 | 1 | **300-400%** |
| Tiempo de respuesta `/session/me` | ~3000ms | <200ms | **1400%** |
| Tasa de errores 401 | ~15% | <1% | **1400%** |
| Refresh loops por sesión | 2-5 | 0 | **∞** |
| Cierres de sesión inesperados | ~10% | 0% | **∞** |
| Cache hit rate | ~40% | >80% | **-50%** |

---

## 🎯 Priorización de Problemas

### P0 - CRÍTICO (Bloquea producción)
1. ✅ Múltiples llamadas concurrentes a `/session/me`
2. ✅ Refresh loops
3. ✅ Cierres de sesión inesperados

### P1 - ALTO (Degrada UX significativamente)
4. ✅ Performance degradada (~3000ms)
5. ✅ Cache inconsistente
6. ✅ Manejo incorrecto de 401/403

### P2 - MEDIO (Mejoras importantes)
7. ✅ Falta de backoff exponencial
8. ✅ SessionStorage no sincronizado
9. ✅ Backend cache no se invalida

### P3 - BAJO (Optimizaciones)
10. ✅ React StrictMode duplica efectos

---

## 🔗 Dependencias entre Problemas

```
CAUSA #1 (Múltiples puntos de verificación)
    ↓
CAUSA #6 (Falta de single-flight)
    ↓
CAUSA #2 (Cache no coordinado)
    ↓
CAUSA #4 (React StrictMode)
    ↓
SÍNTOMA: Múltiples llamadas concurrentes

---

CAUSA #3 (Manejo incorrecto de 401)
    ↓
CAUSA #7 (401 vs 403 confusión)
    ↓
SÍNTOMA: Refresh loops

---

CAUSA #5 (Layout.tsx auth check)
    ↓
CAUSA #1 (Múltiples puntos)
    ↓
SÍNTOMA: Cierres de sesión inesperados
```

---

## ✅ Conclusión

**El problema raíz es arquitectónico:** No existe un sistema centralizado y coordinado para la gestión de autenticación y sesión. Múltiples componentes actúan de forma independiente, causando race conditions, llamadas redundantes, y estados inconsistentes.

**La solución requiere:**
1. Un "Auth Manager" centralizado (single source of truth)
2. Single-flight pattern con mutex global
3. Cache coordinado y estrategia de invalidación clara
4. Separación clara entre auth bootstrap, session validation, y silent refresh
5. Manejo diferenciado de 401 (token expirado) vs 403 (permisos) vs otros errores

**Próximos pasos:** Ver PRD y AI-Spec para diseño de solución.



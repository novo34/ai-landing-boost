# 🔧 Troubleshooting Guide: Session & Auth Stabilization

**Versión:** 1.0  
**Fecha:** 2024-12-19

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Múltiples Llamadas a `/session/me`

**Síntomas:**
```
[PERF][CLIENT] API.request.GET./session/me ... 73.40ms
[PERF][CLIENT] API.request.GET./session/me ... 75.20ms
[PERF][CLIENT] API.request.GET./session/me ... 78.10ms
```

**Causas posibles:**
1. Componente no migrado, todavía usa `checkAuth()`
2. Múltiples componentes llaman `bootstrap()` simultáneamente
3. React StrictMode ejecuta efectos 2x sin protección

**Diagnóstico:**
```typescript
// Buscar en código:
grep -r "checkAuth\|getCurrentUserWithRole" apps/web/app
```

**Solución:**
1. Migrar componente a usar `AuthManager.getState()`
2. Verificar que solo AppLayout llama `bootstrap()`
3. AuthManager debe manejar duplicados con mutex

**Verificación:**
```typescript
// En DevTools → Network
// Debe haber máximo 1 llamada a /session/me por carga
```

---

### Problema 2: Refresh Loops

**Síntomas:**
```
🔄 Token expirado, intentando refresh...
🔄 Token expirado, intentando refresh...
🔄 Token expirado, intentando refresh...
```

**Causas posibles:**
1. Múltiples requests fallan con 401 simultáneamente
2. Refresh token también está expirado
3. Cooldown no funciona correctamente

**Diagnóstico:**
```typescript
// Verificar logs del backend
// Verificar si refresh token está expirado
// Verificar cooldown de 60 segundos
```

**Solución:**
1. Verificar que `AuthManager.refreshToken()` usa mutex
2. Verificar cooldown de 60 segundos
3. Si refresh token expirado, hacer logout inmediato

**Verificación:**
```typescript
// En logs, debe haber máximo 1 refresh cada 60 segundos
// Si hay más, hay un bug en el cooldown
```

---

### Problema 3: Cierres de Sesión Inesperados

**Síntomas:**
- Usuario autenticado es redirigido a `/login` sin razón
- Sesión válida se invalida durante navegación

**Causas posibles:**
1. Error 403 en `/session/me` causa logout
2. Múltiples componentes redirigen a `/login` simultáneamente
3. Cache stale después de refresh

**Diagnóstico:**
```typescript
// Verificar en Network tab:
// - ¿Hay 403 en /session/me?
// - ¿Hay 401 después de refresh exitoso?
// - ¿Cache se invalida correctamente?
```

**Solución:**
1. 403 NO debe causar logout (solo mostrar error)
2. Solo AppLayout debe redirigir a `/login`
3. Invalidar cache después de refresh

**Verificación:**
```typescript
// En logs, verificar:
// - 0 cierres de sesión por errores 403
// - Logout solo cuando refresh token expirado
```

---

### Problema 4: Performance Degradada

**Síntomas:**
- Tiempo de respuesta `/session/me` >200ms
- Página tarda mucho en cargar

**Causas posibles:**
1. Múltiples llamadas a `/session/me`
2. Cache no se utiliza
3. Backend lento

**Diagnóstico:**
```typescript
// Verificar métricas:
// - Número de llamadas a /session/me
// - Cache hit rate
// - Tiempo de respuesta backend
```

**Solución:**
1. Reducir llamadas a 1 (single-flight)
2. Aumentar cache hit rate >80%
3. Optimizar backend queries

**Verificación:**
```typescript
// Performance API:
const entries = performance.getEntriesByName('/session/me');
console.log('Calls:', entries.length); // Debe ser 1
console.log('Duration:', entries[0]?.duration); // Debe ser <200ms
```

---

### Problema 5: Estado Inconsistente Entre Componentes

**Síntomas:**
- Un componente muestra usuario autenticado, otro no
- Datos diferentes en diferentes componentes

**Causas posibles:**
1. Cache no coordinado
2. Componentes no suscritos a cambios
3. Race conditions

**Diagnóstico:**
```typescript
// En diferentes componentes:
const state1 = authManager.getState();
const state2 = authManager.getState();
console.log('States match:', state1 === state2); // Debe ser true
```

**Solución:**
1. Usar AuthManager como single source of truth
2. Suscribirse a cambios si necesario
3. No usar cache local en componentes

**Verificación:**
```typescript
// Todos los componentes deben usar:
const state = AuthManager.getInstance().getState();
// NO usar cache local
```

---

### Problema 6: React StrictMode Duplica Efectos

**Síntomas:**
- En desarrollo, efectos se ejecutan 2x
- Múltiples llamadas a `/session/me` en desarrollo

**Causas:**
- React StrictMode ejecuta efectos 2x en desarrollo
- AuthManager no maneja duplicados

**Solución:**
- AuthManager debe usar promise cache para bootstrap
- Mutex previene ejecuciones duplicadas

**Verificación:**
```typescript
// En desarrollo con StrictMode:
// Debe haber máximo 1 llamada HTTP, aunque efecto se ejecute 2x
```

---

### Problema 7: Rate Limiting Activo

**Síntomas:**
```
⚠️ Rate limit alcanzado. Cooldown activo por 60s
```

**Causas:**
- Demasiadas llamadas a `/session/me`
- Backend rate limiting activo

**Solución:**
1. Reducir llamadas a 1 (single-flight)
2. Usar cache cuando rate limit activo
3. Esperar cooldown antes de reintentar

**Verificación:**
```typescript
// Verificar que cooldown funciona:
// - No hacer más requests durante cooldown
// - Usar cache si está disponible
```

---

### Problema 8: Token Refresh Falla

**Síntomas:**
```
❌ Refresh falló con status 401
```

**Causas:**
- Refresh token expirado
- Refresh token inválido
- Backend error

**Solución:**
1. Si refresh token expirado → Logout inmediato
2. Si error transitorio → Retry con backoff
3. Verificar logs del backend

**Verificación:**
```typescript
// En logs, verificar:
// - Refresh solo cuando access token expirado
// - Logout cuando refresh token expirado
```

---

## 🔍 Comandos de Diagnóstico

### Verificar Llamadas a `/session/me`

```typescript
// En DevTools Console:
const entries = performance.getEntriesByType('resource')
  .filter(e => e.name.includes('/session/me'));
console.log('Calls to /session/me:', entries.length);
console.log('Durations:', entries.map(e => e.duration));
```

### Verificar Estado de Auth

```typescript
// En DevTools Console:
const authManager = AuthManager.getInstance();
const state = authManager.getState();
console.log('Auth State:', {
  isAuthenticated: state.isAuthenticated,
  hasUser: !!state.user,
  hasTenant: !!state.tenant,
  lastChecked: new Date(state.lastChecked),
  expiresAt: new Date(state.expiresAt),
});
```

### Verificar Cache

```typescript
// En DevTools Console:
const authManager = AuthManager.getInstance();
const cache = authManager.getCache();
console.log('Cache:', cache);
```

### Verificar Mutex

```typescript
// En DevTools Console:
// Verificar que mutex funciona:
// - Solo 1 request activo a la vez
// - Otros esperan en queue
```

---

## 📊 Métricas de Salud

### Métricas Normales

| Métrica | Valor Normal | Acción si Anormal |
|---------|--------------|-------------------|
| Llamadas `/session/me` por carga | 1 | Revisar componentes no migrados |
| Tiempo respuesta P95 | <200ms | Optimizar backend |
| Cache hit rate | >80% | Revisar TTL o invalidación |
| Refresh loops | 0 | Revisar cooldown |
| Errores 401 | <1% | Revisar refresh logic |
| Errores 403 | <2% | Normal (permisos) |

### Alertas

Configurar alertas para:
- Llamadas `/session/me` >1 por carga
- Tiempo respuesta P95 >200ms
- Refresh loops >0
- Errores 401 >5%
- Cache hit rate <70%

---

## 🐛 Debug Mode

### Habilitar Debug Logs

```typescript
// En .env.local:
NEXT_PUBLIC_DEBUG_API=true
```

### Logs Esperados

**Bootstrap:**
```
[AuthManager] Bootstrap start
[AuthManager] Cache check: miss
[AuthManager] Acquiring mutex
[AuthManager] HTTP request: GET /session/me
[AuthManager] Response: 200 OK
[AuthManager] Cache updated
[AuthManager] Subscribers notified: 3
[AuthManager] Bootstrap complete: 150ms
```

**Refresh:**
```
[AuthManager] Refresh start
[AuthManager] Cooldown check: OK
[AuthManager] Mutex check: available
[AuthManager] HTTP request: POST /auth/refresh
[AuthManager] Response: 200 OK
[AuthManager] Cache invalidated
[AuthManager] Refresh complete: 80ms
```

---

## 🔧 Fixes Rápidos

### Fix 1: Limpiar Cache Manualmente

```typescript
// En DevTools Console:
const authManager = AuthManager.getInstance();
authManager.invalidateCache();
// Recargar página
```

### Fix 2: Forzar Bootstrap

```typescript
// En DevTools Console:
const authManager = AuthManager.getInstance();
authManager.invalidateCache();
authManager.bootstrap().then(state => {
  console.log('New state:', state);
});
```

### Fix 3: Verificar Suscripciones

```typescript
// En DevTools Console:
// Verificar que suscripciones se limpian correctamente
// No debe haber memory leaks
```

---

## 📞 Escalación

Si el problema persiste después de seguir esta guía:

1. **Recopilar información:**
   - Logs del frontend (console)
   - Logs del backend
   - Network tab (requests/responses)
   - Estado de AuthManager

2. **Documentar:**
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots/logs

3. **Revisar:**
   - Root Cause Analysis
   - AI-Spec
   - Código implementado

---

**Última actualización:** 2024-12-19



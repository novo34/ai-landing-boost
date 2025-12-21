# 🛠️ Recomendaciones de Implementación: Session & Auth Stabilization

**Versión:** 1.0  
**Fecha:** 2024-12-19  
**Autor:** Arquitecto Senior SaaS

---

## 📋 Resumen Ejecutivo

Este documento proporciona recomendaciones específicas de implementación para estabilizar el sistema de autenticación y sesión. **NO implementar código aún** - este es un plan de acción detallado.

**Prioridad:** 🔴 CRÍTICA - BLOQUEANTE PARA PRODUCCIÓN

---

## 🎯 Objetivos de Implementación

1. **Eliminar múltiples llamadas concurrentes** a `/session/me`
2. **Eliminar refresh loops**
3. **Eliminar cierres de sesión inesperados**
4. **Mejorar performance** de ~3000ms a <200ms
5. **Garantizar estado consistente** en toda la aplicación

---

## 📁 Estructura de Archivos a Crear/Modificar

### ✨ Archivos NUEVOS a Crear

```
apps/web/lib/auth/
├── auth-manager.ts          # Singleton AuthManager (CORE)
├── mutex.ts                 # Mutex implementation
├── types.ts                 # TypeScript types/interfaces
├── metrics.ts               # Métricas y observabilidad (opcional)
└── index.ts                 # Public exports
```

### 🔧 Archivos a MODIFICAR

```
apps/web/
├── lib/api/client.ts                    # Refactorizar (eliminar checkAuth, mejorar interceptor)
├── app/app/layout.tsx                   # Simplificar (usar AuthManager)
├── app/app/page.tsx                     # Migrar (usar AuthManager)
├── app/app/agents/page.tsx              # Migrar (usar AuthManager)
├── app/app/appointments/page.tsx       # Migrar (usar AuthManager)
├── app/app/settings/**/page.tsx         # Migrar todos (usar AuthManager)
└── components/billing/subscription-warning-banner.tsx  # Migrar (usar AuthManager)

apps/api/src/modules/session/
└── session.controller.ts                # Optimizar cache, agregar invalidación
```

### ❌ Archivos a ELIMINAR (después de migración completa)

```
apps/web/lib/api/client.ts
├── checkAuth() method                   # Eliminar después de migración
├── getCurrentUserWithRole() method      # Eliminar después de migración
└── getSessionMe() method                # Hacer privado o eliminar
```

---

## 🔨 Implementación Paso a Paso

### FASE 1: Crear AuthManager Core (2 días)

#### Paso 1.1: Crear estructura base

**Archivo:** `apps/web/lib/auth/types.ts`

```typescript
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tenant: Tenant | null;
  platformRole: PlatformRole | null;
  lastChecked: number;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  locale?: string;
  timeZone?: string;
  emailVerified?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  status: string;
  role: string;
}

export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'PLATFORM_SUPPORT' | null;
```

**Acción:** Crear archivo con tipos TypeScript.

---

#### Paso 1.2: Implementar Mutex

**Archivo:** `apps/web/lib/auth/mutex.ts`

**Implementación:**
- Queue de funciones pendientes
- Flag `locked` para controlar acceso
- Método `run<T>(fn: () => Promise<T>): Promise<T>`
- Timeout opcional (default: 30s)

**Testing:**
- Test: Múltiples llamadas simultáneas deben ejecutarse secuencialmente
- Test: Timeout funciona correctamente
- Test: No hay deadlocks

**Acción:** Implementar Mutex class con tests.

---

#### Paso 1.3: Implementar AuthManager Singleton

**Archivo:** `apps/web/lib/auth/auth-manager.ts`

**Funcionalidades Core:**
1. **Singleton pattern**
   - `private static instance: AuthManager`
   - `static getInstance(): AuthManager`

2. **Estado reactivo**
   - `private state: AuthState`
   - `getState(): AuthState`
   - `subscribe(callback): () => void` (unsubscribe)

3. **Cache en memoria**
   - `private cache: AuthState | null`
   - `private cacheTTL = 5 * 60 * 1000` (5 minutos)
   - `invalidateCache(): void`

4. **Mutex para single-flight**
   - `private mutex = new Mutex()`
   - Todas las operaciones usan mutex

5. **Métodos públicos:**
   - `bootstrap(): Promise<AuthState>` - Bootstrap inicial
   - `validate(): Promise<AuthState>` - Validación periódica
   - `refreshToken(): Promise<boolean>` - Refresh con anti-loop
   - `logout(): Promise<void>` - Logout coordinado

**Implementación de `bootstrap()`:**
```typescript
async bootstrap(): Promise<AuthState> {
  // 1. Verificar cache
  if (this.cache && Date.now() < this.cache.expiresAt) {
    return this.cache;
  }
  
  // 2. Single-flight con mutex
  return this.mutex.run(async () => {
    // 3. Doble verificación después de adquirir lock
    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache;
    }
    
    // 4. Llamada HTTP
    const response = await apiClient.get('/session/me');
    
    // 5. Procesar respuesta y actualizar estado
    const state = this.processResponse(response);
    this.cache = state;
    this.notifySubscribers(state);
    
    return state;
  });
}
```

**Implementación de `refreshToken()`:**
```typescript
async refreshToken(): Promise<boolean> {
  // 1. Verificar cooldown (60 segundos)
  const now = Date.now();
  if (now - this.lastRefreshAttempt < 60000) {
    return false;
  }
  
  // 2. Verificar si ya hay refresh activo
  if (this.isRefreshing && this.refreshPromise) {
    return this.refreshPromise;
  }
  
  // 3. Iniciar refresh
  this.isRefreshing = true;
  this.lastRefreshAttempt = now;
  this.refreshPromise = (async () => {
    try {
      const response = await fetch('/api/proxy/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        this.invalidateCache();
        return true;
      } else {
        await this.logout();
        return false;
      }
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  })();
  
  return this.refreshPromise;
}
```

**Testing:**
- Test: Singleton funciona correctamente
- Test: Bootstrap hace solo 1 llamada HTTP aunque se llame múltiples veces
- Test: Refresh previene loops
- Test: Subscribers reciben notificaciones
- Test: Cache se invalida correctamente

**Acción:** Implementar AuthManager completo con tests.

---

### FASE 2: Refactorizar ApiClient (2 días)

#### Paso 2.1: Eliminar métodos duplicados

**Archivo:** `apps/web/lib/api/client.ts`

**Eliminar:**
- ❌ `checkAuth(): Promise<boolean>` - Usar `AuthManager.getState()`
- ❌ `getCurrentUserWithRole(): Promise<...>` - Usar `AuthManager.getState()`
- ❌ `getSessionMe(): Promise<...>` - Hacer privado o eliminar

**Mantener (temporalmente para compatibilidad):**
- ⚠️ Métodos marcados como `@deprecated` con warnings
- ⚠️ Redirigir a AuthManager internamente

**Acción:** Marcar métodos como deprecated, agregar warnings en console.

---

#### Paso 2.2: Mejorar Request Interceptor

**Archivo:** `apps/web/lib/api/client.ts`

**Cambios en `request()` method:**

1. **Manejo diferenciado de 401:**
```typescript
if (response.status === 401) {
  const authManager = AuthManager.getInstance();
  const refreshed = await authManager.refreshToken();
  
  if (refreshed) {
    // Retry request original (1 vez)
    const retryResponse = await fetch(...);
    if (retryResponse.ok) {
      return await retryResponse.json();
    }
  }
  
  // Refresh falló → Logout
  await authManager.logout();
  return { success: false, error_key: 'auth.unauthorized' };
}
```

2. **Manejo diferenciado de 403:**
```typescript
if (response.status === 403) {
  // NO hacer logout, solo retornar error
  const errorData = await response.json();
  return {
    success: false,
    error_key: errorData.error_key || 'auth.insufficient_permissions',
  };
}
```

3. **Manejo mejorado de 429:**
```typescript
if (response.status === 429) {
  this.rateLimitActive = true;
  const retryAfter = response.headers.get('Retry-After');
  this.rateLimitUntil = Date.now() + (
    retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000
  );
  
  // Intentar usar cache
  const cached = this.requestCache.get(cacheKey);
  if (cached) {
    return cached.result;
  }
  
  return { success: false, error_key: 'errors.rate_limit_exceeded' };
}
```

4. **Backoff exponencial para errores transitorios:**
```typescript
private async requestWithRetry<T>(
  endpoint: string,
  options: RequestInit,
  maxRetries = 3
): Promise<ApiResponse<T>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      if (attempt < maxRetries && this.isTransientError(error)) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }
}
```

**Testing:**
- Test: 401 dispara refresh correctamente
- Test: 403 NO causa logout
- Test: 429 activa cooldown y usa cache
- Test: Backoff funciona para errores transitorios

**Acción:** Refactorizar `request()` method con manejo mejorado de errores.

---

### FASE 3: Migrar Layout.tsx (1 día)

#### Paso 3.1: Simplificar AppLayout

**Archivo:** `apps/web/app/app/layout.tsx`

**Eliminar:**
- ❌ `checkAuth` callback
- ❌ `executeCheckAuth` con setTimeout
- ❌ Lógica manual de redirección
- ❌ Manejo manual de tenantId

**Agregar:**
- ✅ Import de `AuthManager`
- ✅ `useState` para `authState`
- ✅ `useEffect` para bootstrap (1 vez)
- ✅ Suscripción a eventos de auth
- ✅ Validación periódica (cada 5 min)

**Código nuevo:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthManager } from '@/lib/auth/auth-manager';
import type { AuthState } from '@/lib/auth/auth-manager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  
  useEffect(() => {
    const authManager = AuthManager.getInstance();
    
    // Bootstrap: solo una vez al mount
    authManager.bootstrap().then(state => {
      setAuthState(state);
      setIsBootstrapping(false);
      
      if (!state.isAuthenticated) {
        router.push('/login');
        return;
      }
      
      if (state.platformRole) {
        router.push('/platform');
        return;
      }
    });
    
    // Suscribirse a cambios
    const unsubscribe = authManager.subscribe(state => {
      setAuthState(state);
      if (!state.isAuthenticated) {
        router.push('/login');
      }
    });
    
    // Validación periódica (cada 5 minutos)
    const interval = setInterval(() => {
      authManager.validate().catch(console.error);
    }, 5 * 60 * 1000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [router]);
  
  if (isBootstrapping) {
    return <LoadingScreen />;
  }
  
  if (!authState?.isAuthenticated) {
    return null; // Redirigiendo
  }
  
  // ... resto del layout usando authState.user y authState.tenant ...
}
```

**Testing:**
- Test: Bootstrap se ejecuta solo 1 vez
- Test: Redirección funciona correctamente
- Test: Validación periódica no bloquea UI
- Test: Suscripción funciona correctamente

**Acción:** Refactorizar AppLayout completamente.

---

### FASE 4: Migrar Componentes (3 días)

#### Paso 4.1: Patrón de Migración

**Para cada componente que usa `checkAuth()` o `getCurrentUserWithRole()`:**

**ANTES:**
```typescript
useEffect(() => {
  const loadData = async () => {
    const isAuthenticated = await apiClient.checkAuth();
    if (!isAuthenticated) return;
    
    const userWithRole = await apiClient.getCurrentUserWithRole();
    if (!userWithRole?.tenant?.id) return;
    
    // ... usar userWithRole ...
  };
  
  loadData();
}, []);
```

**DESPUÉS:**
```typescript
useEffect(() => {
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  if (!state.isAuthenticated || !state.tenant) {
    return;
  }
  
  const loadData = async () => {
    // ... usar state.user, state.tenant directamente ...
  };
  
  loadData();
  
  // Opcional: suscribirse a cambios
  const unsubscribe = authManager.subscribe(newState => {
    if (newState.isAuthenticated && newState.tenant) {
      loadData();
    }
  });
  
  return unsubscribe;
}, []);
```

#### Paso 4.2: Componentes a Migrar (en orden de prioridad)

1. **`app/app/page.tsx`** (Dashboard)
   - Eliminar: `checkAuth()`, `getCurrentUserWithRole()`
   - Usar: `AuthManager.getState()`
   - Testing: Verificar que carga datos correctamente

2. **`app/app/agents/page.tsx`**
   - Eliminar: `checkAuth()`, `getCurrentUserWithRole()`
   - Usar: `AuthManager.getState()`
   - Testing: Verificar que lista agentes correctamente

3. **`app/app/appointments/page.tsx`**
   - Eliminar: `checkAuth()`, `getCurrentUserWithRole()`
   - Usar: `AuthManager.getState()`
   - Testing: Verificar que lista citas correctamente

4. **`app/app/settings/**/page.tsx`** (todos)
   - Eliminar: `checkAuth()`, `getCurrentUserWithRole()`
   - Usar: `AuthManager.getState()`
   - Testing: Verificar que cada página funciona

5. **`components/billing/subscription-warning-banner.tsx`**
   - Eliminar: `getCurrentSubscription()` si usa auth check
   - Usar: `AuthManager.getState()` para verificar rol
   - Testing: Verificar que banner se muestra correctamente

**Acción:** Migrar cada componente uno por uno, testing después de cada migración.

---

### FASE 5: Optimizar Backend (1 día)

#### Paso 5.1: Optimizar SessionController

**Archivo:** `apps/api/src/modules/session/session.controller.ts`

**Cambios:**
1. **Cache con TTL diferenciado:**
```typescript
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
private readonly SHORT_CACHE_TTL = 30 * 1000; // 30 segundos

// Usar TTL corto para usuarios con cambios recientes
const ttl = this.shouldUseShortCache(dbUser) 
  ? this.SHORT_CACHE_TTL 
  : this.CACHE_TTL;
this.cache.set(cacheKey, result, ttl);
```

2. **Agregar header de cache:**
```typescript
// En la respuesta, agregar header para indicar si es cache
if (cached) {
  return {
    ...cached,
    _fromCache: true, // Para debugging
  };
}
```

3. **Invalidación coordinada:**
```typescript
@Post('invalidate')
@UseGuards(JwtAuthGuard)
async invalidateCache(@CurrentUser() user: AuthenticatedUser) {
  const patterns = [
    `session:${user.userId}:*`,
    `user:${user.userId}:*`,
  ];
  
  patterns.forEach(pattern => {
    this.cache.deletePattern(pattern);
  });
  
  return { success: true };
}
```

**Testing:**
- Test: Cache funciona correctamente
- Test: Invalidación funciona
- Test: TTL diferenciado funciona

**Acción:** Optimizar SessionController con cache mejorado.

---

### FASE 6: Testing y Validación (2 días)

#### Paso 6.1: Unit Tests

**Cobertura objetivo: >90%**

- ✅ AuthManager: Singleton, bootstrap, refresh, logout
- ✅ Mutex: Single-flight, queue, timeout
- ✅ ApiClient: Manejo de errores, backoff
- ✅ Componentes: Migración correcta

**Acción:** Escribir y ejecutar todos los unit tests.

---

#### Paso 6.2: Integration Tests

**Scenarios:**
- ✅ Bootstrap funciona correctamente
- ✅ 401 dispara refresh correctamente
- ✅ 403 NO causa logout
- ✅ Múltiples componentes no causan llamadas duplicadas
- ✅ Cache funciona correctamente

**Acción:** Escribir y ejecutar integration tests.

---

#### Paso 6.3: E2E Tests

**Scenarios:**
- ✅ Login → Dashboard funciona
- ✅ Navegación entre páginas mantiene sesión
- ✅ Solo 1 llamada a `/session/me` por carga
- ✅ Logout funciona correctamente
- ✅ Refresh funciona correctamente

**Acción:** Escribir y ejecutar E2E tests.

---

#### Paso 6.4: Performance Testing

**Métricas a validar:**
- ✅ Tiempo de respuesta `/session/me` <200ms (P95)
- ✅ Solo 1 llamada a `/session/me` por carga
- ✅ Cache hit rate >80%
- ✅ 0 refresh loops en logs

**Acción:** Ejecutar performance tests y validar métricas.

---

### FASE 7: Cleanup y Documentación (1 día)

#### Paso 7.1: Eliminar Código No Usado

**Archivos:**
- Eliminar métodos deprecated de ApiClient
- Eliminar código comentado
- Limpiar imports no usados

**Acción:** Limpiar código no usado.

---

#### Paso 7.2: Actualizar Documentación

**Documentos a actualizar:**
- README.md: Agregar sección de AuthManager
- CHANGELOG.md: Documentar cambios
- Comentarios en código: Actualizar JSDoc

**Acción:** Actualizar toda la documentación.

---

## ⚠️ Advertencias y Consideraciones

### ⚠️ NO Hacer en Layout.tsx

1. ❌ **NO hacer `checkAuth()` en cada render**
   - Usar `AuthManager.bootstrap()` solo una vez

2. ❌ **NO hacer `router.push('/login')` sin verificar estado**
   - Verificar `authState.isAuthenticated` primero

3. ❌ **NO hacer múltiples llamadas a `getCurrentUserWithRole()`**
   - Usar `AuthManager.getState()` que es síncrono

4. ❌ **NO hacer setTimeout para "evitar race conditions"**
   - Usar mutex en AuthManager

5. ❌ **NO hacer lógica de auth en componentes hijos**
   - AuthManager es el single source of truth

---

### ⚠️ NO Hacer en Componentes

1. ❌ **NO llamar `checkAuth()` directamente**
   - Usar `AuthManager.getState()`

2. ❌ **NO llamar `getCurrentUserWithRole()` directamente**
   - Usar `AuthManager.getState()`

3. ❌ **NO hacer suscripciones múltiples sin cleanup**
   - Siempre retornar `unsubscribe()` en useEffect

4. ❌ **NO hacer requests antes de verificar auth**
   - Verificar `authState.isAuthenticated` primero

---

### ⚠️ NO Hacer en ApiClient

1. ❌ **NO hacer refresh múltiples veces**
   - AuthManager maneja refresh con mutex

2. ❌ **NO hacer logout en 403**
   - 403 es permisos, no autenticación

3. ❌ **NO hacer retry infinito**
   - Máximo 3 intentos con backoff exponencial

4. ❌ **NO limpiar cache sin coordinación**
   - AuthManager maneja invalidación

---

## ✅ Checklist Final de Validación

Antes de considerar la implementación completa:

### Funcionalidad
- [ ] Solo 1 llamada a `/session/me` por carga de página
- [ ] 0 refresh loops en logs durante 1 semana
- [ ] 0 cierres de sesión inesperados
- [ ] Estado consistente en toda la app
- [ ] Logout funciona correctamente

### Performance
- [ ] Tiempo de respuesta `/session/me` <200ms (P95)
- [ ] Cache hit rate >80%
- [ ] Tiempo de auth bootstrap <1000ms

### Testing
- [ ] Unit tests: >90% cobertura
- [ ] Integration tests: Todos pasan
- [ ] E2E tests: Todos pasan
- [ ] Performance tests: Métricas cumplidas

### Código
- [ ] Code review completado
- [ ] No hay código deprecated
- [ ] Documentación actualizada
- [ ] Logs estructurados implementados

---

## 🚀 Orden de Implementación Recomendado

1. **Día 1-2:** Fase 1 (AuthManager Core)
2. **Día 3-4:** Fase 2 (Refactorizar ApiClient)
3. **Día 5:** Fase 3 (Migrar Layout)
4. **Día 6-8:** Fase 4 (Migrar Componentes - 1 por día)
5. **Día 9:** Fase 5 (Optimizar Backend)
6. **Día 10-11:** Fase 6 (Testing)
7. **Día 12:** Fase 7 (Cleanup)

**Total: ~12 días hábiles (~2.5 semanas)**

---

## 📊 Métricas Post-Implementación

Después de implementar, validar:

| Métrica | Antes | Objetivo | Validar |
|---------|-------|----------|---------|
| Llamadas `/session/me` por carga | 3-5 | 1 | ✅ |
| Tiempo de respuesta P95 | ~3000ms | <200ms | ✅ |
| Tasa de errores 401 | ~15% | <1% | ✅ |
| Refresh loops por sesión | 2-5 | 0 | ✅ |
| Cache hit rate | ~40% | >80% | ✅ |
| Cierres de sesión inesperados | ~10% | 0% | ✅ |

---

## 🔗 Referencias

- **Root Cause Analysis:** `docs/AUDIT/SESSION-AUTH-ROOT-CAUSE-ANALYSIS.md`
- **PRD:** `docs/PRD/PRD-SESSION-AUTH-STABILIZATION.md`
- **AI-Spec:** `docs/SPEC/AI-SPEC-SESSION-AUTH-STABILIZATION.md`

---

**Próximo paso:** Revisar y aprobar PRD y AI-Spec antes de comenzar implementación.



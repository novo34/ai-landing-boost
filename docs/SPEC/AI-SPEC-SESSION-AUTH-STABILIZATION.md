# 🧠 AI-Spec: Session & Auth Stabilization

**Versión:** 1.0  
**Fecha:** 2024-12-19  
**Autor:** Arquitecto Senior SaaS  
**Estado:** 🟡 EN DISEÑO

---

## 1. Arquitectura Propuesta

### 1.1 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           AuthManager (Singleton)                      │  │
│  │  - Single source of truth                              │  │
│  │  - Mutex global (single-flight)                        │  │
│  │  - Cache coordinado                                    │  │
│  │  - Event emitter (state changes)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         ApiClient (Refactorizado)                     │  │
│  │  - Request interceptor mejorado                       │  │
│  │  - Manejo diferenciado 401/403/429                    │  │
│  │  - Backoff exponencial                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                     │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Components (Simplificados)                    │  │
│  │  - Usan AuthManager.getAuthState()                    │  │
│  │  - NO hacen checkAuth() directamente                  │  │
│  │  - Suscritos a eventos de auth                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (cookies HttpOnly)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROXY (Next.js API)                       │
├─────────────────────────────────────────────────────────────┤
│  - Preserva headers (x-tenant-id)                            │
│  - No lógica de auth (solo forwarding)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐     │
│  │         SessionController                          │     │
│  │  - Cache optimizado (5 min TTL)                   │     │
│  │  - Invalidación coordinada                        │     │
│  └──────────────────────────────────────────────────────┘     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │         AuthController (Refresh)                    │     │
│  │  - Refresh token endpoint                           │     │
│  │  - Rate limiting específico                         │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Flujo de Autenticación Propuesto

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTH BOOTSTRAP (1 vez)                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  App Mount      │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  AuthManager.bootstrap()     │
              │  - Verifica cache L1         │
              │  - Si no hay cache:          │
              │    → Single-flight call      │
              │    → GET /session/me         │
              │  - Guarda en cache L1        │
              │  - Emite evento 'auth:ready' │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Componentes suscritos       │
              │  reciben estado de auth       │
              └──────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              SESSION VALIDATION (cada 5 min)                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │  Timer (setInterval 5 min)    │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  AuthManager.validate()      │
              │  - Verifica cache TTL         │
              │  - Si expirado:               │
              │    → Single-flight call      │
              │    → GET /session/me          │
              │  - Silencioso (no bloquea UI) │
              └──────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              SILENT REFRESH (cuando necesario)              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌──────────────────────────────┐
              │  Request interceptor         │
              │  detecta 401                 │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  AuthManager.refreshToken()  │
              │  - Verifica mutex            │
              │  - Si no hay refresh activo: │
              │    → POST /auth/refresh      │
              │    → Actualiza cookies       │
              │    → Invalida cache          │
              │  - Si hay refresh activo:     │
              │    → Espera resultado         │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Retry request original       │
              │  (1 vez)                      │
              └──────────────────────────────┘
```

---

## 2. Componentes Técnicos

### 2.1 AuthManager (Singleton)

**Ubicación:** `apps/web/lib/auth/auth-manager.ts`

**Responsabilidades:**
- Single source of truth para estado de auth
- Mutex global para single-flight
- Cache coordinado
- Event emitter para notificaciones
- Coordinación de refresh

**Interfaz:**
```typescript
class AuthManager {
  // Singleton
  private static instance: AuthManager;
  static getInstance(): AuthManager;
  
  // Estado
  private state: AuthState;
  getState(): AuthState;
  subscribe(callback: (state: AuthState) => void): () => void;
  
  // Operaciones
  bootstrap(): Promise<AuthState>;
  validate(): Promise<AuthState>;
  refreshToken(): Promise<boolean>;
  logout(): Promise<void>;
  
  // Cache
  invalidateCache(): void;
  getCache(): AuthState | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tenant: Tenant | null;
  platformRole: PlatformRole | null;
  lastChecked: number;
  expiresAt: number;
}
```

**Implementación Clave:**

```typescript
class AuthManager {
  private mutex = new Mutex();
  private cache: AuthState | null = null;
  private cacheTTL = 5 * 60 * 1000; // 5 minutos
  private subscribers = new Set<(state: AuthState) => void>();
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private lastRefreshAttempt = 0;
  private readonly REFRESH_COOLDOWN = 60 * 1000; // 60 segundos
  
  async bootstrap(): Promise<AuthState> {
    // Verificar cache primero
    if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
      return this.cache;
    }
    
    // Single-flight: solo una llamada a la vez
    return this.mutex.run(async () => {
      // Doble verificación después de adquirir lock
      if (this.cache && Date.now() - this.cache.lastChecked < this.cacheTTL) {
        return this.cache;
      }
      
      // Llamada HTTP
      const response = await apiClient.get('/session/me');
      
      if (response.success && response.data) {
        const state: AuthState = {
          isAuthenticated: true,
          user: response.data.user,
          tenant: response.data.currentTenant,
          platformRole: response.data.platformRole,
          lastChecked: Date.now(),
          expiresAt: Date.now() + this.cacheTTL,
        };
        
        this.cache = state;
        this.notifySubscribers(state);
        return state;
      } else {
        const state: AuthState = {
          isAuthenticated: false,
          user: null,
          tenant: null,
          platformRole: null,
          lastChecked: Date.now(),
          expiresAt: Date.now(),
        };
        
        this.cache = state;
        this.notifySubscribers(state);
        return state;
      }
    });
  }
  
  async refreshToken(): Promise<boolean> {
    // Prevenir refresh loops
    const now = Date.now();
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }
    
    if (now - this.lastRefreshAttempt < this.REFRESH_COOLDOWN) {
      console.warn('[AuthManager] Refresh en cooldown, esperando...');
      return false;
    }
    
    this.isRefreshing = true;
    this.lastRefreshAttempt = now;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch('/api/proxy/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          // Invalidar cache para forzar nueva verificación
          this.invalidateCache();
          return true;
        } else {
          // Refresh falló, hacer logout
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
  
  private notifySubscribers(state: AuthState): void {
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[AuthManager] Error en subscriber:', error);
      }
    });
  }
}
```

**Mutex Implementation:**

```typescript
class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;
  
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.locked = false;
          const next = this.queue.shift();
          if (next) next();
        }
      });
      
      if (!this.locked) {
        this.locked = true;
        const next = this.queue.shift();
        if (next) next();
      }
    });
  }
}
```

---

### 2.2 ApiClient Refactorizado

**Ubicación:** `apps/web/lib/api/client.ts`

**Cambios Principales:**

1. **Eliminar métodos duplicados:**
   - ❌ `checkAuth()` → Usar `AuthManager.getState()`
   - ❌ `getCurrentUserWithRole()` → Usar `AuthManager.getState()`
   - ✅ Mantener solo métodos de API específicos

2. **Request Interceptor Mejorado:**

```typescript
private async request<T>(...): Promise<ApiResponse<T>> {
  // ... código existente ...
  
  const response = await fetch(...);
  
  // Manejo diferenciado de errores
  if (response.status === 401) {
    // Token expirado → Intentar refresh
    const authManager = AuthManager.getInstance();
    const refreshed = await authManager.refreshToken();
    
    if (refreshed) {
      // Retry request original (1 vez)
      const retryResponse = await fetch(...);
      if (retryResponse.ok) {
        return await retryResponse.json();
      }
    }
    
    // Refresh falló o retry falló → Logout
    await authManager.logout();
    return {
      success: false,
      error_key: 'auth.unauthorized',
    };
  }
  
  if (response.status === 403) {
    // Permisos insuficientes → NO logout
    const errorData = await response.json();
    return {
      success: false,
      error_key: errorData.error_key || 'auth.insufficient_permissions',
    };
  }
  
  if (response.status === 429) {
    // Rate limit → Activar cooldown, usar cache
    this.rateLimitActive = true;
    this.rateLimitUntil = Date.now() + 60000;
    
    // Intentar usar cache si está disponible
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      return cached.result;
    }
    
    return {
      success: false,
      error_key: 'errors.rate_limit_exceeded',
    };
  }
  
  // ... resto del código ...
}
```

3. **Backoff Exponencial para Errores Transitorios:**

```typescript
private async requestWithRetry<T>(
  endpoint: string,
  options: RequestInit,
  maxRetries = 3
): Promise<ApiResponse<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await this.request<T>(endpoint, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Solo retry para errores transitorios
      if (attempt < maxRetries && this.isTransientError(error)) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      throw lastError;
    }
  }
  
  throw lastError;
}

private isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('503') ||
    message.includes('502')
  );
}
```

---

### 2.3 Layout.tsx Simplificado

**Ubicación:** `apps/web/app/app/layout.tsx`

**Cambios:**

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
      
      // Si no está autenticado, redirigir a login
      if (!state.isAuthenticated) {
        router.push('/login');
        return;
      }
      
      // Si tiene platformRole, redirigir a platform
      if (state.platformRole) {
        router.push('/platform');
        return;
      }
    });
    
    // Suscribirse a cambios de estado
    const unsubscribe = authManager.subscribe(state => {
      setAuthState(state);
      
      // Si se hace logout, redirigir
      if (!state.isAuthenticated) {
        router.push('/login');
      }
    });
    
    // Validación periódica (cada 5 minutos)
    const validationInterval = setInterval(() => {
      authManager.validate().catch(error => {
        console.error('[AppLayout] Error en validación periódica:', error);
      });
    }, 5 * 60 * 1000);
    
    return () => {
      unsubscribe();
      clearInterval(validationInterval);
    };
  }, [router]);
  
  if (isBootstrapping) {
    return <LoadingScreen />;
  }
  
  if (!authState?.isAuthenticated) {
    return null; // Redirigiendo a login
  }
  
  // ... resto del layout ...
}
```

**Eliminar:**
- ❌ `checkAuth()` callback
- ❌ `executeCheckAuth()` con setTimeout
- ❌ Lógica de redirección compleja
- ❌ Manejo manual de tenantId

---

### 2.4 Componentes Simplificados

**Patrón para todos los componentes:**

```typescript
// ❌ ANTES (malo)
useEffect(() => {
  const loadData = async () => {
    const isAuthenticated = await apiClient.checkAuth();
    if (!isAuthenticated) return;
    
    const userWithRole = await apiClient.getCurrentUserWithRole();
    // ... usar userWithRole ...
  };
  
  loadData();
}, []);

// ✅ DESPUÉS (bueno)
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
  
  // Suscribirse a cambios (opcional)
  const unsubscribe = authManager.subscribe(newState => {
    if (newState.isAuthenticated && newState.tenant) {
      loadData();
    }
  });
  
  return unsubscribe;
}, []);
```

---

## 3. Backend: Optimizaciones

### 3.1 SessionController Mejorado

**Ubicación:** `apps/api/src/modules/session/session.controller.ts`

**Cambios:**

```typescript
@Controller('session')
export class SessionController {
  // Cache con invalidación inteligente
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly SHORT_CACHE_TTL = 30 * 1000; // 30 segundos para cambios frecuentes
  
  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() currentTenant?: { id: string; role: string },
  ) {
    const cacheKey = `session:${user.userId}:${currentTenant?.id || 'none'}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Agregar header para indicar que es cache
      return cached;
    }
    
    // Query optimizada (ya está bien, mantener)
    const dbUser = await this.prisma.user.findUnique({...});
    
    if (!dbUser) {
      return {
        success: false,
        error_key: 'auth.user_not_found',
      };
    }
    
    const result = {
      success: true,
      data: {
        user: {...},
        platformRole: dbUser.platformRole ?? null,
        tenants: [...],
        currentTenant: current,
      },
    };
    
    // Guardar en cache con TTL apropiado
    const ttl = this.shouldUseShortCache(dbUser) 
      ? this.SHORT_CACHE_TTL 
      : this.CACHE_TTL;
    this.cache.set(cacheKey, result, ttl);
    
    return result;
  }
  
  private shouldUseShortCache(user: any): boolean {
    // Usar cache corto si el usuario tiene cambios recientes
    // (ej: cambio de rol, nuevo tenant, etc.)
    return false; // Implementar lógica según necesidades
  }
}
```

### 3.2 Invalidación de Cache Coordinada

**Nuevo endpoint para invalidar cache:**

```typescript
@Post('invalidate')
@UseGuards(JwtAuthGuard)
async invalidateCache(@CurrentUser() user: AuthenticatedUser) {
  // Invalidar todos los caches relacionados con este usuario
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

---

## 4. Diagramas de Flujo

### 4.1 Flujo de Bootstrap

```
┌─────────────┐
│ App Mount   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ AuthManager         │
│ .bootstrap()         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Verificar Cache L1  │
│ (memoria)           │
└──────┬──────────────┘
       │
       ├─ Cache válido? ──SÍ──► Retornar cache
       │
       └─ NO
          │
          ▼
┌─────────────────────┐
│ Adquirir Mutex      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Doble verificación  │
│ (otro proceso pudo  │
│  actualizar cache)  │
└──────┬──────────────┘
       │
       ├─ Cache válido? ──SÍ──► Retornar cache
       │
       └─ NO
          │
          ▼
┌─────────────────────┐
│ GET /session/me     │
│ (single-flight)     │
└──────┬──────────────┘
       │
       ├─ 200 OK ──► Guardar en cache L1
       │            │ Emitir evento 'auth:ready'
       │            └─► Retornar estado
       │
       ├─ 401 ──► Intentar refresh
       │         │ Si falla → Logout
       │         └─► Retornar estado no autenticado
       │
       └─ Otro error ──► Retornar error
```

### 4.2 Flujo de Refresh Token

```
┌─────────────────────┐
│ Request devuelve 401 │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ AuthManager         │
│ .refreshToken()      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Verificar cooldown  │
│ (60 segundos)       │
└──────┬──────────────┘
       │
       ├─ En cooldown? ──SÍ──► Retornar false
       │
       └─ NO
          │
          ▼
┌─────────────────────┐
│ Verificar mutex     │
│ (isRefreshing)       │
└──────┬──────────────┘
       │
       ├─ Refresh activo? ──SÍ──► Esperar resultado
       │
       └─ NO
          │
          ▼
┌─────────────────────┐
│ POST /auth/refresh  │
└──────┬──────────────┘
       │
       ├─ 200 OK ──► Invalidar cache
       │            │ Actualizar cookies
       │            └─► Retornar true
       │
       ├─ 401 ──► Refresh token expirado
       │         │ Hacer logout
       │         └─► Retornar false
       │
       └─ Otro error ──► Retornar false
```

---

## 5. Manejo de Errores Mejorado

### 5.1 Matriz de Decisión de Errores

| Status | Significado | Acción | Prioridad |
|--------|-------------|--------|-----------|
| **200** | OK | Continuar normalmente | - |
| **401** | Token expirado | Intentar refresh (1 vez) | P0 |
| **401** | Token inválido | Logout inmediato | P0 |
| **401** | Refresh token expirado | Logout inmediato | P0 |
| **403** | Permisos insuficientes | Mostrar error, NO logout | P0 |
| **403** | Tenant incorrecto | Mostrar selector tenant | P1 |
| **429** | Rate limit | Activar cooldown, usar cache | P1 |
| **500/503** | Server error | Retry con backoff (máx 3) | P2 |
| **502/504** | Gateway error | Retry con backoff (máx 3) | P2 |

### 5.2 Código de Implementación

```typescript
private async handleErrorResponse<T>(
  response: Response,
  endpoint: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  const status = response.status;
  
  switch (status) {
    case 401: {
      // Token expirado o inválido
      const authManager = AuthManager.getInstance();
      const refreshed = await authManager.refreshToken();
      
      if (refreshed) {
        // Retry request original (1 vez)
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          credentials: 'include',
        });
        
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }
      
      // Refresh falló o retry falló → Logout
      await authManager.logout();
      return {
        success: false,
        error_key: 'auth.unauthorized',
      };
    }
    
    case 403: {
      // Permisos insuficientes → NO logout
      const errorData = await response.json();
      return {
        success: false,
        error_key: errorData.error_key || 'auth.insufficient_permissions',
      };
    }
    
    case 429: {
      // Rate limit → Activar cooldown
      this.rateLimitActive = true;
      const retryAfter = response.headers.get('Retry-After');
      this.rateLimitUntil = Date.now() + (
        retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000
      );
      
      // Intentar usar cache
      const cacheKey = this.getRequestCacheKey(endpoint, options.method || 'GET');
      const cached = this.requestCache.get(cacheKey);
      if (cached) {
        return cached.result;
      }
      
      return {
        success: false,
        error_key: 'errors.rate_limit_exceeded',
      };
    }
    
    case 500:
    case 502:
    case 503:
    case 504: {
      // Server error → Retry con backoff
      return this.requestWithRetry(endpoint, options, 3);
    }
    
    default: {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error_key: errorData.error_key || 'errors.unknown',
      };
    }
  }
}
```

---

## 6. Compatibilidad con React StrictMode

### 6.1 Problema

React StrictMode ejecuta efectos 2x en desarrollo:
```typescript
useEffect(() => {
  // Esto se ejecuta 2x en desarrollo
  checkAuth();
}, []);
```

### 6.2 Solución

**Opción A: Usar ref para tracking**

```typescript
const hasBootstrapped = useRef(false);

useEffect(() => {
  if (hasBootstrapped.current) return;
  hasBootstrapped.current = true;
  
  const authManager = AuthManager.getInstance();
  authManager.bootstrap();
}, []);
```

**Opción B: AuthManager maneja duplicados**

```typescript
class AuthManager {
  private bootstrapPromise: Promise<AuthState> | null = null;
  
  async bootstrap(): Promise<AuthState> {
    // Si ya hay un bootstrap en curso, retornar la misma promise
    if (this.bootstrapPromise) {
      return this.bootstrapPromise;
    }
    
    this.bootstrapPromise = this.mutex.run(async () => {
      // ... lógica de bootstrap ...
    });
    
    const result = await this.bootstrapPromise;
    this.bootstrapPromise = null; // Limpiar después de completar
    return result;
  }
}
```

**Recomendación:** Usar Opción B (AuthManager maneja duplicados) porque es más robusto y funciona incluso si múltiples componentes llaman bootstrap().

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('AuthManager', () => {
  it('debe ser singleton', () => {
    const instance1 = AuthManager.getInstance();
    const instance2 = AuthManager.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  it('debe prevenir múltiples llamadas simultáneas', async () => {
    const authManager = AuthManager.getInstance();
    
    const promises = Array(10).fill(null).map(() => 
      authManager.bootstrap()
    );
    
    const results = await Promise.all(promises);
    
    // Todas deben retornar el mismo resultado
    const firstResult = results[0];
    results.forEach(result => {
      expect(result).toEqual(firstResult);
    });
    
    // Debe haber solo 1 llamada HTTP (verificar con mock)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('debe prevenir refresh loops', async () => {
    const authManager = AuthManager.getInstance();
    
    // Simular múltiples 401 simultáneos
    mockFetch.mockResolvedValueOnce({ status: 401 });
    mockFetch.mockResolvedValueOnce({ status: 200 }); // Refresh exitoso
    
    const refreshPromises = Array(5).fill(null).map(() =>
      authManager.refreshToken()
    );
    
    await Promise.all(refreshPromises);
    
    // Debe haber solo 1 llamada a /auth/refresh
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.any(Object)
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Auth Flow Integration', () => {
  it('debe hacer bootstrap una vez al mount', async () => {
    render(<AppLayout><TestPage /></AppLayout>);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/session/me'),
        expect.any(Object)
      );
    });
    
    // Debe haber solo 1 llamada
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('debe manejar 401 correctamente', async () => {
    // Primera llamada: 401
    mockFetch.mockResolvedValueOnce({ status: 401 });
    // Refresh: 200
    mockFetch.mockResolvedValueOnce({ status: 200 });
    // Retry: 200
    mockFetch.mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    
    const result = await apiClient.get('/some-endpoint');
    
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
```

### 7.3 E2E Tests

```typescript
describe('Auth E2E', () => {
  it('debe mantener sesión durante navegación', async () => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/app/**');
    
    // Navegar entre páginas
    await page.click('a[href="/app/agents"]');
    await page.waitForURL('/app/agents');
    
    await page.click('a[href="/app/settings"]');
    await page.waitForURL('/app/settings');
    
    // Verificar que no se hizo logout
    expect(page.url()).toContain('/app/');
    
    // Verificar que solo hubo 1 llamada a /session/me
    const sessionMeCalls = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/session/me'))
        .length;
    });
    
    expect(sessionMeCalls).toBeLessThanOrEqual(1);
  });
});
```

---

## 8. Migración y Rollout

### 8.1 Estrategia de Migración

**Fase 1: Implementar AuthManager (sin romper código existente)**
- Crear `AuthManager` nuevo
- Mantener `ApiClient` existente funcionando
- Feature flag para habilitar AuthManager

**Fase 2: Migrar Layout.tsx**
- Usar AuthManager en `AppLayout`
- Mantener fallback a código antiguo
- Testing exhaustivo

**Fase 3: Migrar Componentes Gradualmente**
- Migrar un componente a la vez
- Testing después de cada migración
- Rollback plan para cada componente

**Fase 4: Eliminar Código Antiguo**
- Remover `checkAuth()` de ApiClient
- Remover `getCurrentUserWithRole()` de ApiClient
- Limpiar código no usado

### 8.2 Feature Flags

```typescript
// apps/web/lib/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_AUTH_MANAGER: process.env.NEXT_PUBLIC_USE_AUTH_MANAGER === 'true',
  ENABLE_SILENT_REFRESH: process.env.NEXT_PUBLIC_ENABLE_SILENT_REFRESH === 'true',
  ENABLE_PERIODIC_VALIDATION: process.env.NEXT_PUBLIC_ENABLE_PERIODIC_VALIDATION === 'true',
};
```

---

## 9. Métricas y Observabilidad

### 9.1 Métricas a Implementar

```typescript
class AuthMetrics {
  // Contadores
  bootstrapCount: number = 0;
  validateCount: number = 0;
  refreshCount: number = 0;
  logoutCount: number = 0;
  
  // Tiempos
  bootstrapTime: number[] = [];
  validateTime: number[] = [];
  refreshTime: number[] = [];
  
  // Errores
  error401Count: number = 0;
  error403Count: number = 0;
  error429Count: number = 0;
  refreshLoopCount: number = 0;
  
  // Cache
  cacheHitCount: number = 0;
  cacheMissCount: number = 0;
  
  logMetric(name: string, value: number): void {
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log(`[AuthMetrics] ${name}:`, value);
    }
    
    // Enviar a servicio de métricas (ej: DataDog, New Relic)
    // metrics.increment(`auth.${name}`, value);
  }
}
```

### 9.2 Logs Estructurados

```typescript
class AuthLogger {
  logBootstrap(startTime: number, success: boolean, error?: Error): void {
    const duration = Date.now() - startTime;
    console.log('[AuthManager] Bootstrap', {
      duration,
      success,
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
  
  logRefresh(startTime: number, success: boolean, error?: Error): void {
    const duration = Date.now() - startTime;
    console.log('[AuthManager] Refresh', {
      duration,
      success,
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
  
  logError(type: string, error: Error, context?: Record<string, any>): void {
    console.error(`[AuthManager] Error: ${type}`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 10. Checklist de Implementación

### Fase 1: Core AuthManager
- [ ] Crear `apps/web/lib/auth/auth-manager.ts`
- [ ] Implementar singleton pattern
- [ ] Implementar Mutex class
- [ ] Implementar cache en memoria
- [ ] Implementar event emitter
- [ ] Unit tests para AuthManager
- [ ] Unit tests para Mutex

### Fase 2: Integración con ApiClient
- [ ] Refactorizar `request()` para usar AuthManager
- [ ] Implementar manejo diferenciado de errores
- [ ] Implementar backoff exponencial
- [ ] Eliminar `checkAuth()` de ApiClient
- [ ] Eliminar `getCurrentUserWithRole()` de ApiClient
- [ ] Integration tests

### Fase 3: Migración de Layout
- [ ] Refactorizar `AppLayout` para usar AuthManager
- [ ] Eliminar lógica de auth check manual
- [ ] Implementar suscripción a eventos
- [ ] Implementar validación periódica
- [ ] E2E tests para layout

### Fase 4: Migración de Componentes
- [ ] Migrar `app/page.tsx`
- [ ] Migrar `app/agents/page.tsx`
- [ ] Migrar `app/appointments/page.tsx`
- [ ] Migrar `app/settings/**/page.tsx`
- [ ] Migrar otros componentes que usan `checkAuth()`
- [ ] Testing después de cada migración

### Fase 5: Backend Optimizaciones
- [ ] Optimizar cache en SessionController
- [ ] Implementar invalidación coordinada
- [ ] Agregar endpoint de invalidación
- [ ] Testing de cache

### Fase 6: Cleanup
- [ ] Eliminar código no usado
- [ ] Actualizar documentación
- [ ] Code review final
- [ ] Performance testing
- [ ] Security review

---

## 11. Archivos a Modificar

### Crear Nuevos
- `apps/web/lib/auth/auth-manager.ts` (nuevo)
- `apps/web/lib/auth/mutex.ts` (nuevo)
- `apps/web/lib/auth/types.ts` (nuevo)
- `apps/web/lib/auth/metrics.ts` (nuevo, opcional)

### Modificar Existentes
- `apps/web/lib/api/client.ts` (refactorizar)
- `apps/web/app/app/layout.tsx` (simplificar)
- `apps/web/app/app/page.tsx` (migrar)
- `apps/web/app/app/agents/page.tsx` (migrar)
- `apps/web/app/app/appointments/page.tsx` (migrar)
- `apps/web/app/app/settings/**/page.tsx` (migrar todos)
- `apps/api/src/modules/session/session.controller.ts` (optimizar)

### Eliminar (después de migración)
- Métodos `checkAuth()` y `getCurrentUserWithRole()` de ApiClient (mantener compatibilidad temporal)

---

## 12. Consideraciones de Seguridad

### 12.1 Tokens
- ✅ Tokens siempre en cookies HttpOnly
- ✅ No exponer tokens en logs
- ✅ No almacenar tokens en localStorage/sessionStorage
- ✅ Refresh token con expiración adecuada

### 12.2 Rate Limiting
- ✅ Backend: Rate limiting en `/auth/refresh`
- ✅ Frontend: Cooldown de 60s entre refreshes
- ✅ Prevenir refresh storms

### 12.3 CSRF Protection
- ✅ Verificar origen de requests
- ✅ Usar SameSite cookies
- ✅ Validar headers en backend

---

## 13. Performance Considerations

### 13.1 Optimizaciones
- Cache L1 (memoria): TTL 5 minutos
- Cache L2 (backend): TTL 5 minutos
- Single-flight: Máximo 1 request activo
- Lazy loading: Cargar datos solo cuando se necesitan

### 13.2 Monitoring
- Tiempo de respuesta de `/session/me`
- Cache hit rate
- Número de refreshes por sesión
- Tasa de errores 401/403/429

---

**Próximo paso:** Ver Checklist de Implementación para comenzar desarrollo.



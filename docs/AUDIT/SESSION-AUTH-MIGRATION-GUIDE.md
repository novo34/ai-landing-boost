# 🔄 Guía de Migración: Session & Auth Stabilization

**Versión:** 1.0  
**Fecha:** 2024-12-19  
**Para:** Desarrolladores

---

## 📋 Resumen

Esta guía proporciona instrucciones paso a paso para migrar cada componente del sistema actual al nuevo sistema basado en `AuthManager`.

**Tiempo estimado por componente:** 30-60 minutos

---

## 🎯 Objetivo de Migración

**ANTES:**
```typescript
// ❌ Múltiples llamadas, no coordinadas
const isAuthenticated = await apiClient.checkAuth();
const userWithRole = await apiClient.getCurrentUserWithRole();
```

**DESPUÉS:**
```typescript
// ✅ Single source of truth, síncrono
const authManager = AuthManager.getInstance();
const state = authManager.getState();
// state.user, state.tenant disponibles inmediatamente
```

---

## 📝 Checklist Pre-Migración

Antes de comenzar a migrar cualquier componente:

- [ ] AuthManager implementado y testeado
- [ ] Mutex implementado y testeado
- [ ] ApiClient refactorizado (métodos deprecated marcados)
- [ ] Feature flag configurado
- [ ] Tests de AuthManager pasando

---

## 🔧 Patrón de Migración Estándar

### Paso 1: Identificar Uso de Auth

Buscar en el componente:
```typescript
// Buscar estos patrones:
- apiClient.checkAuth()
- apiClient.getCurrentUserWithRole()
- apiClient.getCurrentUser()
- await apiClient.get('/session/me')
```

### Paso 2: Reemplazar con AuthManager

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
import { AuthManager } from '@/lib/auth/auth-manager';

useEffect(() => {
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  // Verificar autenticación (síncrono)
  if (!state.isAuthenticated || !state.tenant) {
    return;
  }
  
  const loadData = async () => {
    // ... usar state.user, state.tenant directamente ...
    // NO necesitas hacer más llamadas a API
  };
  
  loadData();
  
  // Opcional: Suscribirse a cambios
  const unsubscribe = authManager.subscribe(newState => {
    if (newState.isAuthenticated && newState.tenant) {
      loadData(); // Recargar datos si cambia el estado
    }
  });
  
  return unsubscribe;
}, []);
```

### Paso 3: Eliminar Imports No Usados

```typescript
// ❌ Eliminar si ya no se usa
import { apiClient } from '@/lib/api/client';

// ✅ Mantener solo si haces otras llamadas API
import { apiClient } from '@/lib/api/client';
```

### Paso 4: Testing

- [ ] Componente se renderiza correctamente
- [ ] Datos se cargan correctamente
- [ ] No hay llamadas duplicadas a `/session/me`
- [ ] Suscripción funciona (si se implementó)
- [ ] Cleanup funciona (unsubscribe)

---

## 📦 Migraciones Específicas por Componente

### 1. AppLayout (`apps/web/app/app/layout.tsx`)

**ANTES:**
```typescript
const checkAuth = useCallback(async () => {
  const userWithRole = await apiClient.getCurrentUserWithRole();
  if (!userWithRole?.user) {
    router.push('/login');
    return;
  }
  // ... más lógica ...
}, [router]);

useEffect(() => {
  let isMounted = true;
  const executeCheckAuth = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!isMounted) return;
    await checkAuth();
  };
  executeCheckAuth();
  return () => { isMounted = false; };
}, [checkAuth]);
```

**DESPUÉS:**
```typescript
import { AuthManager } from '@/lib/auth/auth-manager';
import type { AuthState } from '@/lib/auth/auth-manager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  
  useEffect(() => {
    const authManager = AuthManager.getInstance();
    
    // Bootstrap: solo una vez
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
      
      // Guardar tenantId en sessionStorage
      if (state.tenant) {
        sessionStorage.setItem('currentTenantId', state.tenant.id);
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
    return null;
  }
  
  // ... resto del layout usando authState.user y authState.tenant ...
}
```

**Cambios clave:**
- ✅ Eliminado `checkAuth` callback
- ✅ Eliminado `executeCheckAuth` con setTimeout
- ✅ Eliminado flag `isMounted`
- ✅ Agregado bootstrap una vez
- ✅ Agregado suscripción a eventos
- ✅ Agregado validación periódica

---

### 2. AppPage (`apps/web/app/app/page.tsx`)

**ANTES:**
```typescript
const loadDashboardData = async () => {
  const isAuthenticated = await apiClient.checkAuth();
  if (!isAuthenticated) {
    router.push('/login');
    return;
  }
  
  const userWithRole = await apiClient.getCurrentUserWithRole();
  if (userWithRole?.user) {
    setUser({ ... });
  }
  if (userWithRole?.tenant) {
    setCurrentTenant(userWithRole.tenant);
  }
  // ... más código ...
};
```

**DESPUÉS:**
```typescript
import { AuthManager } from '@/lib/auth/auth-manager';

const loadDashboardData = async () => {
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  // Verificar autenticación (síncrono)
  if (!state.isAuthenticated || !state.tenant) {
    router.push('/login');
    return;
  }
  
  // Usar state directamente (no necesita más llamadas)
  if (state.user) {
    setUser({
      id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      locale: state.user.locale,
      memberships: [],
    });
  }
  
  if (state.tenant) {
    setCurrentTenant({
      id: state.tenant.id,
      name: state.tenant.name,
      status: state.tenant.status,
      role: state.tenant.role,
    });
  }
  
  // ... resto del código (cargar KPIs, billing, etc.) ...
};
```

**Cambios clave:**
- ✅ Eliminado `checkAuth()`
- ✅ Eliminado `getCurrentUserWithRole()`
- ✅ Usar `authManager.getState()` (síncrono)
- ✅ Datos disponibles inmediatamente

---

### 3. AgentsPage (`apps/web/app/app/agents/page.tsx`)

**ANTES:**
```typescript
const loadData = async () => {
  setLoading(true);
  
  const isAuthenticated = await apiClient.checkAuth();
  if (!isAuthenticated) return;
  
  const userWithRole = await apiClient.getCurrentUserWithRole();
  if (!userWithRole?.tenant?.id) return;
  
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const [agentsResponse, ...] = await Promise.all([...]);
  // ...
};
```

**DESPUÉS:**
```typescript
import { AuthManager } from '@/lib/auth/auth-manager';

const loadData = async () => {
  setLoading(true);
  
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  // Verificar autenticación (síncrono)
  if (!state.isAuthenticated || !state.tenant) {
    setLoading(false);
    return;
  }
  
  // NO necesitas delay, estado ya está disponible
  const [agentsResponse, ...] = await Promise.all([...]);
  // ...
};
```

**Cambios clave:**
- ✅ Eliminado `checkAuth()`
- ✅ Eliminado `getCurrentUserWithRole()`
- ✅ Eliminado `setTimeout(200)` (ya no necesario)
- ✅ Verificación síncrona

---

### 4. AppointmentsPage (`apps/web/app/app/appointments/page.tsx`)

**Mismo patrón que AgentsPage**

---

### 5. Settings Pages (`apps/web/app/app/settings/**/page.tsx`)

**Patrón similar, pero verificar si necesitan datos específicos del usuario:**

```typescript
import { AuthManager } from '@/lib/auth/auth-manager';

useEffect(() => {
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  if (!state.isAuthenticated) {
    return;
  }
  
  // Si necesitas datos adicionales, hacer llamadas específicas
  // PERO no uses checkAuth() o getCurrentUserWithRole()
  const loadSettings = async () => {
    const response = await apiClient.getTenantSettings();
    // ...
  };
  
  loadSettings();
}, []);
```

---

### 6. SubscriptionWarningBanner (`components/billing/subscription-warning-banner.tsx`)

**ANTES:**
```typescript
const loadSubscription = async () => {
  const response = await apiClient.getCurrentSubscription();
  // ...
};
```

**DESPUÉS:**
```typescript
import { AuthManager } from '@/lib/auth/auth-manager';

const loadSubscription = async () => {
  const authManager = AuthManager.getInstance();
  const state = authManager.getState();
  
  // Verificar rol antes de hacer request
  if (!state.isAuthenticated || state.tenant?.role !== 'OWNER') {
    setSubscription(null);
    return;
  }
  
  const response = await apiClient.getCurrentSubscription();
  // ...
};
```

**Cambios clave:**
- ✅ Verificar rol desde `state.tenant.role` (síncrono)
- ✅ Evitar request si no tiene permisos
- ✅ Mejor UX (no muestra error 403)

---

## ⚠️ Errores Comunes a Evitar

### ❌ Error 1: Llamar bootstrap() múltiples veces

```typescript
// ❌ MAL
useEffect(() => {
  authManager.bootstrap();
  authManager.bootstrap(); // Duplicado
}, []);

// ✅ BIEN
useEffect(() => {
  authManager.bootstrap(); // Una vez
}, []);
```

### ❌ Error 2: No verificar estado antes de usar

```typescript
// ❌ MAL
const state = authManager.getState();
const userId = state.user.id; // Error si user es null

// ✅ BIEN
const state = authManager.getState();
if (!state.isAuthenticated || !state.user) return;
const userId = state.user.id; // Seguro
```

### ❌ Error 3: No hacer cleanup de suscripciones

```typescript
// ❌ MAL
useEffect(() => {
  const unsubscribe = authManager.subscribe(...);
  // No retorna unsubscribe
}, []);

// ✅ BIEN
useEffect(() => {
  const unsubscribe = authManager.subscribe(...);
  return unsubscribe; // Cleanup
}, []);
```

### ❌ Error 4: Usar checkAuth() después de migrar

```typescript
// ❌ MAL
const state = authManager.getState();
const isAuth = await apiClient.checkAuth(); // Duplicado!

// ✅ BIEN
const state = authManager.getState();
const isAuth = state.isAuthenticated; // Síncrono
```

---

## 🧪 Testing Después de Migración

### Checklist de Testing

Para cada componente migrado:

- [ ] **Renderizado:**
  - [ ] Componente se renderiza sin errores
  - [ ] Loading state funciona
  - [ ] Error state funciona

- [ ] **Datos:**
  - [ ] Datos se cargan correctamente
  - [ ] Datos se muestran correctamente
  - [ ] Datos se actualizan si cambia auth state

- [ ] **Performance:**
  - [ ] No hay llamadas duplicadas a `/session/me`
  - [ ] Cache se utiliza correctamente
  - [ ] Tiempo de carga es aceptable

- [ ] **Edge Cases:**
  - [ ] Funciona cuando usuario no está autenticado
  - [ ] Funciona cuando usuario no tiene tenant
  - [ ] Funciona cuando hay error de red
  - [ ] Funciona cuando hay rate limiting

---

## 📊 Métricas Post-Migración

Después de migrar cada componente, verificar:

```typescript
// En DevTools → Network
// Debe haber máximo 1 llamada a /session/me por carga de página

// En DevTools → Console
// NO debe haber:
// - "Request deduplicado: /session/me" (múltiples veces)
// - Refresh loops
// - Errores 401 inesperados
```

---

## 🔄 Orden de Migración Recomendado

1. **AppLayout** (crítico, base de todo)
2. **AppPage** (dashboard principal)
3. **AgentsPage** (ejemplo de lista)
4. **AppointmentsPage** (similar a AgentsPage)
5. **Settings Pages** (uno por uno)
6. **Componentes pequeños** (banners, etc.)

**Razón:** AppLayout es la base, otros componentes dependen de él.

---

## 🐛 Troubleshooting

### Problema: Componente no se renderiza

**Causa:** `authState` es `null` durante bootstrap.

**Solución:**
```typescript
if (isBootstrapping) {
  return <LoadingScreen />;
}

if (!authState?.isAuthenticated) {
  return null; // O redirigir a login
}
```

---

### Problema: Datos no se cargan

**Causa:** Verificación de auth falla silenciosamente.

**Solución:**
```typescript
const state = authManager.getState();
console.log('[Debug] Auth state:', state); // Verificar estado

if (!state.isAuthenticated || !state.tenant) {
  console.warn('[Debug] Auth check failed:', { 
    isAuthenticated: state.isAuthenticated,
    hasTenant: !!state.tenant 
  });
  return;
}
```

---

### Problema: Múltiples llamadas a `/session/me`

**Causa:** Componente no migrado completamente, todavía usa `checkAuth()`.

**Solución:**
- Buscar todos los usos de `checkAuth()` en el componente
- Reemplazar con `authManager.getState()`
- Verificar que no hay llamadas en otros lugares

---

### Problema: Suscripción no funciona

**Causa:** Cleanup no se ejecuta o callback tiene errores.

**Solución:**
```typescript
const unsubscribe = authManager.subscribe(newState => {
  try {
    // Tu lógica aquí
  } catch (error) {
    console.error('[Subscription] Error:', error);
  }
});

// Asegurar cleanup
return () => {
  unsubscribe();
};
```

---

## ✅ Checklist Final de Migración

Después de migrar TODOS los componentes:

- [ ] No hay usos de `apiClient.checkAuth()` en código
- [ ] No hay usos de `apiClient.getCurrentUserWithRole()` en código
- [ ] Todos los componentes usan `AuthManager.getState()`
- [ ] Todas las suscripciones tienen cleanup
- [ ] Tests pasan
- [ ] Performance mejoró (verificar métricas)
- [ ] No hay llamadas duplicadas a `/session/me`
- [ ] No hay refresh loops en logs

---

## 📚 Referencias

- **AI-Spec:** `docs/SPEC/AI-SPEC-SESSION-AUTH-STABILIZATION.md`
- **Recomendaciones:** `docs/AUDIT/SESSION-AUTH-IMPLEMENTATION-RECOMMENDATIONS.md`
- **Root Cause:** `docs/AUDIT/SESSION-AUTH-ROOT-CAUSE-ANALYSIS.md`

---

**Próximo paso:** Comenzar migración con AppLayout siguiendo esta guía.



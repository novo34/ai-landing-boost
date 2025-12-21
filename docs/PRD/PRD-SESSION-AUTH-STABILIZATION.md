# 📄 PRD: Session & Auth Stabilization

**Versión:** 1.0  
**Fecha:** 2024-12-19  
**Autor:** Arquitecto Senior SaaS  
**Estado:** 🟡 EN REVISIÓN

---

## 1. Resumen Ejecutivo

### Problema Actual
El sistema de autenticación y gestión de sesión presenta problemas críticos que impiden el despliegue a producción:
- Múltiples llamadas concurrentes a `/session/me` (3-5x por carga de página)
- Refresh loops que causan degradación de performance
- Cierres de sesión inesperados
- Tiempo de respuesta de ~3000ms (objetivo: <200ms)
- Estados inconsistentes entre componentes

### Objetivo
Estabilizar completamente el sistema de autenticación y sesión para soportar producción con:
- **1 sola llamada** a `/session/me` por carga de página
- **0 refresh loops**
- **0 cierres de sesión inesperados**
- **<200ms** tiempo de respuesta
- **Estado consistente** en toda la aplicación

### Alcance
- Frontend: React/Next.js (client.ts, layout.tsx, componentes)
- Backend: NestJS (session controller, auth service)
- Proxy: Next.js API routes
- Cache: Frontend y backend
- Multi-tenant: Headers x-tenant-id

---

## 2. Problema Detallado

### 2.1 Síntomas Observados

#### A) Múltiples Llamadas Concurrentes
```
[PERF][CLIENT] API.request.GET./session/me ... 73.40ms
[PERF][CLIENT] API.request.GET./session/me ... 75.20ms
[PERF][CLIENT] API.request.GET./session/me ... 78.10ms
```
**Causa:** Múltiples componentes llaman `checkAuth()` o `getCurrentUserWithRole()` simultáneamente sin coordinación.

#### B) Refresh Loops
```
🔄 Token expirado, intentando refresh...
🔄 Token expirado, intentando refresh...
🔄 Token expirado, intentando refresh...
```
**Causa:** Múltiples requests fallan con 401 simultáneamente, cada uno intenta refresh independientemente.

#### C) Cierres de Sesión Inesperados
```
GET /api/proxy/session/me → 401 Unauthorized
→ router.push('/login')
```
**Causa:** Layout.tsx y otros componentes redirigen a `/login` sin verificar si otros componentes están manejando el auth.

#### D) Performance Degradada
- Tiempo de respuesta: ~3000ms (objetivo: <200ms)
- Múltiples queries a Prisma por request
- Cache no se utiliza efectivamente

### 2.2 Impacto en el Negocio

| Área | Impacto | Severidad |
|------|---------|-----------|
| **UX** | Pantallas de loading infinitas, navegación interrumpida | 🔴 CRÍTICO |
| **Performance** | Tiempo de carga 15x más lento de lo esperado | 🔴 CRÍTICO |
| **Escalabilidad** | No puede soportar >100 usuarios concurrentes | 🔴 CRÍTICO |
| **Confiabilidad** | Sesiones se invalidan aleatoriamente | 🔴 CRÍTICO |
| **Costos** | Rate limiting causa errores, requiere más recursos | 🟡 ALTO |

### 2.3 Usuarios Afectados

- **100%** de usuarios autenticados experimentan degradación de performance
- **~10%** experimentan cierres de sesión inesperados
- **~15%** de requests fallan con 401 (debería ser <1%)

---

## 3. Objetivos

### 3.1 Objetivos Funcionales

#### OF-1: Single Source of Truth para Auth State
- **Descripción:** Un único sistema centralizado que gestiona el estado de autenticación
- **Criterio de éxito:** Todos los componentes obtienen el estado de auth desde la misma fuente
- **Prioridad:** P0

#### OF-2: Single-Flight Pattern para Auth Checks
- **Descripción:** Solo UNA verificación de auth puede ejecutarse a la vez
- **Criterio de éxito:** Máximo 1 llamada a `/session/me` por carga de página
- **Prioridad:** P0

#### OF-3: Eliminación de Refresh Loops
- **Descripción:** Sistema anti-refresh-loop que previene múltiples refreshes simultáneos
- **Criterio de éxito:** 0 refresh loops en logs durante 1 semana de pruebas
- **Prioridad:** P0

#### OF-4: Cache Coordinado y Consistente
- **Descripción:** Sistema de cache que se sincroniza entre todos los componentes
- **Criterio de éxito:** Cache hit rate >80%, estados consistentes en toda la app
- **Prioridad:** P1

#### OF-5: Manejo Diferenciado de Errores
- **Descripción:** Separación clara entre 401 (token expirado), 403 (permisos), y otros errores
- **Criterio de éxito:** 0 cierres de sesión por errores 403, refresh solo cuando es necesario
- **Prioridad:** P1

#### OF-6: Performance Objetivo
- **Descripción:** Tiempo de respuesta <200ms para `/session/me`
- **Criterio de éxito:** P95 <200ms, P99 <500ms
- **Prioridad:** P1

### 3.2 Objetivos No Funcionales

#### ONF-1: Compatibilidad con React StrictMode
- **Descripción:** El sistema debe funcionar correctamente con StrictMode habilitado
- **Criterio de éxito:** 0 llamadas duplicadas en desarrollo con StrictMode
- **Prioridad:** P2

#### ONF-2: Resiliencia ante Errores Transitorios
- **Descripción:** Backoff exponencial y retry inteligente para errores de red
- **Criterio de éxito:** 95% de errores transitorios se resuelven automáticamente
- **Prioridad:** P2

#### ONF-3: Escalabilidad
- **Descripción:** Sistema debe soportar 1000+ usuarios concurrentes
- **Criterio de éxito:** Performance estable con 1000 usuarios simultáneos
- **Prioridad:** P2

#### ONF-4: Observabilidad
- **Descripción:** Logs y métricas claras para debugging
- **Criterio de éxito:** Todas las operaciones de auth tienen logs estructurados
- **Prioridad:** P3

---

## 4. Requisitos Funcionales

### RF-1: Auth Manager Centralizado

**Descripción:**  
Crear un `AuthManager` singleton que actúa como single source of truth para el estado de autenticación.

**Requisitos:**
- Singleton pattern (una sola instancia en toda la app)
- Estado reactivo (notifica a suscriptores cuando cambia)
- Cache en memoria con TTL configurable
- Métodos públicos: `getAuthState()`, `checkAuth()`, `refreshToken()`, `logout()`

**Entradas:**
- Llamadas desde componentes: `authManager.getAuthState()`
- Eventos de red: 401, 403, 200

**Salidas:**
- Estado de auth: `{ isAuthenticated: boolean, user: User | null, tenant: Tenant | null }`
- Eventos: `auth:state-changed`, `auth:logout`, `auth:refresh`

**Validaciones:**
- Estado siempre consistente
- No hay race conditions
- Cache se invalida correctamente

**Prioridad:** P0

---

### RF-2: Single-Flight Pattern con Mutex

**Descripción:**  
Implementar mutex global que garantiza que solo UNA verificación de auth ocurre a la vez.

**Requisitos:**
- Mutex global compartido entre todas las llamadas
- Queue de espera para llamadas concurrentes
- Timeout configurable (default: 30s)
- Logging de llamadas en queue

**Entradas:**
- Múltiples llamadas simultáneas a `checkAuth()`

**Salidas:**
- Una sola petición HTTP, todas las demás esperan el resultado

**Validaciones:**
- Máximo 1 petición HTTP activa a `/session/me`
- Todas las llamadas concurrentes reciben el mismo resultado
- No hay deadlocks

**Prioridad:** P0

---

### RF-3: Sistema Anti-Refresh-Loop

**Descripción:**  
Prevenir múltiples intentos de refresh simultáneos y loops infinitos.

**Requisitos:**
- Flag global `isRefreshing` compartido
- Máximo 1 intento de refresh cada 60 segundos
- Backoff exponencial si refresh falla
- Detección de refresh token expirado (no reintentar)

**Entradas:**
- Múltiples 401 simultáneos

**Salidas:**
- Un solo intento de refresh, todas las demás esperan

**Validaciones:**
- 0 refresh loops en logs
- Refresh solo cuando es necesario
- No hay refresh storms

**Prioridad:** P0

---

### RF-4: Cache Coordinado Multi-Nivel

**Descripción:**  
Sistema de cache que coordina entre frontend (memoria) y backend (Redis/memoria).

**Requisitos:**
- Cache L1: Memoria del cliente (TTL: 5 minutos)
- Cache L2: Backend (TTL: 5 minutos)
- Invalidación coordinada cuando:
  - Usuario hace logout
  - Token se refresca
  - Información del usuario cambia
  - Tenant cambia

**Entradas:**
- Peticiones a `/session/me`
- Eventos de invalidación

**Salidas:**
- Cache hit cuando es válido
- Petición HTTP solo cuando cache está expirado o inválido

**Validaciones:**
- Cache hit rate >80%
- Estados siempre consistentes
- Invalidación funciona correctamente

**Prioridad:** P1

---

### RF-5: Separación de Responsabilidades

**Descripción:**  
Separar claramente entre auth bootstrap, session validation, y silent refresh.

**Requisitos:**
- **Auth Bootstrap:** Solo en mount inicial de la app
- **Session Validation:** Verificación periódica (cada 5 minutos)
- **Silent Refresh:** Solo cuando token está cerca de expirar (<5 minutos)

**Entradas:**
- Mount de componentes
- Timer de validación periódica
- Detección de token próximo a expirar

**Salidas:**
- Auth bootstrap: 1 vez al inicio
- Session validation: Cada 5 minutos (silencioso)
- Silent refresh: Solo cuando es necesario

**Validaciones:**
- No hay llamadas redundantes
- Silent refresh no interrumpe UX
- Validación periódica no causa degradación

**Prioridad:** P1

---

### RF-6: Manejo Diferenciado de Errores HTTP

**Descripción:**  
Tratar 401, 403, y otros errores de forma diferente.

**Requisitos:**
- **401 Unauthorized:**
  - Token expirado → Intentar refresh (1 vez)
  - Refresh falla → Logout
  - Token inválido → Logout inmediato
- **403 Forbidden:**
  - Permisos insuficientes → Mostrar error, NO logout
  - Tenant incorrecto → Mostrar selector de tenant
- **429 Rate Limit:**
  - Activar cooldown
  - Usar cache si está disponible
  - No reintentar hasta que expire cooldown
- **500/503 Server Error:**
  - Retry con backoff exponencial (máx 3 intentos)
  - Mostrar mensaje de error al usuario

**Entradas:**
- Respuestas HTTP con diferentes status codes

**Salidas:**
- Acciones apropiadas según tipo de error
- UX clara para el usuario

**Validaciones:**
- 0 cierres de sesión por errores 403
- Refresh solo cuando es necesario
- Retry inteligente para errores transitorios

**Prioridad:** P1

---

## 5. Requisitos No Funcionales

### RNF-1: Performance

| Métrica | Valor Actual | Objetivo | Prioridad |
|---------|--------------|----------|------------|
| Tiempo de respuesta `/session/me` | ~3000ms | <200ms | P0 |
| Llamadas a `/session/me` por carga | 3-5 | 1 | P0 |
| Cache hit rate | ~40% | >80% | P1 |
| Tiempo de auth bootstrap | ~5000ms | <1000ms | P1 |

### RNF-2: Escalabilidad

- Soportar 1000+ usuarios concurrentes
- Performance estable bajo carga
- No degradación con múltiples tenants

### RNF-3: Seguridad

- Tokens siempre en cookies HttpOnly
- No exponer tokens en logs
- Rate limiting para prevenir abuse
- CSRF protection

### RNF-4: Observabilidad

- Logs estructurados para todas las operaciones de auth
- Métricas: llamadas/min, error rate, cache hit rate
- Alertas para refresh loops o errores 401 >5%

### RNF-5: Compatibilidad

- React 18+ (StrictMode)
- Next.js 14+
- Navegadores modernos (Chrome, Firefox, Safari, Edge)

---

## 6. Casos Edge

### CE-1: Token Expira Durante Navegación
**Escenario:** Usuario navega entre páginas, token expira a mitad de navegación.  
**Comportamiento esperado:** Silent refresh automático, navegación continúa sin interrupción.  
**Prioridad:** P0

### CE-2: Múltiples Tabs Abiertas
**Escenario:** Usuario tiene 3 tabs abiertas, hace logout en una.  
**Comportamiento esperado:** Todas las tabs detectan logout y redirigen a login.  
**Prioridad:** P1

### CE-3: Red Lenta/Inestable
**Escenario:** Conexión lenta, requests timeout.  
**Comportamiento esperado:** Retry con backoff exponencial, mostrar loading state, no hacer logout prematuro.  
**Prioridad:** P1

### CE-4: Refresh Token Expirado
**Escenario:** Refresh token expira, access token también expirado.  
**Comportamiento esperado:** Logout inmediato, redirigir a login con mensaje claro.  
**Prioridad:** P0

### CE-5: Usuario Sin Tenant
**Escenario:** Usuario autenticado pero sin tenant asignado.  
**Comportamiento esperado:** Mostrar selector de tenant o mensaje apropiado, NO logout.  
**Prioridad:** P1

### CE-6: Cambio de Tenant en Otra Tab
**Escenario:** Usuario cambia de tenant en tab A, tab B sigue con tenant anterior.  
**Comportamiento esperado:** Tab B detecta cambio y actualiza automáticamente (opcional, puede ser P2).  
**Prioridad:** P2

### CE-7: React StrictMode en Desarrollo
**Escenario:** StrictMode ejecuta efectos 2x.  
**Comportamiento esperado:** Sistema debe funcionar correctamente, 0 llamadas duplicadas.  
**Prioridad:** P2

### CE-8: Rate Limiting Activo
**Escenario:** Backend devuelve 429, cooldown activo.  
**Comportamiento esperado:** Usar cache si está disponible, no hacer más requests hasta que expire cooldown.  
**Prioridad:** P1

---

## 7. Criterios de Aceptación

### CA-1: Single Call a `/session/me`
- ✅ Máximo 1 llamada a `/session/me` por carga de página
- ✅ Todas las llamadas concurrentes comparten el mismo resultado
- ✅ Logs muestran "Request deduplicado" para llamadas adicionales

### CA-2: Zero Refresh Loops
- ✅ 0 refresh loops en logs durante 1 semana de pruebas
- ✅ Máximo 1 intento de refresh cada 60 segundos
- ✅ Refresh solo cuando token está expirado o próximo a expirar

### CA-3: Zero Cierres de Sesión Inesperados
- ✅ 0 cierres de sesión por errores 403
- ✅ 0 cierres de sesión cuando token es válido
- ✅ Logout solo cuando refresh token expira o usuario hace logout explícito

### CA-4: Performance Objetivo
- ✅ P95 de tiempo de respuesta <200ms
- ✅ P99 de tiempo de respuesta <500ms
- ✅ Cache hit rate >80%

### CA-5: Estado Consistente
- ✅ Todos los componentes muestran el mismo estado de auth
- ✅ Cache se invalida correctamente en logout
- ✅ SessionStorage sincronizado con estado de auth

### CA-6: Compatibilidad StrictMode
- ✅ 0 llamadas duplicadas en desarrollo con StrictMode
- ✅ Sistema funciona correctamente en producción (sin StrictMode)

---

## 8. Métricas de Éxito

### Métricas Principales (KPIs)

| Métrica | Baseline | Objetivo | Medición |
|---------|----------|----------|----------|
| **Llamadas a `/session/me` por carga** | 3-5 | 1 | Logs del cliente |
| **Tiempo de respuesta P95** | ~3000ms | <200ms | APM / Logs |
| **Tasa de errores 401** | ~15% | <1% | Logs del backend |
| **Refresh loops por sesión** | 2-5 | 0 | Logs del cliente |
| **Cache hit rate** | ~40% | >80% | Métricas del cliente |
| **Cierres de sesión inesperados** | ~10% | 0% | Analytics / Logs |

### Métricas Secundarias

| Métrica | Baseline | Objetivo | Medición |
|---------|----------|----------|----------|
| **Tiempo de auth bootstrap** | ~5000ms | <1000ms | Performance API |
| **Tasa de errores 403** | ~5% | <2% | Logs del backend |
| **Tasa de errores 429** | ~2% | <0.5% | Logs del backend |
| **Uso de memoria (cache)** | N/A | <10MB | DevTools |

---

## 9. Riesgos y Mitigaciones

### R-1: Breaking Changes en API
**Riesgo:** Cambios en `client.ts` pueden romper componentes existentes.  
**Mitigación:** Mantener API pública compatible, usar feature flags, testing exhaustivo.

### R-2: Cache Stale
**Riesgo:** Cache puede servir datos obsoletos.  
**Mitigación:** TTL corto (5 min), invalidación agresiva, versionado de cache.

### R-3: Race Conditions
**Riesgo:** A pesar del mutex, pueden quedar edge cases.  
**Mitigación:** Testing de concurrencia, logs detallados, code review exhaustivo.

### R-4: Performance en Dispositivos Lentos
**Riesgo:** Sistema puede ser lento en dispositivos antiguos.  
**Mitigación:** Optimizaciones, lazy loading, progressive enhancement.

---

## 10. Dependencias

### Dependencias Técnicas
- Next.js 14+ (App Router)
- React 18+
- NestJS (backend)
- Prisma (database)

### Dependencias de Equipo
- Backend team: Cambios en session controller
- Frontend team: Refactor de client.ts y layout.tsx
- QA: Testing exhaustivo de casos edge

---

## 11. Timeline Estimado

| Fase | Duración | Descripción |
|------|----------|-------------|
| **Fase 1: Diseño** | 2 días | AI-Spec completo, arquitectura detallada |
| **Fase 2: Implementación Core** | 5 días | AuthManager, mutex, anti-refresh-loop |
| **Fase 3: Integración** | 3 días | Integrar con componentes existentes |
| **Fase 4: Testing** | 3 días | Unit tests, integration tests, E2E |
| **Fase 5: Optimización** | 2 días | Performance tuning, cache optimization |
| **Total** | **15 días** | ~3 semanas |

---

## 12. Aprobaciones

- [ ] Product Owner
- [ ] Tech Lead
- [ ] Security Team
- [ ] QA Lead

---

**Próximo paso:** Ver AI-Spec para diseño técnico detallado.



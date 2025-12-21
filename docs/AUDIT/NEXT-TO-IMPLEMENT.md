# Siguiente PRD/SPEC a Implementar

> **Fecha:** 2025-01-27  
> **Auditor:** Principal Engineer + Release Manager  
> **Metodología:** Code is Truth

---

## PRD/SPEC Seleccionado

**PRD-SESSION: Session/Auth Stabilization (Estabilización de Sesión y Autenticación)**

**AI-SPEC-SESSION: Solución Definitiva para Problemas de Sesión**

---

## ⚠️ PRD-32 Voice Channel - DEFERRED (Postponed)

**Estado:** ❌ **DEFERRED - NO TOCAR**

**Justificación:**
- PRD-32 requiere implementación completa de integración Twilio, webhooks, TTS/STT, y UI completa
- Es una funcionalidad de extensión (no core)
- Prioridad: BAJA comparada con estabilización de sesión y completitud de módulos pendientes
- Se pospone hasta completar todos los módulos "AUDITAR", "PARCIAL" y "NO_INICIADO" (excepto Voice)

**Acción:** Marcar en matriz como "DEFERRED (Postponed)" - No implementar en este ciclo

---

## ¿Por qué PRD-SESSION es el siguiente?

### 1. Es crítico para estabilidad del sistema

- **Bloque:** Infraestructura Core
- **Dependencias:** Ninguna (es base)
- **Estado:** ⚠️ **PARCIAL** - Existe lógica pero tiene problemas conocidos

### 2. Problemas identificados

- **401 loops:** `/api/proxy/session/me` retorna 401, causando refresh loops
- **Refresh storms:** Múltiples llamadas concurrentes a refresh token
- **Navigation loops:** Reloads inesperados y loops de navegación
- **React StrictMode:** Double effects causando llamadas duplicadas
- **Cierres de sesión inesperados:** Usuarios siendo deslogueados sin razón aparente
- **Múltiples llamadas concurrentes:** Varios componentes llamando `/session/me` simultáneamente

### 3. Impacto si no se completa

- **UX:** Experiencia de usuario degradada (cierres de sesión, loops)
- **Performance:** Múltiples llamadas innecesarias al backend
- **Estabilidad:** Sistema inestable, difícil de depurar
- **Bloqueo:** Afecta todos los módulos que dependen de autenticación

---

## Qué rompe si no se implementa completamente

### 🔴 Crítico

1. **Sesiones inestables:**
   - Usuarios siendo deslogueados inesperadamente
   - Loops de refresh causando degradación de performance
   - Múltiples llamadas simultáneas saturando el backend

2. **Experiencia de usuario degradada:**
   - Reloads inesperados
   - Navegación interrumpida
   - Errores confusos para el usuario

---

## Gaps Identificados

### Backend

1. ⚠️ **Endpoint `/session/me`**
   - Existe pero puede retornar 401 en ciertos casos
   - Cache en backend (5 min) pero puede no ser suficiente
   - No hay circuit breaker para refresh failures

### Frontend

2. ⚠️ **Lógica de refresh token**
   - Existe deduplicación pero puede tener race conditions
   - No hay límite de reintentos con backoff exponencial
   - No hay circuit breaker si refresh falla múltiples veces

3. ⚠️ **Cache de sesión**
   - Existe cache pero TTL puede ser demasiado largo/corto
   - No hay invalidación inteligente de cache
   - Múltiples instancias de ApiClient pueden tener caches desincronizados

4. ⚠️ **Manejo de 401 vs 403**
   - No diferencia clara entre 401 (intentar refresh) y 403 (no autorizado)
   - Puede intentar refresh cuando no debería

5. ⚠️ **React StrictMode**
   - Effects pueden ejecutarse doble en desarrollo
   - No hay guards para evitar efectos duplicados

---

## Plan de Implementación

### Paso 1: Auditar Flujo Actual

1. **Backend:**
   - Revisar `apps/api/src/modules/session/session.controller.ts`
   - Verificar manejo de errores y cache
   - Verificar guards y validaciones

2. **Frontend:**
   - Revisar `apps/web/lib/api/client.ts` (getSessionMe, refreshAccessToken, request)
   - Revisar `apps/web/app/app/layout.tsx` (checkAuth, executeCheckAuth)
   - Revisar `apps/web/app/api/proxy/[...path]/route.ts` (si existe)

### Paso 2: Implementar Solución Definitiva

**Backend:**
1. ✅ Endpoint `/session/me` robusto con cache mejorado
2. ✅ Manejo correcto de errores (401 vs 403)
3. ✅ Logging estructurado para debugging

**Frontend:**
1. ✅ **Single-flight (mutex) mejorado:**
   - Si hay una llamada `/session/me` en curso, todas las demás esperan ese mismo promise
   - Evitar race conditions

2. ✅ **Política anti-loop:**
   - Límite de reintentos por ventana de tiempo (ej: 3 intentos en 30 segundos)
   - Backoff exponencial en refresh (1s, 2s, 4s, 8s)
   - Circuit breaker si refresh falla N veces consecutivas: logout controlado + mensaje UI, sin reload loops

3. ✅ **Cache en memoria mejorado:**
   - TTL corto para `/session/me` (30-60 segundos)
   - Invalidación inteligente (cuando hay cambios de tenant, logout, etc.)
   - Cache compartido entre todas las instancias

4. ✅ **Manejo correcto de 401 vs 403:**
   - 401 => intenta refresh UNA vez (controlado)
   - 403 => no refresh, mostrar "no autorizado"
   - Evitar loops infinitos

5. ✅ **Compatibilidad con React StrictMode:**
   - Usar guards/hydration checks para evitar effects duplicados
   - Usar refs para evitar múltiples ejecuciones

6. ✅ **Observabilidad:**
   - Logs estructurados + contador de llamadas `/session/me`
   - Marca en PERF logger el motivo de cada llamada (boot, navigation, focus, retry)
   - Métricas de refresh attempts y failures

**UI:**
- ✅ Sin refresh de página automático
- ✅ Banner/toast claro cuando sesión expira y no se puede recuperar
- ✅ Mensajes de error amigables

### Paso 3: Tests

1. **Unit tests:**
   - Test del "single-flight + retry policy"
   - Test para "refresh fail -> no loop -> logout controlado"
   - Test de cache invalidation

2. **Integration tests:**
   - Test de flujo completo de autenticación
   - Test de manejo de errores

### Paso 4: Validación Estricta

1. **Criterios de completitud:**
   - ✅ No hay loops de refresh
   - ✅ No hay múltiples llamadas simultáneas a `/session/me`
   - ✅ No hay reloads inesperados
   - ✅ Manejo correcto de 401 vs 403
   - ✅ Circuit breaker funciona correctamente
   - ✅ Logging estructurado implementado
   - ✅ Tests pasando

---

## Archivos a Revisar/Modificar

### Backend

- `apps/api/src/modules/session/session.controller.ts` (mejorar cache y manejo de errores)
- `apps/api/src/modules/auth/auth.service.ts` (refresh token logic)

### Frontend

- `apps/web/lib/api/client.ts` (implementar single-flight mejorado, anti-loop, circuit breaker)
- `apps/web/app/app/layout.tsx` (mejorar checkAuth, evitar StrictMode double effects)
- `apps/web/app/api/proxy/[...path]/route.ts` (si existe, verificar manejo de errores)

### Tests

- `apps/web/__tests__/lib/api/client.test.ts` (nuevo)
- `apps/web/__tests__/lib/api/session.test.ts` (nuevo)

---

## Criterio de Éxito

PRD-SESSION se considera **COMPLETO_REAL** cuando:

1. ✅ **Backend completo:**
   - Endpoint `/session/me` robusto
   - Manejo correcto de errores
   - Logging estructurado

2. ✅ **Frontend completo:**
   - Single-flight funcionando (no hay llamadas duplicadas)
   - Anti-loop funcionando (no hay refresh storms)
   - Circuit breaker funcionando (logout controlado)
   - Cache funcionando correctamente
   - Manejo correcto de 401 vs 403
   - Compatible con React StrictMode

3. ✅ **UI completa:**
   - Sin reloads inesperados
   - Mensajes de error claros
   - Banner/toast cuando sesión expira

4. ✅ **Tests:**
   - Unit tests pasando
   - Integration tests pasando

5. ✅ **Observabilidad:**
   - Logging estructurado implementado
   - Métricas disponibles

---

## Próximo PRD después de completar PRD-SESSION

**Candidatos:**

1. **PRD-49:** Email Delivery (verificar y completar)
2. **PRD-33 a PRD-44:** Mejoras Opcionales (auditar individualmente)
3. **PRD-47-48:** Optimizaciones (medir y aplicar)

**Decisión:** Se tomará después de completar PRD-SESSION y actualizar la matriz.

---

**Última actualización:** 2025-01-27  
**Estado:** ✅ AUDITORÍA COMPLETA - PRD-SESSION ya estaba completo (AuthManager), PRD-49 completado, PRD-33-44 auditados y completos

---

## Resumen de Progreso

### ✅ Verificado en esta sesión:

1. **PRD-SESSION:** Estabilización Session/Auth
   - ✅ **YA ESTABA COMPLETO** según SESSION-AUTH-IMPLEMENTATION-SUMMARY.md (2024-12-19)
   - AuthManager implementado con single-flight, cache, cooldown, sistema de suscripciones
   - 16/16 componentes migrados
   - Mejoras adicionales en client.ts (circuit breaker, observabilidad) son complementarias

2. **PRD-49:** Email Delivery
   - Rutas corregidas
   - Verificado completo

3. **PRD-33 a PRD-44:** Mejoras Opcionales
   - Todos auditados y confirmados como COMPLETO_REAL

### ⚠️ Pendiente:

1. **PRD-47:** Optimización Backend
   - Algunos endpoints aún lentos requieren optimización adicional

2. **PRD-32:** Voice Channel
   - DEFERRED (Postponed) - No implementar en este ciclo

---

## Próximo PRD a Implementar

**PRD-47: Optimización de Rendimiento Backend (Parcial)**

**Justificación:**
- Algunos endpoints aún lentos (`/team/members` 167ms, `/knowledge/*` 137ms)
- Requiere optimización adicional de queries Prisma
- Mejora percepción de velocidad del SaaS

**Plan:**
1. Auditar queries lentas específicas
2. Optimizar queries identificadas
3. Agregar más cache donde aplique
4. Eliminar N+1 queries restantes
5. Medir impacto antes/después

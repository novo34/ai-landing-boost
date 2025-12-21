# Fixes: Conectividad y Autenticación

> **Fecha:** 2025-01-XX  
> **Tipo:** Corrección de errores críticos  
> **Prioridad:** 🔴 CRÍTICA

---

## 📋 Resumen Ejecutivo

Se han corregido errores críticos de conectividad y autenticación que impedían el funcionamiento correcto del frontend cuando:
- El backend no está disponible (ERR_CONNECTION_REFUSED)
- El usuario no tiene permisos para acceder a endpoints protegidos (403)
- La conexión WebSocket falla

---

## 🔍 Root Causes Identificados

### 1. ERR_CONNECTION_REFUSED / Failed to fetch
**Causa:** 
- El backend no está levantado o la URL está mal configurada
- El cliente no detectaba específicamente estos errores de red
- No había manejo graceful cuando el backend está caído

**Evidencia:**
- Logs: `GET http://localhost:3001/users/me net::ERR_CONNECTION_REFUSED`
- El frontend intentaba hacer requests infinitos sin manejar el error

### 2. 403 Forbidden en `/billing/current`
**Causa:**
- El endpoint requiere rol `OWNER` o `ADMIN` (ver `billing.controller.ts:30`)
- Usuarios con rol `AGENT` o `VIEWER` reciben 403, que es esperado
- El frontend no manejaba este caso gracefully

**Evidencia:**
- Logs: `GET http://localhost:3001/billing/current 403 (Forbidden)`
- El banner de suscripción intentaba cargar datos sin verificar permisos

### 3. WebSocket Connection Failed
**Causa:**
- La URL del WebSocket puede estar mal formada
- No hay validación de URL antes de conectar
- Reconexión agresiva cuando el backend está caído

**Evidencia:**
- Logs: `ws://localhost:3001/socket.io/... failed: WebSocket is closed before the connection is established`

---

## ✅ Fixes Aplicados

### 1. `apps/web/lib/api/client.ts`

**Cambios:**
- ✅ Validación de `API_BASE_URL` en desarrollo
- ✅ Detección mejorada de errores de conexión (ERR_CONNECTION_REFUSED, Failed to fetch, etc.)
- ✅ Manejo específico de 403 en `getCurrentSubscription()` con comentarios explicativos
- ✅ Comentarios con referencias a documentación oficial

**Código clave:**
```typescript
// Detectar errores de conexión específicos
const isConnectionError = 
  error.message.includes('Failed to fetch') ||
  error.message.includes('ERR_CONNECTION_REFUSED') ||
  error.message.includes('ERR_NETWORK_CHANGED') ||
  // ... más variantes

if (isConnectionError) {
  return {
    success: false,
    error_key: 'errors.connection_refused',
    data: undefined,
  };
}
```

### 2. `apps/web/components/billing/subscription-warning-banner.tsx`

**Cambios:**
- ✅ Manejo graceful de 403 cuando el usuario no tiene rol OWNER/ADMIN
- ✅ No mostrar banner si el backend está caído (evita confusión)
- ✅ Manejo silencioso de errores esperados

**Código clave:**
```typescript
if (response.error_key === 'auth.insufficient_permissions' || 
    response.error_key === 'auth.role_required') {
  // Usuario no tiene rol OWNER/ADMIN, no mostrar banner
  setSubscription(null);
}
```

### 3. `apps/web/hooks/use-notifications.ts`

**Cambios:**
- ✅ Validación de URL antes de conectar WebSocket
- ✅ Configuración mejorada de reconexión (backoff incremental)
- ✅ Manejo graceful de errores de conexión
- ✅ Comentarios con referencias a documentación oficial

**Código clave:**
```typescript
// Validar URL antes de conectar
try {
  new URL(apiUrl);
} catch {
  // No conectar si la URL es inválida
  return;
}

const newSocket = io(`${apiUrl}/notifications`, {
  reconnectionDelayMax: 10000, // Backoff máximo
  timeout: 10000, // Timeout de conexión
  // ...
});
```

### 4. `apps/web/app/app/layout.tsx`

**Cambios:**
- ✅ No redirigir a login si el backend está caído (permite UI en modo offline)
- ✅ Manejo diferenciado de errores (rate limit vs conexión vs auth)

**Código clave:**
```typescript
if (errorMessage.includes('connection_refused') || 
    errorMessage.includes('Failed to fetch')) {
  // No redirigir a login si el backend está caído
  setIsChecking(false);
  return;
}
```

---

## 📁 Archivos Modificados

1. `apps/web/lib/api/client.ts` - Mejoras en manejo de errores y validación
2. `apps/web/components/billing/subscription-warning-banner.tsx` - Manejo graceful de 403
3. `apps/web/hooks/use-notifications.ts` - Validación y mejor manejo de WebSocket
4. `apps/web/app/app/layout.tsx` - Manejo mejorado cuando backend está caído

---

## 🧪 Cómo Probar

### Test 1: Backend Caído
1. **Preparación:** Asegúrate de que el backend NO esté corriendo
2. **Acción:** Abre el frontend en `http://localhost:3000` (o el puerto configurado)
3. **Resultado esperado:**
   - ✅ No debe haber errores infinitos en consola
   - ✅ La UI debe cargar (aunque sin datos del backend)
   - ✅ No debe redirigir a login automáticamente
   - ✅ Los logs deben mostrar mensajes claros sobre el backend no disponible

### Test 2: Usuario sin Permisos (403)
1. **Preparación:** 
   - Inicia sesión con un usuario que tenga rol `AGENT` o `VIEWER`
   - Asegúrate de que el backend esté corriendo
2. **Acción:** Navega a `/app` (donde se muestra el banner de suscripción)
3. **Resultado esperado:**
   - ✅ No debe aparecer el banner de suscripción
   - ✅ No debe haber errores en consola sobre 403
   - ✅ La página debe cargar normalmente

### Test 3: WebSocket con Backend Caído
1. **Preparación:** Asegúrate de que el backend NO esté corriendo
2. **Acción:** 
   - Inicia sesión (si es posible) o carga la app
   - Abre la consola del navegador
3. **Resultado esperado:**
   - ✅ No debe haber intentos infinitos de reconexión
   - ✅ Los errores de WebSocket deben ser manejados gracefully
   - ✅ No debe bloquear la UI

### Test 4: Backend Disponible (Happy Path)
1. **Preparación:** 
   - Asegúrate de que el backend esté corriendo en `http://localhost:3001`
   - Verifica que `NEXT_PUBLIC_API_URL` esté configurado correctamente
2. **Acción:** 
   - Inicia sesión con un usuario OWNER o ADMIN
   - Navega por la aplicación
3. **Resultado esperado:**
   - ✅ Todas las peticiones deben funcionar normalmente
   - ✅ El banner de suscripción debe aparecer si aplica
   - ✅ WebSocket debe conectarse correctamente

---

## 📚 Referencias Oficiales Usadas

### Next.js Environment Variables
- **URL:** https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
- **Uso:** Validación de `NEXT_PUBLIC_API_URL` y documentación sobre variables públicas

### Fetch API Error Handling
- **URL:** https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
- **Uso:** Manejo de errores de red (ERR_CONNECTION_REFUSED, Failed to fetch)

### Socket.IO Client Options
- **URL:** https://socket.io/docs/v4/client-options/
- **Uso:** Configuración de `withCredentials`, `reconnection`, `timeout`

### Socket.IO Cookies (HttpOnly)
- **URL:** https://socket.io/how-to/deal-with-cookies
- **Uso:** Autenticación con cookies HttpOnly en WebSocket

### HTTP Status Codes
- **URL:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **Uso:** Manejo de 401, 403, 429, etc.

---

## ✅ Checklist para Evitar Regresiones

### Antes de Deploy
- [ ] Verificar que `NEXT_PUBLIC_API_URL` esté configurado correctamente
- [ ] Probar con backend caído (no debe romper la UI)
- [ ] Probar con usuario sin permisos (no debe mostrar errores)
- [ ] Verificar que WebSocket no intente reconectar infinitamente
- [ ] Revisar logs de consola (no debe haber spam de errores)

### En Desarrollo
- [ ] Si cambias la URL del backend, actualizar `NEXT_PUBLIC_API_URL`
- [ ] Si añades nuevos endpoints protegidos, verificar manejo de 403
- [ ] Si cambias la configuración de WebSocket, verificar reconexión

### Monitoreo
- [ ] Revisar logs de errores de conexión en producción
- [ ] Monitorear intentos de reconexión de WebSocket
- [ ] Verificar que los usuarios sin permisos no vean errores confusos

---

## 🔄 Próximos Pasos (Opcional)

1. **Mejora de UX:** Mostrar un banner cuando el backend está caído (en lugar de fallar silenciosamente)
2. **Retry Logic:** Implementar retry con backoff exponencial para requests críticos
3. **Offline Mode:** Detectar cuando el usuario está offline y mostrar UI apropiada
4. **Health Check:** Endpoint de health check para verificar estado del backend antes de hacer requests

---

## 📝 Notas Técnicas

- Los cambios son **mínimos y quirúrgicos**: solo se modificó lo necesario para arreglar los problemas
- No se refactorizó código existente que funcionaba correctamente
- Se mantiene la lógica de autenticación existente (cookies HttpOnly)
- Los comentarios incluyen referencias a documentación oficial para facilitar mantenimiento futuro

---

**Autor:** Senior Full-Stack Engineer  
**Revisión:** Pendiente  
**Estado:** ✅ Completado

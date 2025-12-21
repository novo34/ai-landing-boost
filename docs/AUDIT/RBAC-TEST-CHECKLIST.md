# Checklist de Pruebas RBAC - PLATFORM_OWNER y Multi-tenant

> **Fecha:** 2025-12-15  
> **Rol:** Security + RBAC Engineer (Multi-tenant)  
> **Estado:** ✅ Listo para pruebas

---

## Pruebas para PLATFORM_OWNER

### PLATFORM_OWNER con tenants (caso: kmfponce@gmail.com)

#### Login y Redirección
- [ ] **Login redirige a `/platform`**
  - Hacer login con `kmfponce@gmail.com`
  - Verificar que después del login se redirige a `http://localhost:3000/platform`
  - **No debe** redirigir a `/app`

- [ ] **Dashboard de plataforma se carga correctamente**
  - Verificar que se muestra "Dashboard de Plataforma"
  - Verificar que se muestran métricas globales (tenants, usuarios, MRR, etc.)
  - **No debe** mostrar información de un tenant específico

#### Acceso a Rutas de Plataforma
- [ ] **Puede acceder a `/platform/tenants`**
  - Verificar que se muestra lista de todos los tenants
  - Verificar que puede ver detalles de cualquier tenant

- [ ] **Puede acceder a `/platform/billing`**
  - Verificar que se muestra información de facturación global

- [ ] **Puede acceder a `/platform/audit`**
  - Verificar que se muestran logs de auditoría

- [ ] **Puede acceder a `/platform/leads`**
  - Verificar que se muestra CRM de leads

- [ ] **Puede acceder a `/platform/tickets`**
  - Verificar que se muestran tickets de soporte

#### Navegación a /app (con tenant)
- [ ] **Puede navegar manualmente a `/app`**
  - Desde `/platform`, navegar a `/app`
  - Verificar que `RoleRouter` redirige de vuelta a `/platform` (o permite acceso si el usuario quiere)
  - **Alternativa:** Si se permite acceso, verificar que se muestra dashboard de tenant

- [ ] **Botón "Switch to Platform" es visible en `/app`**
  - En la sidebar de `/app`, verificar que aparece botón "Dashboard Plataforma"
  - Verificar que al hacer clic, redirige a `/platform`

- [ ] **Dashboard de tenant muestra rol correcto**
  - En `/app`, verificar que se muestra "Tu rol: OWNER" (rol de tenant, no platformRole)
  - Verificar que se muestra información del tenant actual

#### Cambio de Tenant
- [ ] **Selector de tenant funciona**
  - Si el usuario tiene múltiples tenants, verificar que aparece selector
  - Verificar que al cambiar de tenant, el dashboard de `/app` se actualiza
  - Verificar que el header `x-tenant-id` se actualiza correctamente

### PLATFORM_OWNER sin tenants (caso teórico)

**Nota:** Este caso puede no ser posible actualmente porque `AuthService.login` requiere al menos un tenant. Si se implementa en el futuro:

- [ ] **Login funciona sin tenant**
  - Hacer login con usuario que tiene `platformRole = PLATFORM_OWNER` pero 0 tenants
  - Verificar que el login no falla con `auth.no_tenant_available`

- [ ] **`/session/me` devuelve datos correctos**
  - Verificar que `platformRole: "PLATFORM_OWNER"` está presente
  - Verificar que `currentTenant: null`
  - Verificar que `tenants: []`

- [ ] **Redirige a `/platform` después del login**
  - Verificar que se redirige a `/platform` incluso sin tenant

- [ ] **Puede acceder a todas las rutas `/platform/**`**
  - Verificar que puede acceder a todas las secciones del panel de plataforma

- [ ] **No puede acceder a `/app/**`**
  - Verificar que al intentar acceder a `/app`, se muestra mensaje apropiado o se redirige

---

## Pruebas para Usuarios Normales (sin platformRole)

### OWNER de Tenant

- [ ] **Login redirige a `/app/admin`**
  - Hacer login con usuario que tiene rol `OWNER` en un tenant
  - Verificar que se redirige a `/app/admin` (o `/app` si la ruta no existe aún)

- [ ] **Dashboard muestra información de administración**
  - Verificar que se muestran secciones de billing, equipo, configuración
  - Verificar que puede acceder a `/app/billing`
  - Verificar que puede acceder a `/app/settings`
  - Verificar que puede acceder a `/app/settings/team`

- [ ] **NO puede acceder a `/platform`**
  - Intentar navegar a `/platform`
  - Verificar que se redirige a `/app` o muestra error 403

- [ ] **Botón "Switch to Platform" NO es visible**
  - Verificar que en la sidebar NO aparece el botón "Dashboard Plataforma"

### ADMIN de Tenant

- [ ] **Login redirige a `/app/admin`**
  - Hacer login con usuario que tiene rol `ADMIN` en un tenant
  - Verificar que se redirige a `/app/admin`

- [ ] **Dashboard muestra información de administración**
  - Similar a OWNER, pero puede tener algunas restricciones según permisos

- [ ] **NO puede acceder a `/platform`**
  - Verificar que se redirige a `/app`

### AGENT de Tenant

- [ ] **Login redirige a `/app/agent`**
  - Hacer login con usuario que tiene rol `AGENT` en un tenant
  - Verificar que se redirige a `/app/agent` (o `/app` si la ruta no existe)

- [ ] **Dashboard muestra conversaciones y tareas**
  - Verificar que se muestran conversaciones asignadas
  - Verificar que puede acceder a `/app/conversations`
  - Verificar que puede acceder a `/app/appointments`

- [ ] **NO puede acceder a `/app/billing`**
  - Verificar que al intentar acceder, se muestra error 403 o se redirige

- [ ] **NO puede acceder a `/platform`**
  - Verificar que se redirige a `/app`

### VIEWER de Tenant

- [ ] **Login redirige a `/app/viewer`**
  - Hacer login con usuario que tiene rol `VIEWER` en un tenant
  - Verificar que se redirige a `/app/viewer` (o `/app` si la ruta no existe)

- [ ] **Dashboard muestra solo estadísticas y reportes**
  - Verificar que se muestran métricas en modo solo lectura
  - Verificar que NO puede editar contenido

- [ ] **NO puede acceder a `/app/billing`**
  - Verificar que se muestra error 403

- [ ] **NO puede acceder a `/app/settings`**
  - Verificar que se muestra error 403 o se oculta la opción

- [ ] **NO puede acceder a `/platform`**
  - Verificar que se redirige a `/app`

---

## Pruebas Multi-Tenant

### Usuario con Múltiples Tenants

- [ ] **Login redirige según tenant del JWT**
  - Hacer login con usuario que tiene múltiples tenants
  - Verificar que se redirige al dashboard del tenant que está en el JWT

- [ ] **Selector de tenant aparece**
  - Verificar que en la sidebar o header aparece un selector de tenant
  - Verificar que muestra todos los tenants del usuario con su rol

- [ ] **Cambio de tenant funciona**
  - Seleccionar un tenant diferente del selector
  - Verificar que el dashboard se actualiza con información del nuevo tenant
  - Verificar que el header `x-tenant-id` se actualiza
  - Verificar que las peticiones siguientes usan el nuevo tenant

- [ ] **Rol cambia según tenant seleccionado**
  - Si el usuario es `OWNER` en tenant A y `AGENT` en tenant B:
    - Seleccionar tenant A → verificar que se muestra rol `OWNER` y dashboard de administración
    - Seleccionar tenant B → verificar que se muestra rol `AGENT` y dashboard de agente

### Usuario con 1 Solo Tenant

- [ ] **No aparece selector de tenant**
  - Verificar que si el usuario solo tiene 1 tenant, no aparece selector
  - Verificar que se redirige directamente al dashboard según su rol

- [ ] **Login redirige directamente al dashboard correcto**
  - Verificar que no hay pasos intermedios de selección de tenant

---

## Pruebas de Seguridad

### Autenticación

- [ ] **Usuario sin autenticación es redirigido a `/login`**
  - Intentar acceder a `/app` sin estar logueado
  - Verificar que se redirige a `/login`

- [ ] **Usuario con JWT inválido es redirigido a `/login`**
  - Modificar cookie `access_token` con valor inválido
  - Verificar que se redirige a `/login`

- [ ] **Usuario con JWT expirado es redirigido a `/login`**
  - Esperar a que expire el token (o simular expiración)
  - Verificar que se redirige a `/login`

### Autorización

- [ ] **Usuario sin `platformRole` no puede acceder a `/platform`**
  - Intentar navegar a `/platform` con usuario normal
  - Verificar que se redirige a `/app` o muestra error 403

- [ ] **Usuario con `platformRole` puede acceder a `/platform`**
  - Verificar que `PLATFORM_OWNER` puede acceder a todas las rutas `/platform/**`

- [ ] **Usuario no puede acceder a endpoints sin el rol requerido**
  - Intentar acceder a `/app/billing` con rol `AGENT`
  - Verificar que se muestra error 403

- [ ] **Usuario no puede acceder a tenants sin membership**
  - Intentar enviar header `x-tenant-id` con un tenant al que no pertenece
  - Verificar que el backend rechaza la petición con error 403

### Validación de Tenant

- [ ] **Header `x-tenant-id` se valida contra memberships**
  - Enviar petición con `x-tenant-id` de un tenant al que el usuario no pertenece
  - Verificar que el backend rechaza con error `tenants.no_access`

- [ ] **JWT `tenantId` se usa como fallback**
  - Hacer petición sin header `x-tenant-id`
  - Verificar que el backend usa `tenantId` del JWT

- [ ] **Primer tenant activo se usa como último fallback**
  - Si no hay `x-tenant-id` ni `tenantId` en JWT, verificar que se usa el primer tenant activo

---

## Pruebas de Edge Cases

### Usuario sin Tenants

- [ ] **Usuario sin tenants muestra mensaje apropiado**
  - Si un usuario no tiene ningún tenant (y no es PLATFORM_OWNER)
  - Verificar que se muestra mensaje apropiado o se redirige a registro/invitación

### Usuario con Tenant Suspendido

- [ ] **Usuario con tenant suspendido muestra mensaje apropiado**
  - Verificar que si el tenant está `SUSPENDED`, se muestra mensaje apropiado
  - Verificar que no puede acceder a datos del tenant suspendido

### Cambio de Tenant Durante Sesión

- [ ] **Cambio de tenant durante sesión funciona correctamente**
  - Estar en `/app` con tenant A
  - Cambiar a tenant B usando selector
  - Verificar que el dashboard se actualiza correctamente
  - Verificar que las peticiones siguientes usan tenant B

### Refresh Token

- [ ] **Refresh token mantiene el tenant correcto**
  - Hacer varias peticiones hasta que expire el access token
  - Verificar que el refresh token regenera access token con el mismo `tenantId`
  - Verificar que no se pierde el contexto del tenant

### Logout

- [ ] **Logout limpia sessionStorage correctamente**
  - Hacer logout
  - Verificar que `sessionStorage.currentTenantId` se limpia
  - Verificar que las cookies se limpian
  - Verificar que se redirige a `/login`

---

## Pruebas de Endpoint `/session/me`

### Respuesta Correcta

- [ ] **`/session/me` devuelve estructura correcta**
  - Hacer petición a `GET /session/me` con usuario autenticado
  - Verificar que la respuesta tiene:
    ```json
    {
      "success": true,
      "data": {
        "user": { "id", "email", "name", "locale", "timeZone" },
        "platformRole": "PLATFORM_OWNER" | null,
        "tenants": [{ "tenantId", "name", "slug", "status", "role" }],
        "currentTenant": { "tenantId", "name", "slug", "status", "role" } | null
      }
    }
    ```

- [ ] **`platformRole` está presente**
  - Para usuario `kmfponce@gmail.com`, verificar que `platformRole: "PLATFORM_OWNER"`
  - Para usuario normal, verificar que `platformRole: null`

- [ ] **`currentTenant` coincide con JWT**
  - Verificar que `currentTenant.tenantId` coincide con `tenantId` del JWT
  - Si se envía header `x-tenant-id`, verificar que `currentTenant` corresponde a ese tenant

### Sin Tenant

- [ ] **`/session/me` funciona sin tenant**
  - Para usuario sin tenants (si es posible), verificar que:
    - `platformRole` está presente (si aplica)
    - `tenants: []`
    - `currentTenant: null`
  - Verificar que el endpoint no falla

### Validación de Guards

- [ ] **`/session/me` requiere autenticación**
  - Hacer petición sin cookie `access_token`
  - Verificar que se rechaza con 401

- [ ] **`/session/me` valida JWT**
  - Hacer petición con JWT inválido
  - Verificar que se rechaza con 401

---

## Pruebas de Integración

### Flujo Completo: Login → Dashboard

- [ ] **PLATFORM_OWNER: Login → `/platform`**
  1. Hacer login con `kmfponce@gmail.com`
  2. Verificar redirección a `/platform`
  3. Verificar que dashboard de plataforma se carga
  4. Verificar que se muestran métricas globales

- [ ] **OWNER: Login → `/app/admin`**
  1. Hacer login con usuario OWNER
  2. Verificar redirección a `/app/admin` (o `/app`)
  3. Verificar que dashboard de tenant se carga
  4. Verificar que se muestra "Tu rol: OWNER"

- [ ] **AGENT: Login → `/app/agent`**
  1. Hacer login con usuario AGENT
  2. Verificar redirección a `/app/agent` (o `/app`)
  3. Verificar que dashboard de agente se carga
  4. Verificar que se muestra "Tu rol: AGENT"

### Flujo Completo: Cambio de Tenant

- [ ] **Multi-tenant: Cambio de tenant → Dashboard actualizado**
  1. Hacer login con usuario multi-tenant
  2. Verificar que se muestra selector de tenant
  3. Seleccionar tenant diferente
  4. Verificar que dashboard se actualiza
  5. Verificar que el rol mostrado corresponde al nuevo tenant

---

## Pruebas de Performance

- [ ] **`/session/me` es rápido**
  - Verificar que la petición a `/session/me` tarda < 500ms
  - Verificar que no hay múltiples queries a BD innecesarias

- [ ] **Cache funciona correctamente**
  - Verificar que `getCurrentUserWithRole()` usa cache (60s TTL)
  - Verificar que el cache se limpia después de logout

---

## Pruebas de UI/UX

### Botón "Switch to Platform"

- [ ] **Botón solo visible para PLATFORM_OWNER**
  - En `/app`, verificar que el botón aparece solo si `platformRole` existe
  - Verificar que el botón tiene icono `Shield`
  - Verificar que al hacer clic, redirige a `/platform`

### Selector de Tenant

- [ ] **Selector solo aparece si hay múltiples tenants**
  - Verificar que si el usuario tiene 1 solo tenant, no aparece selector
  - Verificar que si el usuario tiene 2+ tenants, aparece selector

- [ ] **Selector muestra información correcta**
  - Verificar que muestra nombre del tenant
  - Verificar que muestra rol del usuario en ese tenant
  - Verificar que muestra estado del tenant (ACTIVE, TRIAL, etc.)

---

## Notas para Ejecutar Pruebas

### Usuarios de Prueba Recomendados

1. **PLATFORM_OWNER con tenants:**
   - Email: `kmfponce@gmail.com`
   - `platformRole: "PLATFORM_OWNER"`
   - Tiene al menos 1 tenant con rol `OWNER`

2. **Usuario normal OWNER:**
   - Crear usuario normal sin `platformRole`
   - Asignar rol `OWNER` en un tenant

3. **Usuario normal AGENT:**
   - Crear usuario normal sin `platformRole`
   - Asignar rol `AGENT` en un tenant

4. **Usuario multi-tenant:**
   - Crear usuario con memberships en 2+ tenants
   - Asignar diferentes roles en cada tenant (ej: `OWNER` en tenant A, `AGENT` en tenant B)

### Comandos Útiles

```bash
# Verificar platformRole en BD
mysql> SELECT email, platformRole FROM user WHERE email = 'kmfponce@gmail.com';

# Asignar platformRole (si es necesario)
mysql> UPDATE user SET platformRole = 'PLATFORM_OWNER' WHERE email = 'kmfponce@gmail.com';

# Verificar tenants de un usuario
mysql> SELECT u.email, tm.role, t.name, t.status 
       FROM user u 
       JOIN tenantmembership tm ON u.id = tm.userId 
       JOIN tenant t ON tm.tenantId = t.id 
       WHERE u.email = 'kmfponce@gmail.com';
```

### Debug en Navegador

```javascript
// Verificar sesión actual
fetch('http://localhost:3001/session/me', { credentials: 'include' })
  .then(r => r.json())
  .then(console.log);

// Verificar tenantId en sessionStorage
console.log(sessionStorage.getItem('currentTenantId'));
```

---

**Firma:** Security + RBAC Engineer (Multi-tenant)  
**Fecha:** 2025-12-15

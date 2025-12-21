# PRD-09: Gestión de Equipo Completa (Invitaciones, Roles, Ownership Transfer)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente  
> **Bloque:** A - Fundamentos  
> **Dependencias:** PRD-07

---

## Objetivo

Completar el sistema de gestión de equipos permitiendo a OWNER y ADMIN invitar miembros, gestionar roles, transferir ownership, y remover miembros del tenant.

---

## Alcance INCLUIDO

- ✅ Sistema de invitaciones funcional (completar PRD-07)
- ✅ Listado de miembros del equipo
- ✅ Gestión de roles (cambiar rol de miembro)
- ✅ Remover miembros del equipo
- ✅ Transferencia de ownership
- ✅ UI completa para gestión de equipo
- ✅ Validaciones de permisos
- ✅ Notificaciones por email

---

## Alcance EXCLUIDO

- ❌ Permisos granulares (queda para futuro)
- ❌ Grupos de usuarios (queda para futuro)
- ❌ Historial de cambios de roles (queda para futuro)
- ❌ Invitaciones masivas (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Listado de Miembros

**Descripción:** OWNER y ADMIN deben poder ver todos los miembros del equipo con sus roles.

**Información a mostrar:**
- Nombre y email
- Rol actual
- Fecha de unión
- Estado (activo, invitación pendiente)
- Última actividad (opcional)

---

### RF-02: Cambiar Rol de Miembro

**Descripción:** OWNER puede cambiar el rol de cualquier miembro. ADMIN puede cambiar rol de AGENT y VIEWER.

**Reglas:**
- OWNER no puede cambiar su propio rol
- No puede haber múltiples OWNER (excepto durante transferencia)
- ADMIN no puede cambiar rol de OWNER u otro ADMIN

**Flujo:**
1. OWNER/ADMIN accede a lista de miembros
2. Hace clic en "Cambiar rol" en un miembro
3. Selecciona nuevo rol
4. Confirma cambio
5. Sistema actualiza rol en BD
6. Se envía notificación al miembro (opcional)

---

### RF-03: Remover Miembro

**Descripción:** OWNER y ADMIN deben poder remover miembros del equipo.

**Reglas:**
- OWNER no puede remover a sí mismo
- ADMIN no puede remover a OWNER
- Al remover, se elimina la membresía (TenantMembership)
- Si el usuario solo estaba en este tenant, se puede considerar eliminar usuario (opcional)

**Flujo:**
1. OWNER/ADMIN accede a lista de miembros
2. Hace clic en "Remover" en un miembro
3. Confirma acción
4. Sistema elimina TenantMembership
5. Se envía notificación al miembro removido

---

### RF-04: Transferencia de Ownership

**Descripción:** OWNER debe poder transferir la propiedad del tenant a otro miembro.

**Flujo:**
1. OWNER accede a configuración avanzada
2. Selecciona "Transferir ownership"
3. Selecciona miembro destino (debe ser ADMIN)
4. Confirma transferencia (con doble confirmación)
5. Sistema:
   - Cambia rol del OWNER actual a ADMIN
   - Cambia rol del miembro destino a OWNER
   - Envía notificaciones a ambos
6. OWNER anterior mantiene acceso como ADMIN

**Validaciones:**
- Solo OWNER puede transferir
- Destino debe ser ADMIN
- Requiere doble confirmación (password o código)

---

## Requisitos Técnicos

### RT-01: Endpoints API

**Equipo:**

```
GET    /api/v1/tenants/:tenantId/members          → Listar miembros (OWNER/ADMIN)
POST   /api/v1/tenants/:tenantId/members/:userId/role → Cambiar rol (OWNER/ADMIN)
DELETE /api/v1/tenants/:tenantId/members/:userId   → Remover miembro (OWNER/ADMIN)
POST   /api/v1/tenants/:tenantId/transfer-ownership → Transferir ownership (OWNER)
```

---

### RT-02: DTOs

**ChangeRoleDto:**

```typescript
{
  role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER'
}
```

**TransferOwnershipDto:**

```typescript
{
  newOwnerId: string,
  confirmationCode?: string  // Para doble confirmación
}
```

---

## Flujos UX

### Flujo 1: Cambiar Rol

```
[Settings → Equipo]
  ↓
[Lista de miembros]
  ↓
[Click "Cambiar rol" en miembro]
  ↓
[Modal: Seleccionar nuevo rol]
  ↓
[Confirmar]
  ↓
[Actualización exitosa]
  ↓
[Toast de confirmación]
```

### Flujo 2: Remover Miembro

```
[Settings → Equipo]
  ↓
[Lista de miembros]
  ↓
[Click "Remover" en miembro]
  ↓
[Modal de confirmación]
  ↓
[Confirmar remoción]
  ↓
[Miembro removido]
  ↓
[Toast de confirmación]
```

### Flujo 3: Transferir Ownership

```
[Settings → Avanzado]
  ↓
[Click "Transferir ownership"]
  ↓
[Modal: Seleccionar nuevo OWNER]
  ↓
[Confirmar con password/código]
  ↓
[Segunda confirmación]
  ↓
[Ownership transferido]
  ↓
[Notificaciones enviadas]
```

---

## Estructura de DB

No se requieren cambios al schema. Usar modelos existentes:
- `TenantMembership` para membresías
- `TeamInvitation` para invitaciones (ya en PRD-07)

---

## Endpoints API

Ver RT-01.

**Formato de respuestas:**

```typescript
// Listar miembros
{
  success: true,
  data: [
    {
      id: "user_xxx",
      email: "user@example.com",
      name: "John Doe",
      role: "ADMIN",
      joinedAt: "2025-01-XX...",
      status: "ACTIVE"
    }
  ]
}
```

---

## Eventos n8n

**Eventos que se pueden enviar a n8n:**

- `team.member_added` → Miembro acepta invitación
- `team.member_removed` → Miembro removido
- `team.role_changed` → Rol de miembro cambiado
- `team.ownership_transferred` → Ownership transferido

---

## Criterios de Aceptación

### CA-01: Listado de Miembros
- [ ] OWNER y ADMIN pueden ver lista de miembros
- [ ] Lista muestra información correcta
- [ ] Se distinguen miembros activos de invitaciones pendientes

### CA-02: Cambiar Rol
- [ ] OWNER puede cambiar rol de cualquier miembro
- [ ] ADMIN puede cambiar rol de AGENT y VIEWER
- [ ] No se puede cambiar rol de OWNER a menos que sea transferencia
- [ ] Validaciones de permisos funcionan correctamente

### CA-03: Remover Miembro
- [ ] OWNER y ADMIN pueden remover miembros
- [ ] OWNER no puede remover a sí mismo
- [ ] ADMIN no puede remover a OWNER
- [ ] Membresía se elimina correctamente

### CA-04: Transferencia de Ownership
- [ ] Solo OWNER puede transferir
- [ ] Destino debe ser ADMIN
- [ ] Requiere doble confirmación
- [ ] Roles se actualizan correctamente
- [ ] Notificaciones se envían

---

## Consideraciones de Seguridad

- **Validación de permisos:** Verificar siempre en backend
- **Doble confirmación:** Para transferencia de ownership
- **Logs:** Registrar todos los cambios de roles y remociones
- **Notificaciones:** Enviar emails para cambios importantes

---

## Dependencias

- PRD-07: Sistema de invitaciones (base)

---

## Referencias

- `docs/02-auth-and-tenants.md` - Modelo de tenants y usuarios
- `IA-Specs/03-multitenancy-rbac-y-privacidad.mdc` - RBAC

---

**Última actualización:** 2025-01-XX








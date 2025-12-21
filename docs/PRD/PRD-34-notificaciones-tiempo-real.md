# PRD-34: Notificaciones en Tiempo Real

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Notificaciones y Alertas  
> **Dependencias:** PRD-12, PRD-22, PRD-09

---

## Objetivo

Implementar un sistema de notificaciones en tiempo real usando WebSockets para alertar a los usuarios sobre eventos importantes sin necesidad de refrescar la página.

---

## Alcance INCLUIDO

- ✅ Gateway WebSocket con Socket.IO
- ✅ Notificaciones de nuevos mensajes en conversaciones
- ✅ Notificaciones de cambios de estado en citas
- ✅ Notificaciones de equipo (invitaciones aceptadas/rechazadas)
- ✅ Alertas de límites de plan
- ✅ Badge de notificaciones en el header
- ✅ Centro de notificaciones (panel lateral)
- ✅ Marcar notificaciones como leídas
- ✅ Persistencia de notificaciones en BD

---

## Alcance EXCLUIDO

- ❌ Notificaciones push del navegador (queda para futuro)
- ❌ Notificaciones móviles (queda para futuro)
- ❌ Sonidos de notificación (queda para futuro)
- ❌ Configuración granular de notificaciones por tipo (queda para futuro)
- ❌ Notificaciones por email (ya existe en otros módulos)

---

## Requisitos Funcionales

### RF-01: Gateway WebSocket

**Descripción:** El sistema debe proporcionar un gateway WebSocket para comunicación bidireccional en tiempo real.

**Tecnología:** Socket.IO (compatible con WebSockets y fallback a polling)

**Flujo de Conexión:**
1. Cliente se conecta a `/socket.io`
2. Cliente envía token JWT para autenticación
3. Backend valida token y asocia conexión con usuario/tenant
4. Backend une usuario a room por tenantId
5. Backend puede enviar eventos al usuario específico o a todo el tenant

**Eventos del Cliente:**
- `authenticate` - Enviar token JWT
- `join_tenant` - Unirse a room del tenant
- `mark_read` - Marcar notificación como leída

**Eventos del Servidor:**
- `notification` - Nueva notificación
- `notification_read` - Confirmación de lectura
- `error` - Error de autenticación/conexión

---

### RF-02: Notificaciones de Mensajes

**Descripción:** Los usuarios deben recibir notificaciones cuando llegan nuevos mensajes en conversaciones.

**Eventos que disparan notificación:**
- Nuevo mensaje recibido en conversación activa
- Mensaje enviado falla
- Mensaje entregado/leído (opcional)

**Contenido de notificación:**
- Tipo: `MESSAGE_RECEIVED`, `MESSAGE_FAILED`
- Título: "Nuevo mensaje en [Conversación]"
- Descripción: Preview del mensaje (primeros 100 caracteres)
- Acción: Link a `/app/conversations/:id`
- Metadata: `conversationId`, `messageId`, `senderName`

**Reglas:**
- Solo notificar si el usuario tiene la conversación abierta o es agente asignado
- No notificar al remitente del mensaje
- Agrupar múltiples mensajes de la misma conversación

---

### RF-03: Notificaciones de Citas

**Descripción:** Los usuarios deben recibir notificaciones sobre cambios en citas.

**Eventos que disparan notificación:**
- Nueva cita creada
- Cita confirmada
- Cita cancelada
- Cita reprogramada
- Recordatorio de cita (1 hora antes)

**Contenido de notificación:**
- Tipo: `APPOINTMENT_CREATED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_RESCHEDULED`, `APPOINTMENT_REMINDER`
- Título: "Nueva cita con [Cliente]" / "Cita confirmada" / etc.
- Descripción: Fecha y hora de la cita
- Acción: Link a `/app/appointments/:id`
- Metadata: `appointmentId`, `participantName`, `startTime`

**Reglas:**
- Solo notificar a OWNER, ADMIN, y AGENT asignado
- Recordatorios solo 1 hora antes (no spam)

---

### RF-04: Notificaciones de Equipo

**Descripción:** Los usuarios deben recibir notificaciones sobre eventos del equipo.

**Eventos que disparan notificación:**
- Invitación aceptada
- Invitación rechazada
- Nuevo miembro agregado
- Rol cambiado
- Miembro removido

**Contenido de notificación:**
- Tipo: `TEAM_INVITATION_ACCEPTED`, `TEAM_INVITATION_REJECTED`, `TEAM_MEMBER_ADDED`, `TEAM_ROLE_CHANGED`, `TEAM_MEMBER_REMOVED`
- Título: "[Usuario] aceptó tu invitación" / etc.
- Descripción: Detalles del evento
- Acción: Link a `/app/settings/team`
- Metadata: `userId`, `invitationId`, `role`

**Reglas:**
- Solo notificar a OWNER y ADMIN
- No notificar al usuario que realiza la acción

---

### RF-05: Alertas de Límites de Plan

**Descripción:** Los usuarios deben recibir alertas cuando se acercan o alcanzan límites del plan.

**Eventos que disparan notificación:**
- Límite de agentes alcanzado (80%, 90%, 100%)
- Límite de canales alcanzado (80%, 90%, 100%)
- Trial por expirar (7 días, 3 días, 1 día)
- Pago fallido

**Contenido de notificación:**
- Tipo: `PLAN_LIMIT_WARNING`, `PLAN_LIMIT_REACHED`, `TRIAL_EXPIRING`, `PAYMENT_FAILED`
- Título: "Límite de agentes alcanzado" / "Trial expira en 3 días"
- Descripción: Detalles del límite o estado
- Acción: Link a `/app/billing` para upgrade
- Metadata: `limitType`, `current`, `limit`, `percentage`

**Reglas:**
- Solo notificar a OWNER y ADMIN
- No duplicar notificaciones (una por tipo de límite)
- Auto-dismiss después de 7 días si no se actúa

---

### RF-06: Centro de Notificaciones

**Descripción:** Los usuarios deben tener un panel para ver y gestionar todas sus notificaciones.

**Funcionalidades:**
- Lista de notificaciones (más recientes primero)
- Badge con contador de no leídas
- Marcar como leída individual
- Marcar todas como leídas
- Filtrar por tipo
- Paginación (cargar más)
- Link directo a la acción relacionada

**UI:**
- Panel lateral deslizable o dropdown
- Icono de campana en header
- Badge rojo con número de no leídas
- Animación cuando llega nueva notificación

---

## Requisitos Técnicos

### RT-01: Modelo de Datos

**Archivo:** `apps/api/prisma/schema.prisma`

```prisma
enum NotificationType {
  MESSAGE_RECEIVED
  MESSAGE_FAILED
  APPOINTMENT_CREATED
  APPOINTMENT_CONFIRMED
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  APPOINTMENT_REMINDER
  TEAM_INVITATION_ACCEPTED
  TEAM_INVITATION_REJECTED
  TEAM_MEMBER_ADDED
  TEAM_ROLE_CHANGED
  TEAM_MEMBER_REMOVED
  PLAN_LIMIT_WARNING
  PLAN_LIMIT_REACHED
  TRIAL_EXPIRING
  PAYMENT_FAILED
}

model Notification {
  id          String           @id @default(cuid())
  tenantId    String
  userId     String           // Usuario que recibe la notificación
  type        NotificationType
  title       String
  description String?
  read        Boolean          @default(false)
  readAt      DateTime?
  actionUrl   String?         // URL para la acción relacionada
  metadata    Json?            // Datos adicionales (conversationId, appointmentId, etc.)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  tenant      Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
  @@index([userId, read])
  @@index([createdAt])
}
```

---

### RT-02: Endpoints API

```
GET    /notifications                    → Listar notificaciones del usuario
GET    /notifications/unread-count       → Contador de no leídas
PUT    /notifications/:id/read           → Marcar como leída
PUT    /notifications/read-all           → Marcar todas como leídas
DELETE /notifications/:id                → Eliminar notificación
```

**Auth:** JWT + TenantContext + RBAC (todos los roles)

---

### RT-03: WebSocket Gateway

**Tecnología:** Socket.IO con NestJS

**Configuración:**
- CORS habilitado para frontend
- Autenticación mediante JWT en handshake
- Rooms por tenantId para broadcast
- Rooms por userId para notificaciones individuales

---

## Flujos UX

### Flujo 1: Nueva Notificación

```
[Evento ocurre en backend]
  ↓
[Backend crea registro en BD]
  ↓
[Backend emite evento WebSocket]
  ↓
[Cliente recibe evento]
  ↓
[Badge se actualiza]
  ↓
[Notificación aparece en panel]
  ↓
[Usuario hace clic]
  ↓
[Usuario es redirigido a acción]
  ↓
[Notificación se marca como leída]
```

---

## Estructura de DB

Ver RT-01.

---

## Endpoints API

Ver RT-02.

---

## Eventos n8n

No se emiten eventos nuevos. Los eventos existentes pueden usarse para disparar notificaciones.

---

## Criterios de Aceptación

- [ ] WebSocket gateway funciona correctamente
- [ ] Notificaciones se crean en BD cuando ocurren eventos
- [ ] Notificaciones se envían en tiempo real a usuarios conectados
- [ ] Badge muestra contador correcto
- [ ] Centro de notificaciones muestra lista correcta
- [ ] Marcar como leída funciona
- [ ] Links de acción funcionan correctamente
- [ ] Notificaciones se agrupan correctamente
- [ ] Manejo de reconexión funciona

---

## Dependencias

- PRD-12: Conversations/Messages (para notificaciones de mensajes)
- PRD-22: Appointments Flow (para notificaciones de citas)
- PRD-09: Team Management (para notificaciones de equipo)
- PRD-08: Billing Stripe (para alertas de límites)

---

**Última actualización:** 2025-01-XX


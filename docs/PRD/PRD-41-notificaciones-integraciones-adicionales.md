# PRD-41: Integraciones Adicionales de Notificaciones en Tiempo Real

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Notificaciones  
> **Dependencias:** PRD-34 (Notificaciones en Tiempo Real)

---

## Objetivo

Completar las integraciones de notificaciones en tiempo real en todos los módulos del sistema (Conversations, Team, Billing) y asegurar que las dependencias de Socket.IO estén instaladas y funcionando correctamente.

---

## Contexto

El sistema de notificaciones en tiempo real (PRD-34) está parcialmente implementado:
- ✅ NotificationsGateway y NotificationsService existen
- ✅ Integración en AppointmentsService funciona
- ❌ Dependencias Socket.IO no están instaladas
- ❌ Integraciones faltantes en ConversationsService, TeamService, BillingService

---

## Alcance INCLUIDO

- ✅ Instalación de dependencias Socket.IO
- ✅ Integración de notificaciones en ConversationsService (mensajes entrantes)
- ✅ Integración de notificaciones en TeamService (cambios de equipo)
- ✅ Integración de notificaciones en BillingService (límites de plan, fallos de pago)
- ✅ Configuración y testing de WebSocket

---

## Alcance EXCLUIDO

- ❌ Crear nuevos tipos de notificaciones (usar tipos existentes)
- ❌ Modificar la UI de notificaciones (ya existe)
- ❌ Cambios en el modelo de datos (ya existe)

---

## Requisitos Funcionales

### RF-01: Instalación de Dependencias Socket.IO

**Descripción:** Instalar todas las dependencias necesarias para que el sistema de notificaciones funcione.

**Dependencias requeridas:**
- `socket.io` - Servidor WebSocket
- `@nestjs/websockets` - Integración NestJS con WebSockets
- `@nestjs/platform-socket.io` - Adaptador Socket.IO para NestJS

**Comando de instalación:**
```bash
npm install socket.io @nestjs/websockets @nestjs/platform-socket.io --legacy-peer-deps
```

**Verificación:**
- Dependencias aparecen en `apps/api/package.json`
- Aplicación inicia sin errores
- WebSocket se conecta correctamente

---

### RF-02: Notificaciones en ConversationsService

**Descripción:** Notificar a los usuarios cuando llegan mensajes nuevos en conversaciones.

**Eventos a notificar:**
1. **Mensaje entrante nuevo:**
   - Tipo: `MESSAGE_RECEIVED`
   - Destinatarios: Usuarios con rol OWNER, ADMIN, AGENT asignado a la conversación
   - Acción: Link a `/app/conversations/{conversationId}`

2. **Conversación nueva:**
   - Tipo: `CONVERSATION_NEW`
   - Destinatarios: Usuarios con rol OWNER, ADMIN
   - Acción: Link a `/app/conversations/{conversationId}`

**Flujo:**
1. Mensaje entrante llega vía webhook
2. Se guarda en BD
3. Se crea notificación para usuarios relevantes
4. Notificación se envía en tiempo real vía WebSocket

---

### RF-03: Notificaciones en TeamService

**Descripción:** Notificar a los usuarios sobre cambios en el equipo.

**Eventos a notificar:**
1. **Cambio de rol:**
   - Tipo: `TEAM_ROLE_CHANGED`
   - Destinatario: Usuario afectado
   - Acción: Link a `/app/settings/team`

2. **Miembro removido:**
   - Tipo: `TEAM_MEMBER_REMOVED`
   - Destinatario: Usuario removido
   - Acción: Link a página de inicio

3. **Transferencia de ownership:**
   - Tipo: `TEAM_OWNERSHIP_TRANSFERRED`
   - Destinatarios: Nuevo y antiguo OWNER
   - Acción: Link a `/app/settings/team`

**Flujo:**
1. Cambio ocurre en TeamService
2. Se crea notificación para usuario(s) afectado(s)
3. Notificación se envía en tiempo real

---

### RF-04: Notificaciones en BillingService

**Descripción:** Notificar a los usuarios sobre eventos relacionados con facturación.

**Eventos a notificar:**
1. **Límite de plan alcanzado:**
   - Tipo: `BILLING_LIMIT_REACHED`
   - Destinatarios: Usuarios con rol OWNER, ADMIN
   - Acción: Link a `/app/billing`

2. **Fallo de pago:**
   - Tipo: `BILLING_PAYMENT_FAILED`
   - Destinatarios: Usuarios con rol OWNER, ADMIN
   - Acción: Link a `/app/billing`

3. **Suscripción cancelada:**
   - Tipo: `BILLING_SUBSCRIPTION_CANCELLED`
   - Destinatarios: Usuarios con rol OWNER, ADMIN
   - Acción: Link a `/app/billing`

**Flujo:**
1. Evento de facturación ocurre
2. Se crea notificación para OWNER/ADMIN
3. Notificación se envía en tiempo real

---

## Requisitos Técnicos

### RT-01: Instalar Dependencias

**Archivo:** `apps/api/package.json`

**Acción:** Agregar dependencias:
```json
{
  "dependencies": {
    "socket.io": "^4.x.x",
    "@nestjs/websockets": "^10.x.x",
    "@nestjs/platform-socket.io": "^10.x.x"
  }
}
```

---

### RT-02: Verificar NotificationsModule

**Archivo:** `apps/api/src/modules/notifications/notifications.module.ts`

**Verificar:**
- NotificationsGateway está registrado
- NotificationsService está exportado
- WebSocket está configurado correctamente

---

### RT-03: Integrar en ConversationsService

**Archivo:** `apps/api/src/modules/conversations/conversations.service.ts`

**Cambios:**
1. Importar NotificationsService
2. Inyectar en constructor
3. Llamar `createNotification()` cuando:
   - Llega mensaje entrante (en `processIncomingMessage` o similar)
   - Se crea nueva conversación

---

### RT-04: Integrar en TeamService

**Archivo:** `apps/api/src/modules/team/team.service.ts`

**Cambios:**
1. Importar NotificationsService
2. Inyectar en constructor
3. Llamar `createNotification()` cuando:
   - Se cambia rol de miembro
   - Se remueve miembro
   - Se transfiere ownership

---

### RT-05: Integrar en BillingService

**Archivo:** `apps/api/src/modules/billing/billing.service.ts`

**Cambios:**
1. Importar NotificationsService
2. Inyectar en constructor
3. Llamar `createNotification()` cuando:
   - Se alcanza límite de plan
   - Falla pago
   - Se cancela suscripción

---

## Flujos UX

### Flujo 1: Notificación de Mensaje Entrante

```
[Mensaje llega vía WhatsApp]
  ↓
[ConversationsService procesa mensaje]
  ↓
[Se crea notificación para usuarios relevantes]
  ↓
[Notificación aparece en tiempo real en UI]
  ↓
[Usuario hace clic en notificación]
  ↓
[Navega a conversación]
```

---

### Flujo 2: Notificación de Cambio de Rol

```
[Admin cambia rol de miembro]
  ↓
[TeamService actualiza rol]
  ↓
[Se crea notificación para usuario afectado]
  ↓
[Notificación aparece en tiempo real]
  ↓
[Usuario ve notificación de cambio de rol]
```

---

## Estructura de DB

No se requieren cambios. Se usa el modelo `Notification` existente.

---

## Endpoints API

No se requieren nuevos endpoints. Se usan endpoints existentes de notificaciones.

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Dependencias Socket.IO instaladas y funcionando
- [ ] Notificaciones se envían cuando llegan mensajes entrantes
- [ ] Notificaciones se envían cuando se crean nuevas conversaciones
- [ ] Notificaciones se envían cuando se cambia rol de miembro
- [ ] Notificaciones se envían cuando se remueve miembro
- [ ] Notificaciones se envían cuando se transfiere ownership
- [ ] Notificaciones se envían cuando se alcanza límite de plan
- [ ] Notificaciones se envían cuando falla pago
- [ ] Notificaciones se envían cuando se cancela suscripción
- [ ] Todas las notificaciones aparecen en tiempo real en UI
- [ ] Links de acción funcionan correctamente

---

## Dependencias

- **PRD-34:** Notificaciones en Tiempo Real (debe estar implementado)

---

## Notas de Implementación

1. **Dependencias Socket.IO:** Puede requerir `--legacy-peer-deps` si hay conflictos de versiones con NestJS.

2. **Performance:** Las notificaciones deben enviarse de forma asíncrona para no bloquear operaciones principales.

3. **Errores:** Si falla el envío de notificación, no debe afectar la operación principal (usar try-catch).

4. **Testing:** Verificar que WebSocket se conecta correctamente y que las notificaciones llegan en tiempo real.

---

**Última actualización:** 2025-01-XX


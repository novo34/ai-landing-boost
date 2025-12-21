# PRD-11: Webhooks Bidireccionales WhatsApp

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-10, PRD-12

---

## Objetivo

Implementar sistema de webhooks para recibir mensajes entrantes de WhatsApp, enviar mensajes salientes, y registrar estados de entrega, conectando con el sistema de conversaciones.

---

## Alcance INCLUIDO

- ✅ Endpoint para recibir webhooks de proveedores
- ✅ Procesamiento de mensajes entrantes
- ✅ Envío de mensajes salientes
- ✅ Registro de estados de entrega (sent, delivered, read, failed)
- ✅ Resolución de tenant y agente desde número
- ✅ Integración con sistema de conversaciones
- ✅ Validación de webhooks (firmas)

---

## Alcance EXCLUIDO

- ❌ Procesamiento de mensajes multimedia (queda para futuro)
- ❌ Templates de mensajes (queda para Bloque D)
- ❌ Respuestas automáticas de IA (queda para Bloque D)

---

## Requisitos Funcionales

### RF-01: Webhook de Mensajes Entrantes

**Descripción:** El sistema debe recibir mensajes entrantes de los proveedores de WhatsApp.

**Flujo:**
1. Proveedor (Evolution/Cloud) envía webhook a `/webhooks/whatsapp/:providerId`
2. Backend valida firma del webhook (si aplica)
3. Backend extrae información del mensaje:
   - Número remitente
   - Número destinatario (nuestro número)
   - Contenido del mensaje
   - Timestamp
   - Message ID
4. Backend resuelve tenant desde número destinatario
5. Backend resuelve agente asociado al número
6. Backend busca o crea conversación
7. Backend guarda mensaje en BD
8. Backend envía evento a orquestador (futuro: IA o n8n)

---

### RF-02: Envío de Mensajes Salientes

**Descripción:** El sistema debe poder enviar mensajes a través de los proveedores.

**Flujo:**
1. Sistema necesita enviar mensaje (desde IA, n8n, o manual)
2. Backend obtiene credenciales de cuenta WhatsApp
3. Backend llama a API del proveedor
4. Backend registra mensaje en BD con estado "SENT"
5. Backend espera confirmación de entrega (webhook)

---

### RF-03: Estados de Entrega

**Descripción:** El sistema debe registrar y actualizar estados de entrega de mensajes.

**Estados:**
- `SENT` → Mensaje enviado al proveedor
- `DELIVERED` → Mensaje entregado al dispositivo
- `READ` → Mensaje leído por el usuario
- `FAILED` → Error al enviar

**Flujo:**
1. Proveedor envía webhook de estado
2. Backend actualiza mensaje en BD
3. Backend puede notificar a frontend (WebSocket futuro)

---

## Requisitos Técnicos

### RT-01: Endpoints API

```
POST   /api/v1/webhooks/whatsapp/:providerId    → Webhook de proveedor (público)
POST   /api/v1/whatsapp/send                    → Enviar mensaje (protegido)
GET    /api/v1/conversations/:id/messages       → Listar mensajes (protegido)
```

---

### RT-02: Modelo de Datos

Ver PRD-12 para modelos de `Conversation` y `Message`.

---

## Flujos UX

### Flujo 1: Mensaje Entrante

```
[Usuario envía mensaje a WhatsApp]
  ↓
[Proveedor recibe mensaje]
  ↓
[Proveedor envía webhook a nuestro backend]
  ↓
[Backend procesa webhook]
  ↓
[Backend crea/actualiza conversación]
  ↓
[Backend guarda mensaje]
  ↓
[Backend envía a orquestador (IA/n8n)]
  ↓
[Orquestador genera respuesta]
  ↓
[Backend envía respuesta]
```

---

## Estructura de DB

Ver PRD-12.

---

## Endpoints API

Ver RT-01.

---

## Eventos n8n

- `whatsapp.message_received` → Mensaje entrante recibido
- `whatsapp.message_sent` → Mensaje enviado
- `whatsapp.message_delivered` → Mensaje entregado
- `whatsapp.message_read` → Mensaje leído
- `whatsapp.message_failed` → Error al enviar

---

## Criterios de Aceptación

- [ ] Webhook recibe mensajes entrantes correctamente
- [ ] Mensajes se guardan en BD
- [ ] Sistema puede enviar mensajes salientes
- [ ] Estados de entrega se actualizan correctamente
- [ ] Validación de webhooks funciona

---

**Última actualización:** 2025-01-XX








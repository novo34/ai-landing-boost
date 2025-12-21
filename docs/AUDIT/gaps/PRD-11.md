# Gap Report: PRD-11 - Webhooks Bidireccionales WhatsApp

> **Fecha:** 2025-01-14  
> **PRD:** `docs/PRD/PRD-11-whatsapp-webhooks.md`  
> **Estado según índice:** ✅ COMPLETADO  
> **Estado real:** ⚠️ **PARCIAL** (90% completado)

---

## Resumen Ejecutivo

El PRD-11 está **mayormente implementado** con webhooks funcionales para ambos proveedores (Evolution API y WhatsApp Cloud). La funcionalidad core está presente, pero falta validación de firmas de webhook.

**Estado:** ⚠️ **PARCIAL** - Funcional pero con gap de seguridad

---

## 1. Requisitos del Documento

### RF-01: Webhook de Mensajes Entrantes
### RF-02: Envío de Mensajes Salientes
### RF-03: Estados de Entrega
### RF-04: Resolución de Tenant y Agente
### RF-05: Integración con Conversaciones

---

## 2. Evidencia en Código

### ✅ Implementado Completamente

#### RF-01: Webhook de Mensajes Entrantes

**Backend:**
- ✅ `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`:
  - `handleEvolutionWebhook()` - Líneas 52-104
  - `handleCloudWebhook()` - Líneas 109-178
  - `handleIncomingMessage()` - Líneas 183-302
  - `handleIncomingCloudMessage()` - Líneas 381-481

**Funcionalidad:**
- ✅ Endpoints para Evolution API y WhatsApp Cloud
- ✅ Procesamiento de mensajes entrantes
- ✅ Extracción de información (remitente, destinatario, contenido, timestamp)
- ✅ Resolución de tenant desde número
- ✅ Creación/búsqueda de conversaciones
- ✅ Guardado de mensajes en BD
- ✅ Integración con orquestador

#### RF-02: Envío de Mensajes Salientes

**Backend:**
- ✅ `apps/api/src/modules/whatsapp/whatsapp-messaging.service.ts` - Servicio completo
- ✅ `apps/api/src/modules/whatsapp/whatsapp.controller.ts`:
  - `POST /whatsapp/send` - Línea 134

**Funcionalidad:**
- ✅ Envío de mensajes a través de proveedores
- ✅ Obtención de credenciales encriptadas
- ✅ Llamadas a API de proveedores
- ✅ Registro de mensajes con estado "SENT"

#### RF-03: Estados de Entrega

**Backend:**
- ✅ `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`:
  - `handleMessageStatus()` - Líneas 486-544 (Evolution API)
  - `handleCloudMessageStatus()` - Líneas 549-613 (WhatsApp Cloud)

**Estados manejados:**
- ✅ `SENT` - Mensaje enviado
- ✅ `DELIVERED` - Mensaje entregado
- ✅ `READ` - Mensaje leído
- ✅ `FAILED` - Mensaje fallido

**Funcionalidad:**
- ✅ Actualización de estados desde webhooks
- ✅ Timestamps de sentAt, deliveredAt, readAt
- ✅ Mapeo correcto de estados entre proveedores

#### RF-04: Resolución de Tenant y Agente

**Backend:**
- ✅ Resolución de tenant desde `account.tenantId`
- ✅ Búsqueda de conversación por tenant + account + phone
- ✅ Asociación con agente (si está asignado)

**Funcionalidad:**
- ✅ Resolución correcta de tenant
- ✅ Búsqueda de conversación existente
- ✅ Creación de nueva conversación si no existe

#### RF-05: Integración con Conversaciones

**Backend:**
- ✅ Creación/búsqueda de conversaciones
- ✅ Guardado de mensajes en BD
- ✅ Actualización de `lastMessageAt` y `unreadCount`
- ✅ Integración con `ConversationOrchestratorService`
- ✅ Notificaciones a usuarios
- ✅ Eventos n8n

**Funcionalidad:**
- ✅ Integración completa con sistema de conversaciones
- ✅ Detección de idioma
- ✅ Notificaciones de nuevas conversaciones y mensajes
- ✅ Eventos a n8n

---

## 3. Lo que Falta Exactamente

### ⚠️ Gap Crítico

#### Gap 1: Validación de Firmas de Webhook

**Estado:** ❌ **FALTANTE**

**Descripción:**
- El PRD especifica "Validación de webhooks (firmas)"
- No se encontró evidencia de validación de firmas en el código
- Los webhooks son públicos (`@Public()`) sin validación

**Riesgo:**
- Cualquiera puede enviar webhooks falsos
- Posible inyección de mensajes falsos
- Compromiso de integridad de datos

**Verificación necesaria:**
- [ ] Validar firma de webhook de Evolution API (si aplica)
- [ ] Validar firma de webhook de WhatsApp Cloud API (X-Hub-Signature-256)
- [ ] Rechazar webhooks sin firma válida
- [ ] Documentar secretos de webhook en variables de entorno

**Ubicación esperada:**
- `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`
- Métodos `handleEvolutionWebhook()` y `handleCloudWebhook()`

**Prioridad:** 🔴 CRÍTICA (seguridad)

---

#### Gap 2: Manejo de Mensajes Multimedia

**Estado:** ⚠️ **NO IMPLEMENTADO** (según PRD está excluido)

**Descripción:**
- El PRD marca mensajes multimedia como "excluido"
- Pero el código no maneja estos casos (puede fallar silenciosamente)

**Verificación necesaria:**
- [ ] Manejar mensajes multimedia (rechazar o ignorar con log)
- [ ] Validar que solo se procesan mensajes de texto
- [ ] Logging cuando se recibe mensaje no soportado

**Prioridad:** 🟡 MEDIA (robustez)

---

## 4. Riesgos y Bugs

### 🔴 Críticos

1. **Falta validación de firmas de webhook**
   - **Riesgo:** Webhooks falsos pueden inyectar mensajes
   - **Impacto:** Compromiso de integridad, posibles ataques
   - **Mitigación:** Implementar validación de firmas inmediatamente

### 🟡 Medios

2. **Manejo de mensajes multimedia no implementado**
   - **Riesgo:** Webhooks pueden fallar o procesar incorrectamente
   - **Impacto:** Errores en logs, posible pérdida de datos
   - **Mitigación:** Agregar validación y manejo de casos no soportados

---

## 5. Checklist de Implementación

### Backend

- [x] Webhooks para Evolution API implementados
- [x] Webhooks para WhatsApp Cloud API implementados
- [x] Procesamiento de mensajes entrantes implementado
- [x] Envío de mensajes salientes implementado
- [x] Estados de entrega implementados
- [x] Resolución de tenant y agente implementada
- [x] Integración con conversaciones implementada
- [x] Notificaciones implementadas
- [x] Eventos n8n implementados
- [ ] **FALTA:** Validación de firmas de webhook
- [ ] **FALTA:** Manejo explícito de mensajes multimedia

---

## 6. Estado Final

**Estado según código:** ⚠️ **PARCIAL (90%)**

**Desglose:**
- ✅ Webhooks entrantes: 100% implementado
- ✅ Envío de mensajes: 100% implementado
- ✅ Estados de entrega: 100% implementado
- ✅ Resolución de tenant: 100% implementado
- ✅ Integración con conversaciones: 100% implementado
- ⚠️ Validación de firmas: 0% (crítico)
- ⚠️ Manejo de multimedia: 0% (robustez)

**Conclusión:**
El PRD-11 está funcionalmente completo, pero tiene un gap crítico de seguridad (validación de firmas) que debe corregirse antes de producción. La funcionalidad core funciona correctamente.

---

**Última actualización:** 2025-01-14 15:50  
**Próxima acción:** ✅ Validación de firmas implementada (ver `PRD-11-webhook-signature-fix.md`)

**Fixes aplicados:**
- ✅ Validación de firmas de WhatsApp Cloud API (X-Hub-Signature-256)
- ✅ Validación básica de Evolution API (accountId)
- ✅ Guard de validación creado y aplicado

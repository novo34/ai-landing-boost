# PRD-32: Canal de Voz (Voice Channel)

> **Versión:** 2.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** G - Extensiones  
> **Dependencias:** PRD-30 (Sistema de Canales), PRD-12 (Conversations & Messages), PRD-13 (Conversation Orchestrator)

---

## Objetivo

Implementar un canal de voz completo que permita realizar y recibir llamadas telefónicas, con integración al sistema de conversaciones existente, grabación, transcripción y respuestas automatizadas mediante IA.

---

## Contexto

El sistema ya tiene:
- ✅ Modelo `Channel` con soporte para tipo `VOICE`
- ✅ Sistema de conversaciones y mensajes
- ✅ Orquestador de conversaciones con IA
- ✅ Sistema de agentes IA

Falta:
- ❌ Integración con proveedor de voz (Twilio)
- ❌ Webhooks para llamadas
- ❌ Grabación y transcripción
- ❌ Text-to-Speech para respuestas
- ❌ Modelo de datos para llamadas

---

## Alcance INCLUIDO

- ✅ Integración con Twilio Voice API
- ✅ Llamadas entrantes (inbound)
- ✅ Llamadas salientes (outbound)
- ✅ Grabación de llamadas
- ✅ Transcripción de audio a texto (Speech-to-Text)
- ✅ Text-to-Speech para respuestas del agente
- ✅ Integración con sistema de conversaciones
- ✅ Webhooks para eventos de llamadas
- ✅ UI para gestionar llamadas
- ✅ Historial de llamadas

---

## Alcance EXCLUIDO

- ❌ Video llamadas (solo voz)
- ❌ Conferencias múltiples
- ❌ Transferencia de llamadas entre agentes humanos
- ❌ Múltiples proveedores simultáneos (solo Twilio inicialmente)

---

## Requisitos Funcionales

### RF-01: Configuración de Canal de Voz

**Descripción:** Los usuarios deben poder configurar un canal de voz con credenciales de Twilio.

**Configuración requerida:**
- Account SID de Twilio
- Auth Token de Twilio
- Número de teléfono de Twilio
- Webhook URL para eventos

**Flujo:**
1. Usuario crea canal tipo VOICE
2. Usuario ingresa credenciales de Twilio
3. Sistema valida credenciales
4. Sistema configura webhooks en Twilio
5. Canal queda activo

---

### RF-02: Llamadas Entrantes

**Descripción:** El sistema debe recibir y procesar llamadas entrantes.

**Flujo:**
1. Cliente llama al número de Twilio
2. Twilio envía webhook a nuestro sistema
3. Sistema crea conversación de tipo VOICE
4. Sistema asigna agente IA al canal
5. Sistema reproduce mensaje de bienvenida (TTS)
6. Sistema inicia grabación
7. Sistema escucha audio del cliente
8. Sistema transcribe audio a texto
9. Sistema procesa con orquestador IA
10. Sistema convierte respuesta a audio (TTS)
11. Sistema reproduce respuesta al cliente
12. Repite pasos 7-11 hasta que cliente cuelga

---

### RF-03: Llamadas Salientes

**Descripción:** El sistema debe poder realizar llamadas salientes programadas o bajo demanda.

**Casos de uso:**
- Recordatorios de citas
- Seguimiento de conversaciones
- Campañas proactivas

**Flujo:**
1. Sistema o usuario inicia llamada saliente
2. Sistema crea conversación de tipo VOICE
3. Sistema asigna agente IA
4. Sistema realiza llamada vía Twilio
5. Cuando cliente contesta, sigue flujo de llamada entrante

---

### RF-04: Grabación de Llamadas

**Descripción:** Todas las llamadas deben grabarse para análisis y cumplimiento.

**Requisitos:**
- Grabación automática de todas las llamadas
- Almacenamiento en S3 o similar
- URL de grabación guardada en BD
- Acceso desde UI para escuchar grabaciones

---

### RF-05: Transcripción de Audio

**Descripción:** El audio de las llamadas debe transcribirse a texto en tiempo real.

**Requisitos:**
- Transcripción en tiempo real durante la llamada
- Transcripción completa al finalizar
- Guardar transcripción en mensajes de conversación
- Usar transcripción para procesamiento con IA

**Proveedor:** Twilio Speech Recognition o Google Speech-to-Text

---

### RF-06: Text-to-Speech

**Descripción:** Las respuestas del agente IA deben convertirse a audio.

**Requisitos:**
- Conversión de texto a audio en tiempo real
- Voz natural y clara
- Soporte para múltiples idiomas
- Configuración de voz por tenant

**Proveedor:** Twilio Text-to-Speech o Google Cloud TTS

---

### RF-07: Integración con Conversaciones

**Descripción:** Las llamadas deben integrarse con el sistema de conversaciones existente.

**Requisitos:**
- Crear conversación de tipo VOICE
- Guardar transcripciones como mensajes
- Usar orquestador IA existente
- Mostrar llamadas en UI de conversaciones

---

### RF-08: Historial y UI

**Descripción:** Los usuarios deben poder ver y gestionar llamadas desde la UI.

**Funcionalidades:**
- Lista de llamadas (entrantes/salientes)
- Detalles de llamada (duración, transcripción, grabación)
- Reproducir grabación
- Ver transcripción completa
- Filtrar por fecha, agente, estado

---

## Requisitos Técnicos

### RT-01: Modelo de Datos para Llamadas

**Archivo:** `apps/api/prisma/schema.prisma`

**Nuevo modelo:**
```prisma
model Call {
  id                String      @id @default(cuid())
  tenantId          String
  conversationId    String?
  channelId         String
  agentId           String?
  direction         CallDirection // INBOUND, OUTBOUND
  fromPhone         String
  toPhone           String
  status            CallStatus   @default(RINGING) // RINGING, IN_PROGRESS, COMPLETED, FAILED, NO_ANSWER
  twilioCallSid     String?     @unique
  recordingUrl      String?
  recordingSid      String?
  duration          Int?         // segundos
  startedAt         DateTime?
  endedAt           DateTime?
  metadata          Json?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  conversation  Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  channel       Channel       @relation(fields: [channelId], references: [id], onDelete: Cascade)
  agent         Agent?        @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([conversationId])
  @@index([channelId])
  @@index([twilioCallSid])
  @@index([status])
}

enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CallStatus {
  RINGING
  IN_PROGRESS
  COMPLETED
  FAILED
  NO_ANSWER
  BUSY
  CANCELED
}
```

**Modificar Conversation:**
```prisma
model Conversation {
  // ... campos existentes
  calls Call[]
}
```

---

### RT-02: Integración con Twilio

**Dependencias:**
```json
{
  "dependencies": {
    "twilio": "^4.19.0"
  }
}
```

**Configuración:**
- Variables de entorno para credenciales
- Webhook URLs configuradas en Twilio

---

### RT-03: VoiceService

**Archivo:** `apps/api/src/modules/voice/voice.service.ts`

**Responsabilidades:**
- Iniciar llamadas salientes
- Procesar webhooks de Twilio
- Gestionar estado de llamadas
- Integrar con orquestador IA

---

### RT-04: VoiceWebhookController

**Archivo:** `apps/api/src/modules/voice/voice-webhook.controller.ts`

**Endpoints:**
- `POST /webhooks/voice/incoming` - Llamada entrante
- `POST /webhooks/voice/status` - Cambio de estado
- `POST /webhooks/voice/recording` - Grabación completada
- `POST /webhooks/voice/transcription` - Transcripción completada

---

### RT-05: TwilioProvider

**Archivo:** `apps/api/src/modules/voice/providers/twilio.provider.ts`

**Responsabilidades:**
- Cliente Twilio
- Iniciar llamadas
- Configurar webhooks
- Obtener grabaciones

---

## Flujos UX

### Flujo 1: Llamada Entrante

```
[Cliente llama a número Twilio]
  ↓
[Twilio envía webhook a nuestro sistema]
  ↓
[Sistema crea conversación y llamada]
  ↓
[Sistema asigna agente IA]
  ↓
[Sistema reproduce mensaje de bienvenida]
  ↓
[Sistema inicia grabación]
  ↓
[Cliente habla]
  ↓
[Sistema transcribe a texto]
  ↓
[Orquestador IA procesa]
  ↓
[Sistema convierte respuesta a audio]
  ↓
[Sistema reproduce respuesta]
  ↓
[Repite hasta que cliente cuelga]
  ↓
[Sistema guarda grabación y transcripción]
```

---

### Flujo 2: Llamada Saliente

```
[Usuario o sistema inicia llamada saliente]
  ↓
[Sistema crea conversación y llamada]
  ↓
[Sistema asigna agente IA]
  ↓
[Sistema realiza llamada vía Twilio]
  ↓
[Cliente contesta]
  ↓
[Sigue flujo de llamada entrante]
```

---

## Estructura de DB

Ver RT-01. Nuevo modelo `Call` y enums relacionados.

---

## Endpoints API

### Nuevos Endpoints

**VoiceController:**
- `POST /voice/calls` - Iniciar llamada saliente
- `GET /voice/calls` - Listar llamadas
- `GET /voice/calls/:id` - Obtener detalles de llamada
- `GET /voice/calls/:id/recording` - Obtener URL de grabación

**VoiceWebhookController (públicos):**
- `POST /webhooks/voice/incoming` - Webhook llamada entrante
- `POST /webhooks/voice/status` - Webhook cambio de estado
- `POST /webhooks/voice/recording` - Webhook grabación
- `POST /webhooks/voice/transcription` - Webhook transcripción

---

## Eventos n8n

**Nuevos eventos:**
- `voice.call.started` - Llamada iniciada
- `voice.call.completed` - Llamada completada
- `voice.call.failed` - Llamada fallida
- `voice.recording.ready` - Grabación disponible

---

## Criterios de Aceptación

- [ ] Usuarios pueden configurar canal de voz con Twilio
- [ ] Llamadas entrantes se procesan correctamente
- [ ] Llamadas salientes se realizan correctamente
- [ ] Audio se transcribe a texto en tiempo real
- [ ] Respuestas del agente se convierten a audio
- [ ] Llamadas se graban automáticamente
- [ ] Transcripciones se guardan como mensajes
- [ ] Llamadas aparecen en UI de conversaciones
- [ ] Usuarios pueden ver historial de llamadas
- [ ] Usuarios pueden reproducir grabaciones
- [ ] Webhooks funcionan correctamente
- [ ] Integración con orquestador IA funciona

---

## Dependencias

- **PRD-30:** Sistema de Canales (debe estar implementado)
- **PRD-12:** Conversations & Messages (debe estar implementado)
- **PRD-13:** Conversation Orchestrator (debe estar implementado)
- **PRD-18:** Agent Entity (debe estar implementado)

---

## Notas de Implementación

1. **Twilio:** Requiere cuenta de Twilio y número de teléfono configurado.

2. **Costos:** Twilio cobra por minuto de llamada, grabación y transcripción. Considerar límites en planes.

3. **Latencia:** TTS y transcripción pueden tener latencia. Optimizar para mejor experiencia.

4. **Escalabilidad:** Considerar procesamiento asíncrono para transcripciones largas.

5. **Privacidad:** Las grabaciones contienen datos sensibles. Asegurar cumplimiento GDPR/FADP.

---

**Última actualización:** 2025-01-XX

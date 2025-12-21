# PRD-12: Entidades Conversaciones y Mensajes

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-10

---

## Objetivo

Crear el modelo de datos para almacenar conversaciones y mensajes de WhatsApp, permitiendo historial completo y memoria conversacional.

---

## Alcance INCLUIDO

- ✅ Modelo `Conversation` (conversación = thread con un usuario)
- ✅ Modelo `Message` (mensajes individuales)
- ✅ Estados de mensajes
- ✅ Tipos de mensajes (text, image, document, etc.)
- ✅ Metadatos de mensajes
- ✅ Índices para búsqueda eficiente

---

## Requisitos Técnicos

### RT-01: Modelo Prisma

```prisma
enum MessageType {
  TEXT
  IMAGE
  DOCUMENT
  AUDIO
  VIDEO
  LOCATION
  CONTACT
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

enum MessageDirection {
  INBOUND
  OUTBOUND
}

model Conversation {
  id              String   @id @default(cuid())
  tenantId        String
  whatsappAccountId String
  agentId         String?  // Agente asociado (futuro)
  participantPhone String  // Número del usuario externo
  participantName  String? // Nombre del usuario (si se conoce)
  status          ConversationStatus @default(ACTIVE)
  lastMessageAt   DateTime?
  unreadCount     Int      @default(0)
  metadata        Json?    // Metadatos adicionales
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  whatsappAccount TenantWhatsAppAccount @relation(fields: [whatsappAccountId], references: [id])
  messages        Message[]

  @@unique([tenantId, whatsappAccountId, participantPhone])
  @@index([tenantId])
  @@index([whatsappAccountId])
  @@index([participantPhone])
  @@index([lastMessageAt])
}

enum ConversationStatus {
  ACTIVE
  ARCHIVED
  BLOCKED
}

model Message {
  id              String          @id @default(cuid())
  conversationId  String
  tenantId        String
  type            MessageType
  direction       MessageDirection
  content         Text            // Contenido del mensaje
  status          MessageStatus   @default(SENT)
  providerMessageId String?       // ID del mensaje en el proveedor
  metadata        Json?           // Metadatos (URLs de media, etc.)
  sentAt          DateTime?
  deliveredAt     DateTime?
  readAt          DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  conversation    Conversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([tenantId])
  @@index([providerMessageId])
  @@index([createdAt])
}
```

---

## Criterios de Aceptación

- [ ] Modelos Prisma creados
- [ ] Migración aplicada
- [ ] Índices creados correctamente
- [ ] Relaciones funcionan

---

**Última actualización:** 2025-01-XX








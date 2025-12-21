# PRD-30: Sistema de Canales

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** G - Extensiones

---

## Objetivo

Modelo de canales multi-proveedor para soportar WhatsApp, voz, webchat, etc.

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
enum ChannelType {
  WHATSAPP
  VOICE
  WEBCHAT
  TELEGRAM
}

model Channel {
  id          String      @id @default(cuid())
  tenantId    String
  type        ChannelType
  name        String
  status      String      @default("ACTIVE")
  config      Json?       // Configuración específica del canal
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agents ChannelAgent[]
}

model ChannelAgent {
  id        String   @id @default(cuid())
  channelId String
  agentId   String
  createdAt DateTime @default(now())

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  agent   Agent   @relation(fields: [agentId], references: [id], onDelete: Cascade)

  @@unique([channelId, agentId])
}
```

---

**Última actualización:** 2025-01-XX








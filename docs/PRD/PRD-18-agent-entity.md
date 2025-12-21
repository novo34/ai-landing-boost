# PRD-18: Entidad Agent

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** D - Agente de Citas

---

## Objetivo

Crear entidad Agent configurable con personalidad, idioma, KB, y calendarios.

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
enum AgentStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum LanguageStrategy {
  AUTO_DETECT
  FIXED
  MULTI_LANGUAGE
}

model Agent {
  id                String          @id @default(cuid())
  tenantId          String
  name              String
  whatsappAccountId String
  status            AgentStatus     @default(ACTIVE)
  languageStrategy  LanguageStrategy @default(AUTO_DETECT)
  defaultLanguage   String?         // 'es', 'en', etc.
  personalitySettings Json?         // Tono, nombre, etc.
  knowledgeCollectionIds String[]   // IDs de colecciones
  calendarIntegrationId String?      // ID de integración de calendario
  n8nWorkflowId     String?         // ID de workflow n8n
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  whatsappAccount TenantWhatsAppAccount @relation(fields: [whatsappAccountId], references: [id])

  @@index([tenantId])
  @@index([whatsappAccountId])
}
```

---

**Última actualización:** 2025-01-XX








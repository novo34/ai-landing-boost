# PRD-14: Modelo KB Completo (Sources, Chunks, Collections)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** C - Base de Conocimiento

---

## Objetivo

Crear el modelo completo de base de conocimiento con sources, chunks, collections y embeddings para soportar búsqueda semántica.

---

## Requisitos Técnicos

### RT-01: Modelo Prisma

```prisma
enum KnowledgeSourceType {
  FAQ
  DOC
  URL_SCRAPE
  MANUAL_ENTRY
  CALENDAR
  CRM
}

model KnowledgeCollection {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  language    String   // 'es', 'en', 'de', etc.
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant  Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sources KnowledgeSource[]

  @@index([tenantId])
  @@index([tenantId, language])
}

model KnowledgeSource {
  id          String              @id @default(cuid())
  tenantId    String
  collectionId String?
  type        KnowledgeSourceType
  title       String
  language    String
  content     Text?               // Contenido original
  url         String?             // Para URL_SCRAPE
  metadata    Json?               // Metadatos adicionales
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  tenant    Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  collection KnowledgeCollection? @relation(fields: [collectionId], references: [id])
  chunks    KnowledgeChunk[]

  @@index([tenantId])
  @@index([tenantId, type])
  @@index([tenantId, language])
}

model KnowledgeChunk {
  id          String   @id @default(cuid())
  sourceId    String
  tenantId    String
  content     Text     // Texto del chunk
  chunkIndex  Int      // Índice del chunk en el source
  embedding   Json?    // Vector embedding (opcional)
  metadata    Json?    // Metadatos del chunk
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  source KnowledgeSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([sourceId])
  @@index([tenantId, sourceId])
}
```

---

**Última actualización:** 2025-01-XX








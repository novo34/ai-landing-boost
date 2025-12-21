# PRD-23: Registro de Flujos n8n por Tenant

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** E - Integración n8n

---

## Objetivo

Modelo para registrar y gestionar flujos n8n asociados a tenants y agentes.

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
enum N8nFlowType {
  LEAD_INTAKE
  BOOKING_FLOW
  FOLLOWUP
  PAYMENT_FAILED
  CUSTOM
}

model N8nFlow {
  id          String        @id @default(cuid())
  tenantId    String
  agentId     String?
  workflowId String        // ID del workflow en n8n
  type        N8nFlowType
  name        String
  description String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  Agent? @relation(fields: [agentId], references: [id])

  @@index([tenantId])
  @@index([agentId])
  @@index([workflowId])
}
```

---

**Última actualización:** 2025-01-XX








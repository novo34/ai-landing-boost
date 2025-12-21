# PRD-22: Flujo de Citas Completo

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** D - Agente de Citas

---

## Objetivo

Sistema completo de gestión de citas: agendar, reprogramar, cancelar, recordatorios.

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
enum AppointmentStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

model Appointment {
  id                String            @id @default(cuid())
  tenantId          String
  agentId           String
  conversationId    String
  calendarEventId   String?           // ID en calendario externo
  participantPhone  String
  participantName   String?
  startTime         DateTime
  endTime           DateTime
  status            AppointmentStatus @default(PENDING)
  notes             String?
  reminderSent      Boolean           @default(false)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  tenant        Tenant        @relation(fields: [tenantId], references: [id])
  agent         Agent         @relation(fields: [agentId], references: [id])
  conversation  Conversation  @relation(fields: [conversationId], references: [id])
}
```

---

**Última actualización:** 2025-01-XX








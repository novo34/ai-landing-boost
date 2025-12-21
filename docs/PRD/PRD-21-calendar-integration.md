# PRD-21: Integración Calendarios

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** D - Agente de Citas

---

## Objetivo

Integración con Cal.com y Google Calendar para gestión de citas.

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
enum CalendarProvider {
  CAL_COM
  GOOGLE
  CUSTOM
}

model CalendarIntegration {
  id          String          @id @default(cuid())
  tenantId    String
  provider    CalendarProvider
  credentials String          // Encriptado
  status      String          @default("ACTIVE")
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  rules  AgentCalendarRule[]
}

model AgentCalendarRule {
  id                String   @id @default(cuid())
  agentId           String
  calendarIntegrationId String
  duration          Int      // Duración en minutos
  availableHours    Json     // Horarios disponibles
  availableDays     String[] // Días disponibles
  bufferMinutes     Int      @default(15)
  cancellationPolicy Json?   // Política de cancelación
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  agent            Agent            @relation(fields: [agentId], references: [id])
  calendarIntegration CalendarIntegration @relation(fields: [calendarIntegrationId], references: [id])
}
```

---

**Última actualización:** 2025-01-XX








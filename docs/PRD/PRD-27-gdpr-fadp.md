# PRD-27: GDPR + FADP Completo

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Bloque:** F - Compliance

---

## Objetivo

Módulo completo de cumplimiento GDPR y FADP (Suiza).

---

## Requisitos Funcionales

- Right to be forgotten (borrado/anónimo)
- Anonymization de datos
- Consent logs
- Retention policies
- Data residency EU/CH
- Exportación de datos

---

## Requisitos Técnicos

### Modelo Prisma

```prisma
model ConsentLog {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String?
  consentType String   // 'data_processing', 'marketing', etc.
  granted     Boolean
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
}

model DataRetentionPolicy {
  id          String   @id @default(cuid())
  tenantId    String
  dataType    String   // 'conversations', 'messages', etc.
  retentionDays Int
  autoDelete  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

**Última actualización:** 2025-01-XX








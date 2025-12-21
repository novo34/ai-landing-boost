# PRD-28: Automatizaciones Tenant-Level

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Bloque:** F - Compliance

---

## Objetivo

Sistema de automatizaciones para trial, expiración, grace period, suspensión por impago.

---

## Requisitos Funcionales

- Notificaciones de trial expirando
- Aplicación de restricciones por impago
- Grace period configurable
- Reactivación automática
- Jobs programados (cron)

---

## Requisitos Técnicos

Usar `@nestjs/schedule` para jobs programados.

Crear servicios:
- `TrialExpirationService`
- `PaymentFailureService`
- `SubscriptionBlockingService`

---

**Última actualización:** 2025-01-XX








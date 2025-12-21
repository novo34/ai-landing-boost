# PRD-26: Eventos del Sistema → n8n

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** E - Integración n8n

---

## Objetivo

Sistema de eventos que envía automáticamente eventos relevantes a n8n.

---

## Eventos a Enviar

- `new_lead` → Nuevo lead de marketing
- `new_conversation` → Nueva conversación iniciada
- `booking_confirmed` → Cita confirmada
- `payment_failed` → Pago fallido
- `trial_expiring` → Trial por expirar

---

## Requisitos Técnicos

Crear `EventEmitterService` que escucha eventos del sistema y los envía a n8n si hay flujos activos configurados.

---

**Última actualización:** 2025-01-XX








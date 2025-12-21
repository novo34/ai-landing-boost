# PRD-24: Activación/Desactivación de Flujos n8n

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** E - Integración n8n

---

## Objetivo

UI y lógica para activar/desactivar flujos n8n por agente/tenant.

---

## Requisitos Funcionales

- Listar flujos disponibles
- Activar/desactivar flujos
- Asociar flujos a agentes
- UI con checkboxes

---

## Endpoints API

```
GET    /api/v1/n8n/flows
POST   /api/v1/n8n/flows
PUT    /api/v1/n8n/flows/:id/activate
PUT    /api/v1/n8n/flows/:id/deactivate
```

---

**Última actualización:** 2025-01-XX








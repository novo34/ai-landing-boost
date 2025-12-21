# PRD-19: Memoria Conversacional

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** D - Agente de Citas

---

## Objetivo

Sistema de memoria conversacional que mantiene contexto y resúmenes de conversaciones largas.

---

## Requisitos Funcionales

- Guardar historial completo de mensajes
- Generar resúmenes para conversaciones largas
- Recuperar contexto relevante
- Retención configurable por tenant

---

## Requisitos Técnicos

Usar modelos `Conversation` y `Message` existentes.

Agregar campo `summary` a `Conversation`:

```prisma
model Conversation {
  // ... campos existentes
  summary Text?  // Resumen de conversación para contextos largos
}
```

---

**Última actualización:** 2025-01-XX








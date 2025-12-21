# PRD-15: Panel CRUD Completo para Cliente

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Bloque:** C - Base de Conocimiento

---

## Objetivo

UI completa para que el cliente gestione su base de conocimiento: crear FAQs, importar documentos, gestionar colecciones.

---

## Requisitos Funcionales

- CRUD de FAQs
- CRUD de colecciones
- Importar documentos (PDF, DOCX)
- Scraping de URLs
- Gestión de idiomas
- UI mobile-first

---

## Endpoints API

```
GET    /api/v1/knowledge/collections
POST   /api/v1/knowledge/collections
PUT    /api/v1/knowledge/collections/:id
DELETE /api/v1/knowledge/collections/:id

GET    /api/v1/knowledge/sources
POST   /api/v1/knowledge/sources
PUT    /api/v1/knowledge/sources/:id
DELETE /api/v1/knowledge/sources/:id

POST   /api/v1/knowledge/import/document
POST   /api/v1/knowledge/import/url
```

---

**Última actualización:** 2025-01-XX








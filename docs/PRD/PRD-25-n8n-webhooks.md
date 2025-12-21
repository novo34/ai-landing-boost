# PRD-25: Conexión por Webhooks Internos

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟢 BAJA  
> **Bloque:** E - Integración n8n

---

## Objetivo

Servicio para enviar eventos a n8n mediante webhooks HTTP.

---

## Requisitos Técnicos

**Servicio:**
```typescript
@Injectable()
export class N8nWebhookService {
  async triggerWorkflow(workflowId: string, event: string, payload: any) {
    // Enviar HTTP POST a n8n webhook
  }
}
```

**Variables de entorno:**
```env
N8N_BASE_URL=https://n8n.example.com
N8N_API_KEY=your-api-key
```

---

**Última actualización:** 2025-01-XX








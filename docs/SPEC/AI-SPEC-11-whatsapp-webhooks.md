# AI-SPEC-11: Webhooks WhatsApp

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-11  
> **Prioridad:** 🟠 ALTA

---

## Arquitectura

Crear módulo de webhooks y servicio de envío de mensajes.

**Archivos:**
- `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts` [CREAR]
- `apps/api/src/modules/whatsapp/whatsapp-messaging.service.ts` [CREAR]

---

## Implementación

### Webhook Controller

```typescript
@Controller('webhooks/whatsapp/:providerId')
@Public() // Webhooks son públicos pero validados por firma
export class WhatsAppWebhookController {
  @Post()
  async handleWebhook(@Param('providerId') providerId: string, @Body() payload: any) {
    // Validar firma si aplica
    // Procesar según tipo de evento
    // Resolver tenant y agente
    // Guardar mensaje
    // Enviar a orquestador
  }
}
```

### Messaging Service

```typescript
@Injectable()
export class WhatsAppMessagingService {
  async sendMessage(tenantId: string, to: string, message: string) {
    // Obtener cuenta WhatsApp del tenant
    // Obtener credenciales
    // Llamar a proveedor
    // Guardar mensaje en BD
  }
}
```

---

**Última actualización:** 2025-01-XX








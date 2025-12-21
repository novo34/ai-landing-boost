# Fix: Validación de Firmas de Webhook - PRD-11

> **Fecha:** 2025-01-14  
> **PRD:** PRD-11 - Webhooks Bidireccionales WhatsApp  
> **Prioridad:** 🔴 CRÍTICA

---

## Resumen

Se ha implementado validación de firmas de webhook para prevenir inyección de mensajes falsos y asegurar la integridad de los datos.

---

## Fix Aplicado

### ✅ Validación de Firmas de WhatsApp Cloud API

**Problema:** Webhooks de WhatsApp Cloud API no tenían validación de firmas, permitiendo que cualquiera enviara webhooks falsos.

**Solución:**
- Creado `WebhookSignatureUtil` para validar firmas HMAC-SHA256
- Creado `WebhookSignatureGuard` que valida firmas antes de procesar webhooks
- Guard aplicado a endpoints de webhook

**Archivos creados:**
- `apps/api/src/modules/whatsapp/utils/webhook-signature.util.ts`
- `apps/api/src/modules/whatsapp/guards/webhook-signature.guard.ts`

**Archivos modificados:**
- `apps/api/src/modules/whatsapp/webhooks/whatsapp-webhook.controller.ts`
- `apps/api/src/modules/whatsapp/whatsapp.module.ts`

**Validación implementada:**
- ✅ Validación de `X-Hub-Signature-256` para WhatsApp Cloud API
- ✅ Uso de `crypto.timingSafeEqual()` para prevenir timing attacks
- ✅ Validación de accountId para Evolution API (no tiene estándar de firma)

---

## Configuración Requerida

### Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Ya configurado en main.ts:
# rawBody: true está habilitado para webhooks
```

**Credenciales de WhatsApp Cloud API:**

Las credenciales deben incluir `appSecret` o `app_secret` en el JSON encriptado:

```json
{
  "accessToken": "...",
  "phoneNumberId": "...",
  "appSecret": "tu-app-secret-de-whatsapp-cloud-api"
}
```

---

## Cómo Funciona

### WhatsApp Cloud API

1. WhatsApp envía webhook con header `X-Hub-Signature-256`
2. Guard obtiene `appSecret` desde credenciales encriptadas
3. Guard calcula HMAC-SHA256 del raw body usando `appSecret`
4. Guard compara firma calculada con la recibida (timing-safe)
5. Si la firma es válida, permite el request
6. Si la firma es inválida, retorna 401 Unauthorized

### Evolution API

1. Evolution API no tiene estándar de firma de webhook
2. Guard valida que `accountId` existe en la base de datos
3. Guard valida que el proveedor coincide
4. **Recomendación:** En producción, considerar:
   - Validar IP origen (whitelist de IPs de Evolution API)
   - Usar webhook secret si Evolution API lo soporta en el futuro
   - Configurar firewall para solo permitir IPs conocidas

---

## Código Implementado

### WebhookSignatureUtil

```typescript
static validateWhatsAppCloudSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  // Valida X-Hub-Signature-256 usando HMAC-SHA256
  // Usa crypto.timingSafeEqual() para prevenir timing attacks
}
```

### WebhookSignatureGuard

```typescript
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  // Valida firmas antes de procesar webhooks
  // Para Cloud: valida X-Hub-Signature-256
  // Para Evolution: valida que accountId existe
}
```

---

## Verificación

### Build

```powershell
cd apps/api
pnpm build
```

**Resultado:** ✅ **EXITOSO**

---

## Notas Importantes

### Raw Body

- NestJS está configurado con `rawBody: true` en `main.ts`
- El raw body está disponible en `req.rawBody` para validación precisa
- Si el raw body no está disponible, se usa el body parseado (menos preciso)

### Evolution API

- Evolution API no tiene estándar de firma de webhook
- La validación actual solo verifica que `accountId` existe
- **Recomendación de producción:** Implementar validación adicional:
  - Whitelist de IPs de Evolution API
  - Webhook secret si Evolution API lo soporta
  - Rate limiting por IP

### Testing

Para probar la validación:

1. **WhatsApp Cloud API:**
   ```bash
   # Calcular firma manualmente
   echo -n '{"object":"whatsapp_business_account"}' | openssl dgst -sha256 -hmac "APP_SECRET" -binary | base64
   
   # Enviar webhook con header
   curl -X POST http://localhost:3001/webhooks/whatsapp/cloud/ACCOUNT_ID \
     -H "X-Hub-Signature-256: sha256=..." \
     -H "Content-Type: application/json" \
     -d '{"object":"whatsapp_business_account"}'
   ```

2. **Evolution API:**
   - La validación actual solo verifica accountId
   - En producción, agregar validación de IP

---

## Checklist de Validación

- [x] Utilidad de validación de firmas creada
- [x] Guard de validación creado
- [x] Guard aplicado a endpoints de webhook
- [x] Validación de WhatsApp Cloud API implementada
- [x] Validación básica de Evolution API implementada
- [x] Build verificado y exitoso
- [ ] **PENDIENTE:** Testing end-to-end con webhooks reales
- [ ] **PENDIENTE:** Documentar IPs de Evolution API para whitelist
- [ ] **PENDIENTE:** Agregar rate limiting por IP en webhooks

---

## Próximos Pasos

1. **Testing:** Probar con webhooks reales de WhatsApp Cloud API
2. **Evolution API:** Implementar validación adicional (IP whitelist)
3. **Rate Limiting:** Agregar rate limiting por IP en endpoints de webhook
4. **Monitoring:** Agregar logging de intentos de webhook inválidos

---

**Última actualización:** 2025-01-14 15:50  
**Estado:** ✅ **FIX APLICADO** - Build exitoso, listo para testing

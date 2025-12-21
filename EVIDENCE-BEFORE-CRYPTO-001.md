# EVIDENCIA BEFORE - CIERRE CRYPTO-001
**Fecha:** 2024-12-XX
**Auditor:** Sistema de Auditoría Automática
**Objetivo:** Documentar estado ANTES de eliminación de código legacy

---

## A) INVENTARIO FINAL + EVIDENCIA

### 1. BÚSQUEDA: EncryptionUtil / EmailCryptoService / Legacy

**Comando ejecutado:**
```bash
grep -r "EncryptionUtil|encryption.util|EmailCryptoService|email-crypto|legacyEncrypt|legacyDecrypt" apps/api/src
```

**Resultados encontrados:**

#### A.1. EncryptionUtil (LEGACY ❌)

| Archivo | Línea | Uso | Estado | Migración BD |
|---------|-------|-----|--------|--------------|
| `apps/api/src/modules/whatsapp/utils/encryption.util.ts` | 7, 12 | Definición de clase | ❌ LEGACY | N/A |
| `apps/api/src/modules/whatsapp/whatsapp.service.ts` | 8 | Import | ⚠️ COMPATIBILIDAD | ✅ REQUERIDA |
| `apps/api/src/modules/whatsapp/whatsapp.service.ts` | 48, 51 | `decryptCredentials()` - decrypt legacy | ❌ LEGACY | ✅ REQUERIDA |

**Detalles:**
- `encryption.util.ts`: Clase completa con `encrypt()`, `decrypt()`, `mask()`
- `whatsapp.service.ts` línea 48-56: Soporta formato legacy (string) usando `EncryptionUtil.decrypt()`
- Formato legacy: `iv:authTag:encrypted` (hex)
- Sin AAD, sin keyVersion, sin context binding

#### A.2. EmailCryptoService (LEGACY ❌)

| Archivo | Línea | Uso | Estado | Migración BD |
|---------|-------|-----|--------|--------------|
| `apps/api/src/modules/email/services/email-crypto.service.ts` | 5, 6 | Definición de clase | ❌ LEGACY | N/A |
| `apps/api/src/modules/email/email.module.ts` | 10, 23 | Import y Provider | ⚠️ REGISTRADO | N/A |

**Detalles:**
- `email-crypto.service.ts`: Clase completa con `encrypt()`, `decrypt()`, `hashForAudit()`
- Formato legacy: `iv:tag:ciphertext` (base64)
- Sin AAD, sin keyVersion, sin context binding
- **NOTA:** Según RESUMEN-MIGRACION-CRYPTO.md, ya se migró el código pero el servicio aún está registrado en el módulo

---

### 2. BÚSQUEDA: encrypt() / decrypt() directos

**Comando ejecutado:**
```bash
grep -r "encrypt\(|decrypt\(" apps/api/src
```

**Resultados encontrados:**

| Archivo | Línea | Función | Estado | Migración BD |
|---------|-------|---------|--------|--------------|
| `apps/api/src/modules/whatsapp/utils/encryption.util.ts` | 35, 53 | `encrypt()`, `decrypt()` | ❌ LEGACY | N/A |
| `apps/api/src/modules/whatsapp/whatsapp.service.ts` | 51 | `EncryptionUtil.decrypt()` | ❌ LEGACY | ✅ REQUERIDA |
| `apps/api/src/modules/email/services/email-crypto.service.ts` | 44, 69 | `encrypt()`, `decrypt()` | ❌ LEGACY | N/A |

**Análisis:**
- Solo se usa `EncryptionUtil.decrypt()` en `whatsapp.service.ts` para compatibilidad legacy
- Los métodos `encrypt()`/`decrypt()` en `encryption.util.ts` y `email-crypto.service.ts` son definiciones, no usos activos
- **Conclusión:** Solo hay 1 uso activo de decrypt legacy (whatsapp.service.ts línea 51)

---

### 3. BÚSQUEDA: CryptoService / EncryptedBlobV1 (NUEVO ✅)

**Comando ejecutado:**
```bash
grep -r "CryptoService|crypto.service|crypto.helper|EncryptedBlobV1|keyVersion" apps/api/src
```

**Resultados encontrados:** 105 líneas

#### Archivos que usan CryptoService (NUEVO ✅):

1. **`apps/api/src/modules/crypto/crypto.service.ts`** - Servicio principal ✅
2. **`apps/api/src/modules/crypto/crypto.helper.ts`** - Helper de cifrado ✅
3. **`apps/api/src/modules/crypto/crypto.module.ts`** - Módulo NestJS ✅
4. **`apps/api/src/modules/whatsapp/whatsapp.service.ts`** - Usa CryptoService ✅
5. **`apps/api/src/modules/whatsapp/whatsapp-messaging.service.ts`** - Usa CryptoService ✅
6. **`apps/api/src/modules/whatsapp/guards/webhook-signature.guard.ts`** - Usa CryptoService ✅
7. **`apps/api/src/modules/auth/auth.service.ts`** - Usa CryptoService para OAuth tokens ✅
8. **`apps/api/src/modules/calendar/calendar.service.ts`** - Usa CryptoService para credenciales Cal.com ✅
9. **`apps/api/src/modules/email/email-delivery.service.ts`** - Usa CryptoService para passwords SMTP ✅
10. **`apps/api/src/modules/email/services/email-provider.service.ts`** - Usa CryptoService para descifrar passwords SMTP ✅

**Estado:** ✅ Todos los servicios activos usan CryptoService

---

## RESUMEN EVIDENCE BEFORE

### Código Legacy Detectado:

1. **EncryptionUtil** (`apps/api/src/modules/whatsapp/utils/encryption.util.ts`)
   - ❌ Clase completa (84 líneas)
   - ⚠️ Usado en `whatsapp.service.ts` línea 51 (compatibilidad legacy)
   - ✅ Método `mask()` ya está en CryptoService (línea 107)

2. **EmailCryptoService** (`apps/api/src/modules/email/services/email-crypto.service.ts`)
   - ❌ Clase completa (106 líneas)
   - ⚠️ Registrado en `email.module.ts` pero NO usado en código activo
   - ✅ Método `hashForAudit()` ya está en CryptoService (línea 120)

### Compatibilidad Legacy Detectada:

1. **`whatsapp.service.ts` línea 48-56:**
   ```typescript
   // Si es formato antiguo (string), usar EncryptionUtil
   if (this.isLegacyFormat(credentials)) {
     const decrypted = EncryptionUtil.decrypt(credentials);
     return JSON.parse(decrypted);
   }
   ```
   - ⚠️ Soporta formato legacy (string)
   - ✅ Requiere migración de datos en BD

### Datos Legacy en BD (REQUIEREN MIGRACIÓN):

1. **Tabla: `tenantwhatsappaccount`**
   - Campo: `credentials` (String)
   - Formato legacy: `"iv:authTag:encrypted"` (hex string)
   - Formato nuevo: `EncryptedBlobV1` (JSON)
   - **Acción:** Migrar todos los registros con formato string a EncryptedBlobV1

2. **Tabla: `useridentity`**
   - Campos: `accessToken`, `refreshToken` (String?)
   - **NOTA:** Según código, ya usa CryptoService (líneas 355-367 de auth.service.ts)
   - **Verificar:** Si hay registros legacy en BD

3. **Tabla: `calendarintegration`**
   - Campo: `credentials` (JSON)
   - **NOTA:** Según código, ya usa CryptoService (línea 129 de calendar.service.ts)
   - **Verificar:** Si hay registros legacy en BD

4. **Tabla: `tenantsmtpsettings` / `emailsmtpsettings`**
   - Campo: `password` (String?)
   - Formato legacy: `"iv:tag:ciphertext"` (base64 string)
   - Formato nuevo: `EncryptedBlobV1` (JSON)
   - **Acción:** Migrar todos los registros con formato string a EncryptedBlobV1

### Estado del Código Nuevo:

✅ **CryptoService está completamente implementado y en uso**
✅ **Todos los servicios activos usan CryptoService**
✅ **Validación SSRF implementada** (`validateEvolutionBaseUrl()`)
✅ **Métodos utilitarios centralizados** (`mask()`, `hashForAudit()`)

### Pendientes:

1. ❌ **Migración de datos legacy en BD**
2. ❌ **Eliminación física de EncryptionUtil**
3. ❌ **Eliminación física de EmailCryptoService**
4. ❌ **Eliminación de compatibilidad legacy en whatsapp.service.ts**
5. ❌ **Tests unitarios**

---

## CONCLUSIÓN

**Estado actual:**
- ✅ Código nuevo (CryptoService) implementado y en uso
- ⚠️ Compatibilidad legacy activa (1 uso en whatsapp.service.ts)
- ❌ Código legacy aún existe (2 archivos)
- ❌ Datos legacy en BD requieren migración

**Acciones requeridas:**
1. Crear job de migración de datos
2. Ejecutar migración (dry-run primero)
3. Eliminar código legacy
4. Eliminar compatibilidad legacy
5. Añadir tests unitarios
6. Verificar compilación y tests

---

**FIN EVIDENCE BEFORE**


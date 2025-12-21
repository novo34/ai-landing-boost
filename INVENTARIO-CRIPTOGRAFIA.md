# INVENTARIO COMPLETO DE CIFRADO - CRYPTO-001
**Fecha:** 2024
**Auditor:** Sistema de Auditoría Automática
**Objetivo:** Identificar duplicación, código antiguo y rutas muertas antes de migración

---

## 1. MÓDULOS DE CIFRADO IDENTIFICADOS

### 1.1. MÓDULO NUEVO (ESTÁNDAR) ✅
**Ubicación:** `apps/api/src/modules/crypto/`

#### Archivos:
- `crypto.module.ts` - Módulo global NestJS
- `crypto.service.ts` - Servicio principal (wrapper sobre CryptoHelper)
- `crypto.helper.ts` - Lógica de cifrado (AES-256-GCM, AAD, keyVersion)
- `crypto.types.ts` - Tipos TypeScript (EncryptedBlobV1, CryptoContext)
- `crypto.errors.ts` - Excepciones personalizadas
- `utils/secure-logger.util.ts` - Logger que redacta secretos

#### Características:
- ✅ AES-256-GCM con IV 12 bytes
- ✅ AAD obligatorio: `tenant:${tenantId}|rec:${recordId}`
- ✅ Keys base64 con validación de 32 bytes
- ✅ keyVersion + activeKeyVersion
- ✅ Migración on-read (si ENCRYPTION_MIGRATION_ON_READ=true)
- ✅ SecureLogger para no exponer secretos

#### Uso actual:
- `whatsapp.service.ts` (líneas 9, 24, 58-91): Usa CryptoService para cifrar/descifrar credenciales WhatsApp
- **Estado:** ACTIVO y en uso

---

### 1.2. MÓDULO ANTIGUO #1: EncryptionUtil ❌
**Ubicación:** `apps/api/src/modules/whatsapp/utils/encryption.util.ts`

#### Características:
- ❌ AES-256-GCM pero SIN AAD (sin context binding)
- ❌ IV 16 bytes (debería ser 12 para GCM)
- ❌ Formato string: `iv:authTag:encrypted` (hex)
- ❌ Usa `ENCRYPTION_KEY` (una sola clave, sin versionado)
- ❌ Sin tenantId/recordId binding
- ✅ Método `mask()` útil (debe preservarse)

#### Usos encontrados (DUPLICACIÓN):

| Archivo | Línea | Función | Qué cifra | Estado |
|---------|-------|---------|-----------|--------|
| `whatsapp.service.ts` | 8, 50 | `decryptCredentials()` | Credenciales WhatsApp (formato legacy) | ⚠️ COMPATIBILIDAD |
| `whatsapp.service.ts` | 99, 101 | `getMaskedCredentials()` | Solo usa `mask()` | ✅ OK (solo mask) |
| `whatsapp-messaging.service.ts` | 9, 60 | `sendMessage()` | Credenciales WhatsApp | ❌ DEBE MIGRAR |
| `whatsapp/guards/webhook-signature.guard.ts` | 5, 74 | `canActivate()` | Credenciales WhatsApp | ❌ DEBE MIGRAR |
| `whatsapp/webhooks/whatsapp-webhook.controller.ts` | 17 | Import | No usado directamente | ⚠️ REVISAR |
| `auth/auth.service.ts` | 18, 346-347, 415-416, 511-512, 579-580 | `googleAuthCallback()`, `microsoftAuthCallback()` | accessToken/refreshToken OAuth | ❌ DEBE MIGRAR |
| `calendar/calendar.service.ts` | 18, 55, 98, 120, 137, 180, 195, 470, 532, 589, 625 | Múltiples métodos | Credenciales Cal.com | ❌ DEBE MIGRAR |

**Total:** 7 archivos usando EncryptionUtil (5 con cifrado real, 2 solo mask)

---

### 1.3. MÓDULO ANTIGUO #2: EmailCryptoService ❌
**Ubicación:** `apps/api/src/modules/email/services/email-crypto.service.ts`

#### Características:
- ❌ AES-256-GCM pero SIN AAD
- ✅ IV 12 bytes (correcto)
- ❌ Formato string: `iv:tag:ciphertext` (base64)
- ❌ Usa `ENCRYPTION_KEY` (una sola clave, sin versionado)
- ❌ Sin tenantId/recordId binding
- ✅ Método `hashForAudit()` útil (no reversible)

#### Usos encontrados:

| Archivo | Línea | Función | Qué cifra | Estado |
|---------|-------|---------|-----------|--------|
| `email/email-delivery.service.ts` | 5, 21, 64, 68, 74, 139, 145 | Múltiples métodos | Passwords SMTP | ❌ DEBE MIGRAR |
| `email/services/email-provider.service.ts` | 3, 25, 64 | `getSmtpConfig()` | Passwords SMTP | ❌ DEBE MIGRAR |
| `email/email.module.ts` | 6, 18 | Import/Provider | Módulo | ⚠️ REEMPLAZAR |

**Total:** 3 archivos usando EmailCryptoService

---

## 2. ANÁLISIS DE DUPLICACIÓN

### 2.1. Tres caminos de cifrado en producción ❌

1. **CryptoService** (nuevo) - WhatsApp credenciales (formato nuevo)
2. **EncryptionUtil** (antiguo) - WhatsApp credenciales (formato legacy) + OAuth tokens + Calendar
3. **EmailCryptoService** (antiguo) - Passwords SMTP

### 2.2. Problemas identificados:

#### A) WhatsApp Service - Compatibilidad dual:
- **Línea 32-34:** `isLegacyFormat()` detecta string vs EncryptedBlobV1
- **Línea 47-55:** Si es string → usa `EncryptionUtil.decrypt()` (antiguo)
- **Línea 58-80:** Si es EncryptedBlobV1 → usa `CryptoService.decryptJson()` (nuevo)
- **Línea 86-91:** `encryptCredentials()` siempre usa CryptoService (nuevo)

**Estado:** ✅ Migración en progreso, pero aún soporta legacy

#### B) WhatsApp Messaging Service - Solo antiguo:
- **Línea 60:** `EncryptionUtil.decrypt(account.credentials)` - NO usa CryptoService
- **Problema:** Asume formato string, no soporta EncryptedBlobV1
- **Riesgo:** Falla si las credenciales están en formato nuevo

#### C) Webhook Signature Guard - Solo antiguo:
- **Línea 74:** `EncryptionUtil.decrypt(account.credentials)` - NO usa CryptoService
- **Mismo problema:** No soporta formato nuevo

#### D) Auth Service - OAuth tokens:
- **Líneas 346-347, 415-416, 511-512, 579-580:** `EncryptionUtil.encrypt()` para accessToken/refreshToken
- **Problema:** No usa CryptoService, no tiene context binding (tenantId/recordId)
- **Nota:** OAuth tokens se guardan en `useridentity` table, necesitan tenantId + recordId

#### E) Calendar Service - Credenciales Cal.com:
- **Múltiples usos:** `EncryptionUtil.encrypt/decrypt()` para credenciales de calendario
- **Problema:** No usa CryptoService, no tiene context binding
- **Nota:** Credenciales se guardan en `calendarintegration` table, necesitan tenantId + recordId

#### F) Email Service - Passwords SMTP:
- **Usa EmailCryptoService** (formato diferente a EncryptionUtil)
- **Problema:** No usa CryptoService, no tiene context binding
- **Nota:** Passwords se guardan en `emailsmtpsettings` table, necesitan tenantId + recordId

---

## 3. VALIDACIÓN TÉCNICA DEL NUEVO MÓDULO

### 3.1. CryptoHelper - Verificación:

✅ **AES-256-GCM:** `ALGORITHM = 'aes-256-gcm'` (línea 20)
✅ **IV 12 bytes:** `IV_LENGTH = 12` (línea 21)
✅ **TAG 16 bytes:** `TAG_LENGTH = 16` (línea 22)
✅ **KEY 32 bytes:** `KEY_LENGTH = 32` (línea 23)
✅ **AAD obligatorio:** `generateAAD()` línea 62-64: `tenant:${tenantId}|rec:${recordId}`
✅ **Keys base64:** `getKey()` línea 37 valida `key.length === KEY_LENGTH` (32 bytes)
✅ **keyVersion:** `getActiveKeyVersion()` línea 50-57, `encryptJson()` usa `options.keyVersion || getActiveKeyVersion()`
✅ **decrypt usa blob.keyVersion:** Línea 124: `getKey(blob.keyVersion)`

### 3.2. CryptoService - Verificación:

✅ **Wrapper correcto:** Llama a CryptoHelper
✅ **SecureLogger:** Usa SecureLogger para logs (líneas 26-30, 34-38, 53-57, 73-77)
✅ **Migración on-read:** Líneas 60-69 verifican `ENCRYPTION_MIGRATION_ON_READ` y `needsMigration()`
⚠️ **Problema:** Migración on-read NO actualiza BD automáticamente (línea 67-68: comentario dice que debe hacerlo el servicio que llama)

### 3.3. Problemas encontrados:

#### A) Migración on-read incompleta:
- **Línea 67-68:** Comentario dice "La migración debe ser manejada por el servicio que llama"
- **whatsapp.service.ts línea 136-142:** Migración se hace en `getAccounts()` pero es async sin await
- **whatsapp.service.ts línea 198-202:** Migración se hace en `getAccountById()` con await ✅
- **Riesgo:** Si falla update BD, no se marca error pero tampoco se reintenta

#### B) Falta validación de keyVersion en decrypt:
- Si `blob.keyVersion` no existe en env (`ENCRYPTION_KEY_V${version}`), lanza `KeyMissingException` ✅
- Pero no hay fallback ni mensaje claro al usuario

#### C) No hay tests unitarios:
- No se encontraron tests para CryptoService/CryptoHelper
- **Requerido:** Tests para encrypt/decrypt, AAD mismatch, keyVersion, rotación

---

## 4. SSRF Y VALIDACIÓN baseUrl

### 4.1. Uso de baseUrl encontrado:

| Archivo | Línea | Uso | Validación actual |
|---------|-------|-----|-------------------|
| `whatsapp/providers/evolution.provider.ts` | 22, 29, 82, 83, 169, 170, 198, 199 | `baseUrl` de credenciales | ⚠️ Solo normaliza (trim + remove trailing slash) |
| `whatsapp/dto/create-account.dto.ts` | 18 | DTO acepta `baseUrl` | ❌ Sin validación |
| `whatsapp/dto/update-account.dto.ts` | 15 | DTO acepta `baseUrl` | ❌ Sin validación |

### 4.2. Problemas SSRF identificados:

❌ **NO hay validación de protocolo:** Acepta `http://`, `https://`, o sin protocolo
❌ **NO bloquea localhost:** Puede usar `http://localhost:8080` o `http://127.0.0.1`
❌ **NO bloquea IPs privadas:** Puede usar `192.168.1.1`, `10.0.0.1`, `172.16.0.1`
❌ **NO bloquea link-local:** Puede usar `169.254.0.1`
❌ **Solo normaliza:** Línea 32 de evolution.provider.ts: `url.trim().replace(/\/$/, '')`

### 4.3. Riesgo:

Un tenant malicioso puede:
1. Configurar `baseUrl: http://localhost:8080` → SSRF a servicios internos
2. Configurar `baseUrl: http://192.168.1.1:8080` → SSRF a red privada
3. Configurar `baseUrl: file:///etc/passwd` → Acceso a archivos locales (si axios lo permite)

**CRÍTICO:** Implementar `validateEvolutionBaseUrl()` antes de guardar y antes de usar.

---

## 5. EXPOSICIÓN DE SECRETOS

### 5.1. Controllers/DTOs/Responses:

✅ **whatsapp.controller.ts:** No devuelve credenciales (solo `masked`)
✅ **whatsapp.service.ts línea 159-160, 222-223:** Devuelve `credentials: { masked: '****' }`
✅ **DTOs:** `create-account.dto.ts` y `update-account.dto.ts` aceptan credenciales (input), pero no las devuelven

### 5.2. Logs:

✅ **CryptoService:** Usa SecureLogger (líneas 26-30, 34-38, 53-57, 73-77)
⚠️ **Otros servicios:** 
- `whatsapp.service.ts` línea 234: `this.logger.debug(\`Validating credentials for provider: ${dto.provider}\`)` - No loguea credenciales ✅
- `evolution.provider.ts` línea 34: `this.logger.debug(\`Validating credentials for instance: ${instanceName} at ${normalizedUrl}\`)` - No loguea apiKey ✅
- **Pero:** No todos usan SecureLogger, podrían loguear accidentalmente

### 5.3. Axios config:

⚠️ **evolution.provider.ts línea 40, 91, 173, 208:** `headers: { apikey: apiKey }`
- **Riesgo:** Si se loguea el objeto de axios config, se expone apiKey
- **Verificar:** No se encontraron logs de axios config, pero hay que asegurar

---

## 6. RUTAS MUERTAS Y CÓDIGO NO USADO

### 6.1. EncryptionUtil.mask():
- ✅ **En uso:** `whatsapp.service.ts` (líneas 99, 101), `calendar.service.ts` (líneas 55, 98, 137, 195)
- **Acción:** Preservar método `mask()` pero moverlo a un helper común o a CryptoService

### 6.2. EmailCryptoService.hashForAudit():
- ✅ **En uso:** `email-delivery.service.ts` línea 560-561
- **Acción:** Preservar método pero moverlo a CryptoService o helper común

### 6.3. Imports no usados:
- `whatsapp/webhooks/whatsapp-webhook.controller.ts` línea 17: Importa `EncryptionUtil` pero no se usa directamente
- **Verificar:** Puede estar en código comentado o futuro

---

## 7. RESUMEN DE ACCIONES REQUERIDAS

### 7.1. Eliminación de duplicación:

1. ❌ **Eliminar EncryptionUtil** (excepto `mask()`)
2. ❌ **Eliminar EmailCryptoService** (excepto `hashForAudit()`)
3. ✅ **Migrar todos los usos a CryptoService**

### 7.2. Migraciones necesarias:

1. **whatsapp-messaging.service.ts:** Usar CryptoService en lugar de EncryptionUtil
2. **whatsapp/guards/webhook-signature.guard.ts:** Usar CryptoService
3. **auth/auth.service.ts:** Migrar OAuth tokens a CryptoService (necesita tenantId + recordId)
4. **calendar/calendar.service.ts:** Migrar credenciales Cal.com a CryptoService
5. **email/email-delivery.service.ts:** Migrar passwords SMTP a CryptoService

### 7.3. Validaciones requeridas:

1. **SSRF baseUrl:** Implementar `validateEvolutionBaseUrl()`
2. **Tests unitarios:** Añadir tests para CryptoService
3. **Migración on-read:** Asegurar que fallos de BD no rompan requests

### 7.4. Preservar utilidades:

1. **mask():** Mover a helper común o CryptoService
2. **hashForAudit():** Mover a helper común o CryptoService

---

## 8. CHECKLIST FINAL

- [ ] Migrar whatsapp-messaging.service.ts a CryptoService
- [ ] Migrar webhook-signature.guard.ts a CryptoService
- [ ] Migrar auth.service.ts (OAuth tokens) a CryptoService
- [ ] Migrar calendar.service.ts a CryptoService
- [ ] Migrar email-delivery.service.ts a CryptoService
- [ ] Implementar validateEvolutionBaseUrl() con protección SSRF
- [ ] Añadir tests unitarios para CryptoService
- [ ] Asegurar migración on-read no rompe requests
- [ ] Mover mask() a helper común
- [ ] Mover hashForAudit() a helper común
- [ ] Eliminar EncryptionUtil (después de migración)
- [ ] Eliminar EmailCryptoService (después de migración)
- [ ] Verificar que SecureLogger se usa en todos los logs de credenciales
- [ ] Verificar que no se exponen secretos en responses/controllers

---

**FIN DEL INVENTARIO**

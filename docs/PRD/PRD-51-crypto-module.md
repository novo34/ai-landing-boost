# PRD-51: Módulo Central de Cifrado del SaaS (CRYPTO-001)

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente  
> **Bloque:** A - Infraestructura Core  
> **Dependencias:** Ninguna

---

## Objetivo

Crear un módulo único y centralizado de cifrado/descifrado para todo el SaaS que proteja secretos en reposo (DB) con cifrado autenticado, evite fugas de secretos por logs/errores, soporte rotación de claves sin downtime, y prevenga uso cruzado entre tenants (anti "copy/paste" de blobs).

---

## Contexto

El SaaS es multi-tenant y requiere almacenar y usar secretos por tenant (ej. Evolution baseUrl + apiKey, webhook secrets, SMTP tokens, integraciones futuras). Esos secretos se usan en múltiples módulos (WhatsApp, conversaciones, webhooks, sincronización, settings), por lo que cualquier inconsistencia provoca fallos operativos y riesgos de seguridad.

---

## Alcance INCLUIDO

- ✅ Librería/helper central (backend) para cifrado/descifrado
- ✅ Formato de "Encrypted Blob" versionado
- ✅ Integración con almacenamiento (DB)
- ✅ Políticas de logging seguro (sin secretos en logs)
- ✅ Validación y manejo de errores controlado
- ✅ Rotación de claves y compatibilidad retroactiva
- ✅ Context binding criptográfico (anti-cross-tenant)
- ✅ Soporte para payload JSON y texto plano
- ✅ Integración específica con Evolution BYOE

---

## Alcance EXCLUIDO

- ❌ Gestión de infraestructura del VPS del cliente
- ❌ KMS/Secret Manager específico (aunque se deja compatible)
- ❌ Cifrado de datos no sensibles (solo secretos/credenciales)
- ❌ Cifrado en tránsito (HTTPS ya lo cubre)

---

## Usuarios / Roles

**PLATFORM_OWNER / Admin:**
- Gestiona claves globales del sistema (a nivel deployment)
- Configura variables de entorno de cifrado
- Realiza rotación de claves cuando sea necesario

**Tenant Admin:**
- Guarda credenciales (ej. Evolution) pero nunca ve el secreto en texto plano después del guardado
- Solo puede ver estado de conexión (conectado/inválido/requiere revalidación)

**Servicios internos:**
- Consumen secretos vía helper centralizado
- No acceden directamente a claves de cifrado

---

## Requisitos Funcionales

### RF-01: Centralización Obligatoria

**Descripción:** Todos los cifrados/descifrados deben pasar por el módulo CRYPTO (prohibido cifrar "a mano").

**Flujo:**
1. Cualquier módulo que necesite cifrar/descifrar debe importar el helper central
2. No se permite usar librerías de cifrado directamente en otros módulos
3. El helper valida que el contexto (tenantId + recordId) sea correcto

**Validaciones:**
- Linter/ESLint debe detectar uso directo de crypto en otros módulos
- Code review debe verificar uso del helper central

---

### RF-02: Operaciones de Cifrado/Descifrado

**Descripción:** El módulo debe soportar operaciones básicas de cifrado y descifrado.

**Operaciones:**

**encrypt(payload, context) → EncryptedBlob**
- Input: `payload` (objeto JSON o string), `context` (tenantId, recordId)
- Output: `EncryptedBlob` (formato versionado JSON)

**decrypt(blob, context) → payload**
- Input: `blob` (EncryptedBlob), `context` (tenantId, recordId)
- Output: `payload` original (objeto o string)

**Soporte de tipos:**
- Payload JSON (objeto): `{ baseUrl: "...", apiKey: "..." }`
- Payload texto (string): `"secret-string"`

**Validaciones:**
- Verificar que tenantId y recordId coincidan con el blob
- Verificar que la versión de clave esté disponible
- Verificar integridad del blob (tag de autenticación)

---

### RF-03: Context Binding (Anti-Cross-Tenant)

**Descripción:** El cifrado debe ligarse criptográficamente a tenantId y secretRecordId para prevenir uso cruzado.

**Flujo:**
1. Al cifrar, se incluye `tenantId` y `recordId` en AAD (Additional Authenticated Data)
2. Al descifrar, se verifica que el AAD coincida con el contexto proporcionado
3. Si el blob se mueve a otro tenant/record, el decrypt debe fallar

**Formato AAD:**
```
AAD = "tenant:{tenantId}|rec:{recordId}"
```

**Validaciones:**
- Decrypt falla si tenantId no coincide
- Decrypt falla si recordId no coincide
- Decrypt falla si el blob fue modificado (tamper detection)

---

### RF-04: Rotación de Claves

**Descripción:** El sistema debe soportar múltiples versiones de claves para permitir rotación sin downtime.

**Flujo:**
1. Sistema soporta `ENCRYPTION_KEY_V1`, `ENCRYPTION_KEY_V2`, etc.
2. `activeKeyVersion` indica qué versión usar para nuevos cifrados
3. Al descifrar, se usa la versión indicada en `blob.keyVersion`
4. Blobs antiguos (v1) siguen funcionando mientras se migran a v2

**Modos de migración:**
- **On-read:** Si descifra v1 y active es v2 → re-cifra y actualiza en BD
- **Job nocturno:** Proceso batch que migra todos los blobs v1 a v2

**Validaciones:**
- Verificar que la clave de la versión indicada exista
- Manejar errores si falta una clave antigua (blob no descifrable)

---

### RF-05: Observabilidad Segura

**Descripción:** Logs jamás contienen secretos. Errores de decrypt se registran como eventos sin exponer contenido.

**Políticas de logging:**
- Redactar automáticamente: `apikey`, `authorization`, `cookie`, `apiKey`, `secret`, `token`, `password`
- En errores HTTP: nunca loguear request config completa
- Errores de decrypt: registrar evento sin contenido del blob

**Formato de logs seguros:**
```
[CRYPTO] Decrypt failed for tenant:xxx record:yyy reason:INVALID_AAD
[CRYPTO] Encrypt success for tenant:xxx record:yyy keyVersion:2
```

**Validaciones:**
- Tests de snapshot para verificar que logs no contienen secretos
- Linter debe detectar posibles fugas en código

---

### RF-06: Integración con Evolution BYOE

**Descripción:** Guardar cifrado por tenant: baseUrl y apiKey. El frontend nunca recibe apiKey.

**Flujo de guardado:**
1. Tenant Admin ingresa baseUrl y apiKey en Settings → WhatsApp
2. Backend cifra credenciales usando `encryptJson({ baseUrl, apiKey }, { tenantId, recordId })`
3. Se guarda `encrypted_blob` en BD
4. Frontend solo recibe estado: "Conectado / inválido / requiere revalidación"

**Flujo de uso:**
1. Backend descifra credenciales al hacer llamadas a Evolution API
2. Usa `baseUrl` como endpoint base
3. Usa `apiKey` en header `apikey: {apiKey}`
4. Nunca expone apiKey en respuestas al frontend

**Validaciones:**
- Verificar que frontend nunca reciba apiKey en respuestas
- Verificar que todas las llamadas a Evolution usen credenciales descifradas

---

## Requisitos Técnicos

### RT-01: Algoritmo de Cifrado

**Algoritmo:** AES-256-GCM (AEAD: confidencialidad + integridad)

**Justificación:**
- Autenticación integrada (previene tampering)
- Eficiente y ampliamente soportado
- Estándar de la industria para datos sensibles

**Parámetros:**
- Key size: 256 bits (32 bytes)
- IV size: 96 bits (12 bytes) - recomendado para GCM
- Tag size: 128 bits (16 bytes)

---

### RT-02: Estructura de Datos

**EncryptedBlobV1 (JSON):**

```typescript
interface EncryptedBlobV1 {
  v: 1;                          // Versión del formato
  alg: "aes-256-gcm";            // Algoritmo usado
  keyVersion: number;             // Versión de clave usada
  ivB64: string;                 // IV en base64
  tagB64: string;                 // Tag de autenticación en base64
  ctB64: string;                  // Ciphertext en base64
}
```

**Tabla ejemplo (genérica):**

```prisma
model TenantSecret {
  id                String   @id @default(uuid())
  tenantId          String
  type              String   // EVOLUTION_CONNECTION, SMTP, WEBHOOK_SECRET
  recordId          String   // ID del registro específico (connectionId, etc.)
  encrypted_blob    Json     // EncryptedBlobV1
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  last_validated_at DateTime?
  status            String   // OK, INVALID, NEEDS_ROTATION
  status_reason     String?
  
  @@index([tenantId, type])
  @@index([tenantId, recordId])
}
```

**Nota:** Puedes tener tablas específicas (p.ej. `tenant_evolution_connections`) y guardar el blob ahí.

---

### RT-03: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Claves de cifrado (base64, 32 bytes al decodificar)
ENCRYPTION_KEY_V1=<base64-encoded-32-bytes>
ENCRYPTION_KEY_V2=<base64-encoded-32-bytes>

# Versión activa de clave
ENCRYPTION_ACTIVE_KEY_VERSION=2

# Configuración opcional
ENCRYPTION_MIGRATION_ON_READ=true  # Re-cifrar automáticamente al leer blobs antiguos
```

**Generación de claves:**
```bash
# Generar clave aleatoria (32 bytes en base64)
openssl rand -base64 32
```

---

### RT-04: API del Módulo (Interfaces)

**encryptJson:**

```typescript
function encryptJson<T extends object>(
  tenantId: string,
  recordId: string,
  payload: T,
  options?: { keyVersion?: number }
): EncryptedBlobV1
```

**decryptJson:**

```typescript
function decryptJson<T extends object>(
  tenantId: string,
  recordId: string,
  blob: EncryptedBlobV1
): T
```

**Errores:**

```typescript
enum CryptoError {
  CRYPTO_UNSUPPORTED_VERSION = 'CRYPTO_UNSUPPORTED_VERSION',
  CRYPTO_KEY_MISSING = 'CRYPTO_KEY_MISSING',
  CRYPTO_DECRYPT_FAILED = 'CRYPTO_DECRYPT_FAILED', // Incluye tamper / AAD mismatch
  CRYPTO_INVALID_BLOB = 'CRYPTO_INVALID_BLOB',
}
```

---

### RT-05: Políticas Estrictas

**P-1: Prohibición de secretos en frontend**

- Ningún endpoint devuelve `apiKey` ni `ctB64` si no es estrictamente necesario
- En UI solo se muestra:
  - "Conectado / inválido / requiere revalidación"
  - `baseUrl` (opcional) sin path sensible

**P-2: Logging seguro**

- Logger con redacción automática:
  - Headers: `apikey`, `authorization`, `cookie`
  - Campos: `apiKey`, `secret`, `token`, `password`
- En errores HTTP: nunca loguear request config completa

**P-3: Manejo de errores**

- Un fallo de decrypt no revienta el proceso:
  - Se marca `status=INVALID`
  - Se devuelve error controlado al módulo llamador
  - Se sugiere re-conectar/re-guardar credenciales desde Settings

**P-4: Rotación**

- `activeKeyVersion = N`
- Encrypt usa `N`
- Decrypt usa `blob.keyVersion`
- Migración:
  - "On read": si descifra v1 y active es v2 → re-cifra y actualiza
  - O job nocturno para migrar

---

## Flujos UX

### Flujo 1: Guardar Credenciales Evolution

```
[Settings → WhatsApp → Evolution BYOE]
  ↓
[Usuario ingresa baseUrl y apiKey]
  ↓
[Click "Guardar"]
  ↓
[Backend: encryptJson({ baseUrl, apiKey }, { tenantId, recordId })]
  ↓
[Backend: Guarda encrypted_blob en BD]
  ↓
[Backend: Test de conectividad opcional]
  ↓
[Frontend: Muestra "Conectado" o "Error de conexión"]
  ↓
[Usuario nunca ve apiKey después de guardar]
```

### Flujo 2: Usar Credenciales en Llamada a Evolution

```
[Backend necesita hacer llamada a Evolution API]
  ↓
[Backend: decryptJson(tenantId, recordId, encrypted_blob)]
  ↓
[Backend: Obtiene { baseUrl, apiKey }]
  ↓
[Backend: HTTP GET baseUrl/instance/fetchInstances]
  ↓
[Backend: Header: apikey: {apiKey}]
  ↓
[Backend: Nunca expone apiKey en logs ni respuestas]
```

### Flujo 3: Rotación de Claves

```
[Admin configura ENCRYPTION_KEY_V2 y ENCRYPTION_ACTIVE_KEY_VERSION=2]
  ↓
[Nuevos cifrados usan v2]
  ↓
[Blobs v1 siguen descifrándose con v1]
  ↓
[Migración on-read: Al descifrar v1, re-cifra con v2 y actualiza BD]
  ↓
[O Job nocturno: Migra todos los blobs v1 a v2]
  ↓
[Después de migración completa, se puede eliminar ENCRYPTION_KEY_V1]
```

---

## Estructura de Respuestas API

### Guardar Credenciales Evolution

```typescript
POST /api/v1/settings/evolution/connect
Request: {
  baseUrl: "https://evolution.example.com",
  apiKey: "secret-key-here"
}

Response: {
  success: true,
  data: {
    id: "conn_xxx",
    status: "OK",
    baseUrl: "https://evolution.example.com",  // Sin apiKey
    lastValidatedAt: "2025-01-27T..."
  }
}
```

### Test de Conexión

```typescript
POST /api/v1/settings/evolution/test
Response: {
  success: true,
  data: {
    connected: true,
    status: "OK"
  }
}

// O si falla:
Response: {
  success: false,
  error_key: "evolution.connection_failed",
  error_params: {
    reason: "INVALID_API_KEY"  // Sin exponer apiKey
  }
}
```

---

## Criterios de Aceptación

### CA-01: Cifrado/Descifrado Correcto
- [ ] Un secreto cifrado se descifra correctamente con el mismo tenantId + recordId
- [ ] Payload JSON se cifra y descifra correctamente
- [ ] Payload string se cifra y descifra correctamente

### CA-02: Anti-Cross-Tenant
- [ ] Si cambias tenantId, el descifrado falla
- [ ] Si cambias recordId, el descifrado falla
- [ ] Si modificas el blob (tamper), el descifrado falla

### CA-03: Rotación de Claves
- [ ] Rotación v1→v2: blobs v1 siguen funcionando
- [ ] Nuevos blobs se guardan en v2
- [ ] Migración on-read funciona correctamente
- [ ] Job de migración funciona correctamente

### CA-04: Logging Seguro
- [ ] Ningún log contiene `apiKey`, `Authorization`, `apikey`, etc.
- [ ] Errores de decrypt se registran sin exponer contenido
- [ ] Tests de snapshot verifican ausencia de secretos en logs

### CA-05: Integración Evolution
- [ ] Frontend nunca recibe `apiKey` en respuestas
- [ ] Backend usa credenciales descifradas para llamadas a Evolution
- [ ] Test de conectividad funciona sin exponer apiKey

### CA-06: Tests Unitarios
- [ ] Tests cubren: ok, tamper, tenant mismatch, keyVersion missing
- [ ] Tests de performance: encrypt/decrypt < 5ms típico
- [ ] Tests de logging seguro

---

## Consideraciones de Seguridad

- **Claves de cifrado:** Almacenar en variables de entorno, nunca en código
- **Rotación periódica:** Rotar claves cada 6-12 meses o según política de seguridad
- **Backup de claves:** Mantener backup seguro de claves antiguas para descifrar datos históricos
- **Validación de contexto:** Siempre verificar tenantId y recordId antes de descifrar
- **Rate limiting:** Limitar intentos de descifrado fallidos para prevenir ataques
- **Auditoría:** Registrar todos los eventos de cifrado/descifrado para auditoría

---

## Consideraciones de Rendimiento

- **Performance:** encrypt/decrypt < 5ms típico
- **Alta disponibilidad:** El módulo no debe "crashear" el request; debe devolver error controlado
- **Cache:** No cachear secretos descifrados en memoria (riesgo de seguridad)
- **Compatibilidad:** Cambios futuros deben ser versionados

---

## Dependencias

- Node.js crypto module (built-in)
- Prisma para almacenamiento
- Variables de entorno para claves

---

## Referencias

- AES-GCM Specification: NIST SP 800-38D
- Evolution API Documentation: https://docs.evoapicloud.com/
- PRD-50: Gestión Completa de Instancias Evolution API

---

**Última actualización:** 2025-01-27

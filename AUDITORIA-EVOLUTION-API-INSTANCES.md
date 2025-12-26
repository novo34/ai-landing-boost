# 🔍 AUDITORÍA: Creación de Instancias WhatsApp en Evolution API

**Fecha:** 2024-12-19  
**Auditor:** Backend Senior - Integraciones SaaS  
**Objetivo:** Determinar por qué las instancias creadas desde el SaaS NO aparecen en Evolution API y por qué el estado mostrado no representa el estado real.

---

## 1️⃣ RASTREO DEL CREATE REAL

### Flujo Identificado

**Frontend → Backend → Evolution API:**

1. **Frontend (UI):** `apps/web/app/app/settings/whatsapp/page.tsx`
   - Usuario hace clic en "Conectar" → abre `WhatsAppConnectionWizard`

2. **Wizard Component:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx:90`
   ```typescript
   const response = await apiClient.createWhatsAppAccount({
     provider: 'EVOLUTION_API',
     credentials: {
       apiKey: evolutionCreds.apiKey,
       instanceName: evolutionCreds.instanceName,
       baseUrl: evolutionCreds.baseUrl,
     },
   });
   ```

3. **API Client:** `apps/web/lib/api/client.ts:1707-1712`
   ```typescript
   async createWhatsAppAccount(data: {
     provider: 'EVOLUTION_API' | 'WHATSAPP_CLOUD';
     credentials: WhatsAppCredentials;
   }): Promise<ApiResponse<WhatsAppAccount>> {
     return this.post<WhatsAppAccount>('/whatsapp/accounts', data);
   }
   ```

4. **Backend Controller:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts:102-114`
   ```typescript
   async createAccount(
     @CurrentTenant() tenant: { id: string; role: string },
     @Body() dto: CreateAccountDto | CreateInstanceDto,
   ) {
     // Si tiene provider, es CreateAccountDto (legacy)
     // Si no tiene provider pero tiene instanceName o phoneNumber, es CreateInstanceDto
     if ('provider' in dto) {
       return this.whatsappService.createAccount(tenant.id, dto as CreateAccountDto);
     } else {
       // Es CreateInstanceDto para Evolution API
       return this.whatsappService.createInstance(tenant.id, dto as CreateInstanceDto);
     }
   }
   ```

### ❌ CONCLUSIÓN CRÍTICA

**El flujo actual usa el método LEGACY `createAccount` que NO crea la instancia en Evolution API.**

**Evidencia:**
- El wizard envía `{ provider: 'EVOLUTION_API', credentials: {...} }`
- El controller detecta `'provider' in dto` → llama a `createAccount()` (legacy)
- `createAccount()` **NO llama a `evolutionProvider.createInstance()`**
- `createAccount()` solo:
  1. Valida credenciales contra Evolution (verifica que la instancia exista)
  2. Obtiene información de la instancia existente
  3. Crea registro en BD
  4. **NO crea la instancia en Evolution API**

**Código de `createAccount`:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:328-514`
- Línea 344: `validateCredentials()` - solo valida
- Línea 359: `getAccountInfo()` - solo obtiene info de instancia existente
- Línea 422: `getProviderQRCode()` - solo obtiene QR de instancia existente
- Línea 428: `prisma.tenantwhatsappaccount.create()` - **SOLO crea en BD**

**NO hay llamada a `evolutionProvider.createInstance()` en `createAccount()`**

---

## 2️⃣ AUDITORÍA DE EVOLUTION API CLIENT

### Métodos Disponibles en EvolutionProvider

**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

| Método | Endpoint Evolution API | Estado |
|--------|------------------------|--------|
| `testConnection()` | `GET /instance/fetchInstances` | ✅ Implementado |
| `createInstance()` | `POST /instance/create` | ✅ Implementado (líneas 63-129) |
| `deleteInstance()` | `DELETE /instance/delete/{instanceName}` | ✅ Implementado |
| `connectInstance()` | `GET /instance/connect/{instanceName}` | ✅ Implementado |
| `disconnectInstance()` | `DELETE /instance/logout/{instanceName}` | ✅ Implementado |
| `getInstanceStatus()` | `GET /instance/connectionState/{instanceName}` | ✅ Implementado |
| `listAllInstances()` | `GET /instance/fetchInstances` | ✅ Implementado |

### Verificación de `createInstance`

**Código:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts:63-129`

```typescript
async createInstance(
  baseUrl: string,
  apiKey: string,
  options: {
    instanceName: string;
    phoneNumber?: string;
  },
): Promise<{...}> {
  // ...
  const response = await axios.post(
    `${normalizedUrl}/instance/create`,  // ✅ LLAMADA HTTP REAL
    {
      instanceName,
      qrcode: true,
      integration: 'EVOLUTION',
      ...(phoneNumber && { number: phoneNumber }),
    },
    {
      headers: { apikey: apiKey },
      timeout: 15000,
    }
  );
  // ...
}
```

### ❌ CONCLUSIÓN

**`createInstance()` existe y está correctamente implementado, pero NO se invoca desde el flujo del wizard.**

**Evidencia:**
- `createInstance()` hace POST real a `${baseUrl}/instance/create`
- El método se usa en `whatsapp.service.ts:1437` dentro de `createInstance()` (método nuevo)
- El wizard NO llama a `createInstance()` (método nuevo), usa `createAccount()` (legacy)

---

## 3️⃣ VALIDACIÓN DE CONFIGURACIÓN

### Origen de Credenciales

**NO hay variables de entorno globales `EVOLUTION_API_URL` o `EVOLUTION_API_KEY`**

**Sistema BYOE (Bring Your Own Evolution):**
- Cada tenant configura su propia Evolution API
- Credenciales se almacenan cifradas en `TenantEvolutionConnection`
- Se obtienen desde la conexión del tenant, no desde variables de entorno

**Código:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1423-1434`

```typescript
// Descifrar credenciales desde connection del tenant
const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
const credentials = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
  encryptedBlob,
  {
    tenantId: connection.tenantId,
    recordId: connection.id,
  }
);

const normalizedUrl = connection.normalizedUrl || credentials.baseUrl;
```

### Verificación de URL

**Validación SSRF:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts:78`
```typescript
const normalizedUrl = validateEvolutionBaseUrl(baseUrl, false);
```

**La URL puede ser:**
- Hostinger (si el tenant la configuró)
- Localhost (desarrollo)
- Cualquier URL válida que pase la validación SSRF

### ❌ CONCLUSIÓN

**La configuración es correcta (BYOE), pero el problema es que el flujo legacy NO usa estas credenciales para crear la instancia.**

**Evidencia:**
- El wizard envía `baseUrl` y `apiKey` en `credentials`
- `createAccount()` (legacy) usa estas credenciales solo para validar/obtener info
- `createInstance()` (nuevo) usa credenciales desde `TenantEvolutionConnection` (requiere conexión previa)

---

## 4️⃣ COMPARACIÓN DE NOMBRE DE INSTANCIA

### Generación de `instanceName`

**Método nuevo (`createInstance`):** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1206-1211`
```typescript
private generateInstanceName(tenantId: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const customSuffix = suffix || `${timestamp}-${random}`;
  return `tenant-${tenantId}-${customSuffix}`;  // ✅ Prefijo obligatorio
}
```

**Validación:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1217-1219`
```typescript
private validateInstanceName(instanceName: string, tenantId: string): boolean {
  return validateInstanceName(instanceName, tenantId);
}
```

**Método legacy (`createAccount`):**
- Usa `instanceName` directamente desde `dto.credentials.instanceName`
- NO valida prefijo `tenant-{tenantId}-`
- NO genera nombre automáticamente

### ❌ CONCLUSIÓN

**Divergencia crítica:**
- **Método nuevo:** Genera `tenant-{tenantId}-{timestamp}-{random}` o valida prefijo
- **Método legacy:** Usa `instanceName` del usuario sin validación de prefijo
- Si el usuario ingresa un nombre sin prefijo, puede crear conflictos o instancias huérfanas

---

## 5️⃣ AUDITORÍA DE STATUS

### Origen del Estado Mostrado

**Método legacy (`createAccount`):** `apps/api/src/modules/whatsapp/whatsapp.service.ts:433`
```typescript
status: accountInfo.status === 'connected' 
  ? $Enums.tenantwhatsappaccount_status.CONNECTED 
  : $Enums.tenantwhatsappaccount_status.PENDING,
```

**El estado viene de:**
- `getAccountInfo()` que llama a `evolutionProvider.getAccountInfo()`
- `getAccountInfo()` hace GET a `/instance/fetchInstances` y busca la instancia
- **Si la instancia NO existe en Evolution, falla la validación**

**Método nuevo (`createInstance`):** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1447-1450`
```typescript
const status =
  instanceInfo.status === 'open'
    ? $Enums.tenantwhatsappaccount_status.CONNECTED
    : $Enums.tenantwhatsappaccount_status.PENDING;
```

**El estado viene de:**
- Respuesta de `evolutionProvider.createInstance()` que hace POST a `/instance/create`
- Estado real de Evolution API después de crear la instancia

### Actualización de Estado

**Endpoint de status:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts:152-159`
```typescript
@Get('accounts/:id/status')
async getInstanceStatus(...) {
  return this.whatsappService.getInstanceStatus(tenant.id, id);
}
```

**Implementación:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1956-2077`
- Llama a `evolutionProvider.getInstanceStatus()` que hace GET a `/instance/connectionState/{instanceName}`
- **SÍ obtiene estado real desde Evolution API**
- Actualiza BD con el estado real

### ❌ CONCLUSIÓN

**El estado mostrado en el SaaS es LOCAL (desde BD), no se sincroniza automáticamente con Evolution API.**

**Evidencia:**
- `getAccounts()` retorna `account.status` desde BD (línea 230)
- `getInstanceStatus()` SÍ consulta Evolution API, pero es un endpoint separado que debe llamarse manualmente
- NO hay polling automático que sincronice estados
- El estado inicial se establece al crear, pero no se actualiza automáticamente

---

## 6️⃣ PRUEBA DEFINITIVA

### Evidencia de Llamadas HTTP

**Método legacy (`createAccount`):**
```typescript
// apps/api/src/modules/whatsapp/whatsapp.service.ts:344
const isValid = await this.validateCredentials(dto.provider, dto.credentials);

// apps/api/src/modules/whatsapp/whatsapp.service.ts:359
accountInfo = await this.getAccountInfo(dto.provider, dto.credentials);

// apps/api/src/modules/whatsapp/whatsapp.service.ts:422
qrCodeUrl = await this.getProviderQRCode(dto.provider, dto.credentials);
```

**Estos métodos hacen llamadas HTTP a Evolution API, pero:**
- `validateCredentials()` → GET `/instance/connectionState/{instanceName}` (verifica que exista)
- `getAccountInfo()` → GET `/instance/fetchInstances` (obtiene info de instancia existente)
- `getProviderQRCode()` → GET `/instance/connect/{instanceName}` (obtiene QR de instancia existente)

**❌ NINGUNO de estos métodos CREA la instancia en Evolution API.**

**Método nuevo (`createInstance`):**
```typescript
// apps/api/src/modules/whatsapp/whatsapp.service.ts:1437
const instanceInfo = await this.evolutionProvider.createInstance(
  normalizedUrl,
  credentials.apiKey,
  {
    instanceName,
    phoneNumber: dto.phoneNumber || undefined,
  },
);
```

**Este método SÍ hace:**
- POST `${normalizedUrl}/instance/create` (línea 83-95 de evolution.provider.ts)
- GET `${normalizedUrl}/instance/connect/{instanceName}` (línea 100-106)

### ❌ CONCLUSIÓN DEFINITIVA

**El SaaS NUNCA llama a Evolution API para crear la instancia cuando se usa el wizard actual.**

**Evidencia binaria:**
- ✅ `createInstance()` (método nuevo) SÍ llama a Evolution API → POST `/instance/create`
- ❌ `createAccount()` (método legacy usado por wizard) NO llama a Evolution API → solo valida/obtiene info
- ❌ El wizard usa `createAccount()` porque envía `{ provider: 'EVOLUTION_API' }`

---

## 7️⃣ CONCLUSIÓN FINAL

### ❌ DICTAMEN

**"La instancia NUNCA se crea en Evolution API, solo se crea un registro en la base de datos."**

### Punto Exacto de Ruptura

**Flujo roto:**

1. **Frontend:** `WhatsAppConnectionWizard` → `apiClient.createWhatsAppAccount({ provider: 'EVOLUTION_API', credentials: {...} })`
2. **Backend Controller:** Detecta `'provider' in dto` → llama a `createAccount()` (legacy)
3. **Service:** `createAccount()` valida credenciales, obtiene info de instancia existente, crea registro en BD
4. **❌ ROMPE AQUÍ:** `createAccount()` NO llama a `evolutionProvider.createInstance()`
5. **Resultado:** Registro en BD sin instancia en Evolution API

### Flujo Correcto (No Usado)

1. **Frontend:** Debería llamar a `apiClient.createEvolutionInstance({ instanceName?, phoneNumber? })`
2. **Backend Controller:** Detecta que NO tiene `provider` → llama a `createInstance()` (nuevo)
3. **Service:** `createInstance()` obtiene credenciales desde `TenantEvolutionConnection`, llama a `evolutionProvider.createInstance()`
4. **Provider:** `createInstance()` hace POST a `${baseUrl}/instance/create`
5. **Resultado:** Instancia creada en Evolution API + registro en BD

### Problemas Adicionales Identificados

1. **Estado desincronizado:** El estado en BD no se sincroniza automáticamente con Evolution API
2. **Validación incorrecta:** `createAccount()` valida que la instancia exista, pero si no existe, falla en lugar de crearla
3. **Nombres sin prefijo:** El método legacy no valida/genera nombres con prefijo `tenant-{tenantId}-`
4. **Dos flujos paralelos:** Existen dos métodos (`createAccount` y `createInstance`) que hacen cosas diferentes pero el wizard usa el incorrecto

---

## 📋 RESUMEN EJECUTIVO

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| **¿Se llama a Evolution API para crear?** | ❌ NO | Wizard usa `createAccount()` que NO llama a `createInstance()` |
| **¿Existe el método `createInstance`?** | ✅ SÍ | Implementado en `evolution.provider.ts:63-129` |
| **¿Se usa `createInstance`?** | ❌ NO | Solo se usa en el método nuevo `createInstance()`, no en `createAccount()` |
| **¿Configuración correcta?** | ✅ SÍ | BYOE, credenciales desde `TenantEvolutionConnection` |
| **¿Estado sincronizado?** | ❌ NO | Estado viene de BD, no se actualiza automáticamente desde Evolution |
| **¿Nombres correctos?** | ⚠️ PARCIAL | Método nuevo valida prefijo, método legacy no |

### Acción Requerida

**El wizard debe usar `createEvolutionInstance()` en lugar de `createWhatsAppAccount()` cuando el tenant ya tiene conexión Evolution configurada.**

---

**Fin de Auditoría**


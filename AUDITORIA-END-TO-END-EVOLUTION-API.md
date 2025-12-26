# AUDITORÍA END-TO-END: Evolution API Instances Lifecycle

**Fecha:** 2024-12-19  
**Objetivo:** Confirmar con evidencia si el frontend está llamando el flujo legacy vs nuevo, verificar conexión tenant, comprobar creación real en Evolution, auditar UI e i18n.

---

## 1️⃣ ROOT CAUSE ANALYSIS

### Problema Principal
**El wizard SÍ está usando el flujo correcto (`createEvolutionInstance` → `createInstance`), PERO:**
1. El `instanceName` ingresado por el usuario puede no tener el prefijo `tenant-{tenantId}-` requerido
2. Faltan logs estructurados detallados en `createInstance` (statusCode, response body safe)
3. No hay verificación post-create opcional con `fetchInstances`
4. Las keys i18n ya existen, pero pueden no estar siendo resueltas correctamente

### Evidencia del Flujo Actual

#### Frontend → Backend
**Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx:77-115`

```typescript
if (provider === 'EVOLUTION_API') {
  const connectionStatus = await apiClient.getEvolutionConnectionStatus();
  
  if (connectionStatus.success && connectionStatus.data?.status === 'CONNECTED') {
    // ✅ CORRECTO: Usa createEvolutionInstance (flujo nuevo)
    response = await apiClient.createEvolutionInstance({
      instanceName: evolutionCreds.instanceName || undefined,
      phoneNumber: undefined,
    });
  } else {
    // ✅ CORRECTO: Primero conecta Evolution, luego crea instancia
    const connectResponse = await apiClient.connectEvolution({...});
    response = await apiClient.createEvolutionInstance({...});
  }
}
```

**Cliente API:** `apps/web/lib/api/client.ts:1796-1801`
```typescript
async createEvolutionInstance(data: {
  instanceName?: string;
  phoneNumber?: string;
}): Promise<ApiResponse<WhatsAppAccount>> {
  return this.post<WhatsAppAccount>('/whatsapp/accounts', data);
  // ✅ CORRECTO: Envía payload SIN 'provider' → activa createInstance
}
```

#### Backend Controller
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts:102-114`

```typescript
async createAccount(
  @CurrentTenant() tenant: { id: string; role: string },
  @Body() dto: CreateAccountDto | CreateInstanceDto,
) {
  // ✅ CORRECTO: Detecta por presencia de 'provider'
  if ('provider' in dto) {
    return this.whatsappService.createAccount(tenant.id, dto as CreateAccountDto);
  } else {
    // ✅ CORRECTO: Llama a createInstance (flujo nuevo)
    return this.whatsappService.createInstance(tenant.id, dto as CreateInstanceDto);
  }
}
```

#### Backend Service
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1345-1581`

```typescript
async createInstance(tenantId: string, dto: CreateInstanceDto) {
  // ✅ CORRECTO: Verifica conexión Evolution
  const connection = await this.prisma.tenantevolutionconnection.findUnique({
    where: { tenantId },
  });
  
  // ✅ CORRECTO: Llama a evolutionProvider.createInstance()
  instanceInfo = await this.evolutionProvider.createInstance(
    normalizedUrl,
    credentials.apiKey,
    { instanceName, phoneNumber: dto.phoneNumber || undefined },
  );
}
```

#### Evolution Provider
**Archivo:** `apps/api/src/modules/whatsapp/providers/evolution.provider.ts:63-147`

```typescript
async createInstance(...) {
  // ✅ CORRECTO: Hace POST real a Evolution API
  const response = await axios.post(
    `${normalizedUrl}/instance/create`,
    { instanceName, qrcode: true, integration: 'EVOLUTION', ... },
    { headers: { apikey: apiKey }, timeout: 15000 }
  );
}
```

---

## 2️⃣ VERIFICACIÓN DE CONEXIÓN TENANT A EVOLUTION

### Modelo de Datos
**Tabla:** `TenantEvolutionConnection` (Prisma)

**Evidencia en código:**
- `apps/api/src/modules/whatsapp/whatsapp.service.ts:1363-1374` - Verifica conexión antes de crear instancia
- `apps/api/src/modules/whatsapp/whatsapp.service.ts:999-1110` - Método `connectEvolution()` crea/actualiza conexión

**Estado:** ✅ **CORRECTO** - El backend verifica que existe `TenantEvolutionConnection` antes de crear instancias.

---

## 3️⃣ COMPROBACIÓN DE CREACIÓN REAL EN EVOLUTION

### Estado Actual
✅ **CORRECTO** - `createInstance` SÍ llama a `evolutionProvider.createInstance()` que hace POST real a `{baseUrl}/instance/create`.

### Problemas Detectados

#### ❌ Faltan Logs Estructurados Detallados
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts:1454-1480`

**Actual:**
```typescript
this.logger.log(
  `createInstance: calling Evolution API - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}`
);

instanceInfo = await this.evolutionProvider.createInstance(...);

this.logger.log(
  `createInstance: Evolution API response - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, status=${instanceInfo.status}, hasQR=${!!instanceInfo.qrCodeUrl}`
);
```

**Problema:** No se registra `statusCode` ni `response body safe` (sin datos sensibles).

#### ❌ No Hay Verificación Post-Create
No se llama a `fetchInstances` después de crear para confirmar que la instancia aparece.

---

## 4️⃣ AUDITORÍA DE UI

### Acciones Disponibles en Backend
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.controller.ts`

| Acción | Endpoint | Estado Frontend |
|--------|----------|-----------------|
| Create Instance | `POST /whatsapp/accounts` (sin provider) | ✅ Existe (wizard) |
| Connect | `POST /whatsapp/accounts/:id/connect` | ✅ Existe |
| Disconnect | `POST /whatsapp/accounts/:id/disconnect` | ✅ Existe |
| Status | `GET /whatsapp/accounts/:id/status` | ✅ Existe |
| Get QR | `GET /whatsapp/accounts/:id/qr` | ✅ Existe |
| Validate | `POST /whatsapp/accounts/:id/validate` | ✅ Existe |
| Reconnect | `POST /whatsapp/accounts/:id/reconnect` | ✅ Existe |
| Delete | `DELETE /whatsapp/accounts/:id` | ✅ Existe |

**Archivo:** `apps/web/app/app/settings/whatsapp/page.tsx:462-487`

✅ **TODAS las acciones están disponibles en el menú dropdown.**

### Problema Detectado

#### ⚠️ El Wizard Pide `instanceName` Pero No Valida Prefijo
**Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx:368-375`

```typescript
<Label htmlFor="instanceName">Instance Name *</Label>
<Input
  id="instanceName"
  value={evolutionCreds.instanceName}
  onChange={(e) => setEvolutionCreds({ ...evolutionCreds, instanceName: e.target.value })}
  placeholder="mi-instancia"
/>
```

**Problema:** El usuario puede ingresar un `instanceName` sin el prefijo `tenant-{tenantId}-`, lo cual causará error en el backend (DTO validation).

**Solución:** El backend genera automáticamente el `instanceName` si no se proporciona o si no tiene el prefijo correcto (línea 1419 de whatsapp.service.ts), pero sería mejor validar en frontend o hacer el campo opcional.

---

## 5️⃣ i18n

### Keys Verificadas

**Archivo:** `apps/web/lib/i18n/locales/es/common.json`
- ✅ `whatsapp.evolution_connection_not_found` (línea 701)
- ✅ `whatsapp.cannot_decrypt_credentials` (línea 697)
- ✅ `whatsapp.validation_error` (línea 699)
- ✅ `whatsapp.reconnect_error` (línea 700)

**Archivo:** `apps/web/lib/i18n/locales/en/common.json`
- ✅ `whatsapp.evolution_connection_not_found` (línea 736)
- ✅ `whatsapp.cannot_decrypt_credentials` (línea 732)
- ✅ `whatsapp.validation_error` (línea 734)
- ✅ `whatsapp.reconnect_error` (línea 735)

**Estado:** ✅ **TODAS las keys existen en ambos idiomas.**

---

## 6️⃣ CORRECCIONES NECESARIAS

### 1. Añadir Logs Estructurados en `createInstance`

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Líneas a modificar:** 1454-1480

**Cambio:**
```typescript
// ANTES
this.logger.log(
  `createInstance: calling Evolution API - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}`
);

instanceInfo = await this.evolutionProvider.createInstance(...);

this.logger.log(
  `createInstance: Evolution API response - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, status=${instanceInfo.status}, hasQR=${!!instanceInfo.qrCodeUrl}`
);

// DESPUÉS
this.logger.log(
  `createInstance: calling Evolution API - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}`
);

let instanceInfo;
let statusCode: number | undefined;
let responseBodySafe: any;

try {
  instanceInfo = await this.evolutionProvider.createInstance(
    normalizedUrl,
    credentials.apiKey,
    {
      instanceName,
      phoneNumber: dto.phoneNumber || undefined,
    },
  );
  
  // Logs estructurados post-create
  this.logger.log(
    `createInstance: Evolution API success - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceInfo.instanceName}, status=${instanceInfo.status}, hasQR=${!!instanceInfo.qrCodeUrl}, instanceId=${instanceInfo.instanceId || 'none'}`
  );
} catch (error: any) {
  statusCode = error.response?.status;
  responseBodySafe = error.response?.data ? {
    message: error.response.data.message,
    error: error.response.data.error,
    // NO incluir datos sensibles
  } : undefined;
  
  this.logger.error(
    `createInstance: Evolution API call failed - tenantId=${tenantId}, baseUrl=${normalizedUrl}, instanceName=${instanceName}, statusCode=${statusCode}, error=${error.message}`,
    { responseBodySafe, stack: error.stack }
  );
  throw error;
}
```

### 2. Añadir Verificación Post-Create Opcional

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Líneas a añadir:** Después de línea 1579 (antes del return)

```typescript
// Verificación post-create opcional (solo si está habilitada)
const enablePostCreateVerification = process.env.EVOLUTION_API_ENABLE_POST_CREATE_VERIFICATION === 'true';
if (enablePostCreateVerification) {
  try {
    const allInstances = await this.evolutionProvider.listAllInstances(
      normalizedUrl,
      credentials.apiKey,
    );
    
    const foundInstance = allInstances.find(inst => inst.instanceName === instanceInfo.instanceName);
    
    if (foundInstance) {
      this.logger.log(
        `createInstance: post-create verification SUCCESS - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, found in fetchInstances with status=${foundInstance.status}`
      );
    } else {
      this.logger.warn(
        `createInstance: post-create verification WARNING - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, NOT found in fetchInstances (may be eventual consistency)`
      );
    }
  } catch (verifyError: any) {
    // No fallar si la verificación falla, solo loguear
    this.logger.warn(
      `createInstance: post-create verification failed - tenantId=${tenantId}, instanceName=${instanceInfo.instanceName}, error=${verifyError.message}`
    );
  }
}
```

### 3. Mejorar Validación de `instanceName` en Frontend

**Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`

**Líneas a modificar:** 368-375

**Cambio:**
```typescript
// ANTES
<div className="space-y-2">
  <Label htmlFor="instanceName">Instance Name *</Label>
  <Input
    id="instanceName"
    value={evolutionCreds.instanceName}
    onChange={(e) => setEvolutionCreds({ ...evolutionCreds, instanceName: e.target.value })}
    placeholder="mi-instancia"
  />
</div>

// DESPUÉS
<div className="space-y-2">
  <Label htmlFor="instanceName">Instance Name (opcional)</Label>
  <Input
    id="instanceName"
    value={evolutionCreds.instanceName}
    onChange={(e) => setEvolutionCreds({ ...evolutionCreds, instanceName: e.target.value })}
    placeholder="Se generará automáticamente si se deja vacío"
  />
  <p className="text-xs text-muted-foreground">
    Si proporcionas un nombre, debe comenzar con "tenant-{tenantId}-"
  </p>
</div>
```

---

## 7️⃣ PRUEBAS MANUALES

### Prueba 1: Crear Instancia desde SaaS

**Pasos:**
1. Conectar Evolution API del tenant (si no está conectada):
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/evolution/connect \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "baseUrl": "https://api.evolution-api.com",
       "apiKey": "tu-api-key",
       "testConnection": true
     }'
   ```

2. Verificar que la conexión existe:
   ```bash
   curl -X GET http://localhost:3000/api/whatsapp/evolution/status \
     -H "Authorization: Bearer {token}"
   ```

3. Crear instancia desde UI:
   - Ir a `/app/settings/whatsapp`
   - Click en "Conectar WhatsApp"
   - Seleccionar "Evolution API"
   - Dejar `instanceName` vacío (o ingresar con prefijo correcto)
   - Ingresar `apiKey` y `baseUrl`
   - Click en "Validar"

4. Verificar en logs del backend:
   ```
   createInstance: calling Evolution API - tenantId=xxx, baseUrl=xxx, instanceName=tenant-xxx-xxx
   createInstance: Evolution API success - tenantId=xxx, instanceName=tenant-xxx-xxx, status=connecting
   ```

5. Verificar en Evolution API (fetchInstances):
   ```bash
   curl -X GET https://api.evolution-api.com/instance/fetchInstances \
     -H "apikey: tu-api-key"
   ```
   Debe aparecer la instancia con nombre `tenant-{tenantId}-{suffix}`.

### Prueba 2: Verificar Logs Estructurados

**Pasos:**
1. Crear instancia desde UI
2. Revisar logs del backend:
   - Debe aparecer log con `statusCode` si hay error
   - Debe aparecer log con `responseBodySafe` si hay error
   - Debe aparecer log post-create verification (si está habilitada)

### Prueba 3: Verificar Todas las Acciones en UI

**Pasos:**
1. Ir a `/app/settings/whatsapp`
2. Para cada cuenta, verificar que el menú dropdown tenga:
   - ✅ Connect
   - ✅ Disconnect
   - ✅ Show QR
   - ✅ Validate
   - ✅ Reconnect
   - ✅ Refresh Status
   - ✅ Delete

---

## 8️⃣ RESUMEN

### Root Cause
**El flujo está CORRECTO** - El frontend SÍ está usando `createEvolutionInstance` (flujo nuevo) que llama a `createInstance` en el backend, que SÍ crea la instancia en Evolution API.

**Problemas menores detectados:**
1. Faltan logs estructurados detallados (statusCode, responseBodySafe)
2. No hay verificación post-create opcional con `fetchInstances`
3. El campo `instanceName` en el wizard debería ser opcional o validar prefijo

### Archivos a Cambiar
1. `apps/api/src/modules/whatsapp/whatsapp.service.ts` (líneas 1454-1480, añadir después de 1579)
2. `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx` (líneas 368-375)

### Estado de i18n
✅ **TODAS las keys existen** - No se requieren cambios.

---

## 9️⃣ CAMBIOS APLICADOS

### ✅ Cambios Realizados

#### 1. Logs Estructurados Mejorados
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- ✅ Añadido `statusCode` en logs de error
- ✅ Añadido `responseBodySafe` (sin datos sensibles) en logs de error
- ✅ Mejorado log de éxito con `instanceId`

#### 2. Verificación Post-Create Opcional
**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- ✅ Añadida verificación opcional con `fetchInstances` después de crear instancia
- ✅ Controlada por variable de entorno `EVOLUTION_API_ENABLE_POST_CREATE_VERIFICATION`
- ✅ No falla si la verificación falla, solo loguea warning

#### 3. Mejora en Wizard Frontend
**Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`
- ✅ Campo `instanceName` ahora es opcional (no requerido)
- ✅ Añadido hint explicando el prefijo requerido
- ✅ Actualizada validación para no requerir `instanceName`

---

## 🔟 RESUMEN EJECUTIVO

### Conclusión Principal
**✅ El flujo está CORRECTO** - El frontend SÍ está usando el flujo nuevo (`createEvolutionInstance` → `createInstance`) que crea la instancia real en Evolution API.

### Problemas Resueltos
1. ✅ **Logs estructurados mejorados** - Ahora incluyen `statusCode` y `responseBodySafe`
2. ✅ **Verificación post-create opcional** - Permite confirmar que la instancia aparece en `fetchInstances`
3. ✅ **Wizard mejorado** - `instanceName` es opcional y tiene mejor UX

### Estado de Componentes
- ✅ **Frontend:** Usa flujo correcto (`createEvolutionInstance`)
- ✅ **Backend Controller:** Detecta correctamente flujo nuevo vs legacy
- ✅ **Backend Service:** Crea instancia real en Evolution API
- ✅ **Evolution Provider:** Hace POST real a `/instance/create`
- ✅ **UI:** Todas las acciones disponibles
- ✅ **i18n:** Todas las keys existen

### Próximos Pasos Recomendados
1. Habilitar verificación post-create en producción (opcional):
   ```bash
   EVOLUTION_API_ENABLE_POST_CREATE_VERIFICATION=true
   ```
2. Monitorear logs estructurados para detectar problemas
3. Considerar añadir métricas/alertas basadas en los logs

---

## 📋 PRUEBAS MANUALES (Actualizadas)

### Prueba 1: Crear Instancia desde SaaS

**Pasos:**
1. Conectar Evolution API del tenant (si no está conectada)
2. Verificar que la conexión existe
3. Crear instancia desde UI:
   - Ir a `/app/settings/whatsapp`
   - Click en "Conectar WhatsApp"
   - Seleccionar "Evolution API"
   - **Dejar `instanceName` vacío** (se generará automáticamente)
   - Ingresar `apiKey` y `baseUrl`
   - Click en "Validar"

4. Verificar en logs del backend:
   ```
   createInstance: calling Evolution API - tenantId=xxx, baseUrl=xxx, instanceName=tenant-xxx-xxx, hasPhoneNumber=false
   createInstance: Evolution API success - tenantId=xxx, instanceName=tenant-xxx-xxx, status=connecting, instanceId=xxx
   createInstance: post-create verification SUCCESS - tenantId=xxx, instanceName=tenant-xxx-xxx, found in fetchInstances with status=connecting
   ```

5. Verificar en Evolution API (fetchInstances):
   ```bash
   curl -X GET https://api.evolution-api.com/instance/fetchInstances \
     -H "apikey: tu-api-key"
   ```
   Debe aparecer la instancia con nombre `tenant-{tenantId}-{suffix}`.

### Prueba 2: Verificar Logs Estructurados

**Pasos:**
1. Crear instancia desde UI
2. Revisar logs del backend:
   - ✅ Debe aparecer log con `statusCode` si hay error
   - ✅ Debe aparecer log con `responseBodySafe` si hay error
   - ✅ Debe aparecer log post-create verification (si está habilitada con `EVOLUTION_API_ENABLE_POST_CREATE_VERIFICATION=true`)

### Prueba 3: Verificar Campo instanceName Opcional

**Pasos:**
1. Ir a `/app/settings/whatsapp`
2. Click en "Conectar WhatsApp"
3. Seleccionar "Evolution API"
4. **Dejar `instanceName` vacío**
5. Ingresar solo `apiKey` y `baseUrl`
6. Click en "Validar"
7. ✅ Debe crear la instancia con nombre generado automáticamente

---

## 📝 NOTAS FINALES

- **No se requieren cambios en i18n** - Todas las keys ya existen
- **No se requieren cambios en UI de acciones** - Todas las acciones ya están disponibles
- **Los cambios son mejoras incrementales** - El flujo base ya funcionaba correctamente


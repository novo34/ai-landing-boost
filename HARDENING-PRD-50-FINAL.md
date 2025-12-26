# Hardening Final PRD-50/SPEC-50

## Resumen de Cambios Aplicados

### ✅ BLOQUEANTES CORREGIDOS

#### 1. connectEvolution: Eliminado cifrado con recordId temporal
- **Antes**: Cifraba con `temp_${Date.now()}`, luego re-cifraba con `connection.id`
- **Ahora**: 
  - Upsert con `encryptedCredentials: ''` (placeholder)
  - Cifra UNA SOLA VEZ usando `connection.id` real
  - Guarda `encryptedCredentials` final

#### 2. TenantWhatsAppAccount.credentials: No dejar ''
- **Antes**: Guardaba `''` vacío
- **Ahora**: Guarda `'{}'` si no-nullable (schema no permite null)
- **Nota**: Mensajería/webhooks usan `connectionId -> decrypt`, no `account.credentials`

#### 3. phoneNumber: No guardar ''
- **Antes**: Guardaba `''` vacío
- **Ahora**: Usa `null` si no existe (schema actualizado para nullable)

#### 4. getInstanceStatus: Implementado y verificado
- ✅ Ya existía, mejorado con validaciones de ownership

#### 5. ScheduleModule.forRoot duplicado: Eliminado
- **Antes**: `AutomationsModule` tenía `ScheduleModule.forRoot()`
- **Ahora**: Solo `ScheduleModule` (sin forRoot), ya está en `WhatsAppModule`

### ✅ MEJORAS OBLIGATORIAS

#### A. Normalizar baseUrl y guardar normalizedUrl
- ✅ Normaliza baseUrl (sin trailing slash) en `connectEvolution`
- ✅ Guarda `normalizedUrl` en `TenantEvolutionConnection`
- ✅ Usa `normalizedUrl` en todos los métodos del provider

#### B. Provider: Preservar statusCode de Axios
- ✅ Creado `EvolutionApiError` que preserva `statusCode` de Axios
- ✅ Mapea 401/403 → `INVALID_CREDENTIALS`
- ✅ Mapea 404 → `EXTERNAL_DELETED`
- ✅ Mapea network errors → `NETWORK_ERROR` / `TRANSIENT_ERROR`
- ✅ Todos los métodos del provider usan `EvolutionApiError.fromAxiosError()`

#### C. Respetar EVOLUTION_API_ENABLE_INSTANCE_CREATION
- ✅ Verifica `process.env.EVOLUTION_API_ENABLE_INSTANCE_CREATION !== 'false'`
- ✅ Lanza error si está deshabilitado

#### D. SyncInstances: Importar instancias externas
- ✅ Además de reconciliar cuentas existentes, IMPORTA instancias externas
- ✅ Si `instanceName` startsWith `tenant-{tenantId}-` y no existe en BD → crear `TenantWhatsAppAccount` con `connectionId`

#### E. Backoff mínimo en fallos repetidos
- ✅ Contador `consecutiveFailures` en sync
- ✅ Si `consecutiveFailures >= 3` → marca connection `ERROR` con `statusReason: 'TRANSIENT_ERROR'`

#### F. Validaciones de ownership en TODOS los endpoints
- ✅ `getInstanceStatus`: Valida ownership antes de procesar
- ✅ `connectInstance`: Valida ownership antes de procesar
- ✅ `disconnectInstance`: Valida ownership antes de procesar
- ✅ `deleteInstance`: Ya tenía validación
- ✅ `syncInstances`: Valida `instanceName` ownership en reconciliación

#### G. whatsapp-messaging.service: Usar connectionId -> decrypt
- ✅ Si es Evolution API, usa `connectionId` para obtener credenciales
- ✅ Descifra desde `TenantEvolutionConnection.encryptedCredentials`
- ✅ Construye credenciales con `normalizedUrl` + `apiKey` + `instanceName`

## Archivos Modificados

1. `apps/api/src/modules/whatsapp/whatsapp.service.ts`
   - `connectEvolution`: Flujo corregido (placeholder → cifrar una vez)
   - `createInstance`: Respetar `EVOLUTION_API_ENABLE_INSTANCE_CREATION`
   - `getInstanceStatus`: Validaciones de ownership mejoradas
   - `connectInstance`: Validaciones de ownership mejoradas
   - `disconnectInstance`: Validaciones de ownership mejoradas
   - `syncInstances`: Importar instancias externas + backoff
   - `deleteInstance`: Usar `normalizedUrl`
   - Todos los métodos: Usar `normalizedUrl` en lugar de `credentials.baseUrl`
   - `phoneNumber`: Usar `null` en lugar de `''`
   - `credentials`: Usar `'{}'` en lugar de `''`

2. `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`
   - Todos los métodos: Lanzan `EvolutionApiError` en lugar de `Error`
   - Preserva `statusCode` de Axios

3. `apps/api/src/modules/whatsapp/providers/evolution-api.error.ts` (NUEVO)
   - Clase `EvolutionApiError` que preserva `statusCode` de Axios
   - Mapea statusCode a HttpStatus de NestJS
   - Mapea statusCode a error_key apropiado

4. `apps/api/src/modules/whatsapp/whatsapp-messaging.service.ts`
   - `sendMessage`: Usa `connectionId -> decrypt` para Evolution API
   - Construye credenciales con `normalizedUrl` + `apiKey` + `instanceName`

5. `apps/api/src/modules/automations/automations.module.ts`
   - Eliminado `ScheduleModule.forRoot()` (duplicado)

6. `apps/api/prisma/schema.prisma`
   - `TenantEvolutionConnection`: Añadido campo `normalizedUrl String?`
   - `TenantWhatsAppAccount`: `phoneNumber` ahora es `String?` (nullable)

## Comandos para Ejecutar

### 1. Generar y aplicar migración Prisma

```bash
cd apps/api
npx prisma migrate dev --name hardening_prd50_add_normalized_url_and_nullable_phone
```

### 2. Verificar compilación TypeScript

```bash
cd apps/api
npm run build
```

### 3. Ejecutar tests

```bash
cd apps/api
npm test -- instance-name.util.spec.ts
```

### 4. Verificar lint

```bash
cd apps/api
npm run lint
```

## Ejemplos curl (3 comandos reales)

### 1. Conectar Evolution API

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/evolution/connect \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "baseUrl": "https://evolution-api.mi-hosting.com",
    "apiKey": "YOUR_API_KEY",
    "testConnection": true
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "tenantId": "clx...",
    "status": "CONNECTED",
    "statusReason": null,
    "lastTestAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Testar conexión Evolution

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/evolution/test \
  -H "Cookie: your-auth-cookie"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "CONNECTED",
    "statusReason": null,
    "lastTestAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 3. Crear instancia

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/accounts \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "instanceName": "tenant-clx123abc-1706380800000-a1b2c3",
    "phoneNumber": "+34612345678"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "instanceName": "tenant-clx123abc-1706380800000-a1b2c3",
    "status": "PENDING",
    "qrCodeUrl": "data:image/png;base64,...",
    "phoneNumber": "+34612345678",
    "createdAt": "2024-01-15T10:40:00.000Z"
  }
}
```

### 4. Sincronizar instancias (BONUS)

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/accounts/sync \
  -H "Cookie: your-auth-cookie"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "synced": 3,
    "updated": 1,
    "orphaned": 0,
    "errors": []
  }
}
```

## Variables de Entorno Requeridas

```env
# Límites y configuración
EVOLUTION_API_MAX_INSTANCES_PER_TENANT=10
EVOLUTION_API_ENABLE_INSTANCE_CREATION=true

# Sincronización
EVOLUTION_API_SYNC_INTERVAL_ACTIVE=300000  # 5 minutos (ms)
EVOLUTION_API_SYNC_INTERVAL_INACTIVE=1800000  # 30 minutos (ms)
```

## Verificaciones Finales

### 1. Verificar que no hay referencias a cifrado temporal

```bash
cd apps/api
rg "temp_.*Date.now" src/modules/whatsapp
```

**Resultado esperado:** 0 matches (excepto comentarios)

### 2. Verificar que no hay ScheduleModule.forRoot duplicado

```bash
cd apps/api
rg "ScheduleModule\.forRoot" src
```

**Resultado esperado:** 0 matches (solo en comentarios si hay)

### 3. Verificar que normalizedUrl se usa en todos los lugares

```bash
cd apps/api
rg "normalizedUrl" src/modules/whatsapp
```

**Resultado esperado:** Múltiples matches en:
- `whatsapp.service.ts`: `connectEvolution`, `createInstance`, `getInstanceStatus`, `connectInstance`, `disconnectInstance`, `syncInstances`, `deleteInstance`
- `whatsapp-messaging.service.ts`: `sendMessage`

## Notas Importantes

1. **Migración Prisma**: El schema cambió, es OBLIGATORIO ejecutar la migración antes de compilar
2. **TypeScript Server**: Reiniciar TS server después de la migración para reconocer nuevos tipos
3. **Backward Compatibility**: 
   - `phoneNumber` nullable: Los registros existentes con `''` necesitarán migración de datos
   - `normalizedUrl` nullable: Se calcula desde `encryptedCredentials` si no existe
4. **Error Handling**: Todos los errores de Evolution API ahora preservan `statusCode` de Axios

## Checklist de Implementación

- [x] connectEvolution: Flujo corregido (placeholder → cifrar una vez)
- [x] credentials: No dejar '', usar '{}'
- [x] phoneNumber: No dejar '', usar null
- [x] getInstanceStatus: Verificado y mejorado
- [x] ScheduleModule.forRoot: Eliminado duplicado
- [x] normalizedUrl: Añadido y usado en todos los lugares
- [x] EvolutionApiError: Creado y usado en provider
- [x] EVOLUTION_API_ENABLE_INSTANCE_CREATION: Respetado
- [x] SyncInstances: Importar instancias externas
- [x] Backoff mínimo: Implementado (3 fallos consecutivos)
- [x] Validaciones ownership: Confirmadas en TODOS los endpoints
- [x] whatsapp-messaging.service: Usa connectionId -> decrypt


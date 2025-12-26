# ✅ Checklist de Pruebas - Evolution API Instance Lifecycle

## Prerequisitos

1. ✅ Tenant tiene cuenta en el SaaS
2. ✅ Evolution API está configurada y accesible (Hostinger o local)
3. ✅ API Key de Evolution API válida
4. ✅ Base URL de Evolution API correcta

---

## 1. Crear Instancia en Evolution API

### Test 1.1: Crear instancia con conexión Evolution configurada

**Pasos:**
1. Conectar Evolution API desde Settings → WhatsApp → Connect Evolution
   - Base URL: `https://api.evolution-api.com` (o tu URL)
   - API Key: tu API key válida
   - Test connection: ✅ debe pasar
2. Crear nueva instancia desde Settings → WhatsApp → Connect WhatsApp
   - Seleccionar Evolution API
   - Instance Name: dejar vacío (se genera automáticamente) o usar `tenant-{tenantId}-test-1`
   - Click "Validar"

**Resultados esperados:**
- ✅ Instancia aparece en Evolution API (verificar con `GET /instance/fetchInstances`)
- ✅ Instancia aparece en el SaaS con estado PENDING o CONNECTED
- ✅ QR Code disponible si estado es PENDING
- ✅ Logs en backend muestran:
  ```
  createInstance: calling Evolution API - baseUrl=..., instanceName=...
  createInstance: Evolution API response - instanceName=..., status=...
  ```

**Verificación:**
```bash
# Verificar en Evolution API
curl -X GET "https://api.evolution-api.com/instance/fetchInstances" \
  -H "apikey: YOUR_API_KEY"

# Debe incluir la instancia creada con nombre tenant-{tenantId}-...
```

---

### Test 1.2: Crear instancia sin conexión Evolution configurada

**Pasos:**
1. Eliminar conexión Evolution (si existe)
2. Intentar crear instancia desde wizard
   - Seleccionar Evolution API
   - Ingresar Base URL y API Key
   - Click "Validar"

**Resultados esperados:**
- ✅ Primero crea/actualiza TenantEvolutionConnection
- ✅ Luego crea la instancia en Evolution API
- ✅ Instancia aparece en ambos lugares

---

### Test 1.3: Crear instancia con nombre personalizado

**Pasos:**
1. Conectar Evolution API
2. Crear instancia con nombre: `tenant-{tenantId}-custom-name`

**Resultados esperados:**
- ✅ Instancia se crea con el nombre exacto
- ✅ Nombre aparece en Evolution API
- ✅ Nombre aparece en el SaaS

---

### Test 1.4: Error - Nombre sin prefijo tenant-

**Pasos:**
1. Intentar crear instancia con nombre: `mi-instancia` (sin prefijo)

**Resultados esperados:**
- ❌ Error 400: `whatsapp.invalid_instance_name`
- ❌ Mensaje: "Instance name must start with 'tenant-{tenantId}-' prefix"

---

### Test 1.5: Error - Sin conexión Evolution

**Pasos:**
1. Eliminar conexión Evolution
2. Intentar crear instancia sin conectar primero

**Resultados esperados:**
- ❌ Error 400: `whatsapp.evolution_connection_not_found`
- ❌ Mensaje claro: "Evolution API connection is required..."

---

## 2. Conectar Instancia (Obtener QR)

### Test 2.1: Conectar instancia existente

**Pasos:**
1. Tener instancia creada con estado DISCONNECTED o PENDING
2. Click "Conectar" en la instancia

**Resultados esperados:**
- ✅ Estado cambia a PENDING
- ✅ QR Code se muestra
- ✅ Logs muestran llamada a Evolution API:
  ```
  connectInstance: calling Evolution API - baseUrl=..., instanceName=...
  connectInstance: Evolution API response - instanceName=..., hasQR=true
  ```

---

### Test 2.2: Error - Instancia no existe en Evolution

**Pasos:**
1. Crear instancia en BD manualmente (sin crear en Evolution)
2. Intentar conectar

**Resultados esperados:**
- ❌ Error 404: `whatsapp.instance_not_found`
- ❌ Mensaje: "Instance '...' not found in Evolution API"

---

## 3. Estado Real (Refresh Status)

### Test 3.1: Obtener estado real desde Evolution

**Pasos:**
1. Tener instancia creada
2. Click "Refresh Status" o llamar `GET /whatsapp/accounts/{id}/status`

**Resultados esperados:**
- ✅ Estado se actualiza desde Evolution API
- ✅ Estado en BD se sincroniza con Evolution
- ✅ Logs muestran:
  ```
  getInstanceStatus: calling Evolution API - baseUrl=..., instanceName=...
  getInstanceStatus: Evolution API response - status=open|close|connecting
  ```

---

### Test 3.2: Estado desincronizado

**Pasos:**
1. Cambiar estado en Evolution manualmente (desconectar)
2. Refresh status en SaaS

**Resultados esperados:**
- ✅ Estado en SaaS se actualiza para reflejar Evolution
- ✅ Estado en BD se actualiza

---

## 4. Desconectar Instancia

### Test 4.1: Desconectar instancia conectada

**Pasos:**
1. Tener instancia CONNECTED
2. Click "Desconectar"

**Resultados esperados:**
- ✅ Estado cambia a DISCONNECTED
- ✅ Instancia se desconecta en Evolution API
- ✅ Logs muestran:
  ```
  disconnectInstance: calling Evolution API - baseUrl=..., instanceName=...
  disconnectInstance: Successfully disconnected instance in Evolution API
  ```

---

### Test 4.2: Desconectar instancia ya desconectada (idempotencia)

**Pasos:**
1. Instancia ya DISCONNECTED
2. Click "Desconectar" nuevamente

**Resultados esperados:**
- ✅ No error (idempotente)
- ✅ Estado permanece DISCONNECTED
- ✅ Logs muestran: "Connection not found... Treating as already disconnected"

---

### Test 4.3: Error - Sin conexión Evolution

**Pasos:**
1. Eliminar TenantEvolutionConnection
2. Intentar desconectar

**Resultados esperados:**
- ❌ Error 400: `whatsapp.evolution_connection_not_found`
- ❌ Mensaje claro

---

## 5. Eliminar Instancia

### Test 5.1: Eliminar instancia desconectada

**Pasos:**
1. Tener instancia DISCONNECTED
2. Click "Eliminar"

**Resultados esperados:**
- ✅ Instancia se elimina de Evolution API
- ✅ Instancia se elimina de BD
- ✅ Dependencias se eliminan (conversations, messages, agents)
- ✅ Logs muestran:
  ```
  deleteInstance: calling Evolution API - baseUrl=..., instanceName=...
  ```

---

### Test 5.2: Error - Eliminar instancia conectada

**Pasos:**
1. Tener instancia CONNECTED
2. Intentar eliminar

**Resultados esperados:**
- ❌ Error 409: `whatsapp.must_disconnect_first`
- ❌ Mensaje: "La cuenta está conectada. Debe desconectarse antes de eliminarla."

---

## 6. Validar Instancia

### Test 6.1: Validar instancia existente

**Pasos:**
1. Tener instancia creada
2. Click "Validar"

**Resultados esperados:**
- ✅ Validación exitosa
- ✅ Estado se actualiza si cambió
- ✅ Logs muestran llamada a Evolution API

---

### Test 6.2: Error - Credenciales legacy

**Pasos:**
1. Tener cuenta con credenciales en formato legacy
2. Intentar validar

**Resultados esperados:**
- ❌ Error 400: `whatsapp.cannot_decrypt_credentials`
- ❌ Mensaje: "No se pudieron desencriptar las credenciales..."

---

## 7. Reconectar Instancia

### Test 7.1: Reconectar instancia

**Pasos:**
1. Tener instancia DISCONNECTED o ERROR
2. Click "Reconectar"

**Resultados esperados:**
- ✅ Estado cambia a PENDING
- ✅ QR Code se obtiene
- ✅ Logs muestran llamada a Evolution API

---

## 8. Sincronización Automática

### Test 8.1: Sync de instancias

**Pasos:**
1. Crear instancia externamente en Evolution API
2. Llamar `POST /whatsapp/accounts/sync`

**Resultados esperados:**
- ✅ Instancias externas se importan si tienen prefijo `tenant-{tenantId}-`
- ✅ Estados se sincronizan
- ✅ Instancias huérfanas se marcan como ERROR

---

## 9. Errores de Configuración

### Test 9.1: API Key inválida

**Pasos:**
1. Configurar conexión Evolution con API Key inválida
2. Intentar crear instancia

**Resultados esperados:**
- ❌ Error 401/403 al crear instancia
- ❌ Mensaje claro sobre credenciales inválidas

---

### Test 9.2: Base URL incorrecta

**Pasos:**
1. Configurar conexión con Base URL incorrecta
2. Intentar crear instancia

**Resultados esperados:**
- ❌ Error de conexión
- ❌ Mensaje claro sobre URL incorrecta

---

## 10. Verificación de Logs

### Checklist de Logs Estructurados

Para cada operación, verificar que los logs incluyan:

- ✅ `tenantId` en todos los logs
- ✅ `accountId` cuando aplica
- ✅ `baseUrl` en llamadas a Evolution
- ✅ `instanceName` en todas las operaciones
- ✅ `statusCode` en errores HTTP
- ✅ `error.message` en errores
- ✅ Stack trace en errores críticos

**Ejemplo de log correcto:**
```
createInstance: starting - tenantId=abc123, instanceName=tenant-abc123-test-1
createInstance: calling Evolution API - baseUrl=https://api.evolution-api.com, instanceName=tenant-abc123-test-1
createInstance: Evolution API response - instanceName=tenant-abc123-test-1, status=connecting, hasQR=true
createInstance: credentials persisted - accountId=xyz789, tenantId=abc123, recordId=xyz789
```

---

## 11. Verificación End-to-End

### Test 11.1: Flujo completo

**Pasos:**
1. Conectar Evolution API
2. Crear instancia → debe aparecer en Evolution
3. Conectar instancia → obtener QR
4. Escanear QR → estado cambia a CONNECTED
5. Refresh status → estado se sincroniza
6. Desconectar → estado cambia a DISCONNECTED
7. Eliminar → instancia se elimina de ambos lugares

**Resultados esperados:**
- ✅ Todo el flujo funciona sin errores
- ✅ Estado siempre refleja la realidad de Evolution
- ✅ Logs trazan cada paso

---

## Notas de Testing

1. **Verificar en Evolution API directamente:**
   ```bash
   # Listar instancias
   curl -X GET "https://api.evolution-api.com/instance/fetchInstances" \
     -H "apikey: YOUR_API_KEY"
   
   # Ver estado de instancia
   curl -X GET "https://api.evolution-api.com/instance/connectionState/{instanceName}" \
     -H "apikey: YOUR_API_KEY"
   ```

2. **Verificar en BD:**
   ```sql
   SELECT id, "instanceName", status, "connectionId" 
   FROM "TenantWhatsAppAccount" 
   WHERE "tenantId" = 'YOUR_TENANT_ID';
   ```

3. **Verificar logs del backend:**
   - Buscar logs con `createInstance`, `connectInstance`, `disconnectInstance`, `getInstanceStatus`
   - Verificar que incluyen todos los campos requeridos

---

**Fin del Checklist**


# 🔧 Correcciones Implementadas - Evolution API Instance Lifecycle

**Fecha:** 2024-12-19  
**Objetivo:** Corregir el lifecycle completo de instancias Evolution API para que se creen realmente en Evolution y el estado refleje la realidad.

---

## 📋 Resumen de Cambios

### 1. ✅ Flujo de Creación Corregido

**Problema:** El wizard usaba `createAccount()` (legacy) que NO creaba la instancia en Evolution API, solo creaba un registro en BD.

**Solución:**
- Modificado `WhatsAppConnectionWizard` para verificar si el tenant tiene conexión Evolution configurada
- Si tiene conexión → usa `createEvolutionInstance()` que llama a `createInstance()` (método nuevo)
- Si NO tiene conexión → primero conecta Evolution, luego crea la instancia
- El método `createInstance()` SÍ llama a `evolutionProvider.createInstance()` que hace POST real a `/instance/create`

**Archivos modificados:**
- `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`
- `apps/api/src/modules/whatsapp/whatsapp.service.ts`
- `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`

---

### 2. ✅ Logging Estructurado Implementado

**Mejoras:**
- Logs detallados en cada paso del flujo
- Incluye: `tenantId`, `accountId`, `baseUrl`, `instanceName`, `statusCode`, `error.message`
- Logs antes y después de llamadas a Evolution API
- Stack traces en errores críticos

**Ejemplo de logs:**
```
createInstance: starting - tenantId=abc123, instanceName=tenant-abc123-test-1
createInstance: calling Evolution API - baseUrl=https://api.evolution-api.com, instanceName=tenant-abc123-test-1
createInstance: Evolution API response - instanceName=tenant-abc123-test-1, status=connecting, hasQR=true
```

---

### 3. ✅ Manejo de Errores Mejorado

**Mejoras:**
- Verificación de conexión Evolution antes de operar
- Verificación de existencia de instancia en Evolution antes de conectar/desconectar
- Errores claros y específicos:
  - `whatsapp.evolution_connection_not_found` - cuando falta conexión
  - `whatsapp.instance_not_found` - cuando la instancia no existe en Evolution
  - `whatsapp.instance_not_configured` - cuando falta instanceName
- Idempotencia en disconnect (si ya está desconectado, no falla)

**Archivos modificados:**
- `apps/api/src/modules/whatsapp/whatsapp.service.ts` (connectInstance, disconnectInstance, getInstanceStatus)

---

### 4. ✅ Estado Real Sincronizado

**Mejoras:**
- `getInstanceStatus()` consulta Evolution API directamente (`connectionState`)
- Estado en BD se actualiza con el estado real de Evolution
- Si la instancia no existe en Evolution, se marca como ERROR y se lanza excepción clara

**Archivos modificados:**
- `apps/api/src/modules/whatsapp/whatsapp.service.ts` (getInstanceStatus)

---

### 5. ✅ i18n Keys Verificadas

**Estado:**
- ✅ Todas las keys requeridas ya existen en español e inglés:
  - `whatsapp.validation_error`
  - `whatsapp.reconnect_error`
  - `whatsapp.cannot_decrypt_credentials`
  - `whatsapp.evolution_connection_not_found`

**Archivos verificados:**
- `apps/web/lib/i18n/locales/es/common.json`
- `apps/web/lib/i18n/locales/en/common.json`

---

### 6. ✅ Checklist de Pruebas Creado

**Documento:** `CHECKLIST-PRUEBAS-EVOLUTION-API.md`

Incluye:
- Tests para crear instancia (con/sin conexión, con nombre personalizado, errores)
- Tests para conectar/desconectar
- Tests para estado real
- Tests para validar/reconectar
- Tests para eliminar
- Tests para sincronización
- Tests para errores de configuración
- Verificación de logs estructurados

---

## 🔍 Flujo Corregido End-to-End

### Antes (❌ Roto):
```
Wizard → createWhatsAppAccount({ provider: 'EVOLUTION_API', credentials: {...} })
  → Controller detecta 'provider' → createAccount() (legacy)
    → Valida credenciales (verifica que instancia exista)
    → Obtiene info de instancia existente
    → Crea registro en BD
    → ❌ NO crea instancia en Evolution API
```

### Después (✅ Corregido):
```
Wizard → Verifica conexión Evolution
  → Si tiene conexión:
    → createEvolutionInstance({ instanceName?, phoneNumber? })
      → Controller detecta NO tiene 'provider' → createInstance() (nuevo)
        → Obtiene credenciales desde TenantEvolutionConnection
        → evolutionProvider.createInstance()
          → POST {baseUrl}/instance/create ✅ LLAMADA REAL
        → Crea registro en BD
  → Si NO tiene conexión:
    → connectEvolution({ baseUrl, apiKey })
      → Crea/actualiza TenantEvolutionConnection
    → createEvolutionInstance()
      → (mismo flujo de arriba)
```

---

## 📝 Archivos Modificados

### Frontend:
1. `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`
   - Lógica para verificar conexión Evolution
   - Uso de `createEvolutionInstance()` cuando hay conexión
   - Manejo de errores mejorado

### Backend:
1. `apps/api/src/modules/whatsapp/whatsapp.service.ts`
   - Logging estructurado en `createInstance()`
   - Mejoras en `connectInstance()` - verificación de existencia
   - Mejoras en `disconnectInstance()` - mejor manejo de errores
   - Mejoras en `getInstanceStatus()` - verificación de existencia y logging

2. `apps/api/src/modules/whatsapp/providers/evolution.provider.ts`
   - Logging estructurado en `createInstance()`
   - Mejor manejo de errores con stack traces

---

## ⚠️ Notas Importantes

### Legacy Credentials
- Las cuentas con credenciales en formato legacy pueden causar errores al validar/reconectar
- El sistema detecta formato legacy y devuelve error claro: `whatsapp.cannot_decrypt_credentials`
- **Recomendación:** Eliminar cuentas legacy y recrearlas con el nuevo flujo

### Validación de Nombres
- Los nombres de instancia DEBEN tener prefijo `tenant-{tenantId}-`
- Si se proporciona nombre sin prefijo, se genera automáticamente
- Si se proporciona nombre con prefijo incorrecto, se rechaza con error claro

### Estado Desincronizado
- El estado en BD puede desincronizarse si se modifica externamente en Evolution
- Usar "Refresh Status" para sincronizar
- El scheduler de sync también actualiza estados periódicamente

---

## 🧪 Próximos Pasos

1. **Ejecutar checklist de pruebas** (`CHECKLIST-PRUEBAS-EVOLUTION-API.md`)
2. **Verificar logs** en producción para confirmar que las llamadas a Evolution se realizan
3. **Migrar cuentas legacy** si es necesario (eliminar y recrear)
4. **Monitorear errores** relacionados con `whatsapp.evolution_connection_not_found` y `whatsapp.instance_not_found`

---

## ✅ Verificación Final

Para verificar que todo funciona:

1. **Crear instancia:**
   ```bash
   # Verificar en Evolution API
   curl -X GET "https://api.evolution-api.com/instance/fetchInstances" \
     -H "apikey: YOUR_API_KEY"
   # Debe incluir la instancia creada
   ```

2. **Verificar logs del backend:**
   - Buscar: `createInstance: calling Evolution API`
   - Debe mostrar: `baseUrl`, `instanceName`, y respuesta de Evolution

3. **Verificar estado:**
   - Estado en SaaS debe reflejar estado real de Evolution
   - Refresh status debe sincronizar correctamente

---

**Fin del Documento**


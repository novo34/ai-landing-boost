# DEBUG-TESTS: Verificación de Bugs WhatsApp

**Fecha:** 2025-01-XX  
**Objetivo:** Verificar que los bugs críticos están resueltos

---

## Bugs Resueltos

### Bug 1: DELETE devuelve 403 "instance_not_owned" incluso cuando la UI muestra botón "Eliminar cuenta legacy"
**Estado:** ✅ RESUELTO

### Bug 2: VALIDATE/RECONNECT devuelven 400 "Legacy credentials format" incluso en cuentas nuevas o la UI no lo traduce
**Estado:** ✅ RESUELTO

---

## Configuración de Pruebas

### Requisitos Previos

1. **Dos tenants de prueba:**
   - Tenant A: `tenant-a-123` (ID: `cmj018os20000eq9yiwz99piy`)
   - Tenant B: `tenant-b-456` (ID diferente)

2. **Cuenta de prueba legacy huérfana:**
   - Account ID: `20287d4a-072a-4e9b-b005-6e2e6d6096ac`
   - Tenant ID en BD: puede ser diferente al tenant actual
   - Status: `PENDING` o `ERROR` (NO `CONNECTED`)
   - Credenciales: formato legacy (no EncryptedBlobV1)
   - InstanceName: `tenant-${tenantId}-xxx` (debe validar con validateInstanceName)

---

## Pruebas Manuales

### Test 1: DELETE cuenta legacy huérfana (Caso del Bug 1)

**Escenario:** Cuenta legacy con `account.tenantId != requestedTenantId` pero `instanceName` válido

**Pasos:**
1. Autenticarse como Tenant A (`cmj018os20000eq9yiwz99piy`)
2. Navegar a `/app/settings/whatsapp`
3. Identificar cuenta legacy (debe mostrar banner "Cuenta legacy")
4. Hacer clic en "Eliminar cuenta legacy"
5. Confirmar eliminación

**Resultado Esperado:**
- ✅ HTTP 200 (éxito)
- ✅ Logs muestran: `[deleteAccount] Legacy override ALLOWED: ... decisionReason=legacy_orphan_maintenance`
- ✅ Cuenta eliminada de la BD
- ✅ Dependencias eliminadas (mensajes, conversaciones, agentes)

**Logs a Buscar:**
```
[deleteAccount] Legacy override ALLOWED: accountId=20287d4a-072a-4e9b-b005-6e2e6d6096ac, requestedTenantId=cmj018os20000eq9yiwz99piy, accountTenantId=..., instanceName=..., status=..., isLegacy=true, canDecrypt=false, decisionReason=legacy_orphan_maintenance
```

**Si Falla:**
- Verificar logs: `[deleteAccount] Ownership check FAILED: ... decisionReason=...`
- Verificar que `instanceName` empiece con `tenant-${tenantId}-`
- Verificar que `status != CONNECTED`

---

### Test 2: DELETE cuenta legacy CONNECTED (debe fallar)

**Escenario:** Cuenta legacy pero status = CONNECTED (por seguridad)

**Pasos:**
1. Crear/modificar cuenta legacy con `status = CONNECTED`
2. Intentar eliminar desde UI

**Resultado Esperado:**
- ❌ HTTP 403 "instance_not_owned"
- ✅ Logs muestran: `Legacy account override DENIED for DELETE: account is CONNECTED`

---

### Test 3: DELETE cuenta cross-tenant (debe fallar)

**Escenario:** Cuenta de Tenant B intentando eliminar desde Tenant A

**Pasos:**
1. Autenticarse como Tenant A
2. Intentar eliminar cuenta que pertenece a Tenant B (instanceName no válido)

**Resultado Esperado:**
- ❌ HTTP 403 "instance_not_owned"
- ✅ Logs muestran: `[deleteAccount] Ownership check FAILED: ... decisionReason=...`

---

### Test 4: VALIDATE cuenta legacy (debe devolver 400 traducible)

**Escenario:** Cuenta legacy, intentar validar

**Pasos:**
1. Autenticarse como Tenant A
2. Navegar a cuenta legacy
3. Hacer clic en "Validar"

**Resultado Esperado:**
- ❌ HTTP 400
- ✅ `error_key: "whatsapp.invalid_credentials_format"`
- ✅ Toast muestra: "Las credenciales están en formato antiguo. Por favor, crea una nueva cuenta." (ES) o "The credentials are in an old format. Please create a new account." (EN)
- ✅ NO muestra la key cruda: `"Translation key not found: whatsapp.invalid_credentials_format"`

**Logs a Buscar:**
```
[validateAccount] Ownership check PASSED: ... (si owned) o FAILED (si no owned)
Failed to decrypt credentials for account ...: Legacy format detected
```

---

### Test 5: RECONNECT cuenta legacy (debe devolver 400 traducible)

**Escenario:** Cuenta legacy, intentar reconectar

**Pasos:**
1. Autenticarse como Tenant A
2. Navegar a cuenta legacy
3. Hacer clic en "Reconectar"

**Resultado Esperado:**
- ❌ HTTP 400
- ✅ `error_key: "whatsapp.invalid_credentials_format"`
- ✅ Toast muestra traducción correcta (NO key cruda)

---

### Test 6: VALIDATE cuenta nueva (debe funcionar)

**Escenario:** Cuenta con formato nuevo EncryptedBlobV1

**Pasos:**
1. Crear cuenta nueva (wizard)
2. Validar cuenta

**Resultado Esperado:**
- ✅ HTTP 200
- ✅ Status actualizado a `CONNECTED`
- ✅ NO aparece error de "legacy format"

---

### Test 7: Aislamiento Multi-Tenant

**Escenario:** Verificar que Tenant A no puede operar cuentas de Tenant B

**Pasos:**
1. Autenticarse como Tenant A
2. Intentar acceder a cuenta de Tenant B (usando ID conocido)
3. Probar: GET, DELETE, VALIDATE, RECONNECT

**Resultado Esperado:**
- ❌ HTTP 403 o 404 para todas las operaciones
- ✅ Logs muestran: `Ownership check FAILED: accountTenantId=tenant-b, requestTenantId=tenant-a`

---

## Verificación de Logs Estructurados

Todos los logs deben incluir:
- `action` (deleteAccount, validateAccount, reconnectAccount, etc.)
- `accountId`
- `requestedTenantId`
- `accountTenantId`
- `instanceName` (si existe)
- `status`
- `isLegacy`
- `canDecrypt`
- `decisionReason` (razón de la decisión)

**Ejemplo de log correcto:**
```
[deleteAccount] Legacy override ALLOWED: accountId=20287d4a-072a-4e9b-b005-6e2e6d6096ac, requestedTenantId=cmj018os20000eq9yiwz99piy, accountTenantId=..., instanceName=tenant-cmj018os20000eq9yiwz99piy-xxx, status=PENDING, isLegacy=true, canDecrypt=false, decisionReason=legacy_orphan_maintenance
```

---

## Verificación de Código

### Checklist de Implementación

- [x] Policy `assertAccountOwnedOrLegacyOverride` con logs estructurados
- [x] `canOperateLegacyAccount` permite DELETE solo si `status != CONNECTED`
- [x] `deleteAccount` usa `findUnique` (no filtra por tenantId) y llama a policy
- [x] `validateAccount` y `reconnectAccount` usan policy y devuelven error traducible
- [x] `encryptCredentials` tiene aserción dura (no produce legacy)
- [x] `deleteAccountDependencies` loggea conteos por tabla
- [x] Helper `getAccountOrThrow` creado para validación centralizada
- [x] Traducciones en `common.json` (ES y EN) para `whatsapp.invalid_credentials_format` y `whatsapp.instance_not_owned`

---

## Comandos Útiles

### Ver logs en tiempo real (backend)
```bash
cd apps/api
npm run start:dev | grep -E "\[(deleteAccount|validateAccount|reconnectAccount|Ownership|Legacy)"
```

### Verificar traducciones
```bash
cd apps/web
npm run check-i18n
```

### Verificar compilación
```bash
cd apps/api
npm run build
```

---

## Casos de Prueba Específicos

### Caso 1: Account ID `20287d4a-072a-4e9b-b005-6e2e6d6096ac`

**Contexto:**
- Tenant actual: `cmj018os20000eq9yiwz99piy`
- Problema original: DELETE devolvía 403

**Verificación:**
1. Verificar en BD: `SELECT id, tenantId, instanceName, status, LEFT(credentials, 50) FROM tenantwhatsappaccount WHERE id = '20287d4a-072a-4e9b-b005-6e2e6d6096ac';`
2. Si `instanceName` empieza con `tenant-cmj018os20000eq9yiwz99piy-`, debe permitir DELETE
3. Si `status = CONNECTED`, debe denegar DELETE (403)
4. Si `status != CONNECTED` y `instanceName` válido, debe permitir DELETE (200)

---

## Notas Finales

- **NO refactorizar por gusto:** Solo se cambió lo necesario
- **Una sola policy:** `assertAccountOwnedOrLegacyOverride` es la única fuente de verdad
- **Logs obligatorios:** Cada denial/override debe loggearse con contexto completo
- **Seguridad multi-tenant:** Un tenant NO puede operar cuentas de otro (excepto DELETE legacy huérfana bajo reglas estrictas)


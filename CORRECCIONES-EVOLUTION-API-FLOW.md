# 🔧 CORRECCIONES: Flujo WhatsApp Evolution API

**Fecha:** 2024-12-19  
**Objetivo:** Auditar y corregir el flujo de WhatsApp Evolution API para que las instancias se creen realmente en Evolution API y el frontend exponga todas las acciones disponibles.

---

## ✅ CAMBIOS REALIZADOS

### 1. Normalización de `instanceName` en Backend

**Archivo:** `apps/api/src/modules/whatsapp/whatsapp.service.ts`

**Cambios:**
- ✅ Añadida función `normalizeInstanceName()` que agrega automáticamente el prefijo `tenant-{tenantId}-` si falta
- ✅ Modificado `createInstance()` para usar normalización en lugar de validación estricta
- ✅ Si el usuario proporciona un nombre sin prefijo (ej: "mi-instancia"), se normaliza a `tenant-{tenantId}-mi-instancia`
- ✅ Si viene vacío o null, se genera automáticamente con `generateInstanceName()`

**Código:**
```typescript
private normalizeInstanceName(instanceName: string | undefined | null, tenantId: string): string | null {
  if (!instanceName || instanceName.trim() === '') {
    return null; // Se generará automáticamente
  }
  
  const trimmed = instanceName.trim();
  const prefix = `tenant-${tenantId}-`;
  
  // Si ya tiene el prefijo correcto, devolverlo tal cual
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  
  // Si no tiene prefijo, agregarlo
  const cleanName = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
  const normalized = `${prefix}${cleanName}`;
  
  // Validar longitud máxima (50 caracteres)
  if (normalized.length > 50) {
    const maxSuffixLength = 50 - prefix.length;
    const truncatedSuffix = cleanName.substring(0, maxSuffixLength);
    return `${prefix}${truncatedSuffix}`;
  }
  
  return normalized;
}
```

---

### 2. Corrección del Wizard Frontend

**Archivo:** `apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`

**Cambios:**
- ✅ Eliminado mensaje confuso sobre prefijo `tenant-{tenantId}-`
- ✅ Cambiado texto a: "Si proporcionas un nombre, se normalizará automáticamente con el prefijo del tenant"
- ✅ Añadidos logs de debug cuando `NEXT_PUBLIC_DEBUG_API=true` para rastrear payload y endpoint
- ✅ El wizard ya usa correctamente `createEvolutionInstance()` cuando el tenant tiene conexión Evolution configurada

**Antes:**
```tsx
<p className="text-xs text-muted-foreground">
  Si proporcionas un nombre, debe comenzar con &quot;tenant-{'{tenantId}'}-&quot;
</p>
```

**Después:**
```tsx
<p className="text-xs text-muted-foreground">
  Si proporcionas un nombre, se normalizará automáticamente con el prefijo del tenant
</p>
```

---

### 3. Botón Sync en Frontend

**Archivo:** `apps/web/app/app/settings/whatsapp/page.tsx`

**Cambios:**
- ✅ Añadido estado `syncing` para controlar loading del botón
- ✅ Añadida función `handleSync()` que llama a `apiClient.syncEvolutionInstances()`
- ✅ Añadido botón "Sync" en la barra superior (solo visible si hay cuentas Evolution API)
- ✅ Añadidos logs de debug y manejo de errores

**Código:**
```tsx
const handleSync = async () => {
  try {
    setSyncing(true);
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.log('[WhatsApp Settings] Syncing instances with Evolution API:', {
        endpoint: '/whatsapp/accounts/sync',
      });
    }
    const response = await apiClient.syncEvolutionInstances();
    // ... manejo de respuesta
  } finally {
    setSyncing(false);
  }
};
```

---

### 4. Manejo Idempotente de Disconnect

**Archivo:** `apps/web/app/app/settings/whatsapp/page.tsx`

**Cambios:**
- ✅ Mejorado manejo de errores en `handleDisconnect()` para tratar `whatsapp.evolution_connection_not_found` como idempotente
- ✅ Si Evolution responde "connection not found", se muestra mensaje "Ya desconectado" en lugar de error
- ✅ Añadidos logs de debug

**Backend ya tenía manejo idempotente:**
- El método `disconnectInstance()` en `whatsapp.service.ts` ya maneja correctamente el caso donde la conexión no existe en Evolution API
- Retorna `connectionNotFound: true` y actualiza el estado a DISCONNECTED
- El frontend ahora maneja este caso correctamente

---

### 5. Logs Mejorados

**Backend (`apps/api/src/modules/whatsapp/whatsapp.service.ts`):**
- ✅ Añadido log `[LEGACY FLOW]` en `createAccount()` para distinguir flujo legacy vs nuevo
- ✅ Añadido log `[NEW FLOW]` en `createInstance()` 
- ✅ Añadidos logs de normalización de `instanceName`

**Frontend:**
- ✅ Añadidos logs de debug en wizard cuando `NEXT_PUBLIC_DEBUG_API=true`
- ✅ Añadidos logs en `handleSync()`, `handleDisconnect()`, etc.

---

## 📋 VERIFICACIÓN DEL FLUJO

### Flujo Correcto (Nuevo)

1. **Usuario abre wizard** → Selecciona Evolution API
2. **Wizard verifica conexión Evolution:**
   - Si tiene conexión → Llama a `createEvolutionInstance()` (flujo nuevo)
   - Si NO tiene conexión → Llama a `connectEvolution()` primero, luego `createEvolutionInstance()`
3. **Backend (`createInstance`):**
   - Verifica `TenantEvolutionConnection`
   - Normaliza `instanceName` (agrega prefijo si falta)
   - Llama a `evolutionProvider.createInstance()` → **POST real a Evolution API**
   - Crea registro en BD
4. **Resultado:** Instancia creada en Evolution API + registro en BD

### Flujo Legacy (Mantenido para compatibilidad)

1. **Usuario con cuenta legacy** → Usa `createWhatsAppAccount({ provider: 'EVOLUTION_API' })`
2. **Backend (`createAccount`):**
   - Detecta `provider` en DTO → usa flujo legacy
   - Valida que la instancia exista en Evolution (NO la crea)
   - Crea registro en BD
3. **Resultado:** Solo registro en BD (instancia debe existir previamente)

---

## 🎯 ACCIONES DISPONIBLES EN FRONTEND

Todas las acciones están implementadas y disponibles en la UI:

| Acción | Endpoint | Estado | UI |
|--------|----------|--------|-----|
| **Crear instancia** | `POST /whatsapp/accounts` (sin provider) | ✅ | Wizard |
| **Connect (QR)** | `POST /whatsapp/accounts/:id/connect` | ✅ | Dropdown menu |
| **Disconnect** | `POST /whatsapp/accounts/:id/disconnect` | ✅ | Dropdown menu |
| **Refresh Status** | `GET /whatsapp/accounts/:id/status` | ✅ | Dropdown menu |
| **Sync** | `POST /whatsapp/accounts/sync` | ✅ | Botón en barra superior |
| **Delete** | `DELETE /whatsapp/accounts/:id` | ✅ | Dropdown menu |

---

## 🔍 ARCHIVOS MODIFICADOS

1. **`apps/api/src/modules/whatsapp/whatsapp.service.ts`**
   - Añadida función `normalizeInstanceName()`
   - Modificado `createInstance()` para usar normalización
   - Añadidos logs `[LEGACY FLOW]` y `[NEW FLOW]`

2. **`apps/web/components/whatsapp/whatsapp-connection-wizard.tsx`**
   - Eliminado mensaje confuso sobre prefijo
   - Añadidos logs de debug

3. **`apps/web/app/app/settings/whatsapp/page.tsx`**
   - Añadido botón Sync
   - Mejorado manejo idempotente de disconnect
   - Añadidos logs de debug

---

## ✅ CHECKLIST DE PRUEBAS

### Test 1: Crear Instancia (Flujo Nuevo)
- [ ] Abrir wizard → Seleccionar Evolution API
- [ ] Si NO tiene conexión Evolution → Ingresar baseUrl y apiKey
- [ ] Ingresar nombre de instancia (sin prefijo, ej: "mi-instancia")
- [ ] Verificar que se crea en Evolution API (fetchInstances)
- [ ] Verificar que el nombre se normaliza a `tenant-{tenantId}-mi-instancia`

### Test 2: Crear Instancia (Auto-generado)
- [ ] Abrir wizard → Seleccionar Evolution API
- [ ] Dejar nombre de instancia vacío
- [ ] Verificar que se genera automáticamente con prefijo

### Test 3: Connect (QR)
- [ ] Click "Connect" en una instancia DISCONNECTED
- [ ] Verificar que se muestra QR code
- [ ] Verificar que el estado cambia a PENDING

### Test 4: Refresh Status
- [ ] Click "Refresh Status" en una instancia
- [ ] Verificar que el estado se actualiza desde Evolution API
- [ ] Verificar logs en backend: `getInstanceStatus: Evolution API response`

### Test 5: Disconnect Idempotente
- [ ] Desconectar una instancia CONNECTED → Debe cambiar a DISCONNECTED
- [ ] Intentar desconectar nuevamente → Debe mostrar "Ya desconectado" (idempotente)
- [ ] Verificar logs: `connectionNotFound: true`

### Test 6: Sync
- [ ] Crear instancia en Evolution API manualmente (fuera del SaaS)
- [ ] Click "Sync" en frontend
- [ ] Verificar que la instancia aparece en la lista
- [ ] Verificar logs: `synced`, `updated`, `orphaned`

### Test 7: Delete
- [ ] Eliminar una instancia DISCONNECTED
- [ ] Verificar que desaparece de Evolution API (fetchInstances)
- [ ] Verificar que desaparece de BD

---

## 📝 NOTAS IMPORTANTES

1. **Normalización automática:** El backend ahora normaliza automáticamente los nombres de instancia. El usuario NO necesita conocer el prefijo `tenant-{tenantId}-`.

2. **Flujo dual:** El sistema mantiene dos flujos:
   - **Nuevo:** `createInstance()` → Crea instancia real en Evolution
   - **Legacy:** `createAccount()` → Solo valida instancia existente

3. **Logs de debug:** Activar con `NEXT_PUBLIC_DEBUG_API=true` en frontend para ver payloads y endpoints.

4. **Manejo idempotente:** Disconnect y otras operaciones son idempotentes. Si la instancia ya está desconectada, no se lanza error.

5. **Sync manual:** El botón Sync sincroniza instancias entre Evolution API y BD. Útil cuando se crean instancias fuera del SaaS.

---

## 🚀 PRÓXIMOS PASOS (Opcional)

1. Añadir polling automático para sincronizar estados periódicamente
2. Añadir indicador visual cuando el estado está desincronizado
3. Añadir validación de límite de instancias en frontend antes de crear
4. Mejorar mensajes de error para casos edge (cuenta legacy, credenciales inválidas, etc.)

---

**Fin de Correcciones**


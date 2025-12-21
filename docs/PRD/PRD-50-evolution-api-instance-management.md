# PRD-50: Gestión Completa de Instancias Evolution API

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-10

---

## Objetivo

Permitir a los tenants gestionar completamente sus instancias de Evolution API desde el SaaS, sin necesidad de acceder a EasyPanel. El sistema debe crear, eliminar, validar, conectar, desconectar y monitorear instancias de forma autónoma, manteniendo sincronización completa con la instancia de Evolution API alojada en Hostinger.

---

## Alcance INCLUIDO

- ✅ Crear instancias automáticamente usando API Key maestra
- ✅ Eliminar instancias desde el SaaS
- ✅ Validar estado de conexión de instancias
- ✅ Conectar/desconectar instancias
- ✅ Obtener y mostrar QR codes para conexión
- ✅ Listar todas las instancias del tenant
- ✅ Sincronización bidireccional con Evolution API (EasyPanel)
- ✅ Gestión completa sin necesidad de acceder a EasyPanel
- ✅ Monitoreo de estado en tiempo real
- ✅ Reconexión automática cuando sea necesario
- ✅ Limpieza automática de instancias huérfanas

---

## Alcance EXCLUIDO

- ❌ Modificar configuración avanzada de Evolution API (webhooks, integraciones)
- ❌ Gestión de múltiples servidores Evolution API (solo uno por SaaS)
- ❌ Compartir instancias entre tenants (nunca)
- ❌ Backup/restore de instancias (queda para futuro)

---

## Requisitos Funcionales

### RF-01: Crear Instancia Automáticamente

**Descripción:** OWNER debe poder crear una nueva instancia de Evolution API desde el SaaS, sin necesidad de acceder a EasyPanel.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Hace clic en "Conectar WhatsApp"
3. Selecciona "Evolution API" → "Crear nueva instancia"
4. Opcionalmente ingresa:
   - Nombre de instancia (si no se proporciona, se genera automáticamente)
   - Número de teléfono (opcional, puede asignarse después)
5. Sistema crea la instancia en Evolution API usando API Key maestra
6. Sistema obtiene QR code automáticamente
7. Sistema guarda credenciales encriptadas en BD
8. Usuario escanea QR code con WhatsApp
9. Estado cambia automáticamente a CONNECTED cuando se escanea

**Generación automática de nombres:**
- Formato: `tenant-{tenantId}-{timestamp}-{random}`
- Ejemplo: `tenant-clx123abc-1706380800000-a1b2c3`
- Máximo 50 caracteres
- Solo caracteres alfanuméricos y guiones

**Validaciones:**
- Verificar que el tenant no exceda límite de instancias (configurable)
- Verificar que el nombre de instancia no exista ya en Evolution API
- Validar formato de número de teléfono si se proporciona

---

### RF-02: Eliminar Instancia

**Descripción:** OWNER debe poder eliminar una instancia desde el SaaS, lo que eliminará tanto el registro en BD como la instancia en Evolution API.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Ve lista de instancias
3. Hace clic en "Eliminar" en una instancia
4. Sistema solicita confirmación
5. Sistema elimina la instancia en Evolution API
6. Sistema elimina el registro en BD
7. Sistema muestra confirmación de eliminación

**Validaciones:**
- Verificar que la instancia pertenece al tenant
- Verificar que la instancia existe en Evolution API antes de eliminar
- Manejar errores si la instancia ya fue eliminada externamente

**Limpieza:**
- Si la eliminación en Evolution API falla pero el registro en BD se elimina, registrar en logs
- Si la eliminación en Evolution API tiene éxito pero falla en BD, intentar rollback

---

### RF-03: Validar Estado de Instancia

**Descripción:** El sistema debe poder validar el estado actual de una instancia consultando Evolution API.

**Flujo:**
1. Usuario hace clic en "Validar" en una instancia
2. Sistema consulta estado en Evolution API
3. Sistema actualiza estado en BD según respuesta:
   - `open` → CONNECTED
   - `close` → DISCONNECTED
   - `connecting` → PENDING
   - Error → ERROR
4. Sistema muestra resultado al usuario

**Validación automática:**
- Validar estado cada 5 minutos para instancias PENDING
- Validar estado cada 30 minutos para instancias CONNECTED
- Validar inmediatamente después de escanear QR code

---

### RF-04: Conectar/Desconectar Instancia

**Descripción:** OWNER debe poder conectar o desconectar una instancia manualmente.

**Conectar:**
1. Usuario hace clic en "Conectar" en una instancia DISCONNECTED
2. Sistema obtiene nuevo QR code de Evolution API
3. Sistema actualiza estado a PENDING
4. Sistema muestra QR code al usuario
5. Usuario escanea QR code
6. Estado cambia automáticamente a CONNECTED

**Desconectar:**
1. Usuario hace clic en "Desconectar" en una instancia CONNECTED
2. Sistema desconecta la instancia en Evolution API
3. Sistema actualiza estado a DISCONNECTED
4. Sistema muestra confirmación

---

### RF-05: Obtener QR Code

**Descripción:** El sistema debe poder obtener el QR code de una instancia en cualquier momento.

**Flujo:**
1. Usuario hace clic en "Ver QR" o "Reconectar"
2. Sistema consulta QR code en Evolution API
3. Sistema muestra QR code al usuario
4. QR code se actualiza automáticamente si expira

**Manejo de QR expirado:**
- Detectar cuando el QR code expira (estado `close` o `connecting`)
- Generar nuevo QR code automáticamente
- Notificar al usuario que debe escanear el nuevo QR

---

### RF-06: Listar Instancias

**Descripción:** El sistema debe mostrar todas las instancias del tenant, sincronizadas con Evolution API.

**Información mostrada:**
- Nombre de instancia
- Número de teléfono (si está conectado)
- Estado (CONNECTED, PENDING, DISCONNECTED, ERROR)
- Fecha de conexión
- Última verificación
- Acciones disponibles (Conectar, Desconectar, Validar, Eliminar, Ver QR)

**Sincronización:**
- Al cargar la página, sincronizar con Evolution API
- Mostrar instancias que existen en Evolution API pero no en BD (huérfanas)
- Permitir importar instancias huérfanas al SaaS

---

### RF-07: Sincronización con Evolution API

**Descripción:** El sistema debe mantener sincronización bidireccional con Evolution API, asegurando que todos los cambios sean visibles en EasyPanel.

**Sincronización desde SaaS a Evolution API:**
- Crear instancia → Visible en EasyPanel
- Eliminar instancia → Eliminada en EasyPanel
- Conectar/Desconectar → Estado actualizado en EasyPanel
- Cambios de nombre → Reflejados en EasyPanel

**Sincronización desde Evolution API a SaaS:**
- Detectar cambios externos (si se elimina instancia en EasyPanel)
- Actualizar estado cuando cambia en Evolution API
- Detectar nuevas instancias creadas externamente

**Validación periódica:**
- Sincronizar cada 5 minutos para instancias activas
- Sincronizar cada 30 minutos para instancias inactivas
- Sincronizar inmediatamente después de acciones del usuario

---

### RF-08: Monitoreo y Alertas

**Descripción:** El sistema debe monitorear el estado de las instancias y alertar sobre problemas.

**Eventos a monitorear:**
- Instancia desconectada inesperadamente
- Error al conectar instancia
- QR code expirado sin conexión
- Instancia eliminada externamente
- Límite de instancias alcanzado

**Alertas:**
- Notificación en UI cuando instancia se desconecta
- Email al OWNER si instancia permanece desconectada > 24 horas
- Log de todos los eventos para auditoría

---

## Requisitos Técnicos

### RT-01: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Evolution API - Instancia propia en Hostinger
EVOLUTION_API_BASE_URL=https://jn-evolution-api.xvvcvg.easypanel.host
EVOLUTION_API_MASTER_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_API_ENABLE_INSTANCE_CREATION=true

# Límites y configuración
EVOLUTION_API_MAX_INSTANCES_PER_TENANT=10
EVOLUTION_API_SYNC_INTERVAL_ACTIVE=300000  # 5 minutos
EVOLUTION_API_SYNC_INTERVAL_INACTIVE=1800000  # 30 minutos
```

---

### RT-02: Endpoints API Adicionales

**Nuevos endpoints:**

```
POST   /api/v1/whatsapp/accounts/create-instance     → Crear instancia automáticamente
DELETE /api/v1/whatsapp/accounts/:id/delete-instance → Eliminar instancia (BD + Evolution API)
POST   /api/v1/whatsapp/accounts/:id/connect        → Conectar instancia
POST   /api/v1/whatsapp/accounts/:id/disconnect     → Desconectar instancia
GET    /api/v1/whatsapp/accounts/sync                → Sincronizar con Evolution API
GET    /api/v1/whatsapp/accounts/:id/status          → Obtener estado detallado
```

**Endpoints existentes (mejorar):**

```
GET    /api/v1/whatsapp/accounts                     → Listar (con sincronización)
GET    /api/v1/whatsapp/accounts/:id/qr              → Obtener QR (mejorar manejo de expiración)
POST   /api/v1/whatsapp/accounts/:id/validate        → Validar (mejorar respuesta)
POST   /api/v1/whatsapp/accounts/:id/reconnect       → Reconectar (mejorar)
```

---

### RT-03: Métodos en EvolutionProvider

**Nuevos métodos:**

```typescript
// Crear instancia
async createInstance(options: {
  instanceName?: string;
  phoneNumber?: string;
}): Promise<{
  instanceName: string;
  instanceId: string;
  status: 'open' | 'close' | 'connecting';
  qrCodeUrl: string | null;
}>

// Eliminar instancia
async deleteInstance(instanceName: string): Promise<void>

// Conectar instancia (obtener QR)
async connectInstance(instanceName: string): Promise<{
  qrCodeUrl: string | null;
  status: 'open' | 'close' | 'connecting';
}>

// Desconectar instancia
async disconnectInstance(instanceName: string): Promise<void>

// Obtener estado detallado
async getInstanceStatus(instanceName: string): Promise<{
  status: 'open' | 'close' | 'connecting';
  phoneNumber?: string;
  displayName?: string;
  lastSeen?: Date;
}>

// Listar todas las instancias
async listAllInstances(): Promise<Array<{
  instanceName: string;
  status: 'open' | 'close' | 'connecting';
  phoneNumber?: string;
}>>

// Sincronizar estado
async syncInstanceStatus(instanceName: string): Promise<{
  status: 'open' | 'close' | 'connecting';
  phoneNumber?: string;
}>
```

---

### RT-04: Servicio de Sincronización

**Nuevo servicio:** `whatsapp-sync.service.ts`

**Responsabilidades:**
- Sincronizar estado de instancias periódicamente
- Detectar instancias huérfanas
- Actualizar estados en BD según Evolution API
- Limpiar instancias eliminadas externamente

**Configuración:**
- Intervalo de sincronización configurable
- Sincronización bajo demanda (endpoint manual)
- Logs de sincronización para debugging

---

### RT-05: Modelo de Base de Datos (Sin cambios)

El modelo actual `TenantWhatsAppAccount` es suficiente, pero se pueden agregar campos opcionales:

```prisma
model TenantWhatsAppAccount {
  // ... campos existentes ...
  
  // Nuevos campos opcionales para mejor tracking
  instanceId      String?  // ID de instancia en Evolution API
  lastSyncedAt    DateTime? // Última sincronización con Evolution API
  syncStatus      String?  // Estado de última sincronización
  externalDeleted Boolean @default(false) // Si fue eliminada externamente
}
```

---

## Flujos UX

### Flujo 1: Crear Nueva Instancia

```
[Settings → WhatsApp]
  ↓
[Click "Conectar WhatsApp"]
  ↓
[Modal Wizard - Paso 1: Proveedor]
  Seleccionar "Evolution API"
  ↓
[Paso 1.5: Tipo de Conexión]
  Seleccionar "Crear nueva instancia"
  ↓
[Paso 2: Configuración]
  - Nombre (opcional, se genera si está vacío)
  - Número de teléfono (opcional)
  ↓
[Click "Crear Instancia"]
  ↓
[Creando instancia...]
  ↓
[Éxito: Mostrar QR Code]
  ↓
[Usuario escanea QR con WhatsApp]
  ↓
[Estado cambia a CONNECTED automáticamente]
  ↓
[Instancia lista para usar]
```

### Flujo 2: Gestionar Instancia Existente

```
[Settings → WhatsApp]
  ↓
[Lista de instancias]
  ↓
[Click en instancia]
  ↓
[Panel de acciones]
  ├─ [Validar] → Actualiza estado
  ├─ [Conectar] → Muestra QR nuevo
  ├─ [Desconectar] → Desconecta instancia
  ├─ [Ver QR] → Muestra QR actual
  └─ [Eliminar] → Elimina instancia (BD + Evolution API)
```

### Flujo 3: Sincronización Automática

```
[Sistema ejecuta sincronización cada 5 minutos]
  ↓
[Consulta todas las instancias en Evolution API]
  ↓
[Compara con instancias en BD]
  ↓
[Actualiza estados]
  ↓
[Detecta instancias huérfanas]
  ↓
[Notifica cambios al usuario si es necesario]
```

---

## Estructura de Respuestas API

### Crear Instancia

```typescript
POST /api/v1/whatsapp/accounts/create-instance
Request: {
  instanceName?: string;
  phoneNumber?: string;
}

Response: {
  success: true,
  data: {
    id: "wa_xxx",
    instanceName: "tenant-clx123abc-1706380800000-a1b2c3",
    instanceId: "2797fd30-72ac-45d5-b4b9-5f140c6ab589",
    status: "PENDING",
    qrCodeUrl: "data:image/png;base64,...",
    phoneNumber: null,
    createdAt: "2025-01-27T..."
  }
}
```

### Eliminar Instancia

```typescript
DELETE /api/v1/whatsapp/accounts/:id/delete-instance
Response: {
  success: true,
  data: {
    id: "wa_xxx",
    instanceName: "tenant-clx123abc-1706380800000-a1b2c3",
    deleted: true
  }
}
```

### Estado Detallado

```typescript
GET /api/v1/whatsapp/accounts/:id/status
Response: {
  success: true,
  data: {
    id: "wa_xxx",
    instanceName: "tenant-clx123abc-1706380800000-a1b2c3",
    status: "CONNECTED",
    phoneNumber: "+34612345678",
    displayName: "Mi WhatsApp Business",
    lastSeen: "2025-01-27T...",
    lastSyncedAt: "2025-01-27T...",
    connectedAt: "2025-01-27T..."
  }
}
```

### Sincronizar

```typescript
GET /api/v1/whatsapp/accounts/sync
Response: {
  success: true,
  data: {
    synced: 3,
    updated: 1,
    orphaned: 0,
    errors: []
  }
}
```

---

## Criterios de Aceptación

### CA-01: Crear Instancia
- [ ] Usuario puede crear instancia sin acceder a EasyPanel
- [ ] Nombre se genera automáticamente si no se proporciona
- [ ] Instancia se crea en Evolution API correctamente
- [ ] QR code se obtiene y muestra automáticamente
- [ ] Instancia es visible en EasyPanel después de crear
- [ ] Estado cambia a CONNECTED cuando se escanea QR

### CA-02: Eliminar Instancia
- [ ] Usuario puede eliminar instancia desde SaaS
- [ ] Instancia se elimina en Evolution API
- [ ] Registro se elimina en BD
- [ ] Instancia desaparece de EasyPanel
- [ ] Se manejan errores si instancia ya fue eliminada

### CA-03: Validar Estado
- [ ] Validación consulta Evolution API correctamente
- [ ] Estados se actualizan en BD según respuesta
- [ ] Validación automática funciona cada 5 minutos
- [ ] Usuario puede validar manualmente en cualquier momento

### CA-04: Conectar/Desconectar
- [ ] Usuario puede conectar instancia desconectada
- [ ] Nuevo QR code se obtiene al conectar
- [ ] Usuario puede desconectar instancia conectada
- [ ] Estados se actualizan en Evolution API y BD
- [ ] Cambios son visibles en EasyPanel

### CA-05: Sincronización
- [ ] Sincronización automática funciona cada 5 minutos
- [ ] Instancias huérfanas se detectan correctamente
- [ ] Cambios externos se reflejan en SaaS
- [ ] Sincronización manual funciona correctamente
- [ ] Logs de sincronización son útiles para debugging

### CA-06: QR Code
- [ ] QR code se obtiene correctamente
- [ ] QR code expirado se detecta y renueva
- [ ] QR code se muestra en formato correcto
- [ ] Usuario puede obtener QR code en cualquier momento

### CA-07: Sincronización con EasyPanel
- [ ] Todas las acciones son visibles en EasyPanel
- [ ] Estados se mantienen sincronizados
- [ ] Instancias creadas aparecen en EasyPanel
- [ ] Instancias eliminadas desaparecen de EasyPanel

---

## Consideraciones de Seguridad

- **API Key Maestra:** Almacenar en variables de entorno, nunca en código
- **Validación de Tenant:** Verificar siempre que la instancia pertenece al tenant
- **Rate Limiting:** Limitar creación de instancias por tenant
- **Logs:** No registrar API Key en logs
- **Encriptación:** Credenciales siempre encriptadas en BD
- **Permisos:** Solo OWNER/ADMIN puede gestionar instancias

---

## Consideraciones de Rendimiento

- **Sincronización:** Usar intervalos configurables, no bloquear requests
- **Cache:** Cachear estados de instancias por 1 minuto
- **Batch Operations:** Sincronizar múltiples instancias en batch
- **Timeouts:** Timeout de 10 segundos para requests a Evolution API
- **Retry Logic:** Reintentar 3 veces con backoff exponencial

---

## Dependencias

- PRD-10: Gestión de Proveedores WhatsApp (base)
- Evolution API instalada en Hostinger
- API Key maestra con permisos completos

---

## Referencias

- Evolution API Documentation: https://doc.evolution-api.com/
- PRD-10: Gestión de Proveedores WhatsApp
- Script de prueba: `apps/api/scripts/test-evolution-api.ts`

---

**Última actualización:** 2025-01-27

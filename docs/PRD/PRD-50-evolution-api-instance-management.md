# PRD-50: Gestión Completa de Instancias Evolution API

> **Versión:** 1.1  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-10, PRD-51 (CryptoService)

---

## BREAKING CHANGES vs v1.0

| Cambio | v1.0 | v1.1 |
|--------|------|------|
| **Modelo de conexión** | API Key maestra global (`EVOLUTION_API_MASTER_KEY`) | BYOE: cada tenant tiene su propia Evolution API (baseUrl + apiKey) |
| **Almacenamiento** | Credenciales en `TenantWhatsAppAccount.credentials` | Nueva tabla `TenantEvolutionConnection` con credenciales cifradas |
| **Cifrado** | `EncryptionUtil` (legacy) | `CryptoService` (AES-256-GCM + AAD) |
| **Validación SSRF** | No existía | `validateEvolutionBaseUrl()` obligatorio |
| **Naming** | `tenant-{timestamp}-{random}` | `tenant-{tenantId}-{suffix}` (prefijo obligatorio) |
| **Multi-tenancy** | Débil (solo validación de tenantId) | Fuerte (instanceName incluye tenantId, validación en cada operación) |
| **Sync** | Por instancia individual | Por tenant (1 fetchInstances → reconcile todas las instancias) |

---

## Objetivo

Permitir a los tenants gestionar completamente sus instancias de Evolution API desde el SaaS, sin necesidad de acceder al panel de su hosting (EasyPanel/Hostinger). El sistema opera bajo el modelo **BYOE (Bring Your Own Evolution)**: cada tenant proporciona su propia instalación de Evolution API (baseUrl + apiKey), y el SaaS gestiona las instancias dentro de esa Evolution.

**Principio fundamental:** El SaaS NO tiene una Evolution API global. Cada tenant conecta su propia Evolution API instalada en su hosting.

---

## Alcance INCLUIDO

- ✅ Conectar Evolution API del tenant (baseUrl + apiKey cifrados)
- ✅ Crear instancias automáticamente en la Evolution del tenant
- ✅ Eliminar instancias desde el SaaS
- ✅ Validar estado de conexión de instancias
- ✅ Conectar/desconectar instancias (QR codes)
- ✅ Obtener y mostrar QR codes para conexión
- ✅ Listar todas las instancias del tenant
- ✅ Sincronización bidireccional con Evolution API del tenant
- ✅ Gestión completa sin necesidad de acceder al panel del hosting
- ✅ Monitoreo de estado en tiempo real
- ✅ Reconexión automática cuando sea necesario
- ✅ Limpieza automática de instancias huérfanas
- ✅ Soporte multi-instancia (múltiples cuentas WhatsApp por tenant)

---

## Alcance EXCLUIDO

- ❌ Modificar configuración avanzada de Evolution API (webhooks, integraciones)
- ❌ Instalar Evolution API para el tenant (debe hacerlo en su hosting)
- ❌ Compartir instancias entre tenants (nunca)
- ❌ Backup/restore de instancias (queda para futuro)
- ❌ Gestión de múltiples Evolution APIs por tenant (solo una conexión Evolution por tenant)

---

## Modelo BYOE (Bring Your Own Evolution)

### Concepto

Cada tenant tiene su propia instalación de Evolution API en su hosting (Hostinger, EasyPanel, etc.). El SaaS:

1. **Conecta** la Evolution del tenant (guarda baseUrl + apiKey cifrados)
2. **Opera** instancias dentro de esa Evolution
3. **Nunca** expone secretos al frontend
4. **Valida** SSRF en cada baseUrl antes de usarlo

### Flujo de Conexión

```
[Tenant instala Evolution API en su hosting]
  ↓
[Tenant obtiene baseUrl y apiKey de su Evolution]
  ↓
[Tenant ingresa baseUrl + apiKey en el SaaS]
  ↓
[SaaS valida baseUrl (SSRF) y testa conexión]
  ↓
[SaaS cifra y guarda credenciales en TenantEvolutionConnection]
  ↓
[Tenant puede crear instancias en su Evolution desde el SaaS]
```

### Seguridad

- **Cifrado:** Credenciales cifradas con `CryptoService` (AES-256-GCM + AAD: `tenantId + connectionId`)
- **SSRF:** `validateEvolutionBaseUrl()` bloquea localhost, IPs privadas, protocolos peligrosos
- **Aislamiento:** `instanceName` SIEMPRE incluye prefijo `tenant-{tenantId}-` para prevenir impersonation
- **Validación:** Toda operación valida que `tenantId` del request coincide con `tenantId` de la instancia

---

## Requisitos Funcionales

### RF-01: Conectar Evolution API del Tenant

**Descripción:** OWNER debe poder conectar su Evolution API proporcionando baseUrl y apiKey.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Hace clic en "Conectar WhatsApp"
3. Selecciona "Evolution API"
4. Ingresa:
   - Base URL de su Evolution API (ej: `https://evolution-api.mi-hosting.com`)
   - API Key de su Evolution API
5. Sistema valida baseUrl (SSRF protection)
6. Sistema testa conexión (opcional, puede hacerse después)
7. Sistema cifra credenciales con `CryptoService`
8. Sistema guarda en `TenantEvolutionConnection`
9. Estado de conexión: `CONNECTED` / `DISCONNECTED` / `ERROR`

**Validaciones:**
- baseUrl debe pasar `validateEvolutionBaseUrl()` (bloquea SSRF)
- apiKey no puede estar vacío
- Solo una conexión Evolution activa por tenant
- Test opcional: llamar a `/instance/fetchInstances` para validar credenciales

**Estados de conexión:**
- `CONNECTED`: Credenciales válidas, Evolution API accesible
- `DISCONNECTED`: Credenciales guardadas pero no validadas aún
- `ERROR`: Error de red o credenciales inválidas (401/403)
- `PENDING`: Validación en progreso

**statusReason (opcional):**
- `TRANSIENT_ERROR`: Error de red temporal (reintentar)
- `INVALID_CREDENTIALS`: API Key inválida (tenant debe actualizar)
- `SSRF_BLOCKED`: baseUrl bloqueada por seguridad
- `NETWORK_ERROR`: No se puede alcanzar la Evolution API

---

### RF-02: Crear Instancia Automáticamente

**Descripción:** OWNER debe poder crear una nueva instancia de Evolution API desde el SaaS, operando dentro de su Evolution conectada.

**Prerequisito:** Tenant debe tener `TenantEvolutionConnection` con estado `CONNECTED`.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Ve que tiene Evolution API conectada
3. Hace clic en "Crear nueva instancia"
4. Opcionalmente ingresa:
   - Nombre de instancia (si no se proporciona, se genera automáticamente)
   - Número de teléfono (opcional, puede asignarse después)
5. Sistema valida límite de instancias por tenant
6. Sistema genera `instanceName` con prefijo `tenant-{tenantId}-`
7. Sistema descifra credenciales de `TenantEvolutionConnection`
8. Sistema crea instancia en Evolution API del tenant
9. Sistema obtiene QR code automáticamente
10. Sistema guarda instancia en `TenantWhatsAppAccount` con `connectionId` (FK)
11. Usuario escanea QR code con WhatsApp
12. Estado cambia automáticamente a CONNECTED cuando se escanea

**Generación automática de nombres:**
- Formato: `tenant-{tenantId}-{timestamp}-{random}`
- Ejemplo: `tenant-clx123abc-1706380800000-a1b2c3`
- Máximo 50 caracteres
- Solo caracteres alfanuméricos y guiones
- **OBLIGATORIO:** Prefijo `tenant-{tenantId}-` para prevenir impersonation

**Validaciones:**
- Verificar que el tenant tiene conexión Evolution activa
- Verificar que el tenant no exceda límite de instancias (configurable)
- Verificar que el nombre de instancia no exista ya en Evolution API
- Validar formato de número de teléfono si se proporciona (E.164)
- Validar que `instanceName` incluye prefijo `tenant-{tenantId}-`

---

### RF-03: Eliminar Instancia

**Descripción:** OWNER debe poder eliminar una instancia desde el SaaS, lo que eliminará tanto el registro en BD como la instancia en Evolution API del tenant.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Ve lista de instancias
3. Hace clic en "Eliminar" en una instancia
4. Sistema solicita confirmación
5. Sistema descifra credenciales de `TenantEvolutionConnection`
6. Sistema elimina la instancia en Evolution API del tenant
7. Sistema elimina el registro en BD (soft delete o hard delete según política)
8. Sistema muestra confirmación de eliminación

**Validaciones:**
- Verificar que la instancia pertenece al tenant (validación fuerte)
- Verificar que la instancia existe en Evolution API antes de eliminar
- Manejar errores si la instancia ya fue eliminada externamente (404 → marcar como `EXTERNAL_DELETED`)

**Limpieza:**
- Si la eliminación en Evolution API falla pero el registro en BD se elimina, registrar en logs
- Si la eliminación en Evolution API tiene éxito pero falla en BD, intentar rollback
- Si la instancia no existe en Evolution API (404), marcar como `ORPHANED` o eliminar directamente

---

### RF-04: Validar Estado de Instancia

**Descripción:** El sistema debe poder validar el estado actual de una instancia consultando Evolution API del tenant.

**Flujo:**
1. Usuario hace clic en "Validar" en una instancia
2. Sistema descifra credenciales de `TenantEvolutionConnection`
3. Sistema consulta estado en Evolution API del tenant
4. Sistema actualiza estado en BD según respuesta:
   - `open` → CONNECTED
   - `close` → DISCONNECTED
   - `connecting` → PENDING
   - Error → ERROR (con statusReason apropiado)
5. Sistema muestra resultado al usuario

**Validación automática:**
- Validar estado cada 5 minutos para instancias PENDING
- Validar estado cada 30 minutos para instancias CONNECTED
- Validar inmediatamente después de escanear QR code
- Sincronización por tenant (no por instancia individual)

**Manejo de errores:**
- 401/403 → `statusReason: INVALID_CREDENTIALS` (tenant debe actualizar apiKey)
- 404 → `statusReason: EXTERNAL_DELETED` (instancia eliminada externamente)
- Timeout/Network → `statusReason: TRANSIENT_ERROR` (reintentar)

---

### RF-05: Conectar/Desconectar Instancia

**Descripción:** OWNER debe poder conectar o desconectar una instancia manualmente.

**Conectar:**
1. Usuario hace clic en "Conectar" en una instancia DISCONNECTED
2. Sistema descifra credenciales de `TenantEvolutionConnection`
3. Sistema obtiene nuevo QR code de Evolution API del tenant
4. Sistema actualiza estado a PENDING
5. Sistema muestra QR code al usuario
6. Usuario escanea QR code
7. Estado cambia automáticamente a CONNECTED (vía sync)

**Desconectar:**
1. Usuario hace clic en "Desconectar" en una instancia CONNECTED
2. Sistema descifra credenciales de `TenantEvolutionConnection`
3. Sistema desconecta la instancia en Evolution API del tenant (logout)
4. Sistema actualiza estado a DISCONNECTED
5. Sistema muestra confirmación

---

### RF-06: Obtener QR Code

**Descripción:** El sistema debe poder obtener el QR code de una instancia en cualquier momento.

**Flujo:**
1. Usuario hace clic en "Ver QR" o "Reconectar"
2. Sistema descifra credenciales de `TenantEvolutionConnection`
3. Sistema consulta QR code en Evolution API del tenant
4. Sistema muestra QR code al usuario
5. QR code se actualiza automáticamente si expira

**Manejo de QR expirado:**
- Detectar cuando el QR code expira (estado `close` o `connecting`)
- Generar nuevo QR code automáticamente
- Notificar al usuario que debe escanear el nuevo QR

---

### RF-07: Listar Instancias

**Descripción:** El sistema debe mostrar todas las instancias del tenant, sincronizadas con Evolution API del tenant.

**Información mostrada:**
- Nombre de instancia
- Número de teléfono (si está conectado)
- Estado (CONNECTED, PENDING, DISCONNECTED, ERROR)
- statusReason (si aplica)
- Fecha de conexión
- Última verificación
- Acciones disponibles (Conectar, Desconectar, Validar, Eliminar, Ver QR)

**Sincronización:**
- Al cargar la página, sincronizar con Evolution API del tenant
- Mostrar instancias que existen en Evolution API pero no en BD (huérfanas)
- Permitir importar instancias huérfanas al SaaS (si tienen prefijo `tenant-{tenantId}-`)

---

### RF-08: Sincronización con Evolution API

**Descripción:** El sistema debe mantener sincronización bidireccional con Evolution API del tenant.

**Sincronización desde SaaS a Evolution API:**
- Crear instancia → Visible en Evolution API del tenant
- Eliminar instancia → Eliminada en Evolution API del tenant
- Conectar/Desconectar → Estado actualizado en Evolution API del tenant

**Sincronización desde Evolution API a SaaS:**
- Detectar cambios externos (si se elimina instancia en Evolution API)
- Actualizar estado cuando cambia en Evolution API
- Detectar nuevas instancias creadas externamente (solo si tienen prefijo `tenant-{tenantId}-`)

**Estrategia de sync eficiente:**
- **Por tenant, no por instancia:** 1 `fetchInstances` por tenant → index → reconcile todas las instancias
- **Scheduler:** Cada X minutos, por tenant "activo" (con instancias)
- **Intervalos configurables:**
  - Activo: cada 5 minutos (instancias CONNECTED o PENDING)
  - Inactivo: cada 30 minutos (solo instancias DISCONNECTED o ERROR)

**Validación periódica:**
- Sincronizar cada 5 minutos para instancias activas
- Sincronizar cada 30 minutos para instancias inactivas
- Sincronizar inmediatamente después de acciones del usuario

---

### RF-09: Monitoreo y Alertas

**Descripción:** El sistema debe monitorear el estado de las instancias y alertar sobre problemas.

**Eventos a monitorear:**
- Instancia desconectada inesperadamente
- Error al conectar instancia
- QR code expirado sin conexión
- Instancia eliminada externamente
- Límite de instancias alcanzado
- Error de credenciales (401/403) en conexión Evolution

**Alertas:**
- Notificación en UI cuando instancia se desconecta
- Email al OWNER si instancia permanece desconectada > 24 horas
- Log de todos los eventos para auditoría (sin secretos)

---

## Requisitos Técnicos

### RT-01: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Límites y configuración
EVOLUTION_API_MAX_INSTANCES_PER_TENANT=10
EVOLUTION_API_ENABLE_INSTANCE_CREATION=true

# Sincronización
EVOLUTION_API_SYNC_INTERVAL_ACTIVE=300000  # 5 minutos (ms)
EVOLUTION_API_SYNC_INTERVAL_INACTIVE=1800000  # 30 minutos (ms)

# NOTA: NO existe EVOLUTION_API_MASTER_KEY ni EVOLUTION_API_BASE_URL global
# Cada tenant proporciona su propia baseUrl + apiKey
```

---

### RT-02: Endpoints API

**Nuevos endpoints:**

```
POST   /api/v1/whatsapp/evolution/connect        → Conectar Evolution API del tenant (guardar baseUrl+apiKey cifrado)
POST   /api/v1/whatsapp/evolution/test           → Test conexión Evolution (NO retorna apiKey)
GET    /api/v1/whatsapp/evolution/status         → Estado conexión Evolution del tenant
POST   /api/v1/whatsapp/accounts                 → Crear instancia en Evolution del tenant
GET    /api/v1/whatsapp/accounts                 → Listar instancias del tenant
GET    /api/v1/whatsapp/accounts/:id/status      → Estado detallado de instancia
POST   /api/v1/whatsapp/accounts/:id/connect     → Conectar instancia (nuevo QR)
POST   /api/v1/whatsapp/accounts/:id/disconnect  → Desconectar instancia (logout)
DELETE /api/v1/whatsapp/accounts/:id            → Eliminar instancia (Evolution + BD)
POST   /api/v1/whatsapp/accounts/sync            → Sincronización manual
```

**Endpoints existentes (mejorar):**

```
GET    /api/v1/whatsapp/accounts/:id/qr          → Obtener QR (mejorar manejo de expiración)
POST   /api/v1/whatsapp/accounts/:id/validate    → Validar (mejorar respuesta con statusReason)
```

---

### RT-03: Modelo de Base de Datos

**Nueva tabla: `TenantEvolutionConnection`**

```prisma
model TenantEvolutionConnection {
  id                String   @id @default(cuid())
  tenantId          String
  status            String   @default("DISCONNECTED") // CONNECTED, DISCONNECTED, PENDING, ERROR
  statusReason      String?  // TRANSIENT_ERROR, INVALID_CREDENTIALS, SSRF_BLOCKED, NETWORK_ERROR
  encryptedCredentials String // EncryptedBlobV1 con { baseUrl, apiKey }
  lastTestAt       DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  tenant            tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  accounts         tenantwhatsappaccount[]
  
  @@unique([tenantId]) // Solo una conexión Evolution activa por tenant
  @@index([tenantId])
  @@index([status])
}
```

**Modificar: `TenantWhatsAppAccount`**

```prisma
model TenantWhatsAppAccount {
  // ... campos existentes ...
  
  // Nuevo campo: FK a TenantEvolutionConnection
  connectionId     String?
  connection       TenantEvolutionConnection? @relation(fields: [connectionId], references: [id])
  
  // Nuevo campo: statusReason para errores detallados
  statusReason     String?  // TRANSIENT_ERROR, INVALID_CREDENTIALS, EXTERNAL_DELETED, ORPHANED
  
  // Campos opcionales para mejor tracking
  lastSyncedAt    DateTime? // Última sincronización con Evolution API
  
  // ... resto de campos ...
}
```

**Nota:** Si `TenantWhatsAppAccount` ya tiene `credentials`, se puede mantener para compatibilidad, pero las credenciales Evolution se guardan en `TenantEvolutionConnection`.

---

### RT-04: Cifrado con CryptoService

**Uso obligatorio de CryptoService (CRYPTO-001 cerrado):**

```typescript
// Al guardar conexión Evolution
const credentials = { baseUrl, apiKey };
const encryptedBlob = cryptoService.encryptJson(credentials, {
  tenantId: connection.tenantId,
  recordId: connection.id,
});

// Al usar credenciales (justo antes de llamar a Evolution)
const credentials = cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
  connection.encryptedCredentials,
  {
    tenantId: connection.tenantId,
    recordId: connection.id,
  }
);
```

**Prohibido:**
- ❌ Usar `EncryptionUtil` (legacy)
- ❌ Descifrar credenciales y guardarlas en memoria/cache
- ❌ Exponer credenciales al frontend (nunca)

---

### RT-05: Validación SSRF

**Uso obligatorio de `validateEvolutionBaseUrl()`:**

```typescript
import { validateEvolutionBaseUrl } from '@/modules/crypto/utils/url-validation.util';

// Al guardar conexión
const normalizedUrl = validateEvolutionBaseUrl(dto.baseUrl, false); // Solo HTTPS

// Antes de cada request a Evolution (defensa en profundidad)
const normalizedUrl = validateEvolutionBaseUrl(credentials.baseUrl, false);
```

**Bloquea:**
- localhost, 127.0.0.1, ::1
- IPs privadas (10/8, 172.16/12, 192.168/16)
- link-local (169.254/16)
- multicast (224/4)
- Protocolos peligrosos (file:, ftp:, javascript:, etc.)

---

### RT-06: Naming de Instancias (Anti-Impersonation)

**Regla obligatoria:** `instanceName` SIEMPRE debe incluir prefijo `tenant-{tenantId}-`

```typescript
// Generación automática
function generateInstanceName(tenantId: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const customSuffix = suffix || `${timestamp}-${random}`;
  return `tenant-${tenantId}-${customSuffix}`;
}

// Validación
function validateInstanceName(instanceName: string, tenantId: string): boolean {
  const prefix = `tenant-${tenantId}-`;
  return instanceName.startsWith(prefix) && instanceName.length <= 50;
}
```

**Validación en cada operación:**
- Crear instancia: forzar prefijo
- Operar instancia: validar que `instanceName` pertenece a `tenantId`
- Sync: solo importar instancias con prefijo correcto

---

## Flujos UX

### Flujo 1: Conectar Evolution API (Primera vez)

```
[Settings → WhatsApp]
  ↓
[Click "Conectar WhatsApp"]
  ↓
[Modal Wizard - Paso 1: Proveedor]
  Seleccionar "Evolution API"
  ↓
[Paso 2: Conexión Evolution]
  - Base URL (ej: https://evolution-api.mi-hosting.com)
  - API Key
  - [Opcional] Test conexión ahora
  ↓
[Click "Conectar"]
  ↓
[Validando baseUrl (SSRF)...]
  ↓
[Testando conexión...] (opcional)
  ↓
[Éxito: Evolution API conectada]
  ↓
[Puede crear instancias]
```

### Flujo 2: Crear Nueva Instancia

```
[Settings → WhatsApp]
  ↓
[Ve que tiene Evolution API conectada]
  ↓
[Click "Crear nueva instancia"]
  ↓
[Modal - Configuración]
  - Nombre (opcional, se genera si está vacío)
  - Número de teléfono (opcional)
  ↓
[Click "Crear Instancia"]
  ↓
[Creando instancia en Evolution API...]
  ↓
[Éxito: Mostrar QR Code]
  ↓
[Usuario escanea QR con WhatsApp]
  ↓
[Estado cambia a CONNECTED automáticamente]
  ↓
[Instancia lista para usar]
```

### Flujo 3: Gestionar Instancia Existente

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
  └─ [Eliminar] → Elimina instancia (Evolution + BD)
```

### Flujo 4: Sincronización Automática

```
[Sistema ejecuta sincronización cada 5 minutos]
  ↓
[Por cada tenant con conexión Evolution activa]
  ↓
[1 fetchInstances en Evolution API del tenant]
  ↓
[Indexar instancias por nombre]
  ↓
[Reconciliar con instancias en BD]
  ↓
[Actualizar estados]
  ↓
[Detectar instancias huérfanas]
  ↓
[Notificar cambios al usuario si es necesario]
```

---

## Estructura de Respuestas API

### Conectar Evolution API

```typescript
POST /api/v1/whatsapp/evolution/connect
Request: {
  baseUrl: string;  // Validado con validateEvolutionBaseUrl
  apiKey: string;
  testConnection?: boolean; // Opcional: testar conexión ahora
}

Response: {
  success: true,
  data: {
    id: "ev_xxx",
    tenantId: "clx123abc",
    status: "CONNECTED" | "DISCONNECTED" | "ERROR",
    statusReason: null | "TRANSIENT_ERROR" | "INVALID_CREDENTIALS",
    lastTestAt: "2025-01-27T...",
    createdAt: "2025-01-27T..."
    // NO retorna apiKey ni baseUrl
  }
}
```

### Test Conexión Evolution

```typescript
POST /api/v1/whatsapp/evolution/test
Response: {
  success: true,
  data: {
    status: "CONNECTED" | "ERROR",
    statusReason: null | "INVALID_CREDENTIALS" | "NETWORK_ERROR",
    lastTestAt: "2025-01-27T..."
  }
}
```

### Crear Instancia

```typescript
POST /api/v1/whatsapp/accounts
Request: {
  provider: "EVOLUTION_API",
  instanceName?: string;  // Si no se proporciona, se genera con prefijo tenant-{tenantId}-
  phoneNumber?: string; // Formato E.164
}

Response: {
  success: true,
  data: {
    id: "wa_xxx",
    tenantId: "clx123abc",
    connectionId: "ev_xxx",
    instanceName: "tenant-clx123abc-1706380800000-a1b2c3",
    status: "PENDING",
    statusReason: null,
    qrCodeUrl: "data:image/png;base64,...",
    phoneNumber: null,
    createdAt: "2025-01-27T..."
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
    status: "CONNECTED" | "PENDING" | "DISCONNECTED" | "ERROR",
    statusReason: null | "TRANSIENT_ERROR" | "EXTERNAL_DELETED" | "INVALID_CREDENTIALS",
    phoneNumber: "+34612345678",
    displayName: "Mi WhatsApp Business",
    lastSyncedAt: "2025-01-27T...",
    connectedAt: "2025-01-27T..."
  }
}
```

### Sincronizar

```typescript
POST /api/v1/whatsapp/accounts/sync
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

### CA-01: Conectar Evolution API
- [ ] Usuario puede conectar Evolution API proporcionando baseUrl + apiKey
- [ ] baseUrl se valida con `validateEvolutionBaseUrl()` (bloquea SSRF)
- [ ] Credenciales se cifran con `CryptoService` (AES-256-GCM + AAD)
- [ ] Test de conexión opcional funciona correctamente
- [ ] Solo una conexión Evolution activa por tenant
- [ ] Errores de credenciales (401/403) se reportan con `statusReason: INVALID_CREDENTIALS`

### CA-02: Crear Instancia
- [ ] Usuario puede crear instancia sin acceder al panel del hosting
- [ ] Nombre se genera automáticamente con prefijo `tenant-{tenantId}-` si no se proporciona
- [ ] Instancia se crea en Evolution API del tenant correctamente
- [ ] QR code se obtiene y muestra automáticamente
- [ ] Estado cambia a CONNECTED cuando se escanea QR
- [ ] Validación de límite de instancias funciona

### CA-03: Eliminar Instancia
- [ ] Usuario puede eliminar instancia desde SaaS
- [ ] Instancia se elimina en Evolution API del tenant
- [ ] Registro se elimina en BD
- [ ] Se manejan errores si instancia ya fue eliminada (404 → `EXTERNAL_DELETED`)

### CA-04: Validar Estado
- [ ] Validación consulta Evolution API del tenant correctamente
- [ ] Estados se actualizan en BD según respuesta
- [ ] Validación automática funciona cada 5 minutos (activas) / 30 minutos (inactivas)
- [ ] Usuario puede validar manualmente en cualquier momento
- [ ] Errores se reportan con `statusReason` apropiado

### CA-05: Conectar/Desconectar
- [ ] Usuario puede conectar instancia desconectada
- [ ] Nuevo QR code se obtiene al conectar
- [ ] Usuario puede desconectar instancia conectada
- [ ] Estados se actualizan en Evolution API del tenant y BD

### CA-06: Sincronización
- [ ] Sincronización automática funciona cada 5 minutos (activas) / 30 minutos (inactivas)
- [ ] Sync eficiente: 1 `fetchInstances` por tenant → reconcile todas las instancias
- [ ] Instancias huérfanas se detectan correctamente
- [ ] Cambios externos se reflejan en SaaS
- [ ] Sincronización manual funciona correctamente
- [ ] Logs de sincronización son útiles para debugging (sin secretos)

### CA-07: Seguridad
- [ ] Credenciales NUNCA se exponen al frontend
- [ ] `instanceName` SIEMPRE incluye prefijo `tenant-{tenantId}-`
- [ ] Validación SSRF funciona en cada baseUrl
- [ ] Cifrado usa `CryptoService` (no `EncryptionUtil`)
- [ ] Aislamiento multi-tenant: nadie puede operar instancias de otro tenant

### CA-08: QR Code
- [ ] QR code se obtiene correctamente
- [ ] QR code expirado se detecta y renueva
- [ ] QR code se muestra en formato correcto
- [ ] Usuario puede obtener QR code en cualquier momento

---

## Consideraciones de Seguridad

- **Cifrado:** Credenciales cifradas con `CryptoService` (AES-256-GCM + AAD: `tenantId + connectionId`)
- **SSRF:** `validateEvolutionBaseUrl()` bloquea localhost, IPs privadas, protocolos peligrosos
- **Validación de Tenant:** Verificar siempre que la instancia pertenece al tenant (validación fuerte)
- **Anti-Impersonation:** `instanceName` SIEMPRE incluye prefijo `tenant-{tenantId}-`
- **Rate Limiting:** Limitar creación de instancias por tenant
- **Logs:** No registrar API Key ni baseUrl en logs (usar SecureLogger)
- **Permisos:** Solo OWNER/ADMIN puede gestionar instancias
- **Nunca exponer secretos:** Credenciales NUNCA se envían al frontend

---

## Consideraciones de Rendimiento

- **Sincronización:** Usar intervalos configurables, no bloquear requests
- **Sync eficiente:** 1 `fetchInstances` por tenant, no por instancia
- **Cache:** NO cachear credenciales descifradas (descifrar justo antes de usar)
- **Timeouts:** Timeout de 10 segundos para requests a Evolution API
- **Retry Logic:** Reintentar 3 veces con backoff exponencial para errores transitorios
- **Batch Operations:** Sincronizar múltiples instancias en batch (reconciliación)

---

## Dependencias

- PRD-10: Gestión de Proveedores WhatsApp (base)
- PRD-51: Módulo Central de Cifrado (CryptoService)
- Evolution API instalada por el tenant en su hosting
- API Key proporcionada por el tenant de su Evolution

---

## Referencias

- Evolution API Documentation: https://doc.evolution-api.com/
- PRD-10: Gestión de Proveedores WhatsApp
- PRD-51: Módulo Central de Cifrado
- AI-SPEC-50: Gestión Completa de Instancias Evolution API (v1.1)

---

## Cambios Clave (v1.0 → v1.1)

| Aspecto | v1.0 | v1.1 |
|--------|------|------|
| **Modelo** | API Key maestra global | BYOE: cada tenant su propia Evolution |
| **Conexión** | No existía | Nueva tabla `TenantEvolutionConnection` |
| **Cifrado** | `EncryptionUtil` (legacy) | `CryptoService` (AES-256-GCM + AAD) |
| **SSRF** | No existía | `validateEvolutionBaseUrl()` obligatorio |
| **Naming** | `tenant-{timestamp}-{random}` | `tenant-{tenantId}-{suffix}` (prefijo obligatorio) |
| **Multi-tenancy** | Débil | Fuerte (instanceName incluye tenantId) |
| **Sync** | Por instancia | Por tenant (1 fetchInstances → reconcile) |
| **Variables env** | `EVOLUTION_API_MASTER_KEY` global | NO existe (cada tenant proporciona) |
| **Endpoints** | `/accounts/create-instance` | `/evolution/connect` + `/accounts` |
| **Estados** | Básicos | + `statusReason` (TRANSIENT_ERROR, INVALID_CREDENTIALS, etc.) |

---

**Última actualización:** 2025-01-27

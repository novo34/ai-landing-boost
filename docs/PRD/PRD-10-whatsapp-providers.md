# PRD-10: Gestión de Proveedores WhatsApp (EvolutionAPI / WhatsApp Cloud)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** B - WhatsApp  
> **Dependencias:** PRD-08, PRD-09

---

## Objetivo

Permitir a los tenants conectar sus números de WhatsApp mediante proveedores externos (Evolution API o WhatsApp Cloud API), gestionar las credenciales de forma segura, y validar la conexión.

---

## Alcance INCLUIDO

- ✅ Soporte para Evolution API
- ✅ Soporte para WhatsApp Cloud API (Meta Direct)
- ✅ Wizard de conexión paso a paso
- ✅ Almacenamiento seguro de credenciales (encriptadas)
- ✅ Validación de conexión
- ✅ Gestión de múltiples números por tenant (preparado)
- ✅ Estados de conexión (connected, pending, disconnected, error)
- ✅ Reconexión automática
- ✅ UI para gestión de cuentas WhatsApp

---

## Alcance EXCLUIDO

- ❌ Otros proveedores (Gupshup, 360dialog) - queda para futuro
- ❌ Compartir números entre tenants (nunca)
- ❌ Gestión de templates de mensajes (queda para Bloque D)
- ❌ Webhooks (se cubre en PRD-11)

---

## Requisitos Funcionales

### RF-01: Wizard de Conexión

**Descripción:** OWNER debe poder conectar su número de WhatsApp mediante un wizard guiado.

**Flujo:**
1. Usuario accede a Settings → WhatsApp
2. Hace clic en "Conectar WhatsApp"
3. Paso 1: Seleccionar proveedor (Evolution API / WhatsApp Cloud)
4. Paso 2: Ingresar credenciales según proveedor:
   - Evolution API: API Key, Instance Name, Base URL
   - WhatsApp Cloud: App ID, App Secret, Phone Number ID, Access Token
5. Paso 3: Validar conexión (test de API)
6. Paso 4: Confirmar y guardar
7. Sistema crea/actualiza cuenta WhatsApp
8. Estado inicial: PENDING (hasta validación completa)

---

### RF-02: Validación de Conexión

**Descripción:** El sistema debe validar que las credenciales son correctas y la conexión funciona.

**Validaciones:**
- Evolution API: Llamar a endpoint de status/health
- WhatsApp Cloud: Verificar token y permisos
- Verificar que el número está conectado
- Obtener información del número (nombre, estado)

**Estados:**
- `PENDING` → Validando conexión
- `CONNECTED` → Conexión exitosa y validada
- `DISCONNECTED` → Conexión perdida
- `ERROR` → Error en credenciales o conexión

---

### RF-03: Gestión de Credenciales

**Descripción:** Las credenciales deben almacenarse de forma segura y encriptadas.

**Requisitos:**
- Encriptar tokens/keys antes de guardar en BD
- No mostrar credenciales completas en UI (solo últimos 4 caracteres)
- Permitir actualizar credenciales
- Permitir desconectar/eliminar cuenta

---

### RF-04: Múltiples Números (Preparado)

**Descripción:** El modelo debe soportar múltiples números por tenant, aunque inicialmente solo se use uno.

**Implementación:**
- Modelo permite múltiples `TenantWhatsAppAccount` por tenant
- UI inicial muestra solo una cuenta (puede expandirse)
- Cada cuenta tiene su propio agente asociado (futuro)

---

## Requisitos Técnicos

### RT-01: Modelo de Base de Datos

**Nuevas entidades Prisma:**

```prisma
enum WhatsAppProvider {
  EVOLUTION_API
  WHATSAPP_CLOUD
}

enum WhatsAppAccountStatus {
  PENDING
  CONNECTED
  DISCONNECTED
  ERROR
}

model TenantWhatsAppAccount {
  id          String              @id @default(cuid())
  tenantId    String
  provider    WhatsAppProvider
  phoneNumber String              // Número de teléfono (formato internacional)
  status      WhatsAppAccountStatus @default(PENDING)
  
  // Credenciales encriptadas (JSON)
  credentials String              // JSON encriptado con credenciales específicas del proveedor
  
  // Metadatos
  instanceName String?            // Para Evolution API
  displayName  String?            // Nombre mostrado en UI
  qrCodeUrl    String?            // URL temporal para QR (Evolution API)
  
  // Timestamps
  connectedAt  DateTime?
  lastCheckedAt DateTime?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, phoneNumber])
  @@index([tenantId])
  @@index([provider, status])
}
```

---

### RT-02: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Encriptación de credenciales
ENCRYPTION_KEY=your-encryption-key-32-chars-min

# Evolution API (opcional, para testing)
EVOLUTION_API_DEFAULT_URL=https://api.evolution-api.com

# WhatsApp Cloud API (opcional)
WHATSAPP_CLOUD_API_VERSION=v21.0
```

---

### RT-03: Endpoints API

**WhatsApp Accounts:**

```
GET    /api/v1/whatsapp/accounts              → Listar cuentas del tenant
POST   /api/v1/whatsapp/accounts              → Crear nueva cuenta (wizard)
GET    /api/v1/whatsapp/accounts/:id          → Obtener cuenta específica
PUT    /api/v1/whatsapp/accounts/:id          → Actualizar cuenta
DELETE /api/v1/whatsapp/accounts/:id          → Eliminar cuenta
POST   /api/v1/whatsapp/accounts/:id/validate → Validar conexión
POST   /api/v1/whatsapp/accounts/:id/reconnect → Reconectar
GET    /api/v1/whatsapp/accounts/:id/qr       → Obtener QR code (Evolution API)
```

---

### RT-04: Servicios de Proveedores

**Estructura:**

```
apps/api/src/
├── modules/
│   └── whatsapp/
│       ├── providers/
│       │   ├── base.provider.ts              [CREAR]
│       │   ├── evolution.provider.ts         [CREAR]
│       │   └── whatsapp-cloud.provider.ts     [CREAR]
```

---

## Flujos UX

### Flujo 1: Conectar WhatsApp (Evolution API)

```
[Settings → WhatsApp]
  ↓
[Click "Conectar WhatsApp"]
  ↓
[Modal Wizard - Paso 1: Proveedor]
  ↓
[Seleccionar "Evolution API"]
  ↓
[Paso 2: Credenciales]
  - API Key
  - Instance Name
  - Base URL
  ↓
[Click "Validar"]
  ↓
[Validando...]
  ↓
[Éxito: Mostrar QR si es necesario]
  ↓
[Paso 3: Confirmar]
  ↓
[Cuenta creada y conectada]
```

### Flujo 2: Conectar WhatsApp (WhatsApp Cloud)

```
[Settings → WhatsApp]
  ↓
[Click "Conectar WhatsApp"]
  ↓
[Modal Wizard - Paso 1: Proveedor]
  ↓
[Seleccionar "WhatsApp Cloud API"]
  ↓
[Paso 2: Credenciales]
  - App ID
  - App Secret
  - Phone Number ID
  - Access Token
  ↓
[Click "Validar"]
  ↓
[Validando...]
  ↓
[Éxito: Cuenta validada]
  ↓
[Paso 3: Confirmar]
  ↓
[Cuenta creada y conectada]
```

---

## Estructura de DB

Ver RT-01.

**Relaciones:**
- `TenantWhatsAppAccount` N:1 `Tenant`

---

## Endpoints API

Ver RT-03.

**Formato de respuestas:**

```typescript
// Listar cuentas
{
  success: true,
  data: [
    {
      id: "wa_xxx",
      provider: "EVOLUTION_API",
      phoneNumber: "+34612345678",
      status: "CONNECTED",
      displayName: "Mi WhatsApp Business",
      connectedAt: "2025-01-XX...",
      credentials: {
        masked: "****-****-****-abc1"  // Solo últimos 4 caracteres
      }
    }
  ]
}

// Validar conexión
{
  success: true,
  data: {
    status: "CONNECTED",
    phoneNumber: "+34612345678",
    displayName: "Mi WhatsApp Business",
    validatedAt: "2025-01-XX..."
  }
}
```

---

## Eventos n8n

**Eventos que se pueden enviar a n8n:**

- `whatsapp.account_connected` → Cuenta conectada exitosamente
- `whatsapp.account_disconnected` → Cuenta desconectada
- `whatsapp.account_error` → Error en cuenta

---

## Criterios de Aceptación

### CA-01: Wizard de Conexión
- [ ] Usuario puede seleccionar proveedor
- [ ] Formulario se adapta según proveedor seleccionado
- [ ] Validación de campos funciona correctamente
- [ ] Test de conexión valida credenciales
- [ ] Cuenta se crea correctamente después de confirmación

### CA-02: Validación
- [ ] Sistema valida credenciales contra API del proveedor
- [ ] Estados se actualizan correctamente (PENDING → CONNECTED)
- [ ] Errores se muestran claramente
- [ ] QR code se genera para Evolution API si es necesario

### CA-03: Seguridad
- [ ] Credenciales se encriptan antes de guardar
- [ ] Credenciales no se muestran completas en UI
- [ ] Solo OWNER/ADMIN puede gestionar cuentas
- [ ] Validación de permisos en backend

### CA-04: Gestión
- [ ] Usuario puede ver lista de cuentas
- [ ] Usuario puede actualizar credenciales
- [ ] Usuario puede desconectar cuenta
- [ ] Usuario puede eliminar cuenta

---

## Consideraciones de Seguridad

- **Encriptación:** Usar AES-256 para encriptar credenciales
- **Validación:** Validar siempre en backend, nunca confiar en frontend
- **Permisos:** Solo OWNER/ADMIN puede gestionar cuentas
- **Logs:** No registrar credenciales en logs

---

## Dependencias

- PRD-08: Billing (para validar límites de canales)
- PRD-09: Team management (para permisos)

---

## Referencias

- Evolution API Documentation
- WhatsApp Cloud API Documentation
- `IA-Specs/01-saas-architecture-and-stack.mdc` - Stack tecnológico

---

**Última actualización:** 2025-01-XX








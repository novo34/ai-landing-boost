# Integraciones - Panel de Plataforma

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Integración con N8N](#integración-con-n8n)
2. [Integración con Stripe](#integración-con-stripe)
3. [Integración con WhatsApp](#integración-con-whatsapp)
4. [Webhooks](#webhooks)
5. [APIs Disponibles](#apis-disponibles)

---

## Integración con N8N

### Descripción
N8N es una plataforma de automatización de flujos de trabajo que permite conectar diferentes servicios y automatizar procesos.

### Configuración Inicial

#### 1. Obtener Credenciales de N8N
1. Accede a tu instancia de N8N
2. Ve a **Settings** → **API**
3. Genera un **API Key**
4. Copia la URL de tu instancia de N8N

#### 2. Configurar en la Plataforma
1. Ve a **Configuración** → **Integraciones**
2. Busca **N8N**
3. Ingresa:
   - URL de N8N (ej: `https://n8n.tu-dominio.com`)
   - API Key
4. Guarda la configuración

### Usar Flujos N8N

#### Crear Flujo desde la Plataforma
1. Ve a **N8N Flows** → **Crear Flujo**
2. Completa la información:
   - Nombre del flujo
   - Categoría
   - Descripción
3. Opciones:
   - **Crear en N8N**: El sistema crea el workflow en N8N
   - **Registrar Existente**: Si ya tienes un workflow en N8N, ingresa su ID

#### Activar/Desactivar Flujos
- Desde la lista de flujos, cambia el estado
- Los flujos activos se ejecutan automáticamente
- Los flujos inactivos no se ejecutan

#### Ver Logs de Ejecución
1. Selecciona un flujo
2. Haz clic en **"Ver Logs"**
3. Revisa:
   - Ejecuciones exitosas
   - Ejecuciones fallidas
   - Tiempo de ejecución
   - Datos procesados

### Casos de Uso Comunes

#### 1. Procesamiento Automático de Leads
```
Trigger: Nuevo lead creado
  ↓
Acción: Enviar a CRM externo (HubSpot, Salesforce)
  ↓
Acción: Enviar email al equipo de ventas
  ↓
Acción: Crear tarea de seguimiento
```

#### 2. Notificaciones de Eventos Importantes
```
Trigger: Ticket crítico creado
  ↓
Acción: Enviar notificación Slack
  ↓
Acción: Enviar SMS al responsable
  ↓
Acción: Crear recordatorio en calendario
```

#### 3. Generación de Reportes
```
Trigger: Diario a las 9:00 AM
  ↓
Acción: Recopilar métricas del día anterior
  ↓
Acción: Generar reporte en PDF
  ↓
Acción: Enviar por email al equipo
```

---

## Integración con Stripe

### Descripción
Stripe gestiona automáticamente la facturación y pagos de los tenants.

### Configuración

#### 1. Obtener Credenciales de Stripe
1. Accede a tu cuenta de Stripe
2. Ve a **Developers** → **API keys**
3. Copia:
   - **Publishable key** (clave pública)
   - **Secret key** (clave secreta)

#### 2. Configurar Webhooks
1. En Stripe, ve a **Developers** → **Webhooks**
2. Agrega endpoint: `https://tu-dominio.com/api/webhooks/stripe`
3. Selecciona eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copia el **Webhook signing secret**

#### 3. Configurar en la Plataforma
1. Ve a **Configuración** → **Integraciones** → **Stripe**
2. Ingresa:
   - Publishable key
   - Secret key
   - Webhook signing secret
3. Guarda la configuración

### Funcionalidades Automáticas

#### Facturación Automática
- Los tenants se facturan automáticamente según su plan
- Las facturas se generan automáticamente
- Los pagos se procesan automáticamente

#### Gestión de Suscripciones
- Cambios de plan se reflejan en Stripe
- Cancelaciones se procesan automáticamente
- Renovaciones se gestionan automáticamente

#### Manejo de Pagos Fallidos
- El sistema detecta pagos fallidos
- Se envían notificaciones automáticas
- Se pueden configurar flujos N8N para manejar pagos fallidos

---

## Integración con WhatsApp

### Descripción
Conecta cuentas de WhatsApp para que los agentes puedan comunicarse con clientes.

### Configuración

#### Opción 1: Evolution API
1. Ve a **Operaciones Propias** → **Mis Canales**
2. Crea un canal tipo **WhatsApp**
3. Selecciona **Evolution API** como proveedor
4. Ingresa:
   - URL de la API de Evolution
   - API Key
5. Conecta la cuenta escaneando el QR

#### Opción 2: WhatsApp Cloud API
1. Crea un canal tipo **WhatsApp**
2. Selecciona **WhatsApp Cloud API**
3. Ingresa:
   - Phone Number ID
   - Access Token
   - Verify Token
   - Webhook URL

### Uso en Agentes
1. Al crear un agente, selecciona la cuenta de WhatsApp
2. El agente puede recibir y enviar mensajes automáticamente
3. Las conversaciones se registran en **Mis Conversaciones**

---

## Webhooks

### Descripción
Los webhooks permiten que sistemas externos reciban notificaciones de eventos en la plataforma.

### Eventos Disponibles

#### Eventos de Tenants
- `tenant.created`: Nuevo tenant creado
- `tenant.updated`: Tenant actualizado
- `tenant.suspended`: Tenant suspendido
- `tenant.reactivated`: Tenant reactivado
- `tenant.deleted`: Tenant eliminado

#### Eventos de Tickets
- `ticket.created`: Nuevo ticket creado
- `ticket.updated`: Ticket actualizado
- `ticket.closed`: Ticket cerrado
- `ticket.message.added`: Nuevo mensaje en ticket

#### Eventos de Leads
- `lead.created`: Nuevo lead creado
- `lead.updated`: Lead actualizado
- `lead.converted`: Lead convertido
- `lead.stage.changed`: Etapa del lead cambiada

#### Eventos de Conversaciones
- `conversation.started`: Nueva conversación iniciada
- `conversation.message.received`: Mensaje recibido
- `conversation.message.sent`: Mensaje enviado
- `conversation.ended`: Conversación finalizada

### Configurar Webhooks

#### 1. Crear Endpoint Webhook
1. Ve a **Configuración** → **Webhooks**
2. Haz clic en **"Crear Webhook"**
3. Completa:
   - URL del endpoint (debe ser HTTPS)
   - Eventos a escuchar
   - Secret para verificación

#### 2. Verificar Webhook
- El sistema envía un evento de prueba
- Tu endpoint debe responder con el challenge
- Una vez verificado, el webhook está activo

#### 3. Recibir Eventos
- Los eventos se envían como POST requests
- Incluyen:
  - Tipo de evento
  - Timestamp
  - Datos del evento
  - Firma de verificación

### Ejemplo de Payload

```json
{
  "event": "tenant.created",
  "timestamp": "2025-01-27T10:00:00Z",
  "data": {
    "tenantId": "uuid-del-tenant",
    "name": "Empresa Cliente",
    "plan": "Pro",
    "status": "ACTIVE"
  },
  "signature": "firma-de-verificacion"
}
```

---

## APIs Disponibles

### API REST

La plataforma expone una API REST completa para integraciones.

#### Autenticación
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "tu-email@ejemplo.com",
  "password": "tu-contraseña"
}
```

Respuesta:
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-id",
    "email": "tu-email@ejemplo.com",
    "platformRole": "PLATFORM_OWNER"
  }
}
```

#### Endpoints Principales

##### Tenants
```http
GET    /api/platform/tenants           # Listar tenants
POST   /api/platform/tenants           # Crear tenant
GET    /api/platform/tenants/:id        # Obtener tenant
PUT    /api/platform/tenants/:id        # Actualizar tenant
DELETE /api/platform/tenants/:id        # Eliminar tenant
```

##### Tickets
```http
GET    /api/platform/support/tickets   # Listar tickets
POST   /api/platform/support/tickets   # Crear ticket
GET    /api/platform/support/tickets/:id # Obtener ticket
PUT    /api/platform/support/tickets/:id # Actualizar ticket
POST   /api/platform/support/tickets/:id/messages # Agregar mensaje
```

##### Leads
```http
GET    /api/platform/leads             # Listar leads
POST   /api/platform/leads              # Crear lead
GET    /api/platform/leads/pipeline     # Obtener pipeline
GET    /api/platform/leads/metrics     # Obtener métricas
```

##### Operaciones Propias
```http
GET    /api/platform/operations/agents      # Mis agentes
GET    /api/platform/operations/channels     # Mis canales
GET    /api/platform/operations/conversations # Mis conversaciones
GET    /api/platform/operations/leads        # Mis leads
```

### Documentación Completa de API

Para documentación completa de la API, consulta:
- Swagger UI: `https://tu-dominio.com/api/docs`
- Postman Collection: Disponible en el repositorio

---

## Mejores Prácticas

### Seguridad
- ✅ Usa HTTPS para todos los webhooks
- ✅ Verifica las firmas de los webhooks
- ✅ Almacena credenciales de forma segura
- ✅ Rota las API keys regularmente

### Rendimiento
- ✅ Implementa retry logic para webhooks
- ✅ Usa colas para procesar eventos
- ✅ Monitorea el tiempo de respuesta de webhooks
- ✅ Limita la frecuencia de llamadas a APIs

### Monitoreo
- ✅ Registra todos los eventos de integración
- ✅ Monitorea errores de webhooks
- ✅ Revisa logs de ejecución de flujos N8N
- ✅ Configura alertas para fallos críticos

---

**Última actualización:** 2025-01-27

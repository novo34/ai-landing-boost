# Panel de Administración de Plataforma - Overview

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [¿Qué es el Panel de Plataforma?](#qué-es-el-panel-de-plataforma)
2. [¿Para qué sirve?](#para-qué-sirve)
3. [Características Principales](#características-principales)
4. [Acceso al Panel](#acceso-al-panel)
5. [Estructura del Panel](#estructura-del-panel)

---

## ¿Qué es el Panel de Plataforma?

El **Panel de Administración de Plataforma** es el centro de control completo para los dueños del SaaS. Este panel te permite gestionar todos los aspectos de tu plataforma multi-tenant, desde la administración de clientes (tenants) hasta el uso de las mismas funcionalidades que ofreces a tus clientes para tus propias operaciones.

### Diferencias Clave

| Aspecto | Panel de Tenant (`/app`) | Panel de Plataforma (`/platform`) |
|---------|-------------------------|-----------------------------------|
| **Usuarios** | Clientes (tenants) | Dueños del SaaS |
| **Propósito** | Usar el SaaS | Gestionar el SaaS y usarlo internamente |
| **Alcance** | Un solo tenant | Todos los tenants + operaciones propias |
| **Funcionalidades** | Agentes, canales, conversaciones, etc. | Gestión de tenants + las mismas funcionalidades |

---

## ¿Para qué sirve?

El Panel de Plataforma te permite:

### 1. **Gestión de Clientes (Tenants)**
- Crear y gestionar cuentas de clientes
- Ver métricas y uso de cada tenant
- Suspender o reactivar cuentas
- Gestionar suscripciones y facturación

### 2. **Operaciones Propias del SaaS**
- Usar agentes de IA para captación de leads propios
- Configurar canales para tus propias operaciones
- Gestionar conversaciones y leads internos
- Automatizar procesos internos con N8N

### 3. **Soporte y Atención al Cliente**
- Sistema de tickets integrado
- Chat en vivo con clientes
- Gestión de solicitudes y problemas

### 4. **Monitoreo y Analytics**
- Dashboard con métricas globales
- Métricas por tenant
- Análisis de uso y rendimiento
- Alertas y notificaciones

### 5. **Configuración de la Plataforma**
- Gestión de planes de suscripción
- Configuración de instancias
- Gestión de regiones de datos
- Auditoría y logs

---

## Características Principales

### ✅ Multi-Tenant Completo
- Gestión centralizada de todos los tenants
- Aislamiento de datos por tenant
- Métricas agregadas y por tenant

### ✅ Operaciones Propias
- Acceso completo a todas las funcionalidades del SaaS
- Tenant dedicado para operaciones internas
- Agentes, canales, conversaciones y leads propios

### ✅ Sistema de Soporte Integrado
- Tickets de soporte por tenant
- Chat en vivo con clientes
- Historial completo de interacciones

### ✅ CRM de Leads
- Gestión de leads propios del SaaS
- Pipeline de ventas
- Métricas de conversión

### ✅ Automatización con N8N
- Flujos de automatización internos
- Integración con sistemas externos
- Webhooks y eventos

### ✅ Facturación y Suscripciones
- Gestión de planes
- Suscripciones por tenant
- Integración con Stripe

---

## Acceso al Panel

### Requisitos

Para acceder al Panel de Plataforma necesitas:

1. **Usuario con `platformRole`**
   - `PLATFORM_OWNER`: Acceso completo
   - `PLATFORM_ADMIN`: Acceso administrativo
   - `PLATFORM_SUPPORT`: Acceso de soporte

2. **Autenticación**
   - Iniciar sesión con credenciales válidas
   - El sistema verificará automáticamente tu `platformRole`

### URL de Acceso

```
http://localhost:3000/platform
```

O en producción:
```
https://tu-dominio.com/platform
```

### Primera Configuración

Si es la primera vez que accedes:

1. El sistema creará automáticamente un tenant especial `platform-owner`
2. Este tenant se usa para tus "Operaciones Propias"
3. Podrás usar todas las funcionalidades del SaaS para tus operaciones internas

---

## Estructura del Panel

### Navegación Principal

El panel está organizado en las siguientes secciones:

#### 1. **Dashboard** (`/platform`)
- Métricas globales
- Resumen de tenants
- Métricas de uso
- Alertas y notificaciones

#### 2. **Tenants** (`/platform/tenants`)
- Lista de todos los tenants
- Crear nuevo tenant
- Ver detalles de cada tenant
- Gestionar suscripciones

#### 3. **Facturación** (`/platform/billing`)
- Gestión de facturación
- Pagos fallidos
- Ajustes y créditos

#### 4. **Planes** (`/platform/plans`)
- Crear y gestionar planes
- Configurar límites y precios
- Ver tenants suscritos a cada plan

#### 5. **Tickets** (`/platform/tickets`)
- Lista de tickets de soporte
- Responder y gestionar tickets
- Historial de conversaciones

#### 6. **Chat** (`/platform/chat`)
- Chat en vivo con clientes
- Conversaciones en tiempo real
- Historial de mensajes

#### 7. **Instancias** (`/platform/instances`)
- Gestión de instancias del sistema
- Asignación de tenants a instancias
- Configuración de dominios

#### 8. **Regiones de Datos** (`/platform/regions`)
- Gestión de regiones de datos
- Configuración de almacenamiento
- Cumplimiento de normativas

#### 9. **Auditoría** (`/platform/audit`)
- Logs de acciones administrativas
- Historial de cambios
- Trazabilidad completa

### Operaciones Propias

Sección especial para usar el SaaS internamente:

#### 1. **Mis Agentes** (`/platform/operations/agents`)
- Agentes de IA para captación de leads
- Configuración de personalidad y conocimiento
- Gestión de agentes propios

#### 2. **Mis Canales** (`/platform/operations/channels`)
- Canales configurados para operaciones propias
- WhatsApp, Webchat, Telegram, Voz
- Configuración y gestión

#### 3. **Mis Conversaciones** (`/platform/operations/conversations`)
- Conversaciones de tus operaciones propias
- Historial completo
- Gestión de mensajes

#### 4. **Mis Leads** (`/platform/operations/leads`)
- CRM de leads generados por tus agentes
- Pipeline de ventas
- Métricas de conversión

#### 5. **Mis Flujos N8N** (`/platform/operations/n8n`)
- Flujos de automatización internos
- Activación y desactivación
- Logs y ejecuciones

#### 6. **Configuración** (`/platform/operations/settings`)
- Configuración de operaciones propias
- Datos de empresa
- Preferencias y ajustes

---

## 🎯 Próximos Pasos

1. **Lee la [Guía de Inicio](./01-Getting-Started.md)** para configurar todo
2. **Explora los [Módulos](./02-Modules.md)** para conocer todas las funcionalidades
3. **Consulta los [Flujos de Trabajo](./03-Workflows.md)** para tareas comunes
4. **Revisa las [Integraciones](./04-Integrations.md)** disponibles

---

**Última actualización:** 2025-01-27

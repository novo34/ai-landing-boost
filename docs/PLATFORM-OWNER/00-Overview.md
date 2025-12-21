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

### 1. **Gestión Completa de Clientes (Tenants)**
- Crear, editar y eliminar tenants
- Gestionar suscripciones y planes
- Ver métricas y estadísticas de cada cliente
- Suspender o reactivar cuentas
- Asignar tenants a diferentes instancias

### 2. **Operaciones Propias del SaaS**
- **Usar Agentes de IA**: Crear y gestionar tus propios agentes para captación de leads y ventas
- **Gestionar Canales**: Configurar WhatsApp, Webchat, Telegram, etc. para tus operaciones
- **Ver Conversaciones**: Monitorear y gestionar conversaciones de tus agentes propios
- **CRM de Leads**: Gestionar leads generados por tus agentes y flujos de ventas
- **Flujos N8N**: Automatizar procesos internos con flujos de N8N

### 3. **Soporte Integrado**
- Sistema de tickets de soporte para atender a clientes
- Chat en vivo para comunicación directa con tenants
- Historial completo de interacciones

### 4. **Gestión Avanzada**
- **Multi-instancia**: Gestionar múltiples instancias del SaaS
- **Planes y Facturación**: Crear y gestionar planes de suscripción
- **Regiones de Datos**: Gestionar dónde se almacenan los datos de cada tenant

---

## Características Principales

### 🎯 Dashboard Centralizado
Vista general con métricas clave:
- Total de tenants activos
- Ingresos recurrentes (MRR/ARR)
- Nuevos clientes
- Tickets de soporte pendientes
- Conversaciones activas

### 👥 Gestión de Tenants
- Lista completa de todos los clientes
- Filtros avanzados (estado, plan, región)
- Acciones rápidas (suspender, cambiar plan, etc.)
- Vista detallada de cada tenant

### 🎫 Sistema de Tickets
- Crear tickets de soporte
- Asignar tickets a miembros del equipo
- Seguimiento de estado y prioridad
- Historial completo de mensajes

### 💬 Chat en Vivo
- Comunicación en tiempo real con tenants
- Múltiples conversaciones simultáneas
- Historial de mensajes
- Notificaciones de nuevos mensajes

### 📊 CRM de Leads
- Gestión completa de leads
- Pipeline de ventas (Kanban)
- Métricas de conversión
- Notas y seguimiento

### 🔄 Flujos N8N de Plataforma
- Automatización de procesos internos
- Flujos para onboarding, notificaciones, reportes
- Activación/desactivación de flujos
- Logs de ejecución

### ⚙️ Operaciones Propias
- **Mis Agentes**: Agentes de IA para tus operaciones
- **Mis Canales**: Canales de comunicación propios
- **Mis Conversaciones**: Conversaciones de tus agentes
- **Mis Leads**: CRM para tus leads
- **Mis Flujos N8N**: Automatizaciones internas

### 🏢 Multi-instancia
- Crear y gestionar múltiples instancias
- Asignar tenants a instancias específicas
- Gestión de dominios y regiones de datos

### 💳 Gestión de Planes
- Crear planes de suscripción
- Configurar límites y características
- Ver métricas de ingresos por plan
- Gestionar precios y períodos de facturación

---

## Acceso al Panel

### Requisitos
- Tener el rol `PLATFORM_OWNER` asignado en tu cuenta de usuario
- Estar autenticado en el sistema

### URL de Acceso
```
https://tu-dominio.com/platform
```

### Primera Vez
1. Inicia sesión con tu cuenta de PLATFORM_OWNER
2. Serás redirigido automáticamente al panel de plataforma
3. Si no tienes acceso, contacta al administrador del sistema

---

## Estructura del Panel

```
/platform
├── Dashboard (Vista general)
├── Tenants (Gestión de clientes)
│   ├── Lista de Tenants
│   ├── Crear Tenant
│   └── Detalles de Tenant
├── Tickets (Soporte)
│   ├── Lista de Tickets
│   ├── Crear Ticket
│   └── Detalles de Ticket
├── Chat (Comunicación en vivo)
├── Leads (CRM)
│   ├── Lista de Leads
│   ├── Pipeline
│   └── Métricas
├── Instances (Multi-instancia)
│   ├── Lista de Instancias
│   └── Crear Instancia
├── N8N Flows (Automatizaciones)
│   ├── Lista de Flujos
│   └── Crear Flujo
├── Plans (Planes de suscripción)
│   ├── Lista de Planes
│   └── Crear Plan
└── Operaciones Propias
    ├── Mis Agentes
    ├── Mis Canales
    ├── Mis Conversaciones
    ├── Mis Leads
    ├── Mis Flujos N8N
    └── Configuración
```

---

## Próximos Pasos

- [Guía de Inicio Rápido](./01-Getting-Started.md) - Configuración inicial
- [Módulos del Panel](./02-Modules.md) - Descripción detallada de cada módulo
- [Flujos de Trabajo](./03-Workflows.md) - Cómo realizar tareas comunes
- [Integraciones](./04-Integrations.md) - Integraciones disponibles
- [Solución de Problemas](./05-Troubleshooting.md) - Resolución de errores comunes

---

## Notas Importantes

⚠️ **Permisos**: El panel de plataforma solo es accesible para usuarios con rol `PLATFORM_OWNER`. Los usuarios con otros roles serán redirigidos a su panel correspondiente.

💡 **Operaciones Propias**: El sistema crea automáticamente un tenant especial (`platform-owner`) para que puedas usar todas las funcionalidades del SaaS para tus propias operaciones.

🔒 **Seguridad**: Todas las acciones en el panel de plataforma están registradas en logs de auditoría para cumplimiento y seguridad.

---

**Última actualización:** 2025-01-27

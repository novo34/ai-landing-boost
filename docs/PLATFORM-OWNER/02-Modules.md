# Módulos del Panel de Plataforma

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Dashboard](#dashboard)
2. [Gestión de Tenants](#gestión-de-tenants)
3. [Sistema de Tickets](#sistema-de-tickets)
4. [Chat en Vivo](#chat-en-vivo)
5. [CRM de Leads](#crm-de-leads)
6. [Multi-instancia](#multi-instancia)
7. [Flujos N8N de Plataforma](#flujos-n8n-de-plataforma)
8. [Gestión de Planes](#gestión-de-planes)
9. [Operaciones Propias](#operaciones-propias)

---

## Dashboard

### Descripción
Vista centralizada con métricas clave de toda la plataforma.

### Características

#### Métricas Principales
- **Total de Tenants**: Número total de clientes registrados
- **Tenants Activos**: Clientes con suscripción activa
- **En Trial**: Clientes en período de prueba
- **Suspendidos**: Clientes con cuenta suspendida
- **Nuevos (30 días)**: Nuevos clientes en el último mes

#### Métricas de Usuarios
- **Total de Usuarios**: Todos los usuarios de todos los tenants
- **Activos (30 días)**: Usuarios que han iniciado sesión en el último mes

#### Métricas de Ingresos
- **MRR (Monthly Recurring Revenue)**: Ingresos recurrentes mensuales
- **ARR (Annual Recurring Revenue)**: Ingresos recurrentes anuales
- **Mes Actual**: Ingresos del mes en curso
- **Mes Anterior**: Ingresos del mes anterior
- **Crecimiento**: Porcentaje de crecimiento

#### Gráficos
- Evolución de tenants en el tiempo
- Distribución por planes
- Ingresos por mes
- Tickets de soporte por estado

![Dashboard](./screenshots/dashboard-metrics.png)
*Captura: Métricas del dashboard*

---

## Gestión de Tenants

### Descripción
Módulo completo para gestionar todos los clientes (tenants) de la plataforma.

### Funcionalidades

#### Lista de Tenants
- Vista de tabla con todos los tenants
- Filtros por:
  - Estado (ACTIVE, TRIAL, SUSPENDED)
  - Plan de suscripción
  - Región de datos
  - País
- Búsqueda por nombre o email
- Ordenamiento por diferentes columnas

![Lista de Tenants](./screenshots/tenants-list.png)
*Captura: Lista de tenants con filtros*

#### Crear Tenant
Formulario completo para crear un nuevo tenant:

1. **Información Básica**:
   - Nombre del tenant
   - Slug (generado automáticamente)
   - País
   - Región de datos

2. **Suscripción**:
   - Plan de suscripción
   - Estado inicial (ACTIVE, TRIAL)
   - Fecha de fin de trial (si aplica)

3. **Usuario Owner**:
   - Email del usuario que será OWNER
   - El sistema crea automáticamente el usuario si no existe

#### Detalles de Tenant
Vista detallada de un tenant específico:

- **Información General**:
  - Nombre, slug, estado
  - Plan actual
  - Fechas de creación y última actualización

- **Usuarios**:
  - Lista de todos los usuarios del tenant
  - Roles y permisos
  - Estado de verificación de email

- **Métricas**:
  - Número de agentes
  - Número de canales
  - Conversaciones activas
  - Uso de almacenamiento

- **Acciones**:
  - Editar información
  - Cambiar plan
  - Suspender/Reactivar
  - Eliminar (con confirmación)

![Detalles de Tenant](./screenshots/tenant-details.png)
*Captura: Vista detallada de un tenant*

---

## Sistema de Tickets

### Descripción
Sistema integrado de tickets de soporte para atender a los clientes.

### Funcionalidades

#### Lista de Tickets
- Vista de todos los tickets de soporte
- Filtros por:
  - Estado (OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED)
  - Categoría (TECHNICAL, BILLING, CONFIGURATION, FEATURE_REQUEST, OTHER)
  - Prioridad (LOW, MEDIUM, HIGH, CRITICAL)
  - Tenant asignado
  - Usuario asignado

#### Crear Ticket
Formulario para crear un nuevo ticket:

- **Información del Ticket**:
  - Asunto
  - Descripción
  - Categoría
  - Prioridad
  - Tenant relacionado (opcional)
  - Usuario asignado (opcional)

#### Detalles de Ticket
Vista completa de un ticket:

- **Información**:
  - Estado, categoría, prioridad
  - Tenant y usuario asignado
  - Fechas de creación y última actividad

- **Mensajes**:
  - Historial completo de mensajes
  - Mensajes internos (solo visibles para el equipo)
  - Agregar nuevo mensaje

- **Acciones**:
  - Actualizar estado
  - Cambiar prioridad
  - Reasignar
  - Cerrar ticket

![Detalles de Ticket](./screenshots/ticket-details.png)
*Captura: Vista detallada de un ticket con mensajes*

---

## Chat en Vivo

### Descripción
Sistema de chat en tiempo real para comunicarte directamente con los tenants.

### Funcionalidades

#### Lista de Conversaciones
- Todas las conversaciones activas con tenants
- Indicador de mensajes no leídos
- Último mensaje visible
- Estado de conexión del tenant

#### Interfaz de Chat
- Panel dividido:
  - **Izquierda**: Lista de conversaciones
  - **Derecha**: Área de chat activa
- Indicador de escritura
- Historial de mensajes
- Timestamps de mensajes
- Envío de mensajes en tiempo real

#### Características
- **Múltiples Conversaciones**: Cambiar entre diferentes conversaciones
- **Notificaciones**: Alertas de nuevos mensajes
- **Búsqueda**: Buscar en el historial de mensajes
- **Archivo Adjuntos**: Enviar archivos (si está configurado)

![Chat en Vivo](./screenshots/chat-interface.png)
*Captura: Interfaz de chat en vivo con un tenant*

---

## CRM de Leads

### Descripción
Sistema completo de gestión de leads para gestionar oportunidades de venta.

### Funcionalidades

#### Lista de Leads
Vista de tabla con todos los leads:

- Información del lead:
  - Nombre, email, teléfono
  - Fuente (Website, Referral, Social Media, etc.)
  - Estado (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
  - Etapa (LEAD, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED)
  - Valor estimado
  - Fecha de creación

- Filtros:
  - Por estado
  - Por etapa
  - Por fuente
  - Por usuario asignado

#### Pipeline de Ventas
Vista Kanban con leads organizados por etapa:

- **Columnas por Etapa**:
  - Lead Capturado
  - Contactado
  - Calificado
  - Propuesta
  - Negociación
  - Cerrado (Ganado/Perdido)

- **Acciones**:
  - Arrastrar y soltar leads entre etapas
  - Ver detalles del lead
  - Agregar notas
  - Actualizar información

#### Métricas
- Total de leads
- Leads convertidos
- Tasa de conversión
- Valor total de leads
- Leads por etapa
- Tiempo promedio en cada etapa

![Pipeline de Ventas](./screenshots/leads-pipeline.png)
*Captura: Vista Kanban del pipeline de ventas*

#### Crear Lead
Formulario para crear un lead manualmente:

- Información básica (nombre, email, teléfono)
- Fuente del lead
- Interés/Producto
- Notas iniciales
- Asignación a usuario

---

## Multi-instancia

### Descripción
Gestiona múltiples instancias del SaaS para diferentes regiones o propósitos.

### Funcionalidades

#### Lista de Instancias
- Todas las instancias configuradas
- Información de cada instancia:
  - Nombre
  - Dominio
  - Región de datos
  - País
  - Estado
  - Número de tenants asignados

#### Crear Instancia
Formulario para crear una nueva instancia:

- **Información**:
  - Nombre de la instancia
  - Dominio único
  - Región de datos (EU, US, ASIA, etc.)
  - País

- **Validaciones**:
  - El dominio debe ser único
  - No se puede eliminar una instancia con tenants asignados

#### Asignar Tenants
- Asignar tenants existentes a una instancia
- Cambiar la instancia de un tenant
- Ver todos los tenants de una instancia

![Lista de Instancias](./screenshots/instances-list.png)
*Captura: Lista de instancias con tenants asignados*

---

## Flujos N8N de Plataforma

### Descripción
Gestiona flujos de automatización N8N a nivel de plataforma para procesos internos.

### Funcionalidades

#### Lista de Flujos
- Todos los flujos N8N de plataforma
- Información de cada flujo:
  - Nombre y descripción
  - Categoría
  - Estado (Activo/Inactivo)
  - Fecha de creación

- Filtros:
  - Por categoría
  - Por estado (activo/inactivo)

#### Crear Flujo
Formulario para crear un nuevo flujo:

- **Información**:
  - Nombre del flujo
  - Descripción
  - Categoría (LEAD_INTAKE, BOOKING_FLOW, FOLLOWUP, PAYMENT_FAILED, CUSTOM)
  - Workflow JSON (configuración de N8N)

#### Gestionar Flujos
- **Activar/Desactivar**: Cambiar el estado del flujo
- **Ver Logs**: Historial de ejecuciones
- **Editar**: Modificar la configuración
- **Eliminar**: Eliminar el flujo (con confirmación)

#### Categorías de Flujos
- **LEAD_INTAKE**: Procesamiento automático de leads
- **BOOKING_FLOW**: Flujos de reservas y citas
- **FOLLOWUP**: Seguimiento automático
- **PAYMENT_FAILED**: Manejo de pagos fallidos
- **CUSTOM**: Flujos personalizados

![Flujos N8N](./screenshots/n8n-flows-list.png)
*Captura: Lista de flujos N8N de plataforma*

---

## Gestión de Planes

### Descripción
Crea y gestiona planes de suscripción para los tenants.

### Funcionalidades

#### Lista de Planes
- Todos los planes disponibles
- Información de cada plan:
  - Nombre y descripción
  - Precio mensual/anual
  - Límites (agentes, canales, usuarios, etc.)
  - Número de tenants suscritos
  - Ingresos generados

#### Crear Plan
Formulario completo para crear un plan:

- **Información Básica**:
  - Nombre del plan
  - Slug (identificador único)
  - Descripción
  - Precio mensual
  - Precio anual (opcional, con descuento)

- **Límites**:
  - Número máximo de agentes
  - Número máximo de canales
  - Número máximo de usuarios
  - Almacenamiento (GB)
  - Mensajes por mes

- **Características**:
  - Integraciones disponibles
  - Funcionalidades incluidas
  - Soporte incluido

#### Métricas de Planes
- Ingresos por plan
- Número de suscriptores
- Tasa de conversión
- Churn rate

![Lista de Planes](./screenshots/plans-list.png)
*Captura: Lista de planes con métricas*

---

## Operaciones Propias

### Descripción
Usa todas las funcionalidades del SaaS para tus propias operaciones internas.

### Módulos Disponibles

#### Mis Agentes
Gestiona tus propios agentes de IA:

- Lista de agentes propios
- Crear nuevos agentes
- Configurar agentes existentes
- Ver estadísticas de uso

**Uso típico**: Agentes para captación de leads, atención al cliente, ventas.

![Mis Agentes](./screenshots/operations-agents.png)
*Captura: Lista de agentes propios*

#### Mis Canales
Gestiona tus canales de comunicación:

- Lista de canales propios
- Crear nuevos canales (WhatsApp, Webchat, Telegram, Voz)
- Configurar canales existentes
- Ver estado de conexión

**Uso típico**: Canales para recibir leads, atención al cliente, comunicación con prospectos.

![Mis Canales](./screenshots/operations-channels.png)
*Captura: Lista de canales propios*

#### Mis Conversaciones
Visualiza y gestiona conversaciones de tus agentes:

- Lista de todas las conversaciones
- Filtrar por estado, agente, fecha
- Ver historial completo
- Responder manualmente si es necesario

**Uso típico**: Monitorear conversaciones de ventas, atención al cliente, seguimiento de leads.

![Mis Conversaciones](./screenshots/operations-conversations.png)
*Captura: Lista de conversaciones propias*

#### Mis Leads
CRM completo para tus leads:

- **Lista**: Vista de tabla con todos los leads
- **Pipeline**: Vista Kanban por etapa de venta
- **Métricas**: Conversión, valor, tiempo en cada etapa
- Crear leads manualmente
- Agregar notas y seguimiento

**Uso típico**: Gestionar leads generados por tus agentes, pipeline de ventas del SaaS.

![Mis Leads](./screenshots/operations-leads.png)
*Captura: Vista de pipeline de leads propios*

#### Mis Flujos N8N
Automatizaciones para tus operaciones:

- Lista de flujos propios
- Crear flujos personalizados
- Activar/desactivar flujos
- Ver logs de ejecución

**Uso típico**: Automatizar onboarding, notificaciones internas, generación de reportes, procesamiento de leads.

![Mis Flujos N8N](./screenshots/operations-n8n.png)
*Captura: Lista de flujos N8N propios*

#### Configuración
Ajustes generales de tus operaciones:

- Información de la empresa
- Contacto (email, teléfono, dirección)
- Zona horaria
- Idioma preferido
- Moneda

![Configuración](./screenshots/operations-settings.png)
*Captura: Página de configuración de operaciones propias*

---

## Notas Importantes

💡 **Tenant Automático**: El sistema crea automáticamente un tenant especial (`platform-owner`) para tus operaciones. No necesitas crearlo manualmente.

🔄 **Sincronización**: Los cambios en operaciones propias se reflejan inmediatamente. No hay delay.

📊 **Métricas Separadas**: Las métricas de tus operaciones propias están separadas de las métricas de los tenants clientes.

🔒 **Permisos**: Tienes acceso completo a todas las funcionalidades en operaciones propias, sin restricciones de plan.

---

**Última actualización:** 2025-01-27

# PRD-46: Panel de Administración de Plataforma (Platform Owner)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente  
> **Bloque:** A - Fundamentos  
> **Dependencias:** PRD-07, PRD-08, PRD-09

---

## Objetivo

Implementar un sistema completo de administración de plataforma que permita al dueño del SaaS (PLATFORM_OWNER) gestionar todos los tenants/clientes, sus suscripciones, configuraciones, métricas globales y operaciones administrativas desde un panel centralizado.

---

## Alcance INCLUIDO

- ✅ Sistema completo de roles de plataforma (PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT)
- ✅ Panel de administración dedicado (`/platform`) con UI/UX profesional
- ✅ Gestión completa de tenants (crear, editar, eliminar, suspender)
- ✅ Visualización de métricas globales del SaaS
- ✅ Gestión de facturación de cualquier tenant
- ✅ Configuración de agentes, canales y conocimiento para cualquier tenant
- ✅ Sistema de auditoría y logs de acciones administrativas
- ✅ Gestión de planes de suscripción
- ✅ Notificaciones y alertas del sistema
- ✅ Exportación de datos y reportes globales
- ✅ **Multi-instancia del SaaS** - Gestión de múltiples instancias/entornos
- ✅ **Gestión de múltiples regiones de datos** - EU, CH, US, etc.
- ✅ **Sistema de tickets de soporte integrado** - Gestión completa de tickets
- ✅ **Chat en vivo con clientes** - Comunicación directa desde el panel
- ✅ **Automatización de onboarding de clientes** - Flujos automatizados
- ✅ **Uso propio de funcionalidades** - Agentes, canales, N8N para captación de leads y ventas
- ✅ **Gestión de leads propios** - Sistema de CRM integrado para el SaaS
- ✅ **Flujos N8N para operaciones** - Automatización de procesos internos
- ✅ UI completa y profesional para todas las funcionalidades

---

## Requisitos Funcionales

### RF-01: Sistema de Roles de Plataforma

**Descripción:** Implementar un sistema de roles separado para la plataforma, distinto de los roles de tenant.

**Roles de Plataforma:**
- **PLATFORM_OWNER:** Dueño del SaaS, acceso completo a todo
- **PLATFORM_ADMIN:** Administrador de plataforma con permisos amplios (gestión de tenants, facturación, configuración)
- **PLATFORM_SUPPORT:** Soporte técnico con acceso a tickets, chat con clientes y configuración limitada

**Implementación:**
- Nuevo campo `platformRole` en tabla `User` (opcional, nullable)
- Si `platformRole` existe, el usuario tiene acceso al panel de plataforma
- Un usuario puede tener `platformRole` Y roles de tenant simultáneamente
- El `platformRole` se verifica independientemente del `tenantRole`
- Sistema de permisos granulares por rol de plataforma

**Reglas:**
- PLATFORM_OWNER: Acceso completo sin restricciones
- PLATFORM_ADMIN: Puede gestionar tenants, facturación, planes, pero no puede eliminar instancias ni cambiar roles de otros admins
- PLATFORM_SUPPORT: Puede ver tenants, gestionar tickets, chatear con clientes, pero no puede modificar facturación ni eliminar recursos
- El PLATFORM_OWNER puede ver y gestionar todos los tenants sin restricciones
- El PLATFORM_OWNER puede "impersonar" un tenant para configurarlo directamente
- Todos los roles de plataforma pueden usar las funcionalidades del SaaS para operaciones propias (agentes, canales, N8N)

---

### RF-02: Panel de Administración de Plataforma

**Descripción:** Dashboard principal del PLATFORM_OWNER con métricas globales y acceso rápido a funcionalidades.

**Secciones del Panel:**

1. **Dashboard Principal**
   - Total de tenants activos
   - Total de usuarios
   - Ingresos mensuales/recurrentes (MRR)
   - Crecimiento de tenants (últimos 30 días)
   - Tenants en trial vs suscritos
   - Tenants con problemas (pagos fallidos, límites excedidos)
   - Gráficos de tendencias (tenants, usuarios, ingresos)

2. **Gestión de Tenants**
   - Lista completa de todos los tenants
   - Filtros: estado, plan, fecha de creación, país
   - Búsqueda por nombre, email, slug
   - Acciones rápidas: ver detalles, editar, suspender, eliminar

3. **Gestión de Facturación**
   - Ver suscripciones de todos los tenants
   - Cambiar plan de cualquier tenant
   - Gestionar pagos fallidos
   - Ver historial de pagos
   - Exportar reportes financieros

4. **Configuración de Tenants**
   - Acceso a configuración de cualquier tenant
   - Crear/editar agentes para cualquier tenant
   - Gestionar base de conocimiento de cualquier tenant
   - Configurar canales de cualquier tenant
   - Ajustar límites y permisos

5. **Auditoría y Logs**
   - Historial de acciones del PLATFORM_OWNER
   - Logs de cambios en tenants
   - Logs de cambios en suscripciones
   - Exportación de logs

6. **Gestión de Planes**
   - Crear/editar/eliminar planes de suscripción
   - Configurar precios y límites
   - Activar/desactivar planes

---

### RF-03: Gestión Completa de Tenants

**Descripción:** El PLATFORM_OWNER debe poder realizar todas las operaciones CRUD sobre tenants.

#### RF-03.1: Listar Tenants

**Información a mostrar:**
- Nombre y slug del tenant
- Estado (ACTIVE, TRIAL, SUSPENDED, CANCELLED)
- Plan actual y estado de suscripción
- Fecha de creación
- País y región de datos
- Número de usuarios
- Número de agentes activos
- Última actividad
- Ingresos mensuales

**Filtros disponibles:**
- Por estado
- Por plan
- Por país
- Por fecha de creación (rango)
- Por estado de suscripción (trial, activo, cancelado, bloqueado)

**Ordenamiento:**
- Por fecha de creación (asc/desc)
- Por nombre (asc/desc)
- Por ingresos (asc/desc)
- Por número de usuarios (asc/desc)

#### RF-03.2: Ver Detalles de Tenant

**Información completa:**
- Datos básicos (nombre, slug, país, región)
- Configuración (idioma, zona horaria, colores, logo)
- Suscripción actual (plan, estado, próxima facturación)
- Métricas del tenant (agentes, canales, conversaciones, mensajes)
- Lista de usuarios y sus roles
- Historial de cambios de plan
- Historial de pagos
- Logs de actividad reciente

#### RF-03.3: Crear Tenant

**Flujo:**
1. PLATFORM_OWNER accede a "Crear Tenant"
2. Completa formulario:
   - Nombre del tenant
   - Slug (validación de unicidad)
   - País
   - Región de datos (EU, CH, etc.)
   - Email del owner inicial
   - Plan inicial (opcional, puede ser trial)
3. Sistema crea:
   - Tenant en BD
   - Usuario owner (si no existe, se crea)
   - TenantMembership con rol OWNER
   - Suscripción inicial (trial o plan seleccionado)
   - Configuración por defecto
4. Se envía email de bienvenida al owner con credenciales

**Validaciones:**
- Slug debe ser único
- Email debe ser válido
- País debe ser válido según enum

#### RF-03.4: Editar Tenant

**Campos editables:**
- Nombre
- Slug (con validación de unicidad)
- País
- Región de datos
- Estado (ACTIVE, SUSPENDED, CANCELLED)
- Fecha de fin de trial (si aplica)

**Reglas:**
- Cambiar slug requiere actualizar todas las referencias
- Cambiar estado a SUSPENDED bloquea acceso del tenant
- Cambiar estado a CANCELLED marca para eliminación (soft delete)

#### RF-03.5: Suspender Tenant

**Descripción:** Suspender temporalmente un tenant sin eliminarlo.

**Flujo:**
1. PLATFORM_OWNER selecciona tenant
2. Hace clic en "Suspender"
3. Opcionalmente ingresa razón de suspensión
4. Sistema:
   - Cambia estado a SUSPENDED
   - Bloquea acceso de todos los usuarios del tenant
   - Envía notificación al owner del tenant
   - Registra acción en logs de auditoría

**Efectos de suspensión:**
- Usuarios no pueden iniciar sesión
- API rechaza requests del tenant
- Agentes de IA no procesan mensajes
- Webhooks no se procesan

#### RF-03.6: Reactivar Tenant

**Descripción:** Reactivar un tenant suspendido.

**Flujo:**
1. PLATFORM_OWNER selecciona tenant suspendido
2. Hace clic en "Reactivar"
3. Sistema:
   - Cambia estado a ACTIVE
   - Restaura acceso de usuarios
   - Envía notificación al owner
   - Registra acción en logs

#### RF-03.7: Eliminar Tenant

**Descripción:** Eliminar permanentemente un tenant (soft delete recomendado).

**Flujo:**
1. PLATFORM_OWNER selecciona tenant
2. Hace clic en "Eliminar"
3. Sistema muestra advertencia con:
   - Número de usuarios afectados
   - Número de conversaciones
   - Datos que se eliminarán
4. PLATFORM_OWNER confirma con doble confirmación
5. Sistema:
   - Marca tenant como CANCELLED
   - Programa eliminación completa (soft delete) o marca para eliminación física
   - Envía notificación al owner
   - Registra acción en logs

**Nota:** Se recomienda soft delete para cumplimiento GDPR. Eliminación física puede ser programada para después de X días.

---

### RF-04: Gestión de Facturación de Tenants

**Descripción:** El PLATFORM_OWNER debe poder gestionar la facturación de cualquier tenant.

#### RF-04.1: Ver Suscripción de Tenant

**Información mostrada:**
- Plan actual
- Estado de suscripción
- Fecha de inicio
- Próxima facturación
- Método de pago (últimos 4 dígitos)
- Historial de pagos
- Historial de cambios de plan

#### RF-04.2: Cambiar Plan de Tenant

**Flujo:**
1. PLATFORM_OWNER accede a detalles de tenant
2. Sección "Facturación"
3. Selecciona "Cambiar Plan"
4. Selecciona nuevo plan
5. Opciones:
   - Cambio inmediato (con prorrateo)
   - Cambio al final del período actual
6. Sistema actualiza suscripción
7. Si es upgrade inmediato, puede requerir pago adicional
8. Se envía notificación al tenant

**Nota:** El PLATFORM_OWNER puede cambiar planes sin pasar por Stripe (útil para descuentos, planes personalizados, etc.)

#### RF-04.3: Gestionar Pagos Fallidos

**Descripción:** Ver y gestionar tenants con problemas de pago.

**Información:**
- Lista de tenants con estado PAST_DUE
- Días desde último pago exitoso
- Intentos de pago fallidos
- Monto pendiente
- Acciones disponibles:
  - Extender grace period
  - Marcar como pagado manualmente
  - Suspender tenant
  - Contactar al cliente

#### RF-04.4: Aplicar Descuentos y Ajustes

**Descripción:** Aplicar descuentos, créditos o ajustes manuales a facturación.

**Flujo:**
1. PLATFORM_OWNER accede a facturación del tenant
2. Selecciona "Aplicar Ajuste"
3. Ingresa:
   - Tipo (descuento, crédito, ajuste)
   - Monto
   - Razón
   - Fecha de aplicación
4. Sistema registra ajuste
5. Se aplica en próxima facturación o inmediatamente según tipo

---

### RF-05: Configuración de Tenants

**Descripción:** El PLATFORM_OWNER debe poder configurar cualquier aspecto de cualquier tenant.

#### RF-05.1: Configurar Agentes

**Acciones disponibles:**
- Ver todos los agentes del tenant
- Crear nuevo agente
- Editar agente existente
- Eliminar agente
- Activar/desactivar agente

**Nota:** Misma funcionalidad que tiene el OWNER del tenant, pero accesible desde el panel de plataforma.

#### RF-05.2: Gestionar Base de Conocimiento

**Acciones disponibles:**
- Ver todos los documentos
- Subir nuevos documentos
- Editar documentos existentes
- Eliminar documentos
- Gestionar categorías

#### RF-05.3: Configurar Canales

**Acciones disponibles:**
- Ver canales configurados
- Configurar WhatsApp
- Configurar Webchat
- Activar/desactivar canales

#### RF-05.4: Ajustar Configuración General

**Campos editables:**
- Logo
- Colores primarios y secundarios
- Idioma por defecto
- Zona horaria
- Configuración de integraciones (n8n, calendario)

---

### RF-06: Métricas Globales del SaaS

**Descripción:** Dashboard con métricas agregadas de toda la plataforma.

**Métricas Principales:**

1. **Métricas de Tenants**
   - Total de tenants
   - Tenants activos
   - Tenants en trial
   - Tenants suspendidos
   - Nuevos tenants (últimos 30 días)
   - Churn rate (tenants cancelados)

2. **Métricas de Usuarios**
   - Total de usuarios
   - Usuarios activos (últimos 30 días)
   - Nuevos usuarios (últimos 30 días)
   - Distribución por rol

3. **Métricas de Ingresos**
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - Ingresos del mes actual
   - Ingresos del mes anterior
   - Crecimiento de ingresos (%)
   - Valor promedio por tenant (ARPU)

4. **Métricas de Uso**
   - Total de agentes activos
   - Total de canales configurados
   - Total de conversaciones
   - Total de mensajes procesados
   - Promedio de mensajes por tenant

5. **Métricas de Salud**
   - Tenants con pagos fallidos
   - Tenants cerca de límites
   - Tiempo promedio de respuesta de agentes
   - Satisfacción (si se implementa en el futuro)

**Visualizaciones:**
- Gráficos de líneas para tendencias temporales
- Gráficos de barras para comparaciones
- Gráficos de pastel para distribuciones
- Tablas con datos detallados

**Filtros:**
- Por rango de fechas
- Por país
- Por plan

---

### RF-07: Gestión de Planes de Suscripción

**Descripción:** El PLATFORM_OWNER debe poder gestionar los planes de suscripción disponibles.

#### RF-07.1: Listar Planes

**Información mostrada:**
- Nombre del plan
- Precio (mensual/anual)
- Límites (agentes, canales, mensajes)
- Estado (activo/inactivo)
- Número de tenants suscritos
- Ingresos generados por el plan

#### RF-07.2: Crear Plan

**Campos requeridos:**
- Nombre
- Descripción
- Precio mensual (en centavos)
- Precio anual (en centavos, opcional)
- Moneda (EUR, CHF)
- Límites:
  - maxAgents
  - maxChannels
  - maxMessages (opcional)
- Características (lista de features)

**Flujo:**
1. PLATFORM_OWNER accede a "Gestión de Planes"
2. Hace clic en "Crear Plan"
3. Completa formulario
4. Sistema crea plan en BD
5. Plan queda disponible para selección en checkout

#### RF-07.3: Editar Plan

**Campos editables:**
- Nombre
- Descripción
- Precios
- Límites
- Características
- Estado (activo/inactivo)

**Reglas:**
- Cambiar límites no afecta a tenants ya suscritos (solo a nuevos)
- Cambiar precios no afecta a suscripciones existentes
- Desactivar plan impide nuevas suscripciones pero mantiene las existentes

#### RF-07.4: Eliminar Plan

**Reglas:**
- Solo se puede eliminar si no hay tenants suscritos
- Si hay tenants suscritos, se debe desactivar primero
- Eliminación es soft delete (se mantiene historial)

---

### RF-08: Sistema de Auditoría y Logs

**Descripción:** Registrar todas las acciones del PLATFORM_OWNER para auditoría y trazabilidad.

#### RF-08.1: Registro de Acciones

**Acciones a registrar:**
- Crear/editar/eliminar tenant
- Suspender/reactivar tenant
- Cambiar plan de tenant
- Aplicar ajustes de facturación
- Configurar agentes/canales/conocimiento
- Cambios en planes de suscripción
- Accesos al panel de plataforma

**Información registrada:**
- Usuario que realizó la acción (PLATFORM_OWNER)
- Tipo de acción
- Recurso afectado (tenant, plan, etc.)
- Datos antes y después (para cambios)
- Timestamp
- IP de origen
- User agent

#### RF-08.2: Visualización de Logs

**Funcionalidades:**
- Lista de logs con filtros:
  - Por tipo de acción
  - Por tenant
  - Por fecha (rango)
  - Por usuario
- Búsqueda por texto
- Exportación a CSV/JSON
- Paginación

#### RF-08.3: Alertas y Notificaciones

**Alertas automáticas:**
- Nuevo tenant creado
- Tenant suspendido
- Pago fallido (crítico)
- Tenant cerca de límites
- Error en sistema

**Canales de notificación:**
- Email
- Dashboard (badges, notificaciones)
- Webhooks (para integración con sistemas externos)

---

### RF-09: Exportación de Datos y Reportes

**Descripción:** Generar reportes y exportar datos para análisis externo.

#### RF-09.1: Reportes Disponibles

1. **Reporte de Tenants**
   - Lista completa con todas las métricas
   - Filtrable y exportable

2. **Reporte Financiero**
   - Ingresos por período
   - Ingresos por plan
   - Ingresos por país
   - Churn y retención

3. **Reporte de Uso**
   - Uso de recursos por tenant
   - Distribución de agentes y canales
   - Mensajes procesados

4. **Reporte de Crecimiento**
   - Nuevos tenants por mes
   - Nuevos usuarios por mes
   - Tendencias de uso

#### RF-09.2: Exportación

**Formatos:**
- CSV (para Excel)
- JSON (para sistemas)
- PDF (para presentaciones)

**Opciones:**
- Seleccionar columnas a exportar
- Aplicar filtros antes de exportar
- Programar exportaciones automáticas (futuro)

---

### RF-10: UI del Panel de Plataforma

**Descripción:** Interfaz de usuario profesional y completa para todas las funcionalidades.

#### RF-10.1: Diseño y Navegación

**Estructura:**
- Layout dedicado para `/platform`
- Sidebar con navegación completa:
  - Dashboard
  - Tenants
  - Facturación
  - Planes
  - Tickets de Soporte
  - Chat con Clientes
  - Instancias (Multi-instancia)
  - Regiones de Datos
  - Auditoría
  - Operaciones Propias:
    - Mis Agentes
    - Mis Canales
    - Mis Conversaciones
    - Mis Leads (CRM)
    - Mis Flujos N8N
  - Configuración
- Header con:
  - Logo/nombre del SaaS
  - Selector de instancia (si multi-instancia)
  - Selector de tenant (para impersonación)
  - Notificaciones (tickets, chat, alertas)
  - Perfil de usuario

**Estilo:**
- Diseño profesional y moderno
- Consistente con el resto de la aplicación
- Responsive (mobile-friendly)
- Accesible (WCAG 2.1 AA)

#### RF-10.2: Componentes Principales

1. **Dashboard Cards**
   - Cards con métricas principales
   - Gráficos interactivos
   - Filtros rápidos

2. **Tabla de Tenants**
   - Tabla con paginación
   - Filtros avanzados
   - Acciones rápidas (dropdown)
   - Búsqueda en tiempo real

3. **Formularios**
   - Formularios de creación/edición
   - Validación en tiempo real
   - Mensajes de error claros
   - Confirmaciones para acciones destructivas

4. **Modales**
   - Modales para acciones rápidas
   - Modales de confirmación
   - Modales de detalles

#### RF-10.3: Estados y Feedback

**Estados a manejar:**
- Loading (skeletons, spinners)
- Empty states (sin datos)
- Error states (con mensajes claros)
- Success states (confirmaciones)

**Feedback:**
- Toasts para acciones exitosas
- Toasts para errores
- Confirmaciones para acciones destructivas
- Tooltips para información adicional

---

### RF-11: Multi-Instancia del SaaS

**Descripción:** El PLATFORM_OWNER debe poder gestionar múltiples instancias del SaaS (producción, staging, desarrollo, clientes white-label).

#### RF-11.1: Gestión de Instancias

**Funcionalidades:**
- Crear nuevas instancias del SaaS
- Configurar cada instancia independientemente:
  - Base de datos
  - Variables de entorno
  - Dominio/subdominio
  - Configuración de Stripe
  - Configuración de n8n
- Cambiar entre instancias desde el panel
- Ver métricas por instancia
- Gestionar tenants por instancia

**Casos de Uso:**
- Instancia de producción para clientes reales
- Instancia de staging para pruebas
- Instancia de desarrollo para testing
- Instancias white-label para clientes enterprise

#### RF-11.2: Sincronización entre Instancias

**Funcionalidades:**
- Sincronizar configuración entre instancias
- Migrar tenants entre instancias
- Backup y restore de instancias
- Clonar instancias completas

---

### RF-12: Gestión de Múltiples Regiones de Datos

**Descripción:** Gestionar dónde se almacenan los datos de cada tenant según cumplimiento legal (GDPR, nLPD, etc.).

#### RF-12.1: Configuración de Regiones

**Regiones Soportadas:**
- EU (Europa - GDPR)
- CH (Suiza - nLPD)
- US (Estados Unidos)
- APAC (Asia-Pacífico)
- Otras (extensible)

**Funcionalidades:**
- Asignar región de datos al crear tenant
- Cambiar región de datos de tenant existente (con migración)
- Ver distribución de tenants por región
- Configurar políticas de residencia de datos por región
- Validar cumplimiento legal por región

#### RF-12.2: Migración de Datos entre Regiones

**Flujo:**
1. PLATFORM_OWNER selecciona tenant
2. Cambia región de datos
3. Sistema valida cumplimiento legal
4. Sistema programa migración de datos
5. Migración se ejecuta en background
6. Notificación cuando migración completa
7. Validación de integridad de datos

---

### RF-13: Sistema de Tickets de Soporte Integrado

**Descripción:** Sistema completo de gestión de tickets de soporte para atender a los clientes (tenants).

#### RF-13.1: Creación y Gestión de Tickets

**Funcionalidades:**
- Los clientes pueden crear tickets desde su panel
- PLATFORM_OWNER/ADMIN/SUPPORT pueden crear tickets manualmente
- Asignar tickets a miembros del equipo de soporte
- Categorizar tickets (técnico, facturación, configuración, etc.)
- Priorizar tickets (baja, media, alta, crítica)
- Estados: Abierto, En Progreso, Esperando Cliente, Resuelto, Cerrado

#### RF-13.2: Flujo de Tickets

**Flujo Completo:**
1. Cliente crea ticket o se crea automáticamente (pago fallido, error, etc.)
2. Ticket se asigna automáticamente o manualmente
3. Soporte responde y trabaja en el ticket
4. Comunicación bidireccional (cliente y soporte)
5. Ticket se marca como resuelto
6. Cliente confirma resolución
7. Ticket se cierra

#### RF-13.3: Integración con Tenants

**Funcionalidades:**
- Ver contexto del tenant desde el ticket
- Acceso rápido a configuración del tenant
- Ver historial de tickets del tenant
- Ver métricas del tenant (facturación, uso, etc.)
- Impersonar tenant para debugging

#### RF-13.4: Automatización de Tickets

**Reglas Automáticas:**
- Crear ticket automáticamente cuando:
  - Pago fallido
  - Tenant suspendido
  - Error crítico en sistema
  - Límites excedidos
- Asignar tickets según categoría
- Escalar tickets no resueltos en X tiempo
- Cerrar tickets automáticamente si cliente no responde

#### RF-13.5: Métricas de Soporte

**Métricas:**
- Tickets abiertos vs cerrados
- Tiempo promedio de respuesta
- Tiempo promedio de resolución
- Satisfacción del cliente (si se implementa)
- Tickets por categoría
- Tickets por tenant

---

### RF-14: Chat en Vivo con Clientes

**Descripción:** Sistema de chat en tiempo real para comunicarse directamente con los clientes desde el panel de plataforma.

#### RF-14.1: Iniciar Conversación

**Funcionalidades:**
- PLATFORM_OWNER/ADMIN/SUPPORT puede iniciar chat con cualquier tenant
- Ver lista de conversaciones activas
- Ver historial de conversaciones
- Notificaciones en tiempo real de nuevos mensajes
- Indicadores de estado (en línea, ausente, escribiendo)

#### RF-14.2: Funcionalidades del Chat

**Características:**
- Mensajes en tiempo real (WebSocket)
- Envío de archivos e imágenes
- Emojis y reacciones
- Mensajes leídos/no leídos
- Búsqueda en historial
- Etiquetas y categorías
- Notas internas (solo visibles para soporte)

#### RF-14.3: Integración con Tickets

**Funcionalidades:**
- Convertir conversación en ticket
- Vincular conversación a ticket existente
- Ver tickets relacionados desde el chat
- Crear ticket desde el chat

#### RF-14.4: Chat Automatizado

**Funcionalidades:**
- Bot de soporte automático para preguntas frecuentes
- Respuestas automáticas según categoría
- Escalamiento automático a humano si es necesario
- Horarios de disponibilidad de chat

---

### RF-15: Automatización de Onboarding de Clientes

**Descripción:** Flujos automatizados para el onboarding de nuevos clientes (tenants).

#### RF-15.1: Flujo de Onboarding Configurable

**Etapas del Onboarding:**
1. **Registro/Verificación**
   - Email de bienvenida automático
   - Verificación de email
   - Creación de cuenta

2. **Configuración Inicial**
   - Wizard guiado paso a paso
   - Configuración de logo y colores
   - Selección de plan
   - Configuración de pago

3. **Primera Configuración**
   - Conectar WhatsApp
   - Crear primer agente
   - Importar conocimiento inicial
   - Configurar canales

4. **Activación**
   - Prueba del sistema
   - Activación completa
   - Email de confirmación

#### RF-15.2: Personalización de Flujos

**Funcionalidades:**
- Crear múltiples flujos de onboarding
- Asignar flujo según:
  - Plan seleccionado
  - País
  - Tipo de negocio
  - Fuente de registro
- Personalizar emails y mensajes
- Agregar/quitar pasos según necesidad

#### RF-15.3: Seguimiento de Onboarding

**Métricas:**
- Tasa de completación de onboarding
- Tiempo promedio de onboarding
- Abandono por etapa
- Conversión de trial a pago
- Activación de primera conversación

#### RF-15.4: Automatización con N8N

**Integración:**
- Flujos de onboarding ejecutados en N8N
- Webhooks para cada etapa
- Integración con CRM externo
- Notificaciones automáticas
- Tareas automáticas (crear recursos, enviar emails, etc.)

---

### RF-16: Uso Propio de Funcionalidades del SaaS

**Descripción:** El PLATFORM_OWNER y su equipo pueden usar todas las funcionalidades del SaaS para sus propias operaciones (captación de leads, ventas, soporte, etc.).

#### RF-16.1: Tenant Propio del SaaS

**Funcionalidades:**
- Crear un tenant especial "SaaS Owner" o similar
- Este tenant tiene acceso ilimitado a todas las funcionalidades
- No tiene restricciones de plan
- Puede crear agentes, canales, conversaciones ilimitadas

#### RF-16.2: Agentes para Captación de Leads

**Casos de Uso:**
- Agente de ventas para captar leads del SaaS
- Agente de soporte para atención inicial
- Agente de onboarding para nuevos clientes
- Agente de información sobre planes y precios

**Configuración:**
- Crear agentes desde el panel de plataforma
- Configurar personalidad y conocimiento
- Conectar a canales (WhatsApp, Webchat en landing page)
- Gestionar conversaciones y leads generados

#### RF-16.3: Canales para Operaciones Propias

**Canales Disponibles:**
- WhatsApp Business para ventas
- Webchat en landing page del SaaS
- Webchat en página de soporte
- Email (futuro)
- Otros canales según necesidad

**Configuración:**
- Configurar canales desde panel de plataforma
- Conectar WhatsApp Business propio
- Integrar webchat en sitios web propios
- Gestionar múltiples números/canales

#### RF-16.4: Base de Conocimiento Propia

**Contenido:**
- FAQs sobre el SaaS
- Documentación de productos
- Información de planes y precios
- Guías de uso
- Políticas y términos

**Gestión:**
- Gestionar conocimiento desde panel de plataforma
- Importar documentos
- Actualizar información
- Organizar por categorías

#### RF-16.5: Conversaciones y Leads Propios

**Funcionalidades:**
- Ver todas las conversaciones del tenant propio
- Gestionar leads generados
- Responder manualmente cuando sea necesario
- Exportar leads a CRM externo
- Analizar conversiones

---

### RF-17: Gestión de Leads Propios (CRM Integrado)

**Descripción:** Sistema CRM integrado para gestionar leads generados por los agentes propios del SaaS.

#### RF-17.1: Captura de Leads

**Fuentes de Leads:**
- Conversaciones de WhatsApp
- Formularios de webchat
- Landing pages
- Integraciones externas
- Importación manual

**Información Capturada:**
- Nombre y contacto
- Interés expresado
- Plan de interés
- Fuente del lead
- Historial de conversación
- Notas y etiquetas

#### RF-17.2: Gestión de Leads

**Funcionalidades:**
- Lista de leads con filtros y búsqueda
- Estados: Nuevo, Contactado, Calificado, Oportunidad, Cliente, Perdido
- Asignar leads a miembros del equipo
- Agregar notas y seguimientos
- Programar recordatorios
- Historial completo de interacciones

#### RF-17.3: Pipeline de Ventas

**Etapas:**
1. Lead capturado
2. Contacto inicial
3. Calificación
4. Demostración/Prueba
5. Propuesta
6. Negociación
7. Cierre (éxito o pérdida)

**Funcionalidades:**
- Visualización tipo Kanban
- Arrastrar leads entre etapas
- Métricas por etapa
- Tiempo en cada etapa
- Tasa de conversión

#### RF-17.4: Integración con Conversaciones

**Funcionalidades:**
- Ver conversación completa desde el lead
- Responder desde el CRM
- Crear lead desde conversación
- Sincronización bidireccional

#### RF-17.5: Reportes de Ventas

**Métricas:**
- Leads capturados por período
- Conversión por etapa
- Tasa de cierre
- Valor promedio de cliente
- Tiempo promedio de ciclo de ventas
- Leads por fuente
- Performance del equipo

---

### RF-18: Flujos N8N para Operaciones Internas

**Descripción:** Usar N8N para automatizar procesos internos del SaaS (onboarding, notificaciones, reportes, etc.).

#### RF-18.1: Flujos Disponibles

**Categorías de Flujos:**
1. **Onboarding Automático**
   - Crear recursos iniciales
   - Enviar emails de bienvenida
   - Configurar integraciones
   - Programar tareas de seguimiento

2. **Notificaciones**
   - Alertas de pagos fallidos
   - Notificaciones de nuevos tenants
   - Reportes automáticos
   - Recordatorios de tareas

3. **Gestión de Leads**
   - Sincronizar con CRM externo
   - Enviar leads a equipo de ventas
   - Notificaciones de nuevos leads
   - Seguimiento automático

4. **Reportes y Analytics**
   - Generar reportes diarios/semanales
   - Enviar métricas a stakeholders
   - Alertas de métricas anómalas
   - Exportación automática

5. **Operaciones**
   - Backup automático
   - Limpieza de datos antiguos
   - Actualización de precios
   - Sincronización con sistemas externos

#### RF-18.2: Gestión de Flujos

**Funcionalidades:**
- Crear/editar/eliminar flujos desde panel de plataforma
- Activar/desactivar flujos
- Ver logs de ejecución
- Monitorear performance
- Gestionar errores y reintentos

#### RF-18.3: Integración con N8N

**Configuración:**
- Conectar instancia de N8N desde panel
- Autenticación y permisos
- Sincronización de webhooks
- Gestión de credenciales

#### RF-18.4: Templates de Flujos

**Funcionalidades:**
- Biblioteca de templates predefinidos
- Compartir flujos entre instancias
- Importar/exportar flujos
- Versionado de flujos

---

## Requisitos No Funcionales

### RNF-01: Seguridad

- ✅ Autenticación obligatoria para acceder a `/platform`
- ✅ Verificación de rol PLATFORM_OWNER en cada request
- ✅ Logs de todas las acciones administrativas
- ✅ Rate limiting en endpoints administrativos
- ✅ Validación de permisos en backend (nunca solo en frontend)
- ✅ Encriptación de datos sensibles en logs

### RNF-02: Performance

- ✅ Carga inicial del dashboard < 2 segundos
- ✅ Paginación en listas grandes (50 items por página)
- ✅ Caché de métricas agregadas (refresh cada 5 minutos)
- ✅ Lazy loading de gráficos y datos pesados

### RNF-03: Escalabilidad

- ✅ Sistema debe soportar 1000+ tenants sin degradación
- ✅ Queries optimizadas con índices apropiados
- ✅ Agregación de métricas en background jobs (futuro)

### RNF-04: Usabilidad

- ✅ Navegación intuitiva
- ✅ Búsqueda y filtros potentes
- ✅ Acciones rápidas accesibles
- ✅ Mensajes de error claros y accionables
- ✅ Documentación inline (tooltips, help text)

### RNF-05: Mantenibilidad

- ✅ Código bien documentado
- ✅ Separación clara de responsabilidades
- ✅ Tests unitarios y de integración
- ✅ Logs estructurados para debugging

---

## Dependencias Técnicas

### Backend
- NestJS (ya implementado)
- Prisma (ya implementado)
- Sistema de autenticación JWT (ya implementado)
- Guards y decorators (ya implementado)

### Frontend
- Next.js (ya implementado)
- React (ya implementado)
- Componentes UI (ya implementados)
- Sistema de routing (ya implementado)

### Base de Datos
- MySQL (ya implementado)
- Migraciones Prisma (ya implementado)

---

## Criterios de Aceptación

### CA-01: Autenticación y Autorización
- ✅ Solo usuarios con `platformRole = PLATFORM_OWNER` pueden acceder a `/platform`
- ✅ Todos los endpoints de plataforma verifican el rol en backend
- ✅ Intentos de acceso no autorizados son registrados y bloqueados

### CA-02: Gestión de Tenants
- ✅ PLATFORM_OWNER puede listar todos los tenants con filtros
- ✅ PLATFORM_OWNER puede crear, editar, suspender y eliminar tenants
- ✅ Cambios en tenants se reflejan inmediatamente
- ✅ Acciones destructivas requieren confirmación

### CA-03: Gestión de Facturación
- ✅ PLATFORM_OWNER puede ver suscripciones de todos los tenants
- ✅ PLATFORM_OWNER puede cambiar planes sin pasar por Stripe
- ✅ Cambios en facturación se sincronizan con Stripe (si aplica)
- ✅ Historial de cambios se mantiene

### CA-04: Métricas y Reportes
- ✅ Dashboard muestra métricas globales correctas
- ✅ Métricas se actualizan en tiempo real (o con refresh)
- ✅ Reportes se pueden exportar en múltiples formatos
- ✅ Filtros funcionan correctamente

### CA-05: Auditoría
- ✅ Todas las acciones se registran en logs
- ✅ Logs son consultables y filtrables
- ✅ Logs incluyen información suficiente para auditoría

### CA-06: UI/UX
- ✅ Interfaz es intuitiva y profesional
- ✅ Todas las funcionalidades son accesibles
- ✅ Feedback claro para todas las acciones
- ✅ Responsive en dispositivos móviles

### CA-07: Multi-Instancia
- ✅ PLATFORM_OWNER puede crear y gestionar múltiples instancias
- ✅ Cambio entre instancias funciona correctamente
- ✅ Datos están aislados por instancia
- ✅ Migración de tenants entre instancias funciona

### CA-08: Regiones de Datos
- ✅ Asignación de región de datos funciona
- ✅ Migración entre regiones se ejecuta correctamente
- ✅ Cumplimiento legal se valida por región
- ✅ Distribución de datos es correcta

### CA-09: Tickets de Soporte
- ✅ Clientes pueden crear tickets
- ✅ Soporte puede gestionar tickets
- ✅ Flujo completo de tickets funciona
- ✅ Integración con tenants funciona
- ✅ Automatización de tickets funciona

### CA-10: Chat en Vivo
- ✅ Chat en tiempo real funciona
- ✅ Notificaciones en tiempo real
- ✅ Integración con tickets funciona
- ✅ Historial de conversaciones se mantiene

### CA-11: Onboarding Automatizado
- ✅ Flujos de onboarding funcionan
- ✅ Personalización de flujos funciona
- ✅ Seguimiento de onboarding funciona
- ✅ Integración con N8N funciona

### CA-12: Uso Propio de Funcionalidades
- ✅ Tenant propio funciona sin restricciones
- ✅ Agentes propios funcionan correctamente
- ✅ Canales propios funcionan correctamente
- ✅ Conversaciones y leads se gestionan correctamente

### CA-13: CRM de Leads
- ✅ Captura de leads funciona
- ✅ Gestión de leads funciona
- ✅ Pipeline de ventas funciona
- ✅ Integración con conversaciones funciona
- ✅ Reportes de ventas son correctos

### CA-14: Flujos N8N
- ✅ Flujos se pueden crear y gestionar
- ✅ Integración con N8N funciona
- ✅ Templates de flujos funcionan
- ✅ Logs de ejecución se mantienen

---

## Notas de Implementación

### Fase 1: Fundamentos (MVP)
1. Sistema de roles de plataforma (PLATFORM_OWNER, PLATFORM_ADMIN, PLATFORM_SUPPORT)
2. Autenticación y autorización
3. Panel básico con lista de tenants
4. Ver detalles de tenant
5. Métricas básicas
6. Gestión básica de facturación

### Fase 2: Gestión Completa
1. CRUD completo de tenants
2. Gestión avanzada de facturación
3. Configuración de tenants
4. Sistema de auditoría
5. Gestión de planes

### Fase 3: Multi-Instancia y Regiones
1. Sistema de multi-instancia
2. Gestión de regiones de datos
3. Migración de datos entre regiones
4. Validación de cumplimiento legal

### Fase 4: Soporte y Comunicación
1. Sistema de tickets de soporte
2. Chat en vivo con clientes
3. Integración tickets-chat
4. Automatización de tickets

### Fase 5: Onboarding y Automatización
1. Flujos de onboarding automatizados
2. Personalización de flujos
3. Integración con N8N
4. Seguimiento de onboarding

### Fase 6: Operaciones Propias
1. Tenant propio del SaaS
2. Agentes y canales propios
3. CRM de leads integrado
4. Pipeline de ventas
5. Flujos N8N para operaciones

### Fase 7: Optimización y Mejoras
1. Reportes avanzados
2. Exportación de datos
3. Optimización de performance
4. Mejoras de UI/UX
5. Analytics avanzados

---

## Referencias

- PRD-07: Autenticación Avanzada y SSO
- PRD-08: Billing Stripe Completo
- PRD-09: Gestión de Equipo Completa
- AI-SPEC-03: Multitenancy, RBAC y Privacidad
- AI-SPEC-08: Integración Stripe Completa

---

**Documento creado:** 2025-01-XX  
**Última actualización:** 2025-01-XX  
**Autor:** Sistema de Documentación

# Guía de Inicio Rápido - Panel de Plataforma

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Configuración Inicial](#configuración-inicial)
3. [Crear tu Primer Tenant](#crear-tu-primer-tenant)
4. [Configurar Operaciones Propias](#configurar-operaciones-propias)
5. [Configurar Planes de Suscripción](#configurar-planes-de-suscripción)
6. [Siguientes Pasos](#siguientes-pasos)

---

## Primeros Pasos

### 1. Acceder al Panel

1. Inicia sesión en el sistema con tu cuenta de PLATFORM_OWNER
2. Serás redirigido automáticamente a `/platform`
3. Verás el Dashboard principal con métricas generales

![Dashboard Principal](./screenshots/dashboard-main.png)
*Captura: Vista del Dashboard principal del Panel de Plataforma*

### 2. Explorar el Menú Lateral

El menú lateral contiene todas las secciones disponibles:

- **Dashboard**: Vista general con métricas
- **Tenants**: Gestión de clientes
- **Tickets**: Sistema de soporte
- **Chat**: Comunicación en vivo
- **Leads**: CRM de leads
- **Instances**: Gestión multi-instancia
- **N8N Flows**: Automatizaciones
- **Plans**: Planes de suscripción
- **Operaciones Propias**: Tus propias operaciones

---

## Configuración Inicial

### 1. Revisar Configuración General

1. Ve a **Operaciones Propias** → **Configuración**
2. Completa la información básica:
   - Nombre de la empresa
   - Email de contacto
   - Teléfono
   - Dirección
   - Zona horaria
   - Idioma preferido
   - Moneda

![Configuración](./screenshots/settings.png)
*Captura: Página de configuración de operaciones propias*

### 2. Verificar Instancias

1. Ve a **Instances**
2. Verifica que tengas al menos una instancia configurada
3. Si no hay ninguna, crea una nueva:
   - Nombre de la instancia
   - Dominio
   - Región de datos
   - País

---

## Crear tu Primer Tenant

### Paso 1: Acceder a la Creación

1. Ve a **Tenants** → **Crear Tenant**
2. O haz clic en el botón **"Crear Tenant"** desde la lista

### Paso 2: Completar Información Básica

Completa el formulario con:

- **Nombre del Tenant**: Nombre de la empresa cliente
- **Slug**: Identificador único (se genera automáticamente)
- **País**: País del tenant
- **Región de Datos**: Dónde se almacenarán los datos (EU, US, etc.)
- **Plan**: Selecciona un plan de suscripción
- **Email del Owner**: Email del usuario que será OWNER del tenant

![Crear Tenant](./screenshots/create-tenant.png)
*Captura: Formulario de creación de tenant*

### Paso 3: Configurar Usuario Owner

- El sistema creará automáticamente un usuario con el email proporcionado
- Este usuario recibirá un email de bienvenida con instrucciones
- El usuario tendrá rol OWNER en el tenant creado

### Paso 4: Verificar Creación

1. Ve a la lista de tenants
2. Busca el tenant recién creado
3. Haz clic para ver sus detalles
4. Verifica que el estado sea "ACTIVE"

---

## Configurar Operaciones Propias

El sistema crea automáticamente un tenant especial para tus operaciones. Puedes usar todas las funcionalidades del SaaS para tus propias necesidades.

### 1. Configurar Agentes Propios

1. Ve a **Operaciones Propias** → **Mis Agentes**
2. Haz clic en **"Crear"**
3. Configura tu agente:
   - Nombre del agente
   - Cuenta de WhatsApp asociada
   - Estrategia de idioma
   - Configuración de personalidad
   - Colecciones de conocimiento

![Mis Agentes](./screenshots/operations-agents.png)
*Captura: Lista de agentes propios*

### 2. Configurar Canales Propios

1. Ve a **Operaciones Propias** → **Mis Canales**
2. Haz clic en **"Crear"**
3. Selecciona el tipo de canal:
   - WhatsApp
   - Webchat
   - Telegram
   - Voz

4. Configura los parámetros específicos del canal

![Mis Canales](./screenshots/operations-channels.png)
*Captura: Lista de canales propios*

### 3. Ver Conversaciones Propias

1. Ve a **Operaciones Propias** → **Mis Conversaciones**
2. Verás todas las conversaciones de tus agentes
3. Puedes filtrar por:
   - Estado (Activa, Cerrada, Archivada)
   - Agente
   - Fecha

![Mis Conversaciones](./screenshots/operations-conversations.png)
*Captura: Lista de conversaciones propias*

### 4. Gestionar Leads Propios

1. Ve a **Operaciones Propias** → **Mis Leads**
2. Puedes ver:
   - **Lista**: Vista de tabla con todos los leads
   - **Pipeline**: Vista Kanban por etapa de venta
3. Crea nuevos leads manualmente o déjalos que se generen automáticamente desde tus agentes

![Mis Leads](./screenshots/operations-leads.png)
*Captura: Vista de pipeline de leads propios*

### 5. Configurar Flujos N8N Propios

1. Ve a **Operaciones Propias** → **Mis Flujos N8N**
2. Crea flujos para automatizar:
   - Procesos de onboarding
   - Notificaciones internas
   - Generación de reportes
   - Procesamiento de leads

![Mis Flujos N8N](./screenshots/operations-n8n.png)
*Captura: Lista de flujos N8N propios*

---

## Configurar Planes de Suscripción

### 1. Crear un Plan

1. Ve a **Plans** → **Crear Plan**
2. Completa la información:
   - **Nombre**: Nombre del plan (ej: Starter, Pro, Enterprise)
   - **Slug**: Identificador único
   - **Descripción**: Descripción del plan
   - **Precio Mensual**: Precio en la moneda base
   - **Precio Anual**: Precio con descuento anual (opcional)
   - **Límites**:
     - Número de agentes
     - Número de canales
     - Número de usuarios
     - Almacenamiento
     - Mensajes por mes

![Crear Plan](./screenshots/create-plan.png)
*Captura: Formulario de creación de plan*

### 2. Configurar Límites

Define los límites del plan:

- **Agentes**: Máximo de agentes de IA
- **Canales**: Máximo de canales de comunicación
- **Usuarios**: Máximo de usuarios del equipo
- **Almacenamiento**: GB de almacenamiento
- **Mensajes**: Mensajes por mes incluidos

### 3. Activar el Plan

Una vez creado, el plan estará disponible para asignar a nuevos tenants o cambiar planes existentes.

---

## Siguientes Pasos

Ahora que tienes la configuración básica, puedes:

1. **Gestionar Tenants**: Crear más clientes y gestionar sus cuentas
2. **Configurar Soporte**: Usar el sistema de tickets para atender clientes
3. **Usar Chat en Vivo**: Comunicarte directamente con tenants
4. **Automatizar Procesos**: Crear flujos N8N para automatizar tareas
5. **Monitorear Métricas**: Revisar el dashboard regularmente para ver el estado de la plataforma

### Documentación Adicional

- [Módulos del Panel](./02-Modules.md) - Descripción detallada de cada módulo
- [Flujos de Trabajo](./03-Workflows.md) - Guías paso a paso para tareas comunes
- [Integraciones](./04-Integrations.md) - Cómo integrar con servicios externos
- [Solución de Problemas](./05-Troubleshooting.md) - Resolver errores comunes

---

## Consejos Pro

💡 **Tenant Automático**: El sistema crea automáticamente un tenant `platform-owner` para tus operaciones. No necesitas crearlo manualmente.

🔒 **Seguridad**: Todos los cambios importantes se registran en logs de auditoría. Revisa estos logs regularmente.

📊 **Métricas**: Usa el dashboard para identificar tendencias y tomar decisiones informadas sobre tu plataforma.

⚡ **Automatización**: Aprovecha los flujos N8N para automatizar tareas repetitivas y mejorar la eficiencia.

---

**Última actualización:** 2025-01-27

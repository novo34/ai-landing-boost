# Overview - AutomAI SaaS

> **Versión:** 1.0  
> **Audiencia:** Product Owner, Usuarios del Sistema  
> **Última actualización:** 2025-01-27

---

## 🎯 ¿Qué es AutomAI?

AutomAI es una plataforma que permite a tu empresa automatizar la atención al cliente mediante **agentes de inteligencia artificial**. Los agentes pueden conversar con tus clientes por WhatsApp, responder preguntas automáticamente, agendar citas y gestionar conversaciones 24/7.

### ¿Qué puedes hacer con AutomAI?

- **Atención Automática 24/7**: Tus clientes reciben respuestas inmediatas, incluso fuera del horario laboral
- **Agendar Citas Automáticamente**: Los clientes pueden agendar citas directamente por WhatsApp, sin intervención humana
- **Base de Conocimiento Inteligente**: Los agentes aprenden de tus documentos, FAQs y páginas web para responder preguntas
- **Múltiples Canales**: WhatsApp, Webchat en tu sitio web, y más
- **Gestión de Equipo**: Invita a miembros de tu equipo con diferentes roles y permisos
- **Facturación Automática**: Planes de suscripción gestionados automáticamente

---

## 🚀 Flujo Básico de Uso

### 1. Registro y Configuración Inicial

1. **Registrarse**: Crea tu cuenta con email y contraseña (o usa Google/Microsoft)
2. **Verificar Email**: Revisa tu correo y haz clic en el enlace de verificación
3. **Configurar tu Empresa**: Sube tu logo, elige colores, configura zona horaria
4. **Conectar WhatsApp**: Conecta tu número de WhatsApp para recibir mensajes
5. **Crear Agente de IA**: Configura tu primer agente con personalidad y conocimiento
6. **Importar Información**: Sube documentos, FAQs o URLs para que el agente aprenda

### 2. Operación Diaria

- **Ver Conversaciones**: Revisa todas las conversaciones en tiempo real
- **Responder Manualmente**: Si es necesario, puedes responder manualmente
- **Gestionar Citas**: Ve y gestiona las citas agendadas automáticamente
- **Monitorear Métricas**: Revisa KPIs y estadísticas en el dashboard
- **Actualizar Conocimiento**: Agrega nueva información a la base de conocimiento

### 3. Gestión y Administración

- **Invitar Miembros**: Agrega miembros a tu equipo con diferentes roles
- **Gestionar Suscripción**: Cambia de plan, cancela o reactiva tu suscripción
- **Configurar Integraciones**: Conecta calendarios, n8n, y otros servicios
- **Ajustar Configuraciones**: Personaliza colores, logo, y preferencias

---

## 👥 Roles y Permisos

### OWNER (Propietario)
- Control total del sistema
- Gestión de facturación y suscripción
- Configuración de la empresa
- Invitar y gestionar miembros del equipo
- Acceso a todas las funcionalidades

### ADMIN (Administrador)
- Gestión operativa del día a día
- Crear y configurar agentes
- Gestionar base de conocimiento
- Ver y responder conversaciones
- Configurar canales e integraciones
- **No puede**: Gestionar facturación ni transferir ownership

### AGENT (Agente)
- Ver conversaciones
- Responder mensajes manualmente
- Gestionar citas
- Ver reportes y métricas
- **No puede**: Crear agentes ni modificar configuraciones importantes

### VIEWER (Solo Lectura)
- Ver conversaciones y métricas
- Ver reportes y analytics
- **No puede**: Modificar nada ni enviar mensajes

---

## 📦 Módulos Principales

### 1. Dashboard
**¿Qué hace?** Muestra un resumen de todo tu negocio: leads, conversaciones activas, agentes, métricas clave.

**Cuándo usarlo:**
- Al iniciar sesión para ver el estado general
- Para revisar KPIs y métricas
- Para ver el estado de tu suscripción

### 2. Agentes de IA
**¿Qué hace?** Crea y configura agentes de inteligencia artificial que conversan con tus clientes.

**Cuándo usarlo:**
- Cuando quieras crear un nuevo agente para un propósito específico
- Para modificar la personalidad o comportamiento de un agente
- Para asignar conocimiento específico a un agente

### 3. Base de Conocimiento
**¿Qué hace?** Almacena toda la información que tus agentes usan para responder preguntas.

**Cuándo usarlo:**
- Cuando quieras agregar nuevas FAQs
- Para importar documentos (PDF, Word) con información de tu empresa
- Para agregar URLs de tu sitio web para que el agente las lea
- Para organizar información en colecciones

### 4. Conversaciones
**¿Qué hace?** Muestra todas las conversaciones con tus clientes, permite responder manualmente y ver historial.

**Cuándo usarlo:**
- Para revisar conversaciones en tiempo real
- Para responder manualmente cuando el agente no puede
- Para archivar o bloquear conversaciones
- Para ver el historial completo de una conversación

### 5. Citas (Appointments)
**¿Qué hace?** Gestiona todas las citas agendadas por tus clientes a través del agente.

**Cuándo usarlo:**
- Para ver las próximas citas
- Para reprogramar o cancelar citas
- Para enviar recordatorios
- Para ver el calendario completo

### 6. Canales
**¿Qué hace?** Gestiona los diferentes canales de comunicación (WhatsApp, Webchat, etc.).

**Cuándo usarlo:**
- Para agregar nuevos canales de comunicación
- Para asignar agentes a canales específicos
- Para activar/desactivar canales

### 7. Configuración
**¿Qué hace?** Permite personalizar tu cuenta, equipo, integraciones y seguridad.

**Subsecciones:**
- **General**: Información básica de la empresa
- **Equipo**: Invitar y gestionar miembros
- **Branding**: Logo y colores
- **Seguridad**: Métodos de autenticación
- **WhatsApp**: Configurar cuentas de WhatsApp
- **Calendario**: Conectar Google Calendar o Cal.com
- **n8n**: Integrar workflows automatizados
- **GDPR**: Configurar privacidad y retención de datos

### 8. Facturación
**¿Qué hace?** Gestiona tu suscripción, planes y pagos.

**Cuándo usarlo:**
- Para ver tu plan actual
- Para cambiar de plan
- Para gestionar método de pago
- Para cancelar o reactivar suscripción

### 9. Analytics
**¿Qué hace?** Muestra métricas y reportes de tu negocio.

**Cuándo usarlo:**
- Para ver estadísticas de conversaciones
- Para analizar tiempos de respuesta
- Para ver conversiones y leads
- Para exportar reportes en PDF

---

## 🔄 Flujos Clave del Negocio

### Flujo 1: Cliente Contacta → Agente Responde → Cita Agendada

1. Cliente envía mensaje por WhatsApp
2. Sistema identifica o crea la conversación
3. Agente de IA analiza el mensaje
4. Agente busca información relevante en la base de conocimiento
5. Agente genera respuesta automática
6. Si el cliente quiere agendar cita:
   - Agente consulta disponibilidad del calendario
   - Muestra opciones de horarios
   - Cliente selecciona horario
   - Se crea la cita automáticamente
   - Se envía confirmación

### Flujo 2: Nuevo Usuario → Configuración → Primer Agente

1. Usuario se registra
2. Verifica su email
3. Configura logo y colores de la empresa
4. Conecta WhatsApp (escanea QR o configura Cloud API)
5. Crea su primer agente:
   - Asigna nombre y personalidad
   - Selecciona cuenta de WhatsApp
   - Asigna colecciones de conocimiento
6. Importa información inicial (FAQs, documentos)
7. Prueba el agente enviando un mensaje de prueba
8. ¡Listo para recibir clientes!

### Flujo 3: Invitar Miembro al Equipo

1. OWNER/ADMIN va a Configuración → Equipo
2. Hace clic en "Invitar Miembro"
3. Ingresa email y selecciona rol (ADMIN, AGENT, VIEWER)
4. Sistema envía email de invitación
5. Usuario hace clic en el enlace del email
6. Si no tiene cuenta, se crea automáticamente
7. Usuario acepta la invitación
8. Ya puede acceder al sistema con su rol asignado

---

## 💡 Conceptos Importantes

### Agente de IA
Un agente es como un asistente virtual que conversa con tus clientes. Puedes crear múltiples agentes para diferentes propósitos (ventas, soporte, citas, etc.). Cada agente tiene:
- **Personalidad**: Tono y estilo de comunicación
- **Conocimiento**: Información que puede usar para responder
- **Canal**: Dónde puede conversar (WhatsApp, Webchat, etc.)
- **Calendario**: Para agendar citas (opcional)

### Base de Conocimiento
Es la "memoria" de tus agentes. Contiene:
- **FAQs**: Preguntas frecuentes y sus respuestas
- **Documentos**: PDFs, Word, con información de tu empresa
- **URLs**: Páginas web que el agente puede leer
- **Entradas Manuales**: Texto que escribes directamente

### Colecciones
Organizan el conocimiento en grupos. Por ejemplo:
- "Información de Productos"
- "Políticas de Devolución"
- "Horarios y Ubicaciones"

Un agente puede usar múltiples colecciones.

### Conversación
Cada interacción con un cliente es una conversación. Incluye:
- Todos los mensajes enviados y recibidos
- Información del cliente (nombre, teléfono)
- Agente asignado
- Estado (activa, archivada, bloqueada)

### Cita (Appointment)
Cuando un cliente agenda una cita a través del agente:
- Se crea automáticamente en tu calendario
- Se envía confirmación al cliente
- Puedes enviar recordatorios
- Se puede reprogramar o cancelar

---

## 🎯 Casos de Uso Comunes

### Caso 1: Clínica Médica
- **Agente**: Responde preguntas sobre servicios, horarios, precios
- **Conocimiento**: Información de tratamientos, doctores, ubicación
- **Citas**: Los pacientes agendan citas directamente por WhatsApp
- **Resultado**: Reducción de llamadas telefónicas, citas agendadas 24/7

### Caso 2: E-commerce
- **Agente**: Soporte al cliente, consultas de productos, seguimiento de pedidos
- **Conocimiento**: Catálogo de productos, políticas de envío, devoluciones
- **Citas**: No aplica (o para consultas personalizadas)
- **Resultado**: Respuestas instantáneas, menos tickets de soporte

### Caso 3: Agencia de Servicios
- **Agente**: Captación de leads, información de servicios, agendamiento
- **Conocimiento**: Servicios ofrecidos, precios, casos de éxito
- **Citas**: Consultas iniciales agendadas automáticamente
- **Resultado**: Más leads calificados, mejor conversión

---

## 📚 Próximos Pasos

1. **Para empezar a usar el sistema**: Ver [Getting Started](/app/docs/getting-started)
2. **Para entender cada módulo**: Ver [Módulos del Sistema](/app/docs/modules)
3. **Para ver flujos paso a paso**: Ver [Flujos de Trabajo](/app/docs/workflows)
4. **Para configurar integraciones**: Ver [Integraciones](/app/docs/integrations)
5. **Para resolver problemas**: Ver [Troubleshooting](/app/docs/troubleshooting)

---

**Última actualización:** 2025-01-27

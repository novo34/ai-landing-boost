# Módulos del Sistema - Guía de Uso

> **Versión:** 1.0  
> **Audiencia:** Usuarios del Sistema  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Dashboard](#1-dashboard)
2. [Agentes de IA](#2-agentes-de-ia)
3. [Base de Conocimiento](#3-base-de-conocimiento)
4. [Conversaciones](#4-conversaciones)
5. [Citas](#5-citas)
6. [Canales](#6-canales)
7. [Configuración](#7-configuración)
8. [Facturación](#8-facturación)
9. [Analytics](#9-analytics)

---

## 1. Dashboard

### ¿Qué es?

El dashboard es la pantalla principal donde ves un resumen de todo tu negocio: métricas clave, estado de suscripción, y acceso rápido a las funciones principales.

### ¿Qué información muestra?

- **Leads**: Total de leads captados y del mes actual
- **Agentes**: Cuántos agentes tienes activos y totales
- **Canales**: Canales de comunicación activos
- **Conversaciones**: Conversaciones activas y totales
- **Mensajes**: Total de mensajes enviados y recibidos
- **Tiempo de Respuesta**: Promedio de tiempo que tarda el agente en responder
- **Estado de Suscripción**: Plan actual, días de trial restantes, estado de pago

### ¿Cuándo usarlo?

- **Al iniciar sesión**: Para ver el estado general de tu negocio
- **Para monitorear**: Revisar métricas y KPIs regularmente
- **Para tomar decisiones**: Ver qué áreas necesitan atención

### ¿Qué puedes hacer?

- Ver todas las métricas en un vistazo
- Acceder rápidamente a otras secciones desde el menú lateral
- Ver notificaciones importantes (trial expirando, pago fallido, etc.)

---

## 2. Agentes de IA

### ¿Qué es?

Los agentes de IA son asistentes virtuales que conversan con tus clientes automáticamente. Puedes crear múltiples agentes para diferentes propósitos.

### ¿Cómo crear un agente?

1. Ve a **Agentes** → **Crear Agente**
2. Completa:
   - **Nombre**: Ej. "Agente de Ventas", "Soporte Técnico"
   - **Cuenta WhatsApp**: Selecciona la cuenta donde recibirá mensajes
   - **Estrategia de Idioma**: Cómo maneja los idiomas
   - **Personalidad**: Tono y estilo de comunicación
   - **Colecciones de Conocimiento**: Qué información puede usar
   - **Calendario** (opcional): Para agendar citas
3. Haz clic en "Crear"

### ¿Cómo configurar la personalidad?

**Tono:**
- **Profesional**: Para empresas formales, servicios profesionales
- **Amigable**: Para atención al cliente, e-commerce
- **Casual**: Para startups, servicios creativos

**Estilo:**
- **Conciso**: Respuestas cortas y directas
- **Detallado**: Respuestas completas con mucha información
- **Conversacional**: Respuestas naturales como una conversación

### ¿Cómo asignar conocimiento?

1. Ve a tu agente → **Editar**
2. En "Colecciones de Conocimiento"
3. Selecciona las colecciones que quieres que use
4. Haz clic en "Guardar"

**💡 Tip**: Puedes asignar diferentes colecciones a diferentes agentes. Por ejemplo, un agente de ventas puede usar "Información de Productos" y otro de soporte puede usar "Preguntas Frecuentes".

### ¿Cómo activar/desactivar un agente?

- **Activar**: El agente está funcionando y responde mensajes
- **Pausar**: El agente deja de responder temporalmente
- **Desactivar**: El agente se desactiva permanentemente

Para cambiar el estado, ve a tu agente → **Editar** → Cambia el estado.

### ¿Cuántos agentes puedo tener?

Depende de tu plan:
- **Plan Básico**: Hasta 3 agentes
- **Plan Pro**: Hasta 10 agentes
- **Plan Enterprise**: Agentes ilimitados

---

## 3. Base de Conocimiento

### ¿Qué es?

La base de conocimiento es donde almacenas toda la información que tus agentes usan para responder preguntas. Puede incluir FAQs, documentos, URLs y texto manual.

### ¿Cómo crear una colección?

1. Ve a **Base de Conocimiento** → **Nueva Colección**
2. Completa:
   - **Nombre**: Ej. "Información de Productos"
   - **Descripción**: Breve descripción
   - **Idioma**: Español, Inglés, etc.
3. Haz clic en "Crear"

### ¿Cómo agregar FAQs?

1. Dentro de una colección → **Agregar Fuente** → **FAQ**
2. Completa:
   - **Título**: La pregunta
   - **Contenido**: La respuesta completa
   - **Idioma**: Selecciona el idioma
3. Haz clic en "Crear"

**Ejemplo:**
- **Título**: "¿Cuáles son sus horarios?"
- **Contenido**: "Nuestro horario es de lunes a viernes de 9:00 a 18:00 horas."

### ¿Cómo importar documentos?

1. Dentro de una colección → **Importar Documento**
2. Selecciona un archivo:
   - **Formatos**: PDF, Word (.docx), Texto (.txt)
   - **Tamaño máximo**: 10MB
3. Haz clic en "Importar"
4. Espera a que se procese (puede tardar unos minutos)

**💡 Tip**: Los documentos grandes se dividen automáticamente en secciones para mejor búsqueda.

### ¿Cómo importar URLs?

1. Dentro de una colección → **Importar URL**
2. Ingresa la URL de una página web
3. Haz clic en "Importar"
4. El sistema leerá el contenido de la página

**💡 Tip**: Puedes importar múltiples URLs de tu sitio web para que el agente conozca toda tu información.

### ¿Cómo organizar el conocimiento?

- **Crea colecciones temáticas**: "Productos", "Servicios", "Políticas"
- **Asigna colecciones a agentes**: Cada agente puede usar diferentes colecciones
- **Actualiza regularmente**: Agrega nuevas FAQs cuando identifiques preguntas frecuentes

---

## 4. Conversaciones

### ¿Qué es?

Las conversaciones muestran todas las interacciones con tus clientes. Puedes ver el historial completo, responder manualmente, y gestionar el estado de cada conversación.

### ¿Qué información muestra?

- **Participante**: Nombre y teléfono del cliente
- **Agente Asignado**: Qué agente está manejando la conversación
- **Estado**: Activa, Archivada, Bloqueada
- **Último Mensaje**: Cuándo fue el último mensaje
- **Mensajes No Leídos**: Contador de mensajes sin leer

### ¿Cómo ver una conversación?

1. Ve a **Conversaciones**
2. Haz clic en una conversación
3. Verás:
   - Historial completo de mensajes
   - Información del participante
   - Estado de la conversación

### ¿Cómo responder manualmente?

1. Abre una conversación
2. En la parte inferior, escribe tu mensaje
3. Haz clic en "Enviar"
4. El mensaje se enviará por WhatsApp

**💡 Tip**: Puedes responder manualmente cuando el agente no puede responder adecuadamente o cuando necesitas intervención humana.

### ¿Cómo archivar una conversación?

1. Abre la conversación
2. Haz clic en "Archivar"
3. La conversación se moverá a "Archivadas"

**¿Cuándo archivar?**
- Cuando la conversación está resuelta
- Cuando no necesitas seguirla activa
- Para organizar mejor tus conversaciones

### ¿Cómo desarchivar?

1. Ve a **Conversaciones** → Filtro "Archivadas"
2. Abre la conversación
3. Haz clic en "Desarchivar"

### ¿Cómo bloquear una conversación?

1. Abre la conversación
2. Haz clic en "Bloquear"
3. El agente dejará de responder a este cliente

**¿Cuándo bloquear?**
- Cuando un cliente es spam o abusivo
- Cuando no quieres recibir más mensajes de un cliente específico

---

## 5. Citas

### ¿Qué es?

Las citas son reuniones agendadas por tus clientes a través del agente. Se sincronizan automáticamente con tu calendario (Google Calendar o Cal.com).

### ¿Qué información muestra?

- **Participante**: Nombre y teléfono del cliente
- **Agente**: Qué agente agendó la cita
- **Fecha y Hora**: Cuándo es la cita
- **Estado**: Pendiente, Confirmada, Cancelada, Completada
- **Notas**: Información adicional sobre la cita

### ¿Cómo ver las próximas citas?

1. Ve a **Citas**
2. Por defecto verás las próximas citas
3. Puedes filtrar por:
   - Fecha
   - Agente
   - Estado

### ¿Cómo ver el calendario?

1. Ve a **Citas**
2. Cambia a vista "Calendario"
3. Verás todas las citas en formato calendario
4. Puedes hacer clic en una cita para ver detalles

### ¿Cómo reprogramar una cita?

1. Abre la cita
2. Haz clic en "Reprogramar"
3. Selecciona nueva fecha y hora
4. Haz clic en "Confirmar"
5. Se enviará una notificación al cliente

### ¿Cómo cancelar una cita?

1. Abre la cita
2. Haz clic en "Cancelar"
3. Opcionalmente, agrega una razón
4. Haz clic en "Confirmar"
5. Se enviará una notificación al cliente

### ¿Cómo enviar un recordatorio?

1. Abre la cita
2. Haz clic en "Enviar Recordatorio"
3. Se enviará un mensaje al cliente recordándole la cita

**💡 Tip**: Los recordatorios se pueden enviar automáticamente 24 horas antes si lo configuras en las reglas del calendario.

### ¿Cómo marcar una cita como completada?

1. Abre la cita
2. Haz clic en "Marcar como Completada"
3. El estado cambiará a "Completada"

---

## 6. Canales

### ¿Qué es?

Los canales son los diferentes medios por los que tus clientes pueden contactarte: WhatsApp, Webchat en tu sitio web, etc.

### ¿Qué tipos de canales hay?

- **WhatsApp**: Mensajería por WhatsApp
- **Webchat**: Widget de chat en tu sitio web
- **Voz** (Próximamente): Llamadas de voz
- **Telegram** (Próximamente): Mensajería por Telegram

### ¿Cómo crear un canal?

1. Ve a **Canales** → **Crear Canal**
2. Selecciona el tipo de canal
3. Completa:
   - **Nombre**: Ej. "WhatsApp Principal", "Webchat Sitio Web"
   - **Configuración**: Depende del tipo de canal
4. Haz clic en "Crear"

### ¿Cómo asignar agentes a un canal?

1. Abre el canal
2. Haz clic en "Asignar Agentes"
3. Selecciona los agentes que quieres que manejen este canal
4. Haz clic en "Guardar"

**💡 Tip**: Puedes asignar múltiples agentes a un canal. El sistema distribuirá las conversaciones automáticamente.

### ¿Cómo activar/desactivar un canal?

- **Activar**: El canal está funcionando y recibe mensajes
- **Desactivar**: El canal deja de recibir mensajes

Para cambiar el estado, ve a tu canal → **Editar** → Cambia el estado.

---

## 7. Configuración

### 7.1. General

**¿Qué puedes configurar?**
- Información básica de la empresa
- Zona horaria
- País y región de datos
- Idioma por defecto

**Cuándo usarlo:**
- Al configurar tu cuenta por primera vez
- Cuando cambias de ubicación o zona horaria
- Para ajustar preferencias de idioma

### 7.2. Equipo

**¿Qué puedes hacer?**
- Ver todos los miembros del equipo
- Invitar nuevos miembros
- Cambiar roles de miembros
- Eliminar miembros
- Transferir ownership (solo OWNER)

**Cómo invitar un miembro:**
1. Ve a **Configuración** → **Equipo**
2. Haz clic en "Invitar Miembro"
3. Ingresa email y selecciona rol
4. Haz clic en "Enviar Invitación"

**Roles disponibles:**
- **OWNER**: Control total
- **ADMIN**: Gestión operativa
- **AGENT**: Operación diaria
- **VIEWER**: Solo lectura

### 7.3. Branding

**¿Qué puedes configurar?**
- Logo de la empresa
- Colores primario y secundario
- Estos colores aparecen en:
  - Dashboard
  - Emails enviados
  - Widget de webchat

**Cómo subir logo:**
1. Ve a **Configuración** → **Branding**
2. Haz clic en "Subir Logo"
3. Selecciona imagen (PNG, JPG, máximo 2MB)
4. Haz clic en "Guardar"

### 7.4. Seguridad

**¿Qué puedes gestionar?**
- Métodos de autenticación:
  - Email y contraseña
  - Google (SSO)
  - Microsoft (SSO)
- Desconectar métodos SSO
- Ver información de seguridad

**Cómo conectar Google/Microsoft:**
1. Ve a **Configuración** → **Seguridad**
2. Haz clic en "Conectar Google" o "Conectar Microsoft"
3. Autoriza el acceso
4. Ya puedes iniciar sesión con ese método

### 7.5. WhatsApp

**¿Qué puedes hacer?**
- Ver todas tus cuentas de WhatsApp
- Agregar nuevas cuentas
- Ver estado de conexión
- Reconectar cuentas desconectadas
- Eliminar cuentas

**Cómo agregar cuenta:**
Ver sección "Conectar WhatsApp" en [Getting Started](/app/docs/getting-started)

### 7.6. Calendario

**¿Qué puedes hacer?**
- Conectar Google Calendar o Cal.com
- Crear reglas de disponibilidad por agente
- Ver integraciones activas
- Desconectar calendarios

**Cómo conectar Google Calendar:**
1. Ve a **Configuración** → **Calendario**
2. Haz clic en "Nueva Integración"
3. Selecciona "Google Calendar"
4. Autoriza con Google
5. Selecciona qué calendario usar
6. Haz clic en "Guardar"

**Cómo crear reglas de disponibilidad:**
1. Ve a **Configuración** → **Calendario** → **Reglas**
2. Haz clic en "Nueva Regla"
3. Selecciona agente
4. Configura:
   - Duración de citas
   - Horarios disponibles
   - Días disponibles
   - Tiempo de buffer entre citas
5. Haz clic en "Guardar"

### 7.7. n8n

**¿Qué es n8n?**
n8n es una herramienta de automatización (similar a Zapier) que permite crear workflows personalizados.

**¿Qué puedes hacer?**
- Registrar workflows de n8n
- Activar/desactivar workflows
- Ver workflows disponibles
- Conectar workflows con agentes

**Cómo registrar un workflow:**
1. Crea el workflow en n8n
2. Copia el Workflow ID
3. En AutomAI, ve a **Configuración** → **n8n**
4. Haz clic en "Registrar Workflow"
5. Ingresa el Workflow ID y detalles
6. Haz clic en "Guardar"

### 7.8. GDPR

**¿Qué puedes gestionar?**
- Políticas de retención de datos
- Exportar datos de un usuario
- Anonimizar datos de usuarios
- Registrar consentimientos
- Verificar residencia de datos

**Cómo exportar datos de un usuario:**
1. Ve a **Configuración** → **GDPR**
2. Haz clic en "Exportar Datos"
3. Selecciona el usuario
4. Haz clic en "Exportar"
5. Recibirás un archivo con todos los datos del usuario

---

## 8. Facturación

### ¿Qué es?

La sección de facturación te permite gestionar tu suscripción, ver tu plan actual, cambiar de plan, y gestionar pagos.

### ¿Qué información muestra?

- **Plan Actual**: Qué plan tienes activo
- **Estado**: Trial, Activo, Cancelado, Bloqueado
- **Días Restantes**: Si estás en trial, cuántos días quedan
- **Próximo Pago**: Cuándo es el próximo cobro
- **Uso Actual**: Cuántos agentes, canales, mensajes estás usando

### ¿Cómo ver mi plan actual?

1. Ve a **Facturación**
2. Verás toda la información de tu suscripción en la parte superior

### ¿Cómo cambiar de plan?

1. Ve a **Facturación**
2. Haz clic en "Ver Planes" o "Cambiar Plan"
3. Revisa los planes disponibles
4. Selecciona el plan que quieres
5. Haz clic en "Suscribirse" o "Cambiar"
6. Completa el pago en Stripe
7. Tu plan se actualizará automáticamente

### ¿Cómo ver mi uso actual?

1. Ve a **Facturación**
2. En la sección "Uso Actual" verás:
   - Agentes: X de Y permitidos
   - Canales: X de Y permitidos
   - Mensajes: Total del mes

**💡 Tip**: Si te acercas a los límites, considera cambiar a un plan superior.

### ¿Cómo gestionar mi método de pago?

1. Ve a **Facturación**
2. Haz clic en "Gestionar Pago" o "Portal de Cliente"
3. Serás redirigido a Stripe
4. Puedes:
   - Actualizar tarjeta de crédito
   - Ver facturas anteriores
   - Descargar recibos

### ¿Cómo cancelar mi suscripción?

1. Ve a **Facturación**
2. Haz clic en "Cancelar Suscripción"
3. Confirma la cancelación
4. Tu suscripción se cancelará al final del período actual
5. Seguirás teniendo acceso hasta el final del período

**⚠️ Importante**: Una vez cancelada, no se renovará automáticamente. Puedes reactivarla en cualquier momento.

### ¿Cómo reactivar una suscripción cancelada?

1. Ve a **Facturación**
2. Si tu suscripción está cancelada, verás "Reactivar Suscripción"
3. Haz clic en "Reactivar"
4. Tu suscripción se reactivará inmediatamente

---

## 9. Analytics

### ¿Qué es?

Analytics muestra métricas y estadísticas de tu negocio: conversaciones, mensajes, tiempos de respuesta, conversiones, etc.

### ¿Qué métricas puedo ver?

- **KPIs Principales**: Leads, agentes, canales, conversaciones, mensajes, tiempo de respuesta
- **Tendencias**: Cómo han cambiado las métricas en el tiempo
- **Estadísticas de Mensajes**: Total, por mes, por dirección
- **Tiempos de Respuesta**: Promedio, mínimo, máximo
- **Conversiones**: Leads convertidos en clientes
- **Uso de Agentes**: Qué agentes son más usados

### ¿Cómo ver analytics?

1. Ve a **Analytics**
2. Verás un dashboard con todas las métricas
3. Puedes filtrar por:
   - Período de tiempo
   - Agente específico
   - Canal específico

### ¿Cómo exportar reportes?

1. Ve a **Analytics**
2. Configura los filtros que quieres
3. Haz clic en "Exportar PDF"
4. Se generará y descargará un reporte en PDF

**💡 Tip**: Los reportes PDF son útiles para presentaciones o análisis mensuales.

---

## 🔗 Referencias

- **Para empezar**: Ver [Getting Started](/app/docs/getting-started)
- **Para ver flujos**: Ver [Flujos de Trabajo](/app/docs/workflows)
- **Para configurar integraciones**: Ver [Integraciones](/app/docs/integrations)
- **Para resolver problemas**: Ver [Troubleshooting](/app/docs/troubleshooting)

---

**Última actualización:** 2025-01-27

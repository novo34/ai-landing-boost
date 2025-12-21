# Flujos de Trabajo - Panel de Plataforma

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Flujos de Gestión de Tenants](#flujos-de-gestión-de-tenants)
2. [Flujos de Soporte](#flujos-de-soporte)
3. [Flujos de Operaciones Propias](#flujos-de-operaciones-propias)
4. [Flujos de Configuración](#flujos-de-configuración)
5. [Flujos de Automatización](#flujos-de-automatización)

---

## Flujos de Gestión de Tenants

### Crear un Nuevo Tenant Completo

**Objetivo**: Crear un nuevo cliente (tenant) con toda su configuración inicial.

**Pasos**:

1. **Acceder a la Creación**
   - Ve a **Tenants** → **Crear Tenant**
   - O haz clic en el botón **"Crear Tenant"** desde la lista

2. **Completar Información Básica**
   ```
   Nombre: "Empresa Cliente S.L."
   País: España
   Región de Datos: EU
   Plan: Pro
   Email Owner: owner@empresacliente.com
   ```

3. **Verificar Creación**
   - El sistema crea automáticamente:
     - El tenant
     - El usuario OWNER
     - La configuración inicial
     - La suscripción al plan seleccionado

4. **Enviar Bienvenida** (Opcional)
   - El sistema envía automáticamente un email de bienvenida
   - El usuario puede iniciar sesión inmediatamente

5. **Configuración Inicial del Tenant** (Opcional)
   - Puedes acceder al tenant como administrador
   - Configurar agentes iniciales
   - Conectar canales
   - Importar conocimiento base

**Resultado**: Tenant completamente funcional y listo para usar.

---

### Cambiar el Plan de un Tenant

**Objetivo**: Actualizar el plan de suscripción de un tenant existente.

**Pasos**:

1. **Acceder al Tenant**
   - Ve a **Tenants** → Selecciona el tenant
   - O busca el tenant en la lista

2. **Ver Plan Actual**
   - En la vista de detalles, verás el plan actual
   - Límites actuales del plan

3. **Cambiar Plan**
   - Haz clic en **"Cambiar Plan"**
   - Selecciona el nuevo plan
   - Confirma el cambio

4. **Verificar Cambio**
   - El sistema actualiza automáticamente:
     - Los límites del tenant
     - La facturación
     - Las capacidades disponibles

**Nota**: Los cambios de plan pueden afectar límites inmediatamente. Los upgrades son instantáneos, los downgrades pueden requerir ajustes.

---

### Suspender un Tenant

**Objetivo**: Suspender temporalmente el acceso de un tenant.

**Pasos**:

1. **Acceder al Tenant**
   - Ve a **Tenants** → Selecciona el tenant

2. **Suspender**
   - Haz clic en **"Suspender"**
   - Confirma la acción
   - Opcionalmente, agrega una razón

3. **Efectos de la Suspensión**
   - El tenant no puede iniciar sesión
   - Los agentes dejan de funcionar
   - No se procesan nuevos mensajes
   - Los datos se mantienen intactos

4. **Reactivar** (Cuando sea necesario)
   - Haz clic en **"Reactivar"**
   - El tenant vuelve a funcionar inmediatamente

---

## Flujos de Soporte

### Atender un Ticket de Soporte

**Objetivo**: Resolver un ticket de soporte de un cliente.

**Pasos**:

1. **Recibir Notificación**
   - Recibes una notificación de nuevo ticket
   - O revisa la lista de tickets en **Tickets**

2. **Revisar el Ticket**
   - Ve a **Tickets** → Selecciona el ticket
   - Lee la descripción inicial
   - Revisa el historial de mensajes (si existe)

3. **Asignar el Ticket** (Si no está asignado)
   - Asigna el ticket a ti mismo o a otro miembro del equipo
   - Cambia la prioridad si es necesario

4. **Investigar el Problema**
   - Accede al tenant del cliente si es necesario
   - Revisa logs o configuración
   - Identifica la causa del problema

5. **Responder al Cliente**
   - Haz clic en **"Agregar Mensaje"**
   - Escribe tu respuesta
   - Marca como "Interno" si es solo para el equipo
   - Envía el mensaje

6. **Actualizar Estado**
   - Cambia el estado según corresponda:
     - **IN_PROGRESS**: Estás trabajando en ello
     - **WAITING_CLIENT**: Esperando respuesta del cliente
     - **RESOLVED**: Problema resuelto
     - **CLOSED**: Ticket cerrado

7. **Cerrar el Ticket**
   - Una vez resuelto, haz clic en **"Cerrar Ticket"**
   - El ticket queda archivado

**Mejores Prácticas**:
- Responde dentro de 24 horas
- Mantén al cliente informado del progreso
- Usa mensajes internos para notas del equipo
- Cierra tickets solo cuando estén completamente resueltos

---

### Usar Chat en Vivo para Soporte Rápido

**Objetivo**: Comunicarte en tiempo real con un tenant para resolver problemas urgentes.

**Pasos**:

1. **Abrir Chat**
   - Ve a **Chat**
   - Busca el tenant en la lista de conversaciones
   - O inicia una nueva conversación

2. **Iniciar Conversación**
   - Si no hay conversación previa, el sistema la crea automáticamente
   - Escribe tu mensaje
   - Envía

3. **Mantener Conversación**
   - Responde en tiempo real
   - Usa el chat para:
     - Resolver dudas rápidas
     - Guiar al cliente paso a paso
     - Proporcionar información inmediata

4. **Crear Ticket si es Necesario**
   - Si el problema requiere seguimiento, crea un ticket
   - Puedes referenciar la conversación de chat en el ticket

**Ventajas del Chat**:
- Respuesta inmediata
- Comunicación bidireccional en tiempo real
- Historial completo de la conversación
- Mejor experiencia para el cliente

---

## Flujos de Operaciones Propias

### Configurar Agentes para Captación de Leads

**Objetivo**: Crear agentes de IA para captar leads para tu propio negocio.

**Pasos**:

1. **Crear Agente**
   - Ve a **Operaciones Propias** → **Mis Agentes** → **Crear**
   - Completa la información:
     ```
     Nombre: "Agente de Ventas"
     Cuenta WhatsApp: [Selecciona tu cuenta]
     Idioma: Español
     Personalidad: Profesional y amigable
     ```

2. **Configurar Conocimiento**
   - Asocia colecciones de conocimiento
   - O crea nuevas colecciones con información de tu producto/servicio

3. **Configurar Flujos N8N** (Opcional)
   - Asocia flujos N8N para:
     - Procesar leads automáticamente
     - Enviar notificaciones
     - Crear registros en CRM

4. **Activar el Agente**
   - Cambia el estado a **ACTIVE**
   - El agente comienza a responder automáticamente

5. **Monitorear Conversaciones**
   - Ve a **Mis Conversaciones**
   - Revisa las conversaciones del agente
   - Interviene manualmente si es necesario

6. **Gestionar Leads Generados**
   - Ve a **Mis Leads**
   - Los leads se crean automáticamente desde las conversaciones
   - Gestiona el pipeline de ventas

---

### Configurar Pipeline de Ventas

**Objetivo**: Organizar y gestionar leads en un pipeline de ventas efectivo.

**Pasos**:

1. **Ver Leads Generados**
   - Ve a **Operaciones Propias** → **Mis Leads**
   - Cambia a vista **Pipeline** (Kanban)

2. **Organizar por Etapas**
   - Las etapas típicas son:
     - **Lead Capturado**: Nuevos leads
     - **Contactado**: Leads con los que has hablado
     - **Calificado**: Leads interesados
     - **Propuesta**: Propuesta enviada
     - **Negociación**: En negociación
     - **Cerrado**: Ganado o Perdido

3. **Mover Leads entre Etapas**
   - Arrastra y suelta leads entre columnas
   - O edita el lead y cambia la etapa manualmente

4. **Agregar Notas**
   - Haz clic en un lead
   - Agrega notas sobre:
     - Interacciones
     - Intereses del cliente
     - Próximos pasos
     - Información relevante

5. **Seguir Métricas**
   - Revisa las métricas del pipeline:
     - Tasa de conversión
     - Tiempo en cada etapa
     - Valor total de leads
     - Leads por etapa

6. **Cerrar Leads**
   - Cuando un lead se convierte en cliente:
     - Mueve a "Cerrado - Ganado"
     - Actualiza el valor
     - Agrega nota final

---

### Automatizar Procesos con N8N

**Objetivo**: Crear flujos automatizados para procesos internos.

**Pasos**:

1. **Identificar Proceso a Automatizar**
   - Ejemplos:
     - Procesamiento de leads nuevos
     - Notificaciones de conversaciones importantes
     - Generación de reportes diarios
     - Sincronización con CRM externo

2. **Crear Flujo en N8N**
   - Ve a **Operaciones Propias** → **Mis Flujos N8N** → **Crear**
   - O crea el flujo directamente en N8N

3. **Configurar el Flujo**
   - Define los triggers (webhooks, eventos, horarios)
   - Configura las acciones (enviar email, crear registro, etc.)
   - Prueba el flujo en N8N

4. **Registrar en la Plataforma**
   - Si creaste el flujo en N8N primero:
     - Obtén el ID del workflow
     - Regístralo en la plataforma
   - O crea el flujo directamente desde la plataforma

5. **Activar el Flujo**
   - Cambia el estado a **ACTIVE**
   - El flujo comienza a ejecutarse automáticamente

6. **Monitorear Ejecuciones**
   - Ve a **Ver Logs** en el flujo
   - Revisa ejecuciones exitosas y fallidas
   - Ajusta el flujo si es necesario

**Ejemplo de Flujo: Procesamiento de Leads**
```
Trigger: Nuevo lead creado
  ↓
Acción 1: Enviar email al equipo de ventas
  ↓
Acción 2: Crear tarea en sistema externo
  ↓
Acción 3: Agregar nota al lead
  ↓
Acción 4: Enviar mensaje de bienvenida al lead
```

---

## Flujos de Configuración

### Configurar Multi-instancia

**Objetivo**: Configurar múltiples instancias para diferentes regiones o propósitos.

**Pasos**:

1. **Crear Nueva Instancia**
   - Ve a **Instances** → **Crear Instancia**
   - Completa:
     ```
     Nombre: "Instancia EU"
     Dominio: eu.tu-saas.com
     Región: EU
     País: España
     ```

2. **Verificar Dominio**
   - Configura el DNS del dominio
   - Verifica que el dominio apunte a la instancia

3. **Asignar Tenants**
   - Ve a un tenant existente
   - Cambia su instancia asignada
   - O asigna nuevos tenants a esta instancia

4. **Configurar Región de Datos**
   - Los datos de los tenants se almacenan en la región especificada
   - Cumple con regulaciones de datos (GDPR, etc.)

---

### Crear y Configurar Planes de Suscripción

**Objetivo**: Crear planes de suscripción atractivos para diferentes tipos de clientes.

**Pasos**:

1. **Definir Estrategia de Planes**
   - Planes típicos:
     - **Starter**: Para pequeños negocios
     - **Pro**: Para empresas medianas
     - **Enterprise**: Para grandes empresas

2. **Crear Plan Starter**
   ```
   Nombre: Starter
   Precio Mensual: €29
   Precio Anual: €290 (2 meses gratis)
   Límites:
     - 2 agentes
     - 1 canal
     - 3 usuarios
     - 10 GB almacenamiento
     - 1,000 mensajes/mes
   ```

3. **Crear Plan Pro**
   ```
   Nombre: Pro
   Precio Mensual: €99
   Precio Anual: €990
   Límites:
     - 10 agentes
     - 5 canales
     - 10 usuarios
     - 100 GB almacenamiento
     - 10,000 mensajes/mes
   ```

4. **Crear Plan Enterprise**
   ```
   Nombre: Enterprise
   Precio: Personalizado
   Límites: Ilimitados
   Características:
     - Soporte prioritario
     - SLA garantizado
     - Integraciones personalizadas
   ```

5. **Asignar a Tenants**
   - Al crear un tenant, selecciona el plan
   - O cambia el plan de un tenant existente

6. **Monitorear Métricas**
   - Ve a **Plans** → Métricas
   - Revisa:
     - Ingresos por plan
     - Número de suscriptores
     - Tasa de conversión

---

## Flujos de Automatización

### Automatizar Onboarding de Nuevos Tenants

**Objetivo**: Crear un flujo automatizado para dar la bienvenida y configurar nuevos tenants.

**Pasos**:

1. **Crear Flujo N8N**
   - Ve a **N8N Flows** → **Crear Flujo**
   - Categoría: **ONBOARDING**

2. **Configurar Trigger**
   - Trigger: **Webhook** que se activa cuando se crea un nuevo tenant
   - O trigger por **Evento del Sistema**

3. **Configurar Acciones**
   ```
   Acción 1: Enviar email de bienvenida
     - Template personalizado
     - Incluye credenciales y guía de inicio
   
   Acción 2: Crear agentes por defecto
     - Agente de bienvenida
     - Configuración básica
   
   Acción 3: Crear colección de conocimiento inicial
     - FAQs básicas
     - Documentación de inicio
   
   Acción 4: Programar seguimiento
     - Crear tarea para contacto en 7 días
   ```

4. **Activar Flujo**
   - Cambia a **ACTIVE**
   - Prueba con un tenant de prueba

5. **Monitorear**
   - Revisa logs de ejecución
   - Verifica que todos los pasos se ejecuten correctamente

---

### Automatizar Notificaciones de Tickets Críticos

**Objetivo**: Recibir notificaciones inmediatas cuando se crea un ticket de alta prioridad.

**Pasos**:

1. **Crear Flujo N8N**
   - Ve a **N8N Flows** → **Crear Flujo**
   - Categoría: **NOTIFICATIONS**

2. **Configurar Trigger**
   - Trigger: **Webhook** cuando se crea un ticket
   - Filtro: Solo tickets con prioridad **CRITICAL** o **HIGH**

3. **Configurar Acciones**
   ```
   Acción 1: Enviar email al equipo
     - Incluye información del ticket
     - Link directo al ticket
   
   Acción 2: Enviar notificación Slack (si está configurado)
     - Canal #soporte
     - Mensaje con detalles
   
   Acción 3: Crear recordatorio
     - Si no se responde en 1 hora, enviar recordatorio
   ```

4. **Activar y Probar**
   - Activa el flujo
   - Crea un ticket de prueba con prioridad CRITICAL
   - Verifica que recibas las notificaciones

---

## Mejores Prácticas

### Gestión de Tenants
- ✅ Revisa regularmente el estado de los tenants
- ✅ Monitorea el uso de recursos (agentes, canales, almacenamiento)
- ✅ Contacta proactivamente a tenants en trial antes de que expire
- ✅ Mantén comunicación clara sobre cambios de plan

### Soporte
- ✅ Responde tickets dentro de 24 horas
- ✅ Usa templates para respuestas comunes
- ✅ Crea tickets para problemas recurrentes
- ✅ Documenta soluciones para referencia futura

### Operaciones Propias
- ✅ Monitorea regularmente las conversaciones de tus agentes
- ✅ Actualiza la base de conocimiento con frecuencia
- ✅ Revisa métricas de conversión de leads semanalmente
- ✅ Optimiza flujos N8N basándote en resultados

### Automatización
- ✅ Empieza con flujos simples y agrega complejidad gradualmente
- ✅ Prueba flujos en entorno de desarrollo primero
- ✅ Monitorea logs regularmente
- ✅ Documenta cada flujo para referencia futura

---

**Última actualización:** 2025-01-27

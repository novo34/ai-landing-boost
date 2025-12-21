# Integraciones - Guía de Configuración

> **Versión:** 1.0  
> **Audiencia:** Usuarios del Sistema  
> **Última actualización:** 2025-01-27

---

## 📋 Índice de Integraciones

1. [WhatsApp](#1-whatsapp)
2. [Google Calendar](#2-google-calendar)
3. [Cal.com](#3-calcom)
4. [Stripe (Facturación)](#4-stripe-facturación)
5. [n8n (Automatizaciones)](#5-n8n-automatizaciones)

---

## 1. WhatsApp

### ¿Por qué conectar WhatsApp?

WhatsApp es el canal principal para que tus clientes contacten con tus agentes de IA. Sin WhatsApp conectado, no podrás recibir ni enviar mensajes.

### Opciones Disponibles

Tienes dos formas de conectar WhatsApp:

#### Opción A: Evolution API

**Ventajas:**
- Más control y flexibilidad
- Ideal para alto volumen de mensajes
- Sin límites estrictos de Meta

**Requisitos:**
- Tener una instancia de Evolution API corriendo
- API Key y URL de tu instancia

**Cómo configurar:**
1. Ve a **Configuración** → **WhatsApp**
2. Haz clic en "Agregar Cuenta"
3. Selecciona "Evolution API"
4. Completa:
   - **Número de Teléfono**: Con código de país (ej: +34600123456)
   - **API URL**: URL de tu Evolution API (ej: https://api.evolution.com)
   - **API Key**: Tu clave de API
   - **Nombre de Instancia**: Un nombre para identificar esta cuenta
5. Haz clic en "Crear"
6. **Escanear QR Code**:
   - Se mostrará un código QR
   - Abre WhatsApp en tu teléfono
   - Ve a Configuración → Dispositivos vinculados → Vincular dispositivo
   - Escanea el código QR
7. Espera a que el estado cambie a "Conectado" (verde)

**⚠️ Problema común**: Si el QR expira, haz clic en "Reconectar" para obtener uno nuevo.

#### Opción B: WhatsApp Cloud API

**Ventajas:**
- Más simple de configurar
- Usa la API oficial de Meta
- Ideal para empezar rápido

**Requisitos:**
- Cuenta en Meta for Developers
- Número de teléfono verificado en Meta

**Cómo configurar:**

**Paso 1: Crear App en Meta**
1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Inicia sesión con tu cuenta de Meta
3. Haz clic en "Mis Apps" → "Crear App"
4. Selecciona tipo "Negocio"
5. Completa el nombre de la app
6. Agrega el producto "WhatsApp"
7. Completa la configuración básica

**Paso 2: Obtener Credenciales**
1. En tu app, ve a "WhatsApp" → "Configuración inicial"
2. Copia:
   - **Access Token** (temporal o permanente)
   - **Phone Number ID**
   - **Business Account ID**

**Paso 3: Configurar en AutomAI**
1. Ve a **Configuración** → **WhatsApp**
2. Haz clic en "Agregar Cuenta"
3. Selecciona "WhatsApp Cloud API"
4. Completa:
   - **Número de Teléfono**: Tu número verificado en Meta
   - **Access Token**: El token que copiaste
   - **Phone Number ID**: El ID que copiaste
   - **Business Account ID**: El ID que copiaste
5. Haz clic en "Crear"
6. El estado debería cambiar a "Conectado" automáticamente

**⚠️ Importante**: Si el Access Token es temporal, necesitarás renovarlo periódicamente en Meta.

### Verificar Conexión

1. Ve a **Configuración** → **WhatsApp**
2. Verás el estado de cada cuenta:
   - **🟢 Conectado**: Todo funciona correctamente
   - **🟡 Pendiente**: Esperando conexión (Evolution API)
   - **🔴 Desconectado**: Necesita reconexión
   - **🔴 Error**: Hay un problema, revisa la configuración

### Reconectar una Cuenta

Si una cuenta se desconecta:

1. Ve a **Configuración** → **WhatsApp**
2. Abre la cuenta desconectada
3. Haz clic en "Reconectar"
4. Si es Evolution API, escanea el nuevo QR
5. Si es Cloud API, verifica que el Access Token no haya expirado

---

## 2. Google Calendar

### ¿Por qué conectar Google Calendar?

Permite que tus agentes agenden citas automáticamente y se sincronicen con tu calendario de Google.

### Cómo Conectar

#### Paso 1: Autorizar con Google

1. Ve a **Configuración** → **Calendario**
2. Haz clic en "Nueva Integración"
3. Selecciona "Google Calendar"
4. Se abrirá una ventana de Google
5. Inicia sesión con tu cuenta de Google
6. Autoriza el acceso a tu calendario
7. Selecciona qué calendario usar (por defecto: "Principal")
8. Haz clic en "Guardar"

**Resultado**: Tu Google Calendar está conectado.

#### Paso 2: Crear Reglas de Disponibilidad

Para que los agentes puedan agendar citas, necesitas crear reglas:

1. Ve a **Configuración** → **Calendario** → **Reglas**
2. Haz clic en "Nueva Regla"
3. Selecciona el agente
4. Configura:
   - **Duración de Citas**: 30 min, 1 hora, 1.5 horas, etc.
   - **Horarios Disponibles**: 
     - Ejemplo: 9:00-13:00 y 15:00-18:00
     - Formato: HH:MM-HH:MM
   - **Días Disponibles**: 
     - Selecciona: Lunes, Martes, Miércoles, Jueves, Viernes
     - O todos los días
   - **Tiempo de Buffer**: 15 minutos entre citas (recomendado)
4. Haz clic en "Guardar"

**Resultado**: El agente puede agendar citas según estas reglas.

### Verificar que Funciona

1. Prueba agendar una cita a través del agente
2. Ve a tu Google Calendar
3. Deberías ver la cita creada automáticamente

### Problemas Comunes

**"No se puede crear evento en calendario"**
- Verifica que autorizaste el acceso correctamente
- Revisa que el calendario seleccionado existe
- Intenta reconectar la integración

**"No hay horarios disponibles"**
- Verifica que creaste reglas de disponibilidad
- Revisa que los horarios y días están configurados correctamente
- Asegúrate de que no hay citas existentes en esos horarios

---

## 3. Cal.com

### ¿Qué es Cal.com?

Cal.com es una plataforma de agendamiento de citas. Puedes usarla como alternativa a Google Calendar.

### Cómo Conectar

1. Ve a **Configuración** → **Calendario**
2. Haz clic en "Nueva Integración"
3. Selecciona "Cal.com"
4. **Obtener API Key de Cal.com**:
   - Inicia sesión en [cal.com](https://cal.com)
   - Ve a Configuración → API
   - Crea una API Key
   - Copia la clave
5. En AutomAI, completa:
   - **API Key**: La clave que copiaste
   - **API URL**: https://api.cal.com/v1 (o tu URL personalizada si usas self-hosted)
6. Haz clic en "Guardar"

**Resultado**: Cal.com está conectado.

### Crear Reglas de Disponibilidad

Sigue el mismo proceso que con Google Calendar (ver sección anterior).

---

## 4. Stripe (Facturación)

### ¿Qué es Stripe?

Stripe es el sistema de pagos que gestiona tus suscripciones. No necesitas configurarlo manualmente, pero es útil entender cómo funciona.

### Cómo Funciona

1. **Al registrarte**: Se inicia un trial de 14 días automáticamente
2. **Durante el trial**: Tienes acceso completo a todas las funcionalidades
3. **Antes de que termine el trial**: Recibirás notificaciones para suscribirte
4. **Al suscribirte**: 
   - Seleccionas un plan
   - Completas el pago en Stripe
   - Tu suscripción se activa automáticamente
5. **Renovación automática**: Se renueva cada mes o año según tu plan

### Gestionar Método de Pago

1. Ve a **Facturación**
2. Haz clic en "Gestionar Pago" o "Portal de Cliente"
3. Serás redirigido a Stripe
4. Puedes:
   - Actualizar tu tarjeta de crédito
   - Ver facturas anteriores
   - Descargar recibos
   - Cambiar método de pago

### Problemas Comunes

**"Pago fallido"**
- Verifica que tu tarjeta no haya expirado
- Revisa que tienes fondos suficientes
- Actualiza tu método de pago en el Portal de Cliente

**"Suscripción bloqueada"**
- Si el pago falla, tienes 7 días de gracia
- Actualiza tu método de pago antes de que termine el período de gracia
- Una vez actualizado, tu suscripción se reactivará automáticamente

---

## 5. n8n (Automatizaciones)

### ¿Qué es n8n?

n8n es una herramienta que permite crear automatizaciones personalizadas. Por ejemplo:
- Enviar datos a tu CRM cuando se crea un lead
- Notificar a Slack cuando hay una nueva conversación
- Crear tareas en otros sistemas cuando se agenda una cita

### Requisitos

- Tener n8n corriendo (self-hosted o n8n Cloud)
- API Key de n8n

### Cómo Configurar

#### Paso 1: Obtener API Key de n8n

1. Inicia sesión en tu instancia de n8n
2. Ve a Configuración → API
3. Crea una nueva API Key
4. Copia la clave

#### Paso 2: Configurar en AutomAI

1. Ve a **Configuración** → **n8n**
2. Ingresa:
   - **API URL**: URL de tu n8n (ej: https://n8n.tu-dominio.com o http://localhost:5678)
   - **API Key**: La clave que copiaste
3. Haz clic en "Guardar"

**Resultado**: n8n está conectado.

#### Paso 3: Registrar un Workflow

1. Crea tu workflow en n8n
2. Copia el **Workflow ID** (lo encuentras en la URL o en la configuración del workflow)
3. En AutomAI, ve a **Configuración** → **n8n**
4. Haz clic en "Registrar Workflow"
5. Completa:
   - **Workflow ID**: El ID que copiaste
   - **Nombre**: Un nombre descriptivo
   - **Tipo**: 
     - Lead Intake: Para procesar nuevos leads
     - Booking Flow: Para flujos de agendamiento
     - Followup: Para seguimientos
     - Custom: Para workflows personalizados
   - **Descripción**: Opcional
6. Haz clic en "Guardar"

**Resultado**: El workflow está registrado y puede activarse desde AutomAI.

#### Activar/Desactivar Workflow

1. Ve a **Configuración** → **n8n**
2. Verás la lista de workflows registrados
3. Haz clic en "Activar" o "Desactivar" según necesites

**💡 Tip**: Puedes tener múltiples workflows activos al mismo tiempo.

---

## 🔗 Referencias

- **Para empezar**: Ver [Getting Started](/app/docs/getting-started)
- **Para entender módulos**: Ver [Módulos del Sistema](/app/docs/modules)
- **Para ver flujos**: Ver [Flujos de Trabajo](/app/docs/workflows)
- **Para resolver problemas**: Ver [Troubleshooting](/app/docs/troubleshooting)

---

**Última actualización:** 2025-01-27

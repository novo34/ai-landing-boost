# Flujos de Trabajo - Guía Paso a Paso

> **Versión:** 1.0  
> **Audiencia:** Usuarios del Sistema  
> **Última actualización:** 2025-01-27

---

## 📋 Índice de Flujos

1. [Registro y Primera Configuración](#1-registro-y-primera-configuración)
2. [Cliente Contacta → Agente Responde → Cita Agendada](#2-cliente-contacta--agente-responde--cita-agendada)
3. [Agregar Conocimiento a un Agente](#3-agregar-conocimiento-a-un-agente)
4. [Invitar Miembro al Equipo](#4-invitar-miembro-al-equipo)
5. [Cambiar de Plan de Suscripción](#5-cambiar-de-plan-de-suscripción)
6. [Responder Manualmente una Conversación](#6-responder-manualmente-una-conversación)
7. [Reprogramar o Cancelar una Cita](#7-reprogramar-o-cancelar-una-cita)
8. [Actualizar Información del Agente](#8-actualizar-información-del-agente)

---

## 1. Registro y Primera Configuración

### Paso a Paso Completo

#### Paso 1: Registrarse

1. Ve a la página de registro
2. Completa el formulario:
   - Email de trabajo
   - Contraseña segura (mínimo 8 caracteres)
   - Tu nombre completo
   - Nombre de tu empresa
3. Acepta términos y condiciones
4. Haz clic en "Registrarse"

**Resultado**: Se crea tu cuenta y se inicia un trial de 14 días.

#### Paso 2: Verificar Email

1. Revisa tu email (y carpeta de spam)
2. Busca el email "AutomAI - Verificación de Email"
3. Haz clic en el enlace de verificación
4. Serás redirigido al dashboard

**Resultado**: Tu email está verificado y tienes acceso completo.

#### Paso 3: Personalizar tu Empresa

1. Ve a **Configuración** → **Branding**
2. **Sube tu Logo**:
   - Haz clic en "Subir Logo"
   - Selecciona una imagen (PNG o JPG, máximo 2MB)
   - El logo aparecerá en el dashboard
3. **Configura Colores**:
   - Color Primario: El color principal de tu marca
   - Color Secundario: Color complementario
4. Ve a **Configuración** → **General**
5. Configura:
   - Zona horaria
   - País
   - Idioma por defecto
6. Haz clic en "Guardar"

**Resultado**: Tu empresa está personalizada con tu branding.

#### Paso 4: Conectar WhatsApp

1. Ve a **Configuración** → **WhatsApp**
2. Haz clic en "Agregar Cuenta"
3. Selecciona tu proveedor (Evolution API o WhatsApp Cloud API)
4. Completa los datos según tu proveedor
5. Si es Evolution API, escanea el código QR
6. Espera a que el estado cambie a "Conectado" (verde)

**Resultado**: Tu WhatsApp está conectado y listo para recibir mensajes.

#### Paso 5: Crear tu Primer Agente

1. Ve a **Agentes** → **Crear Agente**
2. Completa:
   - Nombre: "Agente Principal" o similar
   - Cuenta WhatsApp: Selecciona la que conectaste
   - Estrategia de Idioma: "Auto Detectar"
   - Personalidad: Elige tono y estilo
3. Haz clic en "Crear"

**Resultado**: Tu primer agente está creado.

#### Paso 6: Agregar Conocimiento Básico

1. Ve a **Base de Conocimiento** → **Nueva Colección**
2. Nombre: "Información Básica"
3. Haz clic en "Crear"
4. Dentro de la colección → **Agregar Fuente** → **FAQ**
5. Agrega al menos 3-5 FAQs básicas:
   - "¿Cuáles son sus horarios?"
   - "¿Dónde están ubicados?"
   - "¿Cómo puedo contactarlos?"
6. Asigna la colección a tu agente

**Resultado**: Tu agente tiene conocimiento básico para responder.

#### Paso 7: Probar el Agente

1. Abre WhatsApp en tu teléfono
2. Envía un mensaje al número conectado
3. El agente debería responder automáticamente
4. Prueba diferentes preguntas

**Resultado**: Tu agente está funcionando correctamente.

---

## 2. Cliente Contacta → Agente Responde → Cita Agendada

### Flujo Completo desde la Perspectiva del Usuario

#### Escenario: Un cliente quiere agendar una cita

**Lo que pasa automáticamente:**

1. **Cliente envía mensaje**: "Hola, quiero agendar una cita"
2. **Sistema recibe el mensaje**: Automáticamente por WhatsApp
3. **Se crea o identifica la conversación**: El sistema busca si ya existe una conversación con este número
4. **Se asigna un agente**: Si no tiene agente, se asigna automáticamente
5. **Agente analiza el mensaje**: Detecta que el cliente quiere agendar una cita
6. **Agente consulta disponibilidad**: Revisa el calendario conectado
7. **Agente responde con opciones**: "¿Qué horario prefieres? Tengo disponible: [opciones]"
8. **Cliente selecciona horario**: "El viernes a las 10:00"
9. **Agente confirma y crea la cita**: "Perfecto, tu cita está agendada para el viernes a las 10:00"
10. **Sistema crea la cita**: Se agrega automáticamente al calendario
11. **Se envía confirmación**: El cliente recibe un mensaje de confirmación

**Lo que puedes hacer como usuario:**

1. **Ver la conversación**: Ve a **Conversaciones** → Verás la conversación nueva
2. **Ver la cita creada**: Ve a **Citas** → Verás la cita agendada
3. **Verificar en el calendario**: Si conectaste Google Calendar, verás la cita allí también
4. **Enviar recordatorio** (opcional): Ve a la cita → "Enviar Recordatorio"

**💡 Tip**: Todo esto sucede automáticamente. Solo necesitas monitorear y, si es necesario, intervenir manualmente.

---

## 3. Agregar Conocimiento a un Agente

### Proceso Paso a Paso

#### Opción A: Agregar FAQs Manualmente

1. Ve a **Base de Conocimiento**
2. Selecciona una colección (o crea una nueva)
3. Haz clic en "Agregar Fuente" → **FAQ**
4. Completa:
   - **Título**: La pregunta (ej: "¿Cuáles son sus precios?")
   - **Contenido**: La respuesta completa
   - **Idioma**: Selecciona el idioma
5. Haz clic en "Crear"
6. Repite para cada FAQ que quieras agregar

**Resultado**: Las FAQs están disponibles para que el agente las use.

#### Opción B: Importar un Documento

1. Ve a **Base de Conocimiento**
2. Selecciona una colección
3. Haz clic en "Importar Documento"
4. Selecciona un archivo (PDF, Word, o Texto)
5. Haz clic en "Importar"
6. Espera a que se procese (verás un indicador de progreso)
7. Una vez procesado, el documento aparecerá en la lista

**Resultado**: El contenido del documento está disponible para el agente.

#### Opción C: Importar una URL

1. Ve a **Base de Conocimiento**
2. Selecciona una colección
3. Haz clic en "Importar URL"
4. Ingresa la URL (ej: "https://tu-sitio-web.com/productos")
5. Haz clic en "Importar"
6. El sistema leerá el contenido de la página

**Resultado**: El contenido de la página web está disponible para el agente.

#### Asignar Conocimiento al Agente

1. Ve a **Agentes** → Selecciona tu agente
2. Haz clic en "Editar"
3. En "Colecciones de Conocimiento"
4. Selecciona las colecciones que quieres que use
5. Haz clic en "Guardar"

**Resultado**: El agente ahora puede usar esta información para responder.

**💡 Tip**: Puedes asignar múltiples colecciones a un agente. Por ejemplo, un agente puede usar "Productos", "Servicios" y "Preguntas Frecuentes".

---

## 4. Invitar Miembro al Equipo

### Proceso Completo

#### Como OWNER o ADMIN

1. Ve a **Configuración** → **Equipo**
2. Haz clic en "Invitar Miembro"
3. Completa el formulario:
   - **Email**: Email de la persona a invitar
   - **Rol**: Selecciona el rol:
     - **ADMIN**: Puede gestionar todo excepto facturación
     - **AGENT**: Puede ver y responder conversaciones
     - **VIEWER**: Solo puede ver, no modificar
4. Haz clic en "Enviar Invitación"
5. La persona recibirá un email con el enlace de invitación

**Resultado**: La invitación ha sido enviada.

#### Como Persona Invitada

1. Revisa tu email
2. Busca el email "Invitación a unirse a [Nombre de Empresa]"
3. Haz clic en el enlace de invitación
4. **Si no tienes cuenta**:
   - Se creará automáticamente
   - Configura tu contraseña
   - Acepta la invitación
5. **Si ya tienes cuenta**:
   - Solo acepta la invitación
6. Serás redirigido al dashboard con acceso al tenant

**Resultado**: Ya eres miembro del equipo con el rol asignado.

#### Gestionar Miembros Existentes

**Cambiar rol de un miembro:**
1. Ve a **Configuración** → **Equipo**
2. Encuentra el miembro en la lista
3. Haz clic en "Cambiar Rol"
4. Selecciona el nuevo rol
5. Haz clic en "Guardar"

**Eliminar un miembro:**
1. Ve a **Configuración** → **Equipo**
2. Encuentra el miembro en la lista
3. Haz clic en "Eliminar"
4. Confirma la eliminación

**⚠️ Importante**: Solo OWNER puede transferir ownership a otro miembro.

---

## 5. Cambiar de Plan de Suscripción

### Proceso Paso a Paso

#### Ver Plan Actual

1. Ve a **Facturación**
2. En la parte superior verás:
   - Plan actual
   - Estado (Trial, Activo, etc.)
   - Días restantes (si estás en trial)
   - Próximo pago

#### Cambiar a un Plan Superior

1. Ve a **Facturación**
2. Haz clic en "Ver Planes" o "Cambiar Plan"
3. Revisa los planes disponibles y sus características
4. Selecciona el plan que quieres
5. Haz clic en "Suscribirse" o "Cambiar"
6. Serás redirigido a Stripe para completar el pago
7. Completa el pago con tu tarjeta de crédito
8. Una vez completado, serás redirigido de vuelta
9. Tu plan se actualizará automáticamente

**Resultado**: Tienes acceso a las características del nuevo plan.

#### Cambiar a un Plan Inferior

1. Ve a **Facturación**
2. Haz clic en "Cambiar Plan"
3. Selecciona el plan inferior
4. Haz clic en "Cambiar"
5. **Importante**: El cambio se aplicará al final del período actual
6. Hasta entonces, seguirás con tu plan actual

**Resultado**: El cambio se aplicará en el próximo ciclo de facturación.

#### Ver Uso Actual vs Límites

1. Ve a **Facturación**
2. En la sección "Uso Actual" verás:
   - **Agentes**: X de Y permitidos
   - **Canales**: X de Y permitidos
   - **Mensajes**: Total del mes

**💡 Tip**: Si te acercas a los límites, considera cambiar a un plan superior.

---

## 6. Responder Manualmente una Conversación

### Cuándo Responder Manualmente

- El agente no puede responder adecuadamente
- Necesitas intervención humana para casos complejos
- Quieres personalizar la respuesta
- El cliente solicita hablar con una persona

### Cómo Responder

1. Ve a **Conversaciones**
2. Abre la conversación donde quieres responder
3. En la parte inferior, verás un campo de texto
4. Escribe tu mensaje
5. Haz clic en "Enviar" o presiona Enter
6. El mensaje se enviará por WhatsApp inmediatamente

**Resultado**: El cliente recibe tu respuesta manual.

### Continuar con Agente Automático

Después de responder manualmente, el agente puede continuar automáticamente:
- El agente seguirá respondiendo a nuevos mensajes
- Puedes intervenir cuando sea necesario
- La conversación se mantiene activa

**💡 Tip**: Puedes alternar entre respuestas automáticas y manuales según sea necesario.

---

## 7. Reprogramar o Cancelar una Cita

### Reprogramar una Cita

1. Ve a **Citas**
2. Abre la cita que quieres reprogramar
3. Haz clic en "Reprogramar"
4. Selecciona nueva fecha y hora
5. Opcionalmente, agrega una nota explicando el cambio
6. Haz clic en "Confirmar"
7. Se enviará una notificación al cliente con la nueva fecha

**Resultado**: La cita se actualiza y el cliente es notificado.

### Cancelar una Cita

1. Ve a **Citas**
2. Abre la cita que quieres cancelar
3. Haz clic en "Cancelar"
4. Opcionalmente, agrega una razón de cancelación
5. Haz clic en "Confirmar"
6. Se enviará una notificación al cliente

**Resultado**: La cita se cancela y se elimina del calendario.

### Enviar Recordatorio

1. Ve a **Citas**
2. Abre la cita
3. Haz clic en "Enviar Recordatorio"
4. Se enviará un mensaje al cliente recordándole la cita

**💡 Tip**: Los recordatorios se pueden enviar automáticamente 24 horas antes si lo configuras en las reglas del calendario.

---

## 8. Actualizar Información del Agente

### Cuándo Actualizar

- Cambiar la personalidad del agente
- Asignar nuevo conocimiento
- Cambiar de cuenta de WhatsApp
- Modificar configuración de idioma
- Conectar o desconectar calendario

### Cómo Actualizar

1. Ve a **Agentes**
2. Selecciona el agente que quieres actualizar
3. Haz clic en "Editar"
4. Modifica los campos que necesites:
   - Nombre
   - Personalidad
   - Colecciones de conocimiento
   - Calendario
   - Estado (Activo/Pausado)
5. Haz clic en "Guardar"

**Resultado**: Los cambios se aplican inmediatamente.

### Actualizar Conocimiento de un Agente

1. Agrega nuevo conocimiento a la base de conocimiento (ver [Flujo 3](#3-agregar-conocimiento-a-un-agente))
2. Ve a tu agente → **Editar**
3. En "Colecciones de Conocimiento"
4. Selecciona las nuevas colecciones
5. Haz clic en "Guardar"

**Resultado**: El agente ahora puede usar la nueva información.

**💡 Tip**: Actualiza el conocimiento regularmente cuando identifiques nuevas preguntas frecuentes o cambios en tu negocio.

---

## 🔗 Referencias

- **Para empezar**: Ver [Getting Started](/app/docs/getting-started)
- **Para entender módulos**: Ver [Módulos del Sistema](/app/docs/modules)
- **Para configurar integraciones**: Ver [Integraciones](/app/docs/integrations)
- **Para resolver problemas**: Ver [Troubleshooting](/app/docs/troubleshooting)

---

**Última actualización:** 2025-01-27

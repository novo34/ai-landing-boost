# Getting Started - Guía de Inicio Rápido

> **Versión:** 1.0  
> **Audiencia:** Usuarios nuevos del sistema  
> **Última actualización:** 2025-01-27

---

## 🎯 Bienvenido a AutomAI

Esta guía te ayudará a configurar tu cuenta y empezar a usar AutomAI en menos de 30 minutos.

---

## 📋 Paso 1: Crear tu Cuenta

### 1.1. Registrarse

1. Ve a la página de registro
2. Completa el formulario:
   - **Email**: Tu email de trabajo
   - **Contraseña**: Crea una contraseña segura (mínimo 8 caracteres)
   - **Nombre**: Tu nombre completo
   - **Nombre de la Empresa**: El nombre de tu organización
3. Acepta los términos y condiciones
4. Haz clic en "Registrarse"

**💡 Tip**: También puedes registrarte con Google o Microsoft haciendo clic en los botones correspondientes.

### 1.2. Verificar tu Email

1. Revisa tu bandeja de entrada (y spam)
2. Busca el email de "AutomAI - Verificación de Email"
3. Haz clic en el enlace de verificación
4. Serás redirigido al dashboard

**⚠️ Importante**: Si no verificas tu email, algunas funcionalidades estarán limitadas.

---

## 🏢 Paso 2: Configurar tu Empresa

### 2.1. Personalizar Branding

1. Ve a **Configuración** → **Branding**
2. **Subir Logo**:
   - Haz clic en "Subir Logo"
   - Selecciona una imagen (PNG, JPG, máximo 2MB)
   - El logo aparecerá en el dashboard y en emails
3. **Configurar Colores**:
   - Color Primario: El color principal de tu marca
   - Color Secundario: Color complementario
   - Estos colores se usarán en la interfaz y en el webchat
4. Haz clic en "Guardar"

### 2.2. Configuración General

1. Ve a **Configuración** → **General**
2. Configura:
   - **Zona Horaria**: Selecciona tu zona horaria
   - **País**: País donde opera tu empresa
   - **Idioma por Defecto**: Español o Inglés
3. Haz clic en "Guardar"

---

## 📱 Paso 3: Conectar WhatsApp

### 3.1. Elegir Proveedor

Tienes dos opciones para conectar WhatsApp:

**Opción A: Evolution API** (Recomendado para alto volumen)
- Requiere tener una instancia de Evolution API
- Más control y flexibilidad
- Ideal para empresas con muchos mensajes

**Opción B: WhatsApp Cloud API** (Más simple)
- Usa la API oficial de Meta
- Más fácil de configurar
- Ideal para empezar rápido

### 3.2. Configurar Evolution API

1. Ve a **Configuración** → **WhatsApp**
2. Haz clic en "Agregar Cuenta"
3. Selecciona "Evolution API"
4. Completa:
   - **Número de Teléfono**: Tu número de WhatsApp (con código de país, ej: +34600123456)
   - **API URL**: La URL de tu instancia de Evolution API
   - **API Key**: Tu clave de API
   - **Nombre de Instancia**: Un nombre para identificar esta cuenta
5. Haz clic en "Crear"
6. **Escanear QR Code**:
   - Se mostrará un código QR
   - Abre WhatsApp en tu teléfono
   - Ve a Configuración → Dispositivos vinculados → Vincular dispositivo
   - Escanea el código QR
7. Espera a que el estado cambie a "Conectado" (verde)

### 3.3. Configurar WhatsApp Cloud API

1. Ve a **Configuración** → **WhatsApp**
2. Haz clic en "Agregar Cuenta"
3. Selecciona "WhatsApp Cloud API"
4. **En Meta for Developers**:
   - Crea una app en [developers.facebook.com](https://developers.facebook.com)
   - Agrega el producto "WhatsApp"
   - Obtén tu Access Token y Phone Number ID
5. Completa en AutomAI:
   - **Número de Teléfono**: Tu número verificado en Meta
   - **Access Token**: Token de acceso de Meta
   - **Phone Number ID**: ID del número de teléfono
   - **Business Account ID**: ID de tu cuenta de negocio
6. Haz clic en "Crear"
7. El estado debería cambiar a "Conectado" automáticamente

**💡 Tip**: Si tienes problemas, ve a la sección de Troubleshooting.

---

## 🤖 Paso 4: Crear tu Primer Agente de IA

### 4.1. Crear el Agente

1. Ve a **Agentes** en el menú lateral
2. Haz clic en "Crear Agente"
3. Completa el formulario:
   - **Nombre**: Ej. "Agente de Ventas", "Soporte Técnico"
   - **Cuenta WhatsApp**: Selecciona la cuenta que configuraste
   - **Estrategia de Idioma**: 
     - "Auto Detectar": Detecta el idioma del mensaje y responde en el mismo
     - "Fijo": Siempre responde en un idioma específico
     - "Multi-idioma": Soporta varios idiomas
   - **Idioma por Defecto**: Si elegiste "Fijo", selecciona el idioma
   - **Personalidad**: 
     - Tono: Profesional, Amigable, Casual
     - Estilo: Conciso, Detallado, Conversacional
4. Haz clic en "Crear"

### 4.2. Configurar Personalidad (Opcional)

Puedes personalizar cómo habla tu agente:

- **Tono Profesional**: Para empresas formales, servicios profesionales
- **Tono Amigable**: Para atención al cliente, e-commerce
- **Tono Casual**: Para startups, servicios creativos

**Ejemplo de Personalidad**:
- Saludo: "Hola, ¿en qué puedo ayudarte?"
- Cierre: "¡Que tengas un buen día!"

---

## 📚 Paso 5: Agregar Conocimiento al Agente

### 5.1. Crear una Colección

1. Ve a **Base de Conocimiento**
2. Haz clic en "Nueva Colección"
3. Completa:
   - **Nombre**: Ej. "Información de Productos", "Preguntas Frecuentes"
   - **Descripción**: Breve descripción del contenido
   - **Idioma**: Español, Inglés, etc.
4. Haz clic en "Crear"

### 5.2. Agregar FAQs Manualmente

1. Dentro de tu colección, haz clic en "Agregar Fuente"
2. Selecciona "FAQ"
3. Completa:
   - **Título**: La pregunta
   - **Contenido**: La respuesta completa
   - **Idioma**: Selecciona el idioma
4. Haz clic en "Crear"
5. Repite para cada FAQ

**Ejemplo de FAQ**:
- **Título**: "¿Cuáles son sus horarios de atención?"
- **Contenido**: "Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 horas. Los sábados de 10:00 a 14:00 horas. Estamos cerrados los domingos."

### 5.3. Importar Documentos

1. Dentro de tu colección, haz clic en "Importar Documento"
2. Selecciona un archivo:
   - **Formatos soportados**: PDF, Word (.docx), Texto (.txt)
   - **Tamaño máximo**: 10MB
3. Haz clic en "Importar"
4. Espera a que se procese (puede tardar unos minutos)
5. El documento aparecerá en la lista de fuentes

**💡 Tip**: Los documentos grandes se dividen automáticamente en secciones para mejor búsqueda.

### 5.4. Importar URLs

1. Dentro de tu colección, haz clic en "Importar URL"
2. Ingresa la URL de una página web (ej: tu sitio web, blog, documentación)
3. Haz clic en "Importar"
4. El sistema leerá el contenido de la página y lo agregará al conocimiento

**💡 Tip**: Puedes importar múltiples URLs de tu sitio web para que el agente conozca toda tu información.

### 5.5. Asignar Conocimiento al Agente

1. Ve a **Agentes** → Selecciona tu agente
2. En la sección "Colecciones de Conocimiento"
3. Selecciona las colecciones que quieres que use este agente
4. Haz clic en "Guardar"

**💡 Tip**: Puedes asignar diferentes colecciones a diferentes agentes. Por ejemplo, un agente de ventas puede usar "Información de Productos" y otro agente de soporte puede usar "Preguntas Frecuentes".

---

## 📅 Paso 6: Configurar Calendario (Opcional)

Si quieres que tu agente pueda agendar citas automáticamente:

### 6.1. Conectar Google Calendar

1. Ve a **Configuración** → **Calendario**
2. Haz clic en "Nueva Integración"
3. Selecciona "Google Calendar"
4. **Autorizar con Google**:
   - Se abrirá una ventana de Google
   - Inicia sesión con tu cuenta de Google
   - Autoriza el acceso a tu calendario
5. Selecciona qué calendario usar (por defecto: "Principal")
6. Haz clic en "Guardar"

### 6.2. Crear Reglas de Disponibilidad

1. En **Configuración** → **Calendario** → **Reglas**
2. Haz clic en "Nueva Regla"
3. Selecciona el agente
4. Configura:
   - **Duración de Citas**: 30 min, 1 hora, etc.
   - **Horarios Disponibles**: Ej. 9:00-13:00, 15:00-18:00
   - **Días Disponibles**: Lunes a Viernes
   - **Tiempo de Buffer**: 15 min entre citas
5. Haz clic en "Guardar"

**💡 Tip**: Puedes crear múltiples reglas para diferentes agentes o diferentes horarios.

---

## ✅ Paso 7: Probar tu Configuración

### 7.1. Enviar Mensaje de Prueba

1. Abre WhatsApp en tu teléfono
2. Envía un mensaje al número que conectaste
3. El agente debería responder automáticamente
4. Prueba diferentes preguntas:
   - "Hola"
   - "¿Cuáles son sus horarios?"
   - "Quiero agendar una cita"

### 7.2. Verificar Conversación

1. Ve a **Conversaciones** en el dashboard
2. Deberías ver la conversación de prueba
3. Revisa que los mensajes se hayan guardado correctamente
4. Verifica que el agente respondió adecuadamente

### 7.3. Ajustar si es Necesario

Si el agente no responde bien:
- Revisa que el conocimiento esté asignado correctamente
- Agrega más FAQs o documentos
- Ajusta la personalidad del agente
- Verifica que la cuenta de WhatsApp esté "Conectada"

---

## 💳 Paso 8: Configurar Facturación

### 8.1. Ver Plan Actual

1. Ve a **Facturación**
2. Verás tu plan actual (probablemente "Trial")
3. Revisa los días restantes de tu trial

### 8.2. Suscribirse a un Plan

1. En **Facturación**, haz clic en "Ver Planes"
2. Revisa los planes disponibles:
   - **Básico**: Para empezar
   - **Pro**: Para empresas en crecimiento
   - **Enterprise**: Para grandes volúmenes
3. Selecciona el plan que mejor se adapte
4. Haz clic en "Suscribirse"
5. Serás redirigido a Stripe para completar el pago
6. Una vez completado, tu suscripción estará activa

**💡 Tip**: Durante el trial (14 días), tienes acceso completo a todas las funcionalidades.

---

## 👥 Paso 9: Invitar Miembros al Equipo

### 9.1. Invitar un Miembro

1. Ve a **Configuración** → **Equipo**
2. Haz clic en "Invitar Miembro"
3. Completa:
   - **Email**: Email de la persona a invitar
   - **Rol**: 
     - **ADMIN**: Puede gestionar todo excepto facturación
     - **AGENT**: Puede ver y responder conversaciones
     - **VIEWER**: Solo puede ver, no modificar
4. Haz clic en "Enviar Invitación"
5. La persona recibirá un email con el enlace de invitación

### 9.2. Aceptar Invitación (Para el Invitado)

1. Revisa tu email
2. Haz clic en el enlace de invitación
3. Si no tienes cuenta, se creará automáticamente
4. Si ya tienes cuenta, solo acepta la invitación
5. Serás redirigido al dashboard con acceso al tenant

---

## 🎉 ¡Listo!

Ya tienes AutomAI configurado y funcionando. Tu agente está listo para:
- ✅ Responder mensajes automáticamente
- ✅ Agendar citas (si configuraste calendario)
- ✅ Usar tu base de conocimiento para responder preguntas
- ✅ Funcionar 24/7 sin intervención

---

## 📚 Próximos Pasos

- **Aprender más sobre cada módulo**: Ver [Módulos del Sistema](/app/docs/modules)
- **Ver flujos de trabajo detallados**: Ver [Flujos de Trabajo](/app/docs/workflows)
- **Configurar integraciones avanzadas**: Ver [Integraciones](/app/docs/integrations)
- **Resolver problemas comunes**: Ver [Troubleshooting](/app/docs/troubleshooting)

---

## 💡 Consejos para Empezar

1. **Empieza Simple**: Crea un agente básico primero, luego agrega complejidad
2. **Agrega Conocimiento Gradualmente**: No necesitas importar todo de una vez
3. **Prueba Regularmente**: Envía mensajes de prueba para ver cómo responde el agente
4. **Monitorea Conversaciones**: Revisa las conversaciones para identificar qué mejorar
5. **Actualiza el Conocimiento**: Agrega nuevas FAQs cuando identifiques preguntas frecuentes

---

**Última actualización:** 2025-01-27

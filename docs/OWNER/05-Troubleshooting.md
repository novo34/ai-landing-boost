# Troubleshooting - Solución de Problemas

> **Versión:** 1.0  
> **Audiencia:** Usuarios del Sistema  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Problemas de WhatsApp](#1-problemas-de-whatsapp)
2. [Problemas con Agentes](#2-problemas-con-agentes)
3. [Problemas con Conversaciones](#3-problemas-con-conversaciones)
4. [Problemas con Citas](#4-problemas-con-citas)
5. [Problemas de Facturación](#5-problemas-de-facturación)
6. [Problemas de Acceso](#6-problemas-de-acceso)
7. [Problemas con Conocimiento](#7-problemas-con-conocimiento)

---

## 1. Problemas de WhatsApp

### Problema: "Cuenta Desconectada"

**Síntomas:**
- El estado de la cuenta muestra "Desconectado" (rojo)
- No recibes mensajes
- No puedes enviar mensajes

**Solución:**

**Si usas Evolution API:**
1. Ve a **Configuración** → **WhatsApp**
2. Abre la cuenta desconectada
3. Haz clic en "Reconectar"
4. Se mostrará un nuevo código QR
5. Escanea el QR con WhatsApp:
   - Abre WhatsApp en tu teléfono
   - Ve a Configuración → Dispositivos vinculados
   - Toca "Vincular dispositivo"
   - Escanea el código QR
6. Espera a que el estado cambie a "Conectado" (verde)

**Si usas WhatsApp Cloud API:**
1. Ve a **Configuración** → **WhatsApp**
2. Abre la cuenta desconectada
3. Verifica en Meta for Developers:
   - Que tu Access Token no haya expirado
   - Si expiró, genera uno nuevo
4. Actualiza el Access Token en AutomAI:
   - Haz clic en "Editar"
   - Ingresa el nuevo Access Token
   - Haz clic en "Guardar"
5. El estado debería cambiar a "Conectado"

**Prevención:**
- Para Evolution API: Mantén WhatsApp abierto en tu teléfono
- Para Cloud API: Usa Access Tokens permanentes cuando sea posible

---

### Problema: "No Recibo Mensajes"

**Síntomas:**
- La cuenta está "Conectada" pero no recibes mensajes
- Los mensajes enviados por clientes no aparecen en el sistema

**Solución:**

1. **Verificar que la cuenta está conectada**:
   - Ve a **Configuración** → **WhatsApp**
   - Verifica que el estado es "Conectado" (verde)

2. **Probar enviando un mensaje de prueba**:
   - Envía un mensaje desde otro número al número conectado
   - Debería aparecer en **Conversaciones** en unos segundos

3. **Si no aparece**:
   - **Evolution API**: Verifica que el webhook está configurado en Evolution API apuntando a tu backend
   - **WhatsApp Cloud API**: Verifica que el webhook está configurado en Meta Dashboard

4. **Reconectar la cuenta**:
   - Sigue los pasos de "Cuenta Desconectada" arriba

---

### Problema: "No Puedo Enviar Mensajes"

**Síntomas:**
- Intentas enviar un mensaje manualmente pero falla
- El estado del mensaje muestra "Fallido"

**Solución:**

1. **Verificar que la cuenta está conectada**:
   - Ve a **Configuración** → **WhatsApp**
   - El estado debe ser "Conectado"

2. **Verificar formato del número**:
   - El número debe tener formato internacional: +34600123456
   - No debe tener espacios ni guiones

3. **Verificar límites de WhatsApp**:
   - WhatsApp tiene límites de mensajes (ventana de 24 horas)
   - Si el cliente no te ha escrito en las últimas 24 horas, no puedes enviarle mensajes promocionales
   - Solo puedes responder a mensajes que recibiste

4. **Reintentar**:
   - Espera unos minutos y vuelve a intentar
   - Si persiste, reconecta la cuenta

---

## 2. Problemas con Agentes

### Problema: "El Agente No Responde"

**Síntomas:**
- Recibes mensajes pero el agente no responde automáticamente
- Las conversaciones aparecen pero sin respuesta

**Solución:**

1. **Verificar que el agente está activo**:
   - Ve a **Agentes**
   - Abre tu agente
   - Verifica que el estado es "Activo" (no "Pausado" o "Desactivado")
   - Si está pausado, cámbialo a "Activo"

2. **Verificar que tiene conocimiento asignado**:
   - Ve a tu agente → **Editar**
   - En "Colecciones de Conocimiento"
   - Verifica que hay al menos una colección seleccionada
   - Si no hay, selecciona colecciones y guarda

3. **Verificar que la cuenta de WhatsApp está conectada**:
   - Ve a **Configuración** → **WhatsApp**
   - Verifica que la cuenta asignada al agente está "Conectada"

4. **Probar con un mensaje simple**:
   - Envía "Hola" desde otro número
   - El agente debería responder con un saludo

**Si aún no responde:**
- Revisa los logs en **Conversaciones** para ver si hay errores
- Verifica que el agente tiene conocimiento básico (al menos un saludo)

---

### Problema: "El Agente Responde Incorrectamente"

**Síntomas:**
- El agente responde pero con información incorrecta
- Las respuestas no son relevantes a las preguntas

**Solución:**

1. **Agregar más conocimiento**:
   - Ve a **Base de Conocimiento**
   - Agrega FAQs específicas para las preguntas que no se responden bien
   - Importa documentos con la información correcta

2. **Revisar el conocimiento existente**:
   - Ve a **Base de Conocimiento**
   - Revisa las FAQs y documentos
   - Actualiza información incorrecta o desactualizada

3. **Asignar conocimiento específico al agente**:
   - Ve a tu agente → **Editar**
   - Asegúrate de que tiene asignadas las colecciones correctas
   - Si es un agente de ventas, debe tener "Información de Productos"
   - Si es de soporte, debe tener "Preguntas Frecuentes"

4. **Ajustar personalidad**:
   - Si las respuestas son muy cortas, cambia el estilo a "Detallado"
   - Si son muy largas, cámbialo a "Conciso"

---

### Problema: "No Puedo Crear Más Agentes"

**Síntomas:**
- Intentas crear un agente pero aparece un error
- Mensaje sobre límite de agentes

**Solución:**

1. **Verificar tu plan actual**:
   - Ve a **Facturación**
   - Revisa cuántos agentes permite tu plan:
     - Plan Básico: 3 agentes
     - Plan Pro: 10 agentes
     - Plan Enterprise: Ilimitados

2. **Ver cuántos agentes tienes**:
   - Ve a **Agentes**
   - Cuenta cuántos agentes activos tienes

3. **Opciones**:
   - **Eliminar agentes no usados**: Si tienes agentes que no usas, elimínalos
   - **Cambiar a un plan superior**: Si necesitas más agentes, cambia de plan

---

## 3. Problemas con Conversaciones

### Problema: "No Veo las Conversaciones"

**Síntomas:**
- Envías mensajes pero no aparecen en **Conversaciones**
- Las conversaciones no se cargan

**Solución:**

1. **Refrescar la página**:
   - Presiona F5 o haz clic en el botón de refrescar
   - A veces hay un retraso en la actualización

2. **Verificar filtros**:
   - En **Conversaciones**, verifica que no hay filtros activos
   - Asegúrate de que estás viendo "Todas" o "Activas"

3. **Verificar que WhatsApp está conectado**:
   - Ve a **Configuración** → **WhatsApp**
   - Verifica que hay al menos una cuenta "Conectada"

4. **Verificar permisos**:
   - Si eres VIEWER, solo puedes ver conversaciones
   - Si eres AGENT, ADMIN u OWNER, deberías poder ver todas

---

### Problema: "No Puedo Responder Manualmente"

**Síntomas:**
- Abres una conversación pero no puedes escribir
- El campo de texto no aparece o está deshabilitado

**Solución:**

1. **Verificar tu rol**:
   - Si eres VIEWER, no puedes enviar mensajes
   - Solo OWNER, ADMIN y AGENT pueden responder

2. **Verificar que WhatsApp está conectado**:
   - Ve a **Configuración** → **WhatsApp**
   - Debe haber al menos una cuenta "Conectada"

3. **Refrescar la página**:
   - A veces hay un problema temporal, refresca la página

---

## 4. Problemas con Citas

### Problema: "No Se Pueden Agendar Citas"

**Síntomas:**
- El cliente intenta agendar pero el agente dice que no hay disponibilidad
- Las citas no se crean

**Solución:**

1. **Verificar que hay calendario conectado**:
   - Ve a **Configuración** → **Calendario**
   - Debe haber al menos una integración "Activa"

2. **Verificar que hay reglas de disponibilidad**:
   - Ve a **Configuración** → **Calendario** → **Reglas**
   - Debe haber al menos una regla para el agente
   - Verifica que los horarios y días están configurados

3. **Verificar que el agente tiene calendario asignado**:
   - Ve a **Agentes** → Tu agente → **Editar**
   - En "Integración de Calendario", debe estar seleccionada una integración

4. **Verificar disponibilidad real**:
   - Ve a tu calendario (Google Calendar o Cal.com)
   - Verifica que no hay citas existentes bloqueando los horarios

---

### Problema: "Las Citas No Aparecen en mi Calendario"

**Síntomas:**
- Se crea la cita en AutomAI pero no aparece en Google Calendar o Cal.com

**Solución:**

1. **Verificar que la integración está activa**:
   - Ve a **Configuración** → **Calendario**
   - Verifica que la integración está "Activa" (no "Error")

2. **Reconectar la integración**:
   - Ve a **Configuración** → **Calendario**
   - Abre la integración
   - Haz clic en "Reconectar" o "Actualizar"
   - Sigue el proceso de autorización nuevamente

3. **Verificar el calendario correcto**:
   - Asegúrate de que estás revisando el calendario correcto
   - Si usas Google Calendar, verifica que estás viendo el calendario "Principal" o el que seleccionaste

---

## 5. Problemas de Facturación

### Problema: "Mi Trial Expiró"

**Síntomas:**
- Aparece un mensaje de que el trial expiró
- No puedes usar algunas funcionalidades

**Solución:**

1. **Suscribirte a un plan**:
   - Ve a **Facturación**
   - Haz clic en "Ver Planes"
   - Selecciona un plan
   - Completa el pago en Stripe
   - Tu suscripción se activará automáticamente

2. **Si ya pagaste pero sigue bloqueado**:
   - Espera unos minutos (puede haber un pequeño retraso)
   - Refresca la página
   - Si persiste, contacta soporte

---

### Problema: "Pago Fallido"

**Síntomas:**
- Recibes un email o notificación de "Pago Fallido"
- Tu cuenta muestra estado "Past Due" o "Bloqueado"

**Solución:**

1. **Actualizar método de pago**:
   - Ve a **Facturación**
   - Haz clic en "Gestionar Pago" o "Portal de Cliente"
   - Serás redirigido a Stripe
   - Actualiza tu tarjeta de crédito:
     - Ingresa una nueva tarjeta
     - O actualiza la fecha de expiración de la actual
   - Stripe intentará cobrar automáticamente

2. **Verificar que tienes fondos**:
   - Asegúrate de que tu tarjeta tiene fondos suficientes
   - Verifica que la tarjeta no esté bloqueada por tu banco

3. **Período de gracia**:
   - Tienes 7 días de gracia después de un pago fallido
   - Durante este tiempo, puedes seguir usando el sistema
   - Actualiza el método de pago antes de que termine el período

**⚠️ Importante**: Si no actualizas el método de pago en 7 días, tu cuenta se bloqueará y no podrás usar el sistema hasta que lo resuelvas.

---

### Problema: "No Puedo Cambiar de Plan"

**Síntomas:**
- Intentas cambiar de plan pero aparece un error
- El botón "Cambiar Plan" no funciona

**Solución:**

1. **Verificar que eres OWNER**:
   - Solo el OWNER puede cambiar de plan
   - Si eres ADMIN, necesitas que el OWNER lo haga

2. **Verificar estado de suscripción**:
   - Si tu suscripción está bloqueada, primero resuelve el pago
   - Luego podrás cambiar de plan

3. **Contactar soporte**:
   - Si el problema persiste, puede ser un problema técnico
   - Contacta al equipo de soporte

---

## 6. Problemas de Acceso

### Problema: "No Puedo Iniciar Sesión"

**Síntomas:**
- Ingresas email y contraseña pero no funciona
- Aparece "Credenciales inválidas"

**Solución:**

1. **Verificar email y contraseña**:
   - Asegúrate de que el email es correcto
   - Verifica que no hay errores de tipeo
   - Prueba copiar y pegar el email

2. **Restablecer contraseña** (si está disponible):
   - Si hay opción "¿Olvidaste tu contraseña?", úsala
   - Sigue las instrucciones del email

3. **Usar SSO**:
   - Si registraste con Google o Microsoft, intenta iniciar sesión con esos métodos
   - Haz clic en "Continuar con Google" o "Continuar con Microsoft"

4. **Verificar que el email está verificado**:
   - Si no verificaste tu email, algunas funciones pueden estar limitadas
   - Revisa tu email y verifica tu cuenta

---

### Problema: "Sesión Expirada"

**Síntomas:**
- Estás trabajando y de repente te pide iniciar sesión de nuevo
- Aparece "Sesión expirada"

**Solución:**

1. **Iniciar sesión nuevamente**:
   - Simplemente inicia sesión de nuevo
   - Tu trabajo no se pierde, solo necesitas autenticarte

2. **Usar "Recordarme"**:
   - Al iniciar sesión, marca "Recordarme" si está disponible
   - Esto extiende la duración de la sesión

**Prevención:**
- No dejes la sesión abierta por mucho tiempo sin actividad
- Si vas a estar inactivo, cierra sesión y vuelve a iniciar cuando regreses

---

### Problema: "No Tengo Acceso a una Funcionalidad"

**Síntomas:**
- Intentas acceder a una sección pero no aparece en el menú
- Aparece un mensaje de "Acceso denegado"

**Solución:**

1. **Verificar tu rol**:
   - Ve a **Configuración** → **Equipo**
   - Verifica qué rol tienes asignado
   - **VIEWER**: Solo puede ver, no modificar
   - **AGENT**: Puede ver y responder conversaciones
   - **ADMIN**: Puede gestionar operaciones
   - **OWNER**: Control total

2. **Solicitar cambio de rol**:
   - Si necesitas más permisos, contacta al OWNER de tu organización
   - El OWNER puede cambiar tu rol en **Configuración** → **Equipo**

3. **Verificar que la funcionalidad existe**:
   - Algunas funcionalidades pueden estar en desarrollo
   - Revisa la documentación para ver qué está disponible

---

## 7. Problemas con Conocimiento

### Problema: "El Agente No Usa el Conocimiento que Agregué"

**Síntomas:**
- Agregaste FAQs o documentos pero el agente no los usa
- Las respuestas no incluyen la información que agregaste

**Solución:**

1. **Verificar que el conocimiento está asignado al agente**:
   - Ve a **Agentes** → Tu agente → **Editar**
   - En "Colecciones de Conocimiento"
   - Verifica que las colecciones están seleccionadas
   - Si no están, selecciónalas y guarda

2. **Verificar que el conocimiento está procesado**:
   - Ve a **Base de Conocimiento**
   - Abre la fuente (FAQ, documento, URL)
   - Verifica que el estado es "Completado" (no "Procesando" o "Error")
   - Si está procesando, espera unos minutos

3. **Probar con preguntas específicas**:
   - Envía exactamente la pregunta que está en tu FAQ
   - El agente debería responder con la respuesta de la FAQ

4. **Agregar más contexto**:
   - A veces el agente necesita más información
   - Agrega más detalles a tus FAQs
   - Importa documentos más completos

---

### Problema: "No Puedo Importar un Documento"

**Síntomas:**
- Intentas importar un documento pero falla
- Aparece un error al importar

**Solución:**

1. **Verificar el formato**:
   - Formatos soportados: PDF, Word (.docx), Texto (.txt)
   - Si es otro formato, conviértelo primero

2. **Verificar el tamaño**:
   - Tamaño máximo: 10MB
   - Si es más grande, divídelo en archivos más pequeños

3. **Verificar que el archivo no está corrupto**:
   - Abre el archivo en tu computadora para verificar que funciona
   - Si no se abre, el archivo puede estar corrupto

4. **Intentar de nuevo**:
   - A veces hay problemas temporales
   - Espera unos minutos e intenta de nuevo

---

### Problema: "La Importación de URL No Funciona"

**Síntomas:**
- Intentas importar una URL pero falla
- El contenido no se importa

**Solución:**

1. **Verificar que la URL es accesible**:
   - Abre la URL en tu navegador
   - Verifica que la página carga correctamente
   - Si requiere login, no se puede importar

2. **Verificar que la URL es pública**:
   - Las URLs privadas o que requieren autenticación no se pueden importar
   - Solo URLs públicas y accesibles

3. **Verificar el formato de la URL**:
   - Debe empezar con http:// o https://
   - Debe ser una URL válida

4. **Intentar con otra URL**:
   - Prueba con una URL diferente para verificar que el problema es específico
   - Algunas páginas pueden tener protección contra scraping

---

## 🔍 Cómo Obtener Ayuda

### Si el Problema Persiste

1. **Revisar esta documentación**: Busca el problema específico en esta guía
2. **Verificar configuración**: Asegúrate de que todo está configurado correctamente
3. **Contactar soporte**: Si nada funciona, contacta al equipo de soporte con:
   - Descripción detallada del problema
   - Pasos para reproducirlo
   - Capturas de pantalla si es posible
   - Tu email y nombre de empresa

### Información Útil para Soporte

Cuando contactes soporte, proporciona:
- **Tu email**: Para identificar tu cuenta
- **Nombre de tu empresa**: Para identificar tu tenant
- **Descripción del problema**: Qué está pasando exactamente
- **Cuándo empezó**: Fecha y hora aproximada
- **Qué intentaste**: Pasos que ya probaste para resolverlo
- **Capturas de pantalla**: Si es posible, adjunta imágenes del problema

---

## 🔗 Referencias

- **Para empezar**: Ver [Getting Started](/app/docs/getting-started)
- **Para entender módulos**: Ver [Módulos del Sistema](/app/docs/modules)
- **Para ver flujos**: Ver [Flujos de Trabajo](/app/docs/workflows)
- **Para configurar integraciones**: Ver [Integraciones](/app/docs/integrations)

---

**Última actualización:** 2025-01-27

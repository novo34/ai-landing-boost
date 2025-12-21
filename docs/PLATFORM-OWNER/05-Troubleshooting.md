# Solución de Problemas - Panel de Plataforma

> **Versión:** 1.0  
> **Audiencia:** PLATFORM_OWNER (Dueños del SaaS)  
> **Última actualización:** 2025-01-27

---

## 📋 Índice

1. [Problemas de Acceso](#problemas-de-acceso)
2. [Problemas con Tenants](#problemas-con-tenants)
3. [Problemas con Tickets](#problemas-con-tickets)
4. [Problemas con Operaciones Propias](#problemas-con-operaciones-propias)
5. [Problemas con Integraciones](#problemas-con-integraciones)
6. [Problemas de Rendimiento](#problemas-de-rendimiento)
7. [Errores Comunes](#errores-comunes)

---

## Problemas de Acceso

### Problema: "No tengo acceso al panel de plataforma"

**Síntomas:**
- Al intentar acceder a `/platform`, eres redirigido a `/app`
- Ves un mensaje de "Acceso denegado"
- No aparece el menú de plataforma

**Solución:**

1. **Verificar Rol de Usuario**
   ```sql
   -- Verificar en base de datos
   SELECT * FROM users WHERE email = 'tu-email@ejemplo.com';
   -- Verificar platformRole
   ```

2. **Asignar Rol PLATFORM_OWNER**
   - Contacta al administrador del sistema
   - O ejecuta en base de datos:
     ```sql
     UPDATE users 
     SET platformRole = 'PLATFORM_OWNER' 
     WHERE email = 'tu-email@ejemplo.com';
     ```

3. **Cerrar Sesión y Volver a Iniciar**
   - Cierra sesión completamente
   - Limpia cookies del navegador
   - Inicia sesión nuevamente

4. **Verificar Token JWT**
   - El token JWT debe incluir `platformRole: 'PLATFORM_OWNER'`
   - Si no está, el token necesita regenerarse

---

### Problema: "Error 404 en endpoints de operations"

**Síntomas:**
- Errores 404 al acceder a `/platform/operations/*`
- Los endpoints no responden
- Mensajes en consola: "GET /platform/operations/agents 404"

**Solución:**

1. **Verificar que el Backend esté Corriendo**
   ```bash
   # Verificar proceso del backend
   ps aux | grep "nest start"
   # O en Windows
   tasklist | findstr node
   ```

2. **Reiniciar el Backend**
   - El módulo `OperationsModule` debe estar cargado
   - Reinicia el servidor backend:
     ```bash
     # Detener
     Ctrl+C
     # Reiniciar
     npm run start:dev
     # O
     pnpm run start:dev
     ```

3. **Verificar Importación del Módulo**
   - Verifica que `OperationsModule` esté en `app.module.ts`:
     ```typescript
     imports: [
       // ...
       OperationsModule,
       // ...
     ]
     ```

4. **Verificar Rutas del Controller**
   - El controller debe tener `@Controller('platform/operations')`
   - Verifica que los métodos estén correctamente decorados

---

## Problemas con Tenants

### Problema: "No puedo crear un tenant"

**Síntomas:**
- El formulario no se envía
- Error al crear tenant
- Mensaje de validación

**Solución:**

1. **Verificar Campos Requeridos**
   - Nombre del tenant
   - Email del owner (debe ser válido)
   - Plan seleccionado (debe existir)
   - País y región

2. **Verificar Unicidad del Slug**
   - El slug se genera automáticamente del nombre
   - Si hay conflicto, el sistema lo indica
   - Cambia el nombre del tenant

3. **Verificar Límites del Plan**
   - El plan seleccionado debe tener límites válidos
   - Si no hay planes, crea uno primero

4. **Revisar Logs del Backend**
   ```bash
   # Ver logs en tiempo real
   tail -f logs/error.log
   ```

---

### Problema: "Un tenant no puede iniciar sesión"

**Síntomas:**
- El usuario del tenant no puede iniciar sesión
- Error de autenticación
- Usuario no encontrado

**Solución:**

1. **Verificar que el Usuario Exista**
   ```sql
   SELECT * FROM users WHERE email = 'email-del-tenant@ejemplo.com';
   ```

2. **Verificar Membership del Tenant**
   ```sql
   SELECT * FROM tenantmembership 
   WHERE userId = 'user-id' AND tenantId = 'tenant-id';
   ```

3. **Verificar Estado del Tenant**
   - El tenant debe estar en estado `ACTIVE`
   - Si está `SUSPENDED`, reactívalo

4. **Verificar Email Verificado**
   - El usuario debe tener el email verificado
   - Si no, reenvía el email de verificación

---

## Problemas con Tickets

### Problema: "No recibo notificaciones de nuevos tickets"

**Síntomas:**
- No recibes emails de nuevos tickets
- No aparecen notificaciones en el panel

**Solución:**

1. **Verificar Configuración de Email**
   - Ve a **Configuración** → **Notificaciones**
   - Verifica que el email esté configurado correctamente
   - Prueba enviando un email de prueba

2. **Verificar Preferencias de Notificación**
   - Revisa tus preferencias de usuario
   - Asegúrate de que las notificaciones estén habilitadas

3. **Verificar Spam**
   - Revisa la carpeta de spam
   - Agrega el dominio a contactos seguros

4. **Verificar Flujos N8N**
   - Si usas N8N para notificaciones, verifica que el flujo esté activo
   - Revisa los logs de ejecución

---

### Problema: "No puedo agregar mensajes a un ticket"

**Síntomas:**
- El botón "Agregar Mensaje" no funciona
- Error al enviar mensaje
- El mensaje no se guarda

**Solución:**

1. **Verificar Permisos**
   - Debes tener rol `PLATFORM_OWNER` o `PLATFORM_SUPPORT`
   - Verifica tu rol actual

2. **Verificar Estado del Ticket**
   - El ticket no debe estar cerrado
   - Si está cerrado, ábrelo primero

3. **Verificar Campos del Mensaje**
   - El mensaje no puede estar vacío
   - Debe tener al menos algunos caracteres

4. **Revisar Logs**
   - Revisa los logs del backend para ver el error específico
   - Verifica la conexión a la base de datos

---

## Problemas con Operaciones Propias

### Problema: "No veo mis agentes/canales/conversaciones"

**Síntomas:**
- Las páginas de operaciones propias están vacías
- Error al cargar datos
- Mensaje "No hay datos disponibles"

**Solución:**

1. **Verificar Tenant de Operaciones Propias**
   - El sistema crea automáticamente un tenant `platform-owner`
   - Verifica que exista:
     ```sql
     SELECT * FROM tenant WHERE slug = 'platform-owner';
     ```

2. **Verificar Membership**
   - Tu usuario debe ser miembro del tenant `platform-owner`:
     ```sql
     SELECT * FROM tenantmembership 
     WHERE userId = 'tu-user-id' 
     AND tenantId = (SELECT id FROM tenant WHERE slug = 'platform-owner');
     ```

3. **Crear Contenido**
   - Si el tenant existe pero está vacío, crea:
     - Agentes en **Mis Agentes** → **Crear**
     - Canales en **Mis Canales** → **Crear**
   - Las conversaciones aparecen cuando hay actividad

4. **Verificar Endpoints**
   - Los endpoints `/platform/operations/*` deben estar funcionando
   - Verifica la sección de "Problemas de Acceso" arriba

---

### Problema: "Mis agentes no responden"

**Síntomas:**
- Los agentes están activos pero no responden
- No se procesan mensajes
- Conversaciones no se crean

**Solución:**

1. **Verificar Estado del Agente**
   - El agente debe estar en estado `ACTIVE`
   - Verifica en **Mis Agentes** → Detalles del agente

2. **Verificar Canal Asociado**
   - El agente debe tener un canal asociado
   - El canal debe estar `ACTIVE` y conectado

3. **Verificar Cuenta de WhatsApp**
   - Si usa WhatsApp, la cuenta debe estar conectada
   - Verifica el estado en **Mis Canales**

4. **Verificar Base de Conocimiento**
   - El agente debe tener colecciones de conocimiento asociadas
   - Verifica en la configuración del agente

5. **Revisar Logs**
   - Revisa los logs del orquestador de conversaciones
   - Busca errores en el procesamiento de mensajes

---

## Problemas con Integraciones

### Problema: "Los flujos N8N no se ejecutan"

**Síntomas:**
- Los flujos están activos pero no se ejecutan
- No aparecen logs de ejecución
- Los webhooks no llegan a N8N

**Solución:**

1. **Verificar Configuración de N8N**
   - Ve a **Configuración** → **Integraciones** → **N8N**
   - Verifica que la URL y API Key sean correctas
   - Prueba la conexión

2. **Verificar Estado del Flujo**
   - El flujo debe estar `ACTIVE` en la plataforma
   - El workflow debe estar activo en N8N también

3. **Verificar Webhooks**
   - Los webhooks deben estar configurados correctamente
   - Verifica que N8N esté escuchando en el endpoint correcto

4. **Revisar Logs de N8N**
   - Accede a N8N y revisa los logs de ejecución
   - Busca errores en los workflows

5. **Probar Manualmente**
   - Ejecuta el workflow manualmente en N8N
   - Si funciona manualmente, el problema es con los triggers

---

### Problema: "Stripe no procesa pagos"

**Síntomas:**
- Los pagos no se procesan automáticamente
- Las suscripciones no se crean en Stripe
- Errores al cambiar planes

**Solución:**

1. **Verificar Credenciales de Stripe**
   - Ve a **Configuración** → **Integraciones** → **Stripe**
   - Verifica que las API keys sean correctas
   - Asegúrate de usar las keys del entorno correcto (test/producción)

2. **Verificar Webhooks de Stripe**
   - En Stripe, verifica que el webhook esté configurado
   - Verifica que el endpoint sea accesible
   - Revisa los logs de webhooks en Stripe

3. **Verificar Configuración de Productos**
   - Los planes deben tener productos correspondientes en Stripe
   - Los precios deben coincidir

4. **Revisar Logs**
   - Revisa los logs del backend para errores de Stripe
   - Verifica las respuestas de la API de Stripe

---

## Problemas de Rendimiento

### Problema: "El panel es lento"

**Síntomas:**
- Las páginas tardan en cargar
- Las consultas son lentas
- Timeouts en requests

**Solución:**

1. **Verificar Carga del Servidor**
   ```bash
   # Ver uso de CPU y memoria
   top
   # O en Windows
   taskmgr
   ```

2. **Optimizar Consultas**
   - Revisa las consultas a la base de datos
   - Agrega índices si es necesario
   - Usa paginación en listas grandes

3. **Verificar Conexión a Base de Datos**
   - Verifica que la conexión sea estable
   - Revisa el pool de conexiones
   - Considera aumentar el pool si hay muchas conexiones

4. **Cachear Datos**
   - Implementa caché para datos que no cambian frecuentemente
   - Usa Redis o similar para caché

5. **Revisar Logs de Rendimiento**
   - Identifica endpoints lentos
   - Optimiza las consultas más lentas

---

## Errores Comunes

### Error: "429 Too Many Requests"

**Causa**: Demasiadas peticiones en un corto período.

**Solución:**
- Espera unos segundos antes de volver a intentar
- Reduce la frecuencia de peticiones
- Implementa debouncing en el frontend

---

### Error: "401 Unauthorized"

**Causa**: Token JWT expirado o inválido.

**Solución:**
1. Cierra sesión y vuelve a iniciar
2. Verifica que el token no haya expirado
3. Limpia cookies y localStorage

---

### Error: "500 Internal Server Error"

**Causa**: Error en el servidor.

**Solución:**
1. Revisa los logs del backend
2. Verifica la conexión a la base de datos
3. Verifica que todos los servicios estén corriendo
4. Contacta al equipo de desarrollo si persiste

---

### Error: "Select.Item must have a value prop"

**Causa**: Error en componentes Select de la UI.

**Solución:**
- Este error ya está corregido en la versión actual
- Si aparece, actualiza el código del frontend
- Verifica que los SelectItem tengan valores válidos (no vacíos)

---

## Obtener Ayuda

### Logs y Diagnóstico

1. **Logs del Backend**
   ```bash
   # Ver logs en tiempo real
   tail -f logs/combined.log
   # Ver solo errores
   tail -f logs/error.log
   ```

2. **Logs del Frontend**
   - Abre la consola del navegador (F12)
   - Revisa errores en la pestaña Console
   - Revisa requests fallidos en Network

3. **Logs de Base de Datos**
   - Revisa logs de MySQL/PostgreSQL
   - Verifica consultas lentas
   - Revisa conexiones activas

### Contactar Soporte

Si el problema persiste:
1. Documenta el error completo
2. Incluye pasos para reproducir
3. Adjunta logs relevantes
4. Contacta al equipo de desarrollo

---

**Última actualización:** 2025-01-27

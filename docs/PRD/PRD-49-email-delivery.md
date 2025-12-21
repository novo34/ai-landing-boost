# PRD-49: Sistema de Entrega de Emails (Email Delivery)

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **Prioridad:** 🟠 ALTA  
> **Estado:** Pendiente  
> **Bloque:** A - Fundamentos  
> **Dependencias:** PRD-07 (Auth), PRD-46 (Platform Owner)

---

## Objetivo

Implementar un sistema completo de entrega de emails multi-tenant con soporte SMTP configurable por tenant, cola de envíos con reintentos automáticos, cifrado de credenciales, y gestión desde UI tanto para tenants como para Platform Owner.

---

## Alcance INCLUIDO

- ✅ Configuración SMTP por tenant (fromName, fromEmail, replyTo, host, port, secure, username, password, tls)
- ✅ Configuración SMTP global del Platform (fallback cuando tenant no tiene SMTP)
- ✅ Envío de email de prueba desde UI con verificación de conexión
- ✅ Cola de envíos (Outbox pattern) en MySQL sin servicios externos
- ✅ Worker/processor en NestJS con reintentos automáticos (backoff exponencial + jitter)
- ✅ Cifrado AES-256-GCM de credenciales SMTP (password)
- ✅ RBAC completo (OWNER/ADMIN para tenant, PLATFORM_OWNER para global)
- ✅ Auditoría de cambios en configuración SMTP
- ✅ UI de gestión en `/app/settings/email` (tenant) y `/platform/settings/email` (global)
- ✅ Logs de envíos y errores visibles en UI
- ✅ i18n completo (sin textos hardcodeados)
- ✅ Idempotencia en envíos (idempotencyKey)
- ✅ Rate limiting básico por tenant

---

## Alcance EXCLUIDO

- ❌ Adjuntos en emails (v1 sin adjuntos, pero diseño preparado para v2)
- ❌ Plantillas avanzadas de email (v1: subject/body simples, hooks para v2)
- ❌ Proveedores externos (SendGrid, Mailgun, etc.) - solo SMTP
- ❌ Webhooks de entrega (bounce, delivery, open tracking)
- ❌ Estadísticas avanzadas (solo logs básicos en v1)
- ❌ Múltiples proveedores SMTP por tenant (v1: uno por tenant)

---

## Requisitos Funcionales

### RF-01: Configuración SMTP por Tenant

**Descripción:** Cada tenant debe poder configurar su propio servidor SMTP para envío de emails.

**Campos configurables:**
- `fromName`: Nombre del remitente (ej: "Mi Empresa")
- `fromEmail`: Email del remitente (ej: "noreply@miempresa.com")
- `replyTo`: Email de respuesta (opcional, por defecto igual a fromEmail)
- `host`: Servidor SMTP (ej: "smtp.gmail.com")
- `port`: Puerto SMTP (ej: 587, 465, 25)
- `secure`: Boolean - true para SSL/TLS (puerto 465), false para STARTTLS (puerto 587)
- `username`: Usuario SMTP (email o usuario)
- `password`: Contraseña SMTP (cifrada en DB)
- `tls`: Configuración TLS opcional (rejectUnauthorized, ciphers, etc.)

**Flujo:**
1. Usuario con rol OWNER o ADMIN accede a `/app/settings/email`
2. Completa formulario con datos SMTP
3. Al guardar, password se cifra con AES-256-GCM antes de almacenar
4. Sistema valida formato de email y host
5. Se registra auditoría (quién, cuándo, qué cambió)

**Validaciones:**
- `fromEmail` debe ser email válido
- `host` no puede estar vacío
- `port` debe ser número entre 1-65535
- `username` y `password` requeridos si se configura SMTP
- `secure` y `port` deben ser consistentes (465 → secure=true, 587 → secure=false)

**Permisos:**
- OWNER: Puede ver y modificar configuración
- ADMIN: Puede ver y modificar configuración
- AGENT: No tiene acceso
- VIEWER: No tiene acceso

---

### RF-02: Configuración SMTP Global del Platform

**Descripción:** El Platform Owner debe poder configurar un SMTP global que se usa como fallback cuando un tenant no tiene SMTP configurado.

**Flujo:**
1. Platform Owner accede a `/platform/settings/email`
2. Configura SMTP global con mismos campos que tenant SMTP
3. Password se cifra igual que tenant SMTP
4. Esta configuración es única para toda la plataforma

**Resolución de Provider:**
1. Si tenant tiene SMTP configurado → usar tenant SMTP
2. Si tenant NO tiene SMTP → usar Platform SMTP (si existe)
3. Si ninguno existe → error claro al intentar enviar

**Permisos:**
- PLATFORM_OWNER: Puede ver y modificar SMTP global
- PLATFORM_ADMIN: Puede ver y modificar SMTP global
- PLATFORM_SUPPORT: Solo lectura
- Tenants: No tienen acceso a esta configuración

---

### RF-03: Envío de Email de Prueba

**Descripción:** Desde la UI, usuarios autorizados deben poder enviar un email de prueba para verificar la configuración SMTP.

**Flujo:**
1. Usuario hace clic en botón "Enviar email de prueba"
2. Se abre modal con campos:
   - `to`: Email destinatario (requerido)
   - `subject`: Asunto (opcional, por defecto "Email de prueba")
3. Usuario confirma envío
4. Backend:
   - Verifica conexión SMTP (test connection)
   - Si conexión OK, envía email de prueba
   - Registra resultado en EmailLog
5. UI muestra resultado (éxito o error con detalles)

**Validaciones:**
- `to` debe ser email válido
- Debe existir SMTP configurado (tenant o global)
- Conexión SMTP debe ser exitosa antes de enviar

**Permisos:**
- Tenant: OWNER/ADMIN pueden enviar prueba usando su SMTP
- Platform: PLATFORM_OWNER/PLATFORM_ADMIN pueden enviar prueba usando SMTP global

---

### RF-04: Cola de Envíos (Outbox Pattern)

**Descripción:** Todos los emails se encolan en tabla `EmailOutbox` antes de ser enviados, permitiendo reintentos automáticos y trazabilidad.

**Estados del Email:**
- `QUEUED`: Email encolado, esperando procesamiento
- `SENDING`: Email siendo procesado por worker
- `SENT`: Email enviado exitosamente
- `FAILED`: Email falló después de todos los reintentos
- `CANCELLED`: Email cancelado manualmente

**Campos del Outbox:**
- `id`: ID único
- `tenantId`: Tenant que envía (nullable para emails del platform)
- `idempotencyKey`: Clave única para evitar duplicados (generada por caller)
- `to`: Email destinatario
- `cc`: Emails en copia (opcional, JSON array)
- `bcc`: Emails en copia oculta (opcional, JSON array)
- `subject`: Asunto
- `body`: Cuerpo del email (HTML o texto plano)
- `bodyType`: "html" | "text"
- `status`: Estado actual (enum)
- `attempts`: Número de intentos realizados
- `maxAttempts`: Máximo de intentos (default: 5)
- `nextRetryAt`: Fecha/hora del próximo reintento (null si no hay más reintentos)
- `lastError`: Último error registrado (null si no hay errores)
- `sentAt`: Fecha/hora de envío exitoso (null si no enviado)
- `provider`: "TENANT" | "PLATFORM" (indica qué SMTP se usó)
- `metadata`: JSON opcional con datos adicionales
- `createdAt`: Fecha de creación
- `updatedAt`: Fecha de última actualización

**Idempotencia:**
- Cada envío debe incluir `idempotencyKey` único
- Si existe email con misma `idempotencyKey` y estado `SENT` o `SENDING`, no se crea duplicado
- Permite reintentos seguros desde frontend sin duplicar emails

---

### RF-05: Worker/Processor de Emails

**Descripción:** Servicio en NestJS que procesa la cola de emails periódicamente, con manejo de concurrencia y reintentos.

**Características:**
- Ejecución periódica: `@Cron` cada X segundos (configurable, default: 30s)
- "Claim" seguro: Usa transacción con locking para evitar doble procesamiento
- Backoff exponencial: Reintentos con delay creciente (1min, 2min, 4min, 8min, 16min)
- Jitter: Añade variabilidad aleatoria (±20%) al delay para evitar thundering herd
- Timeouts: Timeout de 30s por intento de envío
- Rate limiting: Máximo N emails por minuto por tenant (configurable, default: 10)

**Algoritmo de Procesamiento:**
1. Worker busca emails con `status = QUEUED` y `nextRetryAt <= now()` (o null)
2. Ordena por `createdAt` ASC (FIFO)
3. Limita batch size (ej: 50 emails por ciclo)
4. Para cada email:
   - Inicia transacción
   - Intenta "claim" (UPDATE ... WHERE id = ? AND status = 'QUEUED')
   - Si claim exitoso, cambia a `SENDING`
   - Fuera de transacción, intenta envío SMTP
   - Si éxito: actualiza a `SENT`, setea `sentAt`
   - Si fallo: incrementa `attempts`, calcula `nextRetryAt`, actualiza `lastError`
   - Si `attempts >= maxAttempts`: cambia a `FAILED`

**Concurrencia:**
- Múltiples workers pueden ejecutarse simultáneamente
- El "claim" con transacción asegura que solo un worker procesa cada email
- No se requiere lock a nivel de aplicación

---

### RF-06: Cifrado de Credenciales SMTP

**Descripción:** Las contraseñas SMTP deben almacenarse cifradas en la base de datos usando AES-256-GCM.

**Implementación:**
- Algoritmo: AES-256-GCM
- Key: `ENCRYPTION_KEY` desde variable de entorno (obligatorio, 32 bytes)
- IV: Generado aleatoriamente por cada cifrado (12 bytes para GCM)
- Tag de autenticación: Incluido automáticamente por GCM

**Flujo:**
1. Frontend envía password en texto plano (solo al guardar/actualizar)
2. Backend cifra password antes de guardar en DB
3. Backend NUNCA devuelve password real al frontend
4. Al leer configuración, password se devuelve como `"***"` o campo omitido
5. Al usar SMTP, backend descifra password internamente

**Seguridad:**
- `ENCRYPTION_KEY` debe ser secreto y no commitearse
- Password nunca se loguea ni aparece en errores
- Si `ENCRYPTION_KEY` no está configurado, sistema no inicia

---

### RF-07: UI de Gestión - Tenant

**Descripción:** Pantalla en `/app/settings/email` para que tenants gestionen su SMTP.

**Secciones:**

1. **Formulario de Configuración SMTP**
   - Campos: fromName, fromEmail, replyTo, host, port, secure, username, password
   - Validación en tiempo real
   - Botón "Guardar configuración"
   - Botón "Enviar email de prueba" (abre modal)

2. **Estado de Configuración**
   - Indicador visual: "Configurado" / "No configurado"
   - Última actualización (timestamp)
   - Quién actualizó (si aplica)

3. **Tabla de Últimos Envíos**
   - Columnas: Fecha, Destinatario, Asunto, Estado, Acciones
   - Paginación (20 por página)
   - Filtros: Estado, rango de fechas
   - Orden: Más recientes primero

4. **Tabla de Últimos Errores**
   - Similar a envíos, pero solo emails con estado `FAILED`
   - Muestra `lastError` para debugging

**i18n:**
- Todas las etiquetas, mensajes y errores deben usar claves i18n
- Namespace: `common` (o nuevo `email` si se prefiere)
- Idiomas: es, en (mínimo), resto según estándar del proyecto

---

### RF-08: UI de Gestión - Platform Owner

**Descripción:** Pantalla en `/platform/settings/email` para que Platform Owner gestione SMTP global.

**Secciones:**
- Similar a UI de tenant, pero:
  - Solo una configuración global (no por tenant)
  - Puede ver logs de todos los tenants (opcional en v1, o solo global)
  - Indicador de uso: "X tenants usando este SMTP como fallback"

**Permisos:**
- PLATFORM_OWNER: Acceso completo
- PLATFORM_ADMIN: Acceso completo
- PLATFORM_SUPPORT: Solo lectura

---

### RF-09: Auditoría de Cambios

**Descripción:** Registrar quién, cuándo y qué cambió en la configuración SMTP.

**Campos de Auditoría:**
- `userId`: Usuario que hizo el cambio
- `tenantId`: Tenant afectado (null si es cambio global)
- `action`: "CREATE" | "UPDATE" | "DELETE"
- `field`: Campo modificado (opcional, para cambios granulares)
- `oldValue`: Valor anterior (hash para password, no texto plano)
- `newValue`: Valor nuevo (hash para password)
- `ipAddress`: IP del usuario
- `userAgent`: User agent del navegador
- `createdAt`: Timestamp

**Implementación:**
- Usar tabla `PlatformAuditLog` existente o crear `EmailSettingsAuditLog`
- Registrar en cada guardar/actualizar configuración
- No registrar password en texto plano (solo hash o indicador de cambio)

---

### RF-10: Logs y Observabilidad

**Descripción:** Sistema de logs estructurados para debugging y monitoreo.

**Logs a Registrar:**
- Envío exitoso: `Email sent successfully: {id}, to: {to}, tenant: {tenantId}`
- Envío fallido: `Email failed: {id}, error: {error}, attempts: {attempts}`
- Cambio de configuración: `SMTP config updated: tenant={tenantId}, user={userId}`
- Error de cifrado: `Encryption error: {error}` (sin exponer secretos)
- Worker cycle: `Worker processed {count} emails, {success} sent, {failed} failed`

**Métricas Simples (en logs):**
- Emails enviados por tenant (últimas 24h)
- Emails fallidos por tenant (últimas 24h)
- Tasa de éxito global

**Trazas de Error:**
- Incluir stack trace para errores inesperados
- Filtrar secretos (password, tokens) antes de loguear
- No loguear contenido completo de emails (solo metadata)

---

## Requisitos No Funcionales

### RNF-01: Performance
- Worker debe procesar al menos 100 emails/minuto
- UI debe cargar en < 2 segundos
- Validación SMTP (test connection) debe completar en < 5 segundos

### RNF-02: Seguridad
- Password SMTP nunca se expone al frontend
- Cifrado AES-256-GCM con key de 32 bytes mínimo
- Rate limiting por tenant para prevenir abuso
- Validación de inputs (email format, port range, etc.)

### RNF-03: Confiabilidad
- Reintentos automáticos con backoff exponencial
- Idempotencia para evitar duplicados
- Transacciones para garantizar consistencia
- Logs estructurados para debugging

### RNF-04: Escalabilidad
- Worker puede ejecutarse en múltiples instancias sin conflictos
- Outbox pattern permite procesamiento asíncrono
- Índices en DB para queries eficientes

---

## Criterios de Aceptación

### CA-01: Configuración SMTP Tenant
- [ ] Tenant OWNER puede configurar SMTP desde `/app/settings/email`
- [ ] Tenant ADMIN puede configurar SMTP desde `/app/settings/email`
- [ ] AGENT y VIEWER no pueden acceder a configuración
- [ ] Password se cifra antes de guardar
- [ ] Password nunca se devuelve al frontend
- [ ] Validaciones de formato funcionan correctamente
- [ ] Auditoría se registra al guardar

### CA-02: Configuración SMTP Global
- [ ] Platform Owner puede configurar SMTP global desde `/platform/settings/email`
- [ ] SMTP global se usa como fallback cuando tenant no tiene SMTP
- [ ] Si tenant tiene SMTP, se usa tenant SMTP (no global)
- [ ] Si ninguno existe, error claro al intentar enviar

### CA-03: Envío de Prueba
- [ ] Botón "Enviar email de prueba" funciona desde UI tenant
- [ ] Botón "Enviar email de prueba" funciona desde UI platform
- [ ] Modal permite ingresar destinatario y asunto opcional
- [ ] Test de conexión SMTP se ejecuta antes de enviar
- [ ] Email de prueba se envía correctamente
- [ ] Resultado se muestra en UI (éxito o error)
- [ ] Log se registra en EmailLog

### CA-04: Cola de Envíos
- [ ] Emails se encolan en `EmailOutbox` antes de enviar
- [ ] Estados se actualizan correctamente (QUEUED → SENDING → SENT/FAILED)
- [ ] Idempotencia funciona (mismo `idempotencyKey` no crea duplicados)
- [ ] Campos `attempts`, `maxAttempts`, `nextRetryAt`, `lastError` se actualizan correctamente

### CA-05: Worker/Processor
- [ ] Worker ejecuta periódicamente (cada 30s por defecto)
- [ ] Worker procesa emails en estado QUEUED
- [ ] "Claim" seguro funciona (no hay doble procesamiento)
- [ ] Reintentos con backoff exponencial funcionan
- [ ] Jitter se aplica a delays
- [ ] Timeouts funcionan (30s por intento)
- [ ] Rate limiting funciona (máx 10 emails/min por tenant)
- [ ] Múltiples workers pueden ejecutarse sin conflictos

### CA-06: Cifrado
- [ ] Password se cifra con AES-256-GCM antes de guardar
- [ ] Password se descifra correctamente al usar SMTP
- [ ] `ENCRYPTION_KEY` es obligatorio (sistema no inicia sin él)
- [ ] Password nunca se expone en logs ni errores
- [ ] Frontend nunca recibe password real

### CA-07: RBAC
- [ ] Tenant OWNER/ADMIN pueden gestionar SMTP de su tenant
- [ ] Tenant AGENT/VIEWER no pueden acceder
- [ ] Platform Owner puede gestionar SMTP global
- [ ] Guards correctos en todos los endpoints

### CA-08: UI
- [ ] Pantalla `/app/settings/email` muestra formulario y logs
- [ ] Pantalla `/platform/settings/email` muestra formulario y logs
- [ ] Tablas de envíos y errores funcionan con paginación
- [ ] Validación en tiempo real funciona
- [ ] Estados se muestran correctamente (badges, colores)

### CA-09: i18n
- [ ] No hay textos hardcodeados en pantallas nuevas
- [ ] Todas las etiquetas usan claves i18n
- [ ] Mensajes de error usan claves i18n
- [ ] Claves agregadas en es/common.json y en/common.json (mínimo)

### CA-10: Auditoría
- [ ] Cambios en configuración se registran en audit log
- [ ] Campos: userId, tenantId, action, timestamp
- [ ] Password no se registra en texto plano

### CA-11: Logs
- [ ] Logs estructurados se generan correctamente
- [ ] Métricas básicas se registran (sent/failed por tenant)
- [ ] Secretos no aparecen en logs
- [ ] Stack traces para errores inesperados

---

## Riesgos y Mitigaciones

### R-01: Pérdida de ENCRYPTION_KEY
**Riesgo:** Si se pierde la key, no se pueden descifrar passwords existentes.  
**Mitigación:** Documentar proceso de backup de key, considerar key rotation en v2.

### R-02: Rate Limiting Insuficiente
**Riesgo:** Tenant puede abusar y enviar demasiados emails.  
**Mitigación:** Rate limiting por tenant, monitoreo de logs, alertas si se excede.

### R-03: Worker Único como Cuello de Botella
**Riesgo:** Si worker falla, emails se acumulan.  
**Mitigación:** Múltiples workers, health checks, alertas si cola crece.

### R-04: SMTP Provider Bloquea IP
**Riesgo:** Proveedor SMTP bloquea IP por spam.  
**Mitigación:** Rate limiting, validación de destinatarios, documentar mejores prácticas.

---

## Dependencias Técnicas

- `@nestjs/schedule`: Para cron jobs del worker
- `nodemailer`: Para envío SMTP
- `crypto` (Node.js built-in): Para cifrado AES-256-GCM
- Prisma: Para modelos y queries
- Guards existentes: `JwtAuthGuard`, `TenantContextGuard`, `PlatformGuard`
- i18n existente: Sistema de traducciones del proyecto

---

## Notas de Implementación

- **v1 sin adjuntos:** Diseño de `EmailOutbox` incluye campo `attachments` (JSON) preparado para v2, pero v1 no lo implementa.
- **v1 plantillas simples:** Campo `body` acepta HTML/texto plano. Sistema de plantillas avanzadas queda para v2.
- **Hooks para extensiones:** Servicios diseñados para permitir extensiones futuras (webhooks, tracking, etc.).

---

**Última actualización:** 2025-01-27



# Análisis de Funcionalidades Pendientes

> **Fecha:** 2025-01-XX  
> **Análisis:** Estado actual de implementación y pendientes

---

## Aclaración sobre PRD-42

**PRD-42 NO existe como PRD documentado.** Solo se menciona en el alcance EXCLUIDO de PRD-39 como:
- "Reportes programados automáticos (queda para PRD-42)"

Esto significa que es una funcionalidad **futura** que no está en el alcance actual del proyecto.

---

## PRDs Pendientes de Implementación

### PRD-40: Aplicación de Branding en Emails y Widget de Webchat
**Estado:** PENDIENTE  
**Prioridad:** 🟡 MEDIA  
**Dependencias:** PRD-38 (✅ COMPLETADO)

**Qué falta:**
1. **Emails transaccionales:**
   - Modificar `EmailService` para obtener branding del tenant
   - Actualizar templates Handlebars (verification-email.hbs, invitation-email.hbs)
   - Aplicar logo y colores en emails
   - Generar URLs absolutas para logos

2. **Widget de Webchat:**
   - Modificar `WebchatService.getWidgetConfig()` para incluir branding
   - Actualizar widget JavaScript (`chat-widget.js`) para aplicar branding
   - Aplicar logo en header del widget
   - Aplicar colores en botón, header y mensajes

**Archivos a modificar:**
- `apps/api/src/modules/email/email.service.ts`
- `apps/api/src/modules/email/templates/*.hbs`
- `apps/api/src/modules/webchat/webchat.service.ts`
- `apps/web/public/widget/chat-widget.js`

---

## Mejoras Pendientes (No son PRDs)

### 1. PRD-34: Notificaciones en Tiempo Real
**Estado:** ⚠️ PARCIALMENTE IMPLEMENTADO (solo en AppointmentsService)

**Análisis del código:**
- ✅ `NotificationsGateway` existe con Socket.IO
- ✅ `NotificationsService` completo
- ✅ Integración en `AppointmentsService` (citas) - ✅ DESARROLLADO
- ❌ Dependencias Socket.IO NO instaladas en `package.json`
- ❌ Integración en `ConversationsService` - ❌ NO DESARROLLADO
- ❌ Integración en `TeamService` - ❌ NO DESARROLLADO
- ❌ Integración en `BillingService` - ❌ NO DESARROLLADO

**Pendiente:**
- ⚠️ Instalar dependencias Socket.IO (requiere `--legacy-peer-deps` o actualizar NestJS a v11)
- ⚠️ Integrar notificaciones en:
  - `ConversationsService` (mensajes entrantes) - ❌ NO implementado
  - `TeamService` (cambios de equipo) - ❌ NO implementado
  - `BillingService` (límites de plan, pagos fallidos) - ❌ NO implementado

**Archivos afectados:**
- `apps/api/src/modules/conversations/conversations.service.ts`
- `apps/api/src/modules/team/team.service.ts`
- `apps/api/src/modules/billing/billing.service.ts`

---

### 2. PRD-38: Personalización de Logo y Colores
**Estado:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Análisis del código:**
- ✅ Campos en Prisma: `logoUrl`, `primaryColor`, `secondaryColor` - ✅ DESARROLLADO
- ✅ Endpoints para subir/eliminar logo - ✅ DESARROLLADO
- ✅ Endpoints para actualizar colores - ✅ DESARROLLADO
- ✅ Aplicación en layout y sidebar - ✅ DESARROLLADO
- ✅ Storage local funcionando - ✅ DESARROLLADO
- ❌ Storage en producción (S3/Cloudinary) - ❌ NO DESARROLLADO (solo filesystem local)
- ❌ Branding en emails - ❌ NO DESARROLLADO (templates usan branding hardcodeado)
- ❌ Branding en widget - ❌ NO DESARROLLADO (widget usa colores del canal, no del tenant)

**Pendiente:**
- ⚠️ Configurar storage en producción (S3/Cloudinary) - actualmente solo filesystem local
- ⚠️ Aplicar branding en emails (templates Handlebars usan colores hardcodeados)
- ⚠️ Aplicar branding en widget (usa colores del canal, no del tenant branding)

---

### 3. PRD-39: Métricas Avanzadas y Analytics
**Estado:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Análisis del código:**
- ✅ Dashboard completo con gráficos - ✅ DESARROLLADO
- ✅ Filtros avanzados - ✅ DESARROLLADO
- ✅ Exportación CSV - ✅ DESARROLLADO
- ❌ Exportación PDF - ❌ NO DESARROLLADO (no hay endpoint, no hay librería jsPDF)
- ❌ Reportes programados automáticos (PRD-42 - NO EXISTE, es funcionalidad futura)

**Pendiente:**
- ⚠️ Exportación PDF (requiere instalar jsPDF y crear endpoint)
- ⚠️ Reportes programados automáticos (PRD-42 - NO EXISTE, es funcionalidad futura)

**Nota:** La exportación CSV ya está implementada. PDF requiere:
- Instalar `jspdf` y `jspdf-autotable`
- Crear endpoint `/analytics/export?format=pdf`
- Generar PDF con gráficos y tablas

---

### 4. PRD-36: Vista de Calendario para Citas
**Estado:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Análisis del código:**
- ✅ Vista mensual/semanal/diaria - ✅ DESARROLLADO
- ✅ Navegación entre períodos - ✅ DESARROLLADO
- ✅ Filtros por agente - ✅ DESARROLLADO
- ✅ Visualización de citas - ✅ DESARROLLADO
- ❌ Drag & drop para reprogramar - ❌ NO DESARROLLADO (solo visualización estática)

**Pendiente:**
- ⚠️ Drag & drop para reprogramar citas (no hay handlers de drag, solo click para ver detalles)

---

## Resumen de Pendientes (Basado en Código Real)

### PRDs Pendientes (1)
1. **PRD-40** - Aplicación de Branding en Emails y Widget de Webchat
   - ❌ NO desarrollado
   - Emails usan branding hardcodeado
   - Widget usa colores del canal, no del tenant

### Mejoras Pendientes en PRDs Implementados (4)

1. **PRD-34** - Integrar notificaciones en más servicios
   - ⚠️ Estado: Solo integrado en AppointmentsService
   - ❌ Dependencias Socket.IO NO instaladas
   - ❌ ConversationsService: NO implementado
   - ❌ TeamService: NO implementado
   - ❌ BillingService: NO implementado

2. **PRD-38** - Storage y Branding
   - ⚠️ Storage local: ✅ Funcional
   - ❌ Storage producción (S3/Cloudinary): NO implementado
   - ❌ Branding en emails: NO implementado (hardcodeado)
   - ❌ Branding en widget: NO implementado (usa canal)

3. **PRD-39** - Exportación PDF
   - ✅ Exportación CSV: Implementado
   - ❌ Exportación PDF: NO implementado (no hay endpoint ni librería)

4. **PRD-36** - Drag & drop en calendario
   - ✅ Visualización: Implementado
   - ❌ Drag & drop: NO implementado (solo visualización estática)

### Funcionalidades Futuras (No PRDs)
1. **Reportes programados automáticos** - Mencionado como "PRD-42" pero no existe como PRD
2. **Análisis predictivo** - Mencionado en alcance excluido de PRD-39
3. **Machine Learning para insights** - Mencionado en alcance excluido de PRD-39
4. **Integración con Google Analytics** - Mencionado en alcance excluido de PRD-39

---

## Estadísticas Actuales

- **Total PRDs documentados:** 39
- **PRDs implementados y auditados:** 38 (97.44%)
- **PRDs pendientes:** 1 (2.56%) - PRD-40
- **PRD-32 (Voice Channel):** Solo planificación, no requiere implementación

---

## Priorización Recomendada

### Alta Prioridad
1. **PRD-40** - Completar branding en emails y widget (depende de PRD-38 que ya está hecho)

### Media Prioridad
2. **PRD-34** - Integrar notificaciones en más servicios
3. **PRD-38** - Configurar storage en producción

### Baja Prioridad
4. **PRD-39** - Exportación PDF
5. **PRD-36** - Drag & drop en calendario

---

## Notas Importantes

1. **PRD-42 no existe** - Solo se menciona como alcance excluido. Si se quiere implementar reportes programados, se debe crear un nuevo PRD.

2. **Todas las funcionalidades core están completas** - Solo queda PRD-40 de mejoras opcionales.

3. **Las mejoras pendientes son opcionales** - El sistema funciona correctamente sin ellas, son mejoras de UX/features adicionales.

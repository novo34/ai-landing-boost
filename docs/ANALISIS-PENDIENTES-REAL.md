# Análisis Real de Pendientes - Basado en Código

> **Fecha:** 2025-01-XX  
> **Fuente:** Análisis directo del código fuente  
> **Método:** Revisión de archivos y dependencias

---

## Resumen Ejecutivo

**Total de mejoras pendientes analizadas:** 4  
**Completamente desarrolladas:** 0  
**Parcialmente desarrolladas:** 0  
**No desarrolladas:** 4  

---

## 1. PRD-34: Notificaciones en Tiempo Real - Integraciones Adicionales

### Estado Real: ⚠️ NO DESARROLLADO

**Análisis del código:**

#### ✅ Lo que SÍ está desarrollado:
- ✅ `NotificationsGateway` existe con Socket.IO
- ✅ `NotificationsService` completo
- ✅ Integración en `AppointmentsService` (citas)

#### ❌ Lo que NO está desarrollado:

**1. Dependencias Socket.IO:**
```bash
# Verificado en apps/api/package.json
# NO se encontraron:
- socket.io
- @nestjs/websockets
- @nestjs/platform-socket.io
```
**Estado:** Las dependencias NO están instaladas. El código existe pero no funcionará sin instalarlas.

**2. Integración en ConversationsService:**
```typescript
// apps/api/src/modules/conversations/conversations.service.ts
// Verificado: NO hay imports de NotificationsService
// NO hay llamadas a createNotification() en:
// - sendMessage()
// - processIncomingMessage()
```
**Estado:** NO implementado

**3. Integración en TeamService:**
```typescript
// apps/api/src/modules/team/team.service.ts
// Verificado: NO hay imports de NotificationsService
// NO hay llamadas a createNotification() en:
// - changeMemberRole()
// - removeMember()
// - transferOwnership()
```
**Estado:** NO implementado

**4. Integración en BillingService:**
```typescript
// apps/api/src/modules/billing/billing.service.ts
// Verificado: NO hay imports de NotificationsService
// NO hay llamadas a createNotification() en:
// - getCurrentSubscription()
// - handlePaymentFailure()
// - checkPlanLimits()
```
**Estado:** NO implementado

**Conclusión:** Las integraciones adicionales NO están desarrolladas. Solo está integrado en AppointmentsService.

---

## 2. PRD-38: Personalización de Logo y Colores - Storage y Branding en Emails/Widget

### Estado Real: ⚠️ PARCIALMENTE DESARROLLADO

**Análisis del código:**

#### ✅ Lo que SÍ está desarrollado:
- ✅ Campos en Prisma: `logoUrl`, `primaryColor`, `secondaryColor`
- ✅ Endpoints para subir/eliminar logo
- ✅ Endpoints para actualizar colores
- ✅ Aplicación en layout y sidebar del dashboard
- ✅ Storage local funcionando (`./uploads/tenants/{tenantId}/`)

#### ❌ Lo que NO está desarrollado:

**1. Storage en Producción (S3/Cloudinary):**
```typescript
// apps/api/src/modules/tenant-settings/tenant-settings.service.ts
// Línea 10: private readonly uploadsDir = process.env.UPLOADS_DIR || './uploads';
// Línea 121: fs.writeFileSync(filepath, file.buffer);
```
**Estado:** Solo usa filesystem local. NO hay integración con S3/Cloudinary.

**2. Branding en Emails:**
```typescript
// apps/api/src/modules/email/email.service.ts
// Verificado:
// - sendVerificationEmail() NO recibe tenantId
// - sendInvitationEmail() NO recibe tenantId
// - NO hay método getTenantBranding()
// - NO se obtiene branding del tenant
```

```handlebars
<!-- apps/api/src/modules/email/templates/verification-email.hbs -->
<!-- Verificado: -->
<!-- - Logo hardcodeado "AutomAI" (línea 10) -->
<!-- - Colores hardcodeados #667eea, #764ba2 (línea 9, 19) -->
<!-- - NO usa variables {{logoUrl}}, {{primaryColor}}, {{secondaryColor}} -->
```

```handlebars
<!-- apps/api/src/modules/email/templates/invitation-email.hbs -->
<!-- Verificado: -->
<!-- - Logo hardcodeado "AutomAI" (línea 10) -->
<!-- - Colores hardcodeados #667eea, #764ba2 (línea 9, 21) -->
<!-- - NO usa variables de branding -->
```
**Estado:** NO implementado. Emails usan branding hardcodeado.

**3. Branding en Widget de Webchat:**
```typescript
// apps/api/src/modules/webchat/webchat.service.ts
// Línea 20-71: getWidgetConfig()
// Verificado:
// - Incluye tenant.settings (línea 24)
// - PERO NO incluye branding en la respuesta
// - Solo retorna config del canal (primaryColor del canal, no del tenant)
// - NO retorna logoUrl, primaryColor, secondaryColor del tenant
```

```javascript
// apps/web/public/widget/chat-widget.js
// Verificado:
// - Línea 15: primaryColor hardcodeado '#007bff'
// - Línea 53: usa result.data.config.primaryColor (del canal, no del tenant)
// - NO busca branding.logoUrl
// - NO busca branding.primaryColor del tenant
// - NO aplica logo en header
```
**Estado:** NO implementado. Widget usa colores del canal, no del tenant branding.

**Conclusión:** 
- Storage local: ✅ Funcional
- Storage producción: ❌ NO implementado
- Branding en emails: ❌ NO implementado
- Branding en widget: ❌ NO implementado (usa colores del canal, no del tenant)

---

## 3. PRD-39: Métricas Avanzadas y Analytics - Exportación PDF

### Estado Real: ❌ NO DESARROLLADO

**Análisis del código:**

```typescript
// apps/api/src/modules/analytics/analytics.controller.ts
// Verificado: NO hay endpoint para exportación
// - NO hay @Get('export')
// - NO hay método exportAnalytics()
```

```typescript
// apps/api/src/modules/analytics/analytics.service.ts
// Verificado: NO hay método para generar PDF
```

```typescript
// apps/web/app/app/analytics/page.tsx
// Línea 167-179: handleExport()
// Verificado:
// - Solo implementa exportación CSV
// - NO hay lógica para PDF
// - Comentario: "Por ahora solo CSV, PDF requeriría librería adicional"
```

```json
// apps/api/package.json
// Verificado: NO hay dependencias:
// - jspdf
// - jspdf-autotable
```

**Conclusión:** Exportación PDF NO está desarrollada. Solo CSV funciona.

---

## 4. PRD-36: Vista de Calendario para Citas - Drag & Drop

### Estado Real: ❌ NO DESARROLLADO

**Análisis del código:**

```typescript
// apps/web/components/appointments/calendar-view.tsx
// Verificado:
// - NO hay imports de librerías de drag & drop (react-dnd, @dnd-kit, etc.)
// - NO hay handlers onDragStart, onDragEnd, onDrop
// - NO hay atributos draggable en elementos de citas
// - Solo hay click handlers para ver detalles
```

**Conclusión:** Drag & drop NO está desarrollado. Solo visualización estática.

---

## Resumen Final

### Mejoras Pendientes - Estado Real

| Mejora | Estado | Completitud | Notas |
|--------|--------|-------------|-------|
| **PRD-34: Integraciones Notificaciones** | ❌ NO DESARROLLADO | 0% | Dependencias Socket.IO no instaladas. Integraciones en Conversations/Team/Billing no implementadas |
| **PRD-38: Storage Producción** | ❌ NO DESARROLLADO | 0% | Solo filesystem local |
| **PRD-38: Branding en Emails** | ❌ NO DESARROLLADO | 0% | Templates usan branding hardcodeado |
| **PRD-38: Branding en Widget** | ❌ NO DESARROLLADO | 0% | Widget usa colores del canal, no del tenant |
| **PRD-39: Exportación PDF** | ❌ NO DESARROLLADO | 0% | Solo CSV implementado |
| **PRD-36: Drag & Drop** | ❌ NO DESARROLLADO | 0% | Solo visualización estática |

### PRD-40: Aplicación de Branding en Emails y Widget

**Estado:** ❌ PENDIENTE (ya documentado como PRD pendiente)

**Lo que falta:**
1. Modificar `EmailService` para obtener branding del tenant
2. Actualizar templates Handlebars para usar branding
3. Modificar `WebchatService.getWidgetConfig()` para incluir branding
4. Actualizar widget JavaScript para aplicar branding

---

## Acciones Recomendadas

### Prioridad Alta
1. **PRD-40** - Completar branding en emails y widget (depende de PRD-38 que ya tiene la base)

### Prioridad Media
2. **PRD-34** - Instalar Socket.IO y completar integraciones
3. **PRD-38** - Implementar branding en emails y widget (parte de PRD-40)

### Prioridad Baja
4. **PRD-38** - Configurar storage en producción (S3/Cloudinary)
5. **PRD-39** - Exportación PDF
6. **PRD-36** - Drag & drop en calendario

---

## Notas Técnicas

1. **Socket.IO:** El código del gateway existe pero las dependencias no están instaladas. Necesita:
   ```bash
   npm install socket.io @nestjs/websockets @nestjs/platform-socket.io --legacy-peer-deps
   ```

2. **Branding en Emails:** Requiere modificar `EmailService` para:
   - Recibir `tenantId` en métodos de envío
   - Obtener branding desde `TenantSettings`
   - Pasar branding a templates Handlebars

3. **Branding en Widget:** Requiere:
   - Modificar `WebchatService.getWidgetConfig()` para incluir `branding` en respuesta
   - Actualizar widget JavaScript para leer y aplicar branding

4. **Exportación PDF:** Requiere instalar `jspdf` y `jspdf-autotable`, crear endpoint y lógica de generación.

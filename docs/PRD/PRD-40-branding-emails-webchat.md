# PRD-40: Aplicación de Branding en Emails y Widget de Webchat

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🟡 MEDIA  
> **Estado:** Pendiente  
> **Bloque:** Mejoras Opcionales - Personalización y Branding  
> **Dependencias:** PRD-38 (Personalización de Logo y Colores)

---

## Objetivo

Aplicar el branding personalizado del tenant (logo y colores) en todos los emails transaccionales y en el widget de webchat embebible, para mantener una experiencia de marca consistente en todos los puntos de contacto con los usuarios.

---

## Alcance INCLUIDO

- ✅ Aplicar logo del tenant en headers de emails
- ✅ Aplicar colores del tenant (primario/secundario) en emails
- ✅ Aplicar logo del tenant en header del widget de webchat
- ✅ Aplicar colores del tenant en widget de webchat (botón, header, mensajes)
- ✅ Fallback a valores por defecto si no hay branding configurado
- ✅ Soporte para emails en formato HTML con branding dinámico

---

## Alcance EXCLUIDO

- ❌ Personalización de contenido de emails (solo branding visual)
- ❌ Personalización de mensajes del widget (solo branding visual)
- ❌ Editor de templates de email (usa templates existentes con branding)
- ❌ Múltiples variantes de templates (solo actualizar existentes)

---

## Requisitos Funcionales

### RF-01: Branding en Emails

**Descripción:** Todos los emails transaccionales deben mostrar el logo y colores del tenant.

**Emails afectados:**
1. Email de verificación de cuenta (`sendVerificationEmail`)
2. Email de invitación a equipo (`sendInvitationEmail`)
3. Futuros emails transaccionales (recordatorios, notificaciones, etc.)

**Requisitos:**
- Logo del tenant en header del email (si está configurado)
- Color primario del tenant en botones y links (si está configurado)
- Color secundario del tenant en acentos y elementos secundarios (si está configurado)
- Fallback a branding por defecto de AutomAI si no hay branding configurado
- Logo debe ser accesible públicamente (URL absoluta, no relativa)
- Colores deben tener suficiente contraste para legibilidad

**Flujo:**
1. EmailService recibe tenantId al enviar email
2. EmailService obtiene branding del tenant desde TenantSettings
3. EmailService pasa branding a template de Handlebars
4. Template aplica logo y colores en HTML del email
5. Email se envía con branding aplicado

---

### RF-02: Branding en Widget de Webchat

**Descripción:** El widget de webchat embebible debe mostrar el logo y colores del tenant.

**Elementos a personalizar:**
1. Logo en header del widget (si está configurado)
2. Color primario en botón flotante de chat
3. Color primario en header del widget
4. Color primario en botón de enviar mensaje
5. Color primario en mensajes del agente (outbound)
6. Color primario en borde de input cuando está enfocado

**Requisitos:**
- Logo debe cargarse desde URL absoluta
- Colores deben aplicarse dinámicamente en CSS del widget
- Fallback a valores por defecto si no hay branding configurado
- Widget debe funcionar sin branding (valores por defecto)
- Logo debe tener tamaño máximo recomendado (200x50px)
- Colores deben tener suficiente contraste para accesibilidad

**Flujo:**
1. Widget carga configuración desde `/api/public/webchat/config/{tenantSlug}`
2. Endpoint incluye branding (logoUrl, primaryColor, secondaryColor) en respuesta
3. Widget aplica branding al inicializar
4. CSS dinámico se genera con colores del tenant
5. Logo se muestra en header si está disponible

---

## Requisitos Técnicos

### RT-01: Modificar EmailService

**Archivo:** `apps/api/src/modules/email/email.service.ts`

**Cambios:**
1. Agregar dependencia de `TenantSettingsService` o `PrismaService`
2. Modificar `sendVerificationEmail()` para recibir `tenantId` y obtener branding
3. Modificar `sendInvitationEmail()` para recibir `tenantId` y obtener branding
4. Crear método privado `getTenantBranding(tenantId: string)` para obtener branding
5. Pasar branding a templates de Handlebars

**Interfaz:**
```typescript
interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}
```

---

### RT-02: Actualizar Templates de Email

**Archivos:**
- `apps/api/src/modules/email/templates/verification-email.hbs`
- `apps/api/src/modules/email/templates/invitation-email.hbs`

**Cambios:**
1. Reemplazar logo hardcodeado "AutomAI" con logo del tenant (si existe)
2. Reemplazar colores hardcodeados (#667eea, #764ba2) con colores del tenant
3. Usar valores por defecto si branding no está configurado
4. Asegurar que logo use URL absoluta (no relativa)

**Variables Handlebars:**
- `{{logoUrl}}` - URL del logo del tenant (o null)
- `{{primaryColor}}` - Color primario del tenant (o '#667eea' por defecto)
- `{{secondaryColor}}` - Color secundario del tenant (o '#764ba2' por defecto)
- `{{hasLogo}}` - Boolean indicando si hay logo configurado

---

### RT-03: Modificar WebchatService

**Archivo:** `apps/api/src/modules/webchat/webchat.service.ts`

**Cambios:**
1. Modificar `getWidgetConfig()` para incluir branding del tenant
2. Obtener `logoUrl`, `primaryColor`, `secondaryColor` desde `tenant.settings`
3. Incluir branding en respuesta del endpoint

**Respuesta actualizada:**
```typescript
{
  success: true,
  data: {
    tenantId: string,
    tenantSlug: string,
    config: {
      primaryColor: string,
      position: string,
      welcomeMessage: string,
      placeholder: string,
    },
    branding: {
      logoUrl?: string | null,
      primaryColor?: string | null,
      secondaryColor?: string | null,
    }
  }
}
```

---

### RT-04: Actualizar Widget JavaScript

**Archivo:** `apps/web/public/widget/chat-widget.js`

**Cambios:**
1. Cargar branding desde configuración del widget
2. Aplicar logo en header del widget (si está disponible)
3. Aplicar colores dinámicamente en CSS generado
4. Usar valores por defecto si branding no está configurado
5. Generar URL absoluta del logo (usar `window.location.origin` o API URL)

**Lógica:**
- Si `branding.logoUrl` existe, mostrar logo en header
- Si `branding.primaryColor` existe, usar en lugar de `#007bff`
- Si `branding.secondaryColor` existe, usar para elementos secundarios
- Fallback a valores por defecto si branding no está disponible

---

### RT-05: URLs Absolutas para Assets

**Requisito:** Logo debe ser accesible desde emails y widget externo.

**Solución:**
- Usar variable de entorno `FRONTEND_URL` o `API_URL` para construir URLs absolutas
- Formato: `${FRONTEND_URL}${logoUrl}` o `${API_URL}${logoUrl}`
- Asegurar que logo sea servido públicamente (no requiere autenticación)

---

## Flujos UX

### Flujo 1: Email con Branding

```
[Usuario recibe email de verificación/invitación]
  ↓
[Email muestra logo del tenant en header]
  ↓
[Email usa colores del tenant en botones y links]
  ↓
[Si no hay branding, usa valores por defecto de AutomAI]
```

---

### Flujo 2: Widget con Branding

```
[Usuario visita sitio web con widget embebido]
  ↓
[Widget carga configuración desde API]
  ↓
[Widget obtiene branding del tenant]
  ↓
[Widget aplica logo en header (si existe)]
  ↓
[Widget aplica colores en botón, header y mensajes]
  ↓
[Si no hay branding, usa valores por defecto]
```

---

## Estructura de DB

No se requieren cambios en la base de datos. Se usan campos existentes de `TenantSettings`:
- `logoUrl`
- `primaryColor`
- `secondaryColor`

---

## Endpoints API

### Endpoint Existente (modificar)

**GET** `/api/public/webchat/config/{tenantSlug}`

**Respuesta actualizada:**
```json
{
  "success": true,
  "data": {
    "tenantId": "uuid",
    "tenantSlug": "mi-tenant",
    "config": {
      "primaryColor": "#007bff",
      "position": "bottom-right",
      "welcomeMessage": "¡Hola! ¿En qué puedo ayudarte?",
      "placeholder": "Escribe tu mensaje..."
    },
    "branding": {
      "logoUrl": "/uploads/tenants/{tenantId}/logo.png",
      "primaryColor": "#3b82f6",
      "secondaryColor": "#8b5cf6"
    }
  }
}
```

---

## Eventos n8n

No se emiten eventos nuevos.

---

## Criterios de Aceptación

- [ ] Emails de verificación muestran logo del tenant (si está configurado)
- [ ] Emails de verificación usan colores del tenant en botones y links
- [ ] Emails de invitación muestran logo del tenant (si está configurado)
- [ ] Emails de invitación usan colores del tenant en botones y links
- [ ] Emails usan valores por defecto si no hay branding configurado
- [ ] Widget de webchat muestra logo del tenant en header (si está configurado)
- [ ] Widget de webchat usa color primario del tenant en botón flotante
- [ ] Widget de webchat usa color primario del tenant en header
- [ ] Widget de webchat usa color primario del tenant en botón de enviar
- [ ] Widget de webchat usa color primario del tenant en mensajes del agente
- [ ] Widget de webchat usa valores por defecto si no hay branding configurado
- [ ] Logo es accesible desde emails (URL absoluta)
- [ ] Logo es accesible desde widget externo (URL absoluta)
- [ ] Colores tienen suficiente contraste para legibilidad

---

## Dependencias

- **PRD-38:** Personalización de Logo y Colores (debe estar implementado)
- **PRD-31:** Chat Web Embebible (widget debe existir)

---

## Notas de Implementación

1. **URLs Absolutas:** Asegurar que `logoUrl` se convierta a URL absoluta antes de pasarla a templates de email y widget.

2. **Fallback:** Siempre tener valores por defecto para branding (logo y colores) para que el sistema funcione incluso si no hay branding configurado.

3. **Performance:** Cachear branding del tenant si es necesario para evitar consultas repetidas a BD.

4. **Accesibilidad:** Validar que colores personalizados tengan suficiente contraste (WCAG AA mínimo).

5. **Compatibilidad Email:** Algunos clientes de email no soportan CSS avanzado. Usar estilos inline y evitar CSS complejo.

---

**Última actualización:** 2025-01-XX


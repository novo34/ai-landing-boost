# AI-SPEC-40: Aplicación de Branding en Emails y Widget de Webchat

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-40  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación técnica para aplicar el branding personalizado del tenant (logo y colores) en emails transaccionales y en el widget de webchat embebible. La implementación requiere modificaciones en `EmailService`, templates de Handlebars, `WebchatService` y el widget JavaScript.

---

## Arquitectura

### Componentes Afectados

1. **EmailService** (`apps/api/src/modules/email/email.service.ts`)
   - Obtener branding del tenant
   - Pasar branding a templates

2. **Templates de Email** (`apps/api/src/modules/email/templates/*.hbs`)
   - Aplicar logo y colores dinámicamente

3. **WebchatService** (`apps/api/src/modules/webchat/webchat.service.ts`)
   - Incluir branding en respuesta de configuración

4. **Widget JavaScript** (`apps/web/public/widget/chat-widget.js`)
   - Aplicar branding al inicializar

---

## Implementación Detallada

### 1. Modificar EmailService

**Archivo:** `apps/api/src/modules/email/email.service.ts`

**Cambios:**

1. **Agregar dependencia de PrismaService:**
```typescript
constructor(
  private prisma: PrismaService,
) {
  // ... código existente
}
```

2. **Crear método para obtener branding:**
```typescript
private async getTenantBranding(tenantId: string): Promise<{
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  hasLogo: boolean;
}> {
  const settings = await this.prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });

  // Construir URL absoluta del logo si existe
  let absoluteLogoUrl: string | null = null;
  if (settings?.logoUrl) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    absoluteLogoUrl = settings.logoUrl.startsWith('http')
      ? settings.logoUrl
      : `${frontendUrl}${settings.logoUrl}`;
  }

  return {
    logoUrl: absoluteLogoUrl,
    primaryColor: settings?.primaryColor || '#667eea',
    secondaryColor: settings?.secondaryColor || '#764ba2',
    hasLogo: !!absoluteLogoUrl,
  };
}
```

3. **Modificar sendVerificationEmail:**
```typescript
async sendVerificationEmail(
  email: string,
  token: string,
  tenantId: string, // NUEVO: agregar tenantId
  name?: string,
): Promise<void> {
  if (!this.transporter) {
    this.logger.warn('SMTP not configured. Skipping verification email.');
    return;
  }

  try {
    const template = this.loadTemplate('verification-email.hbs');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;
    
    // Obtener branding del tenant
    const branding = await this.getTenantBranding(tenantId);
    
    const html = template({
      name: name || 'Usuario',
      verificationUrl,
      frontendUrl,
      ...branding, // Pasar branding al template
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@automai.es',
      to: email,
      subject: 'Verifica tu email - AutomAI',
      html,
    });

    this.logger.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    this.logger.error(`❌ Failed to send verification email to ${email}:`, error);
    throw error;
  }
}
```

4. **Modificar sendInvitationEmail:**
```typescript
async sendInvitationEmail(
  email: string,
  token: string,
  tenantId: string, // NUEVO: agregar tenantId
  tenantName: string,
  inviterName: string,
): Promise<void> {
  if (!this.transporter) {
    this.logger.warn('SMTP not configured. Skipping invitation email.');
    return;
  }

  try {
    const template = this.loadTemplate('invitation-email.hbs');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/auth/accept-invitation?token=${token}`;
    
    // Obtener branding del tenant
    const branding = await this.getTenantBranding(tenantId);
    
    const html = template({
      email,
      invitationUrl,
      tenantName,
      inviterName,
      frontendUrl,
      ...branding, // Pasar branding al template
    });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@automai.es',
      to: email,
      subject: `Invitación a unirse a ${tenantName} - AutomAI`,
      html,
    });

    this.logger.log(`✅ Invitation email sent to ${email}`);
  } catch (error) {
    this.logger.error(`❌ Failed to send invitation email to ${email}:`, error);
    throw error;
  }
}
```

5. **Actualizar EmailModule para importar PrismaModule:**
```typescript
@Module({
  imports: [PrismaModule], // Agregar PrismaModule
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

---

### 2. Actualizar Template de Verificación

**Archivo:** `apps/api/src/modules/email/templates/verification-email.hbs`

**Cambios:**

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu email - AutomAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, {{primaryColor}} 0%, {{secondaryColor}} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    {{#if hasLogo}}
      <img src="{{logoUrl}}" alt="{{tenantName}}" style="max-height: 50px; max-width: 200px; margin: 0 auto; display: block;">
    {{else}}
      <h1 style="color: white; margin: 0;">AutomAI</h1>
    {{/if}}
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">¡Hola {{name}}!</h2>
    
    <p>Gracias por registrarte en AutomAI. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el botón siguiente:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}" style="background: {{primaryColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Verificar Email
      </a>
    </div>
    
    <p style="font-size: 12px; color: #666;">O copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: {{primaryColor}}; word-break: break-all;">{{verificationUrl}}</p>
    
    <p style="font-size: 12px; color: #666; margin-top: 30px;">
      Este enlace expirará en 24 horas. Si no solicitaste este registro, puedes ignorar este email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© 2025 AutomAI. Todos los derechos reservados.</p>
  </div>
</body>
</html>
```

---

### 3. Actualizar Template de Invitación

**Archivo:** `apps/api/src/modules/email/templates/invitation-email.hbs`

**Cambios:**

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a {{tenantName}} - AutomAI</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, {{primaryColor}} 0%, {{secondaryColor}} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    {{#if hasLogo}}
      <img src="{{logoUrl}}" alt="{{tenantName}}" style="max-height: 50px; max-width: 200px; margin: 0 auto; display: block;">
    {{else}}
      <h1 style="color: white; margin: 0;">AutomAI</h1>
    {{/if}}
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">¡Has sido invitado!</h2>
    
    <p><strong>{{inviterName}}</strong> te ha invitado a unirte al equipo <strong>{{tenantName}}</strong> en AutomAI.</p>
    
    <p>Para aceptar la invitación y comenzar a trabajar con el equipo, haz clic en el botón siguiente:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{invitationUrl}}" style="background: {{primaryColor}}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Aceptar Invitación
      </a>
    </div>
    
    <p style="font-size: 12px; color: #666;">O copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: {{primaryColor}}; word-break: break-all;">{{invitationUrl}}</p>
    
    <p style="font-size: 12px; color: #666; margin-top: 30px;">
      Esta invitación expirará en 7 días. Si no deseas unirte al equipo, puedes ignorar este email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
    <p>© 2025 AutomAI. Todos los derechos reservados.</p>
  </div>
</body>
</html>
```

---

### 4. Actualizar Llamadas a EmailService

**Archivos a modificar:**

1. **AuthService** (`apps/api/src/modules/auth/auth.service.ts`):
```typescript
// Buscar llamada a sendVerificationEmail y agregar tenantId
await this.emailService.sendVerificationEmail(
  user.email,
  token,
  user.tenantId, // NUEVO: agregar tenantId
  user.name || undefined,
);
```

2. **InvitationsService** (`apps/api/src/modules/invitations/invitations.service.ts`):
```typescript
// Buscar llamada a sendInvitationEmail y agregar tenantId
await this.emailService.sendInvitationEmail(
  email,
  token,
  tenantId, // Ya debería estar disponible
  tenantName,
  inviterName,
);
```

---

### 5. Modificar WebchatService

**Archivo:** `apps/api/src/modules/webchat/webchat.service.ts`

**Cambios en getWidgetConfig:**

```typescript
async getWidgetConfig(tenantSlug: string) {
  const tenant = await this.prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: {
      settings: true, // Ya incluye settings
    },
  });

  if (!tenant) {
    throw new NotFoundException({
      success: false,
      error_key: 'webchat.tenant_not_found',
      message: 'Tenant not found',
    });
  }

  // Obtener canal WEBCHAT para este tenant
  const webchatChannel = await this.prisma.channel.findFirst({
    where: {
      tenantId: tenant.id,
      type: 'WEBCHAT',
      status: 'ACTIVE',
    },
  });

  // Configuración por defecto
  const defaultConfig = {
    primaryColor: '#007bff',
    position: 'bottom-right',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte?',
    placeholder: 'Escribe tu mensaje...',
  };

  // Si hay canal configurado, usar su configuración
  const channelConfig = webchatChannel?.config as {
    primaryColor?: string;
    position?: string;
    welcomeMessage?: string;
    placeholder?: string;
  } | null;

  // Obtener branding del tenant
  const branding = {
    logoUrl: tenant.settings?.logoUrl || null,
    primaryColor: tenant.settings?.primaryColor || null,
    secondaryColor: tenant.settings?.secondaryColor || null,
  };

  // Construir URL absoluta del logo si existe
  let absoluteLogoUrl: string | null = null;
  if (branding.logoUrl) {
    const apiUrl = process.env.API_URL || process.env.FRONTEND_URL || 'http://localhost:3001';
    absoluteLogoUrl = branding.logoUrl.startsWith('http')
      ? branding.logoUrl
      : `${apiUrl}${branding.logoUrl}`;
  }

  return {
    success: true,
    data: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      config: {
        ...defaultConfig,
        ...(channelConfig || {}),
      },
      branding: {
        logoUrl: absoluteLogoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
      },
    },
  };
}
```

---

### 6. Actualizar Widget JavaScript

**Archivo:** `apps/web/public/widget/chat-widget.js`

**Cambios:**

1. **Actualizar loadConfig para obtener branding:**
```javascript
// Cargar configuración del widget
async function loadConfig() {
  const tenantSlug = getTenantSlug();
  if (!tenantSlug) {
    console.error('Chat Widget: tenant-slug no especificado');
    return;
  }

  widgetState.tenantSlug = tenantSlug;

  try {
    const response = await fetch(`${DEFAULT_CONFIG.apiUrl}/api/public/webchat/config/${tenantSlug}`);
    const result = await response.json();
    
    if (result.success) {
      widgetState.config = { ...DEFAULT_CONFIG, ...result.data.config };
      
      // NUEVO: Guardar branding
      widgetState.branding = result.data.branding || {
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
      };
      
      // Usar color primario del branding si está disponible
      if (widgetState.branding.primaryColor) {
        widgetState.config.primaryColor = widgetState.branding.primaryColor;
      }
      
      widgetState.isLoaded = true;
      initWidget();
    } else {
      console.error('Chat Widget: Error al cargar configuración', result);
    }
  } catch (error) {
    console.error('Chat Widget: Error al cargar configuración', error);
    // Usar configuración por defecto
    widgetState.config = DEFAULT_CONFIG;
    widgetState.branding = { logoUrl: null, primaryColor: null, secondaryColor: null };
    widgetState.isLoaded = true;
    initWidget();
  }
}
```

2. **Actualizar createWidgetHTML para mostrar logo:**
```javascript
// Crear HTML del widget
function createWidgetHTML() {
  const container = document.createElement('div');
  container.className = 'chat-widget-container';
  container.id = 'chat-widget-container';
  container.style.cssText = getPositionStyles();

  // Botón flotante
  const button = document.createElement('button');
  button.className = 'chat-widget-button';
  button.innerHTML = '💬';
  button.setAttribute('aria-label', 'Abrir chat');
  button.onclick = toggleWidget;

  // Ventana de chat
  const window = document.createElement('div');
  window.className = 'chat-widget-window';
  window.id = 'chat-widget-window';
  window.style.display = 'none';

  // NUEVO: Construir header con logo si está disponible
  const headerContent = widgetState.branding?.logoUrl
    ? `<img src="${widgetState.branding.logoUrl}" alt="Logo" style="max-height: 30px; max-width: 150px;">`
    : '<h3>Chat de Soporte</h3>';

  window.innerHTML = `
    <div class="chat-widget-header">
      ${headerContent}
      <button class="chat-widget-close" onclick="window.chatWidgetToggle()" aria-label="Cerrar chat">×</button>
    </div>
    <div class="chat-widget-messages" id="chat-widget-messages">
      <div class="chat-widget-message inbound">
        ${widgetState.config.welcomeMessage}
      </div>
    </div>
    <div class="chat-widget-input-container">
      <input 
        type="text" 
        class="chat-widget-input" 
        id="chat-widget-input"
        placeholder="${widgetState.config.placeholder}"
        onkeypress="if(event.key==='Enter') window.chatWidgetSend()"
      />
      <button class="chat-widget-send" id="chat-widget-send" onclick="window.chatWidgetSend()">→</button>
    </div>
  `;

  container.appendChild(button);
  container.appendChild(window);
  document.body.appendChild(container);

  // Exponer funciones globales
  window.chatWidgetToggle = toggleWidget;
  window.chatWidgetSend = sendMessage;
}
```

3. **Actualizar injectStyles para usar colores del branding:**
```javascript
// Inyectar estilos CSS
function injectStyles() {
  const styleId = 'chat-widget-styles';
  if (document.getElementById(styleId)) return;

  const primaryColor = widgetState.branding?.primaryColor || widgetState.config.primaryColor || '#007bff';

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .chat-widget-container {
      position: fixed;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .chat-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      transition: transform 0.2s;
    }
    .chat-widget-button:hover {
      transform: scale(1.1);
    }
    .chat-widget-button:active {
      transform: scale(0.95);
    }
    .chat-widget-window {
      position: absolute;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      ${getPositionStyles()}
    }
    .chat-widget-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-widget-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    .chat-widget-header img {
      max-height: 30px;
      max-width: 150px;
      object-fit: contain;
    }
    .chat-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .chat-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-widget-message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      word-wrap: break-word;
    }
    .chat-widget-message.inbound {
      background: #f1f3f5;
      align-self: flex-start;
    }
    .chat-widget-message.outbound {
      background: ${primaryColor};
      color: white;
      align-self: flex-end;
    }
    .chat-widget-input-container {
      padding: 16px;
      border-top: 1px solid #e9ecef;
      display: flex;
      gap: 8px;
    }
    .chat-widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #dee2e6;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
    }
    .chat-widget-input:focus {
      border-color: ${primaryColor};
    }
    .chat-widget-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .chat-widget-send:hover {
      opacity: 0.9;
    }
    .chat-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    @media (max-width: 480px) {
      .chat-widget-window {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        ${getPositionStyles(true)}
      }
    }
  `;
  document.head.appendChild(style);
}
```

---

## Testing

### Tests Unitarios

1. **EmailService:**
   - Test `getTenantBranding()` con tenant con branding
   - Test `getTenantBranding()` con tenant sin branding
   - Test `sendVerificationEmail()` con branding
   - Test `sendInvitationEmail()` con branding

2. **WebchatService:**
   - Test `getWidgetConfig()` incluye branding
   - Test `getWidgetConfig()` con tenant sin branding

### Tests de Integración

1. **Emails:**
   - Enviar email de verificación y verificar que muestra logo y colores
   - Enviar email de invitación y verificar que muestra logo y colores

2. **Widget:**
   - Cargar widget con tenant que tiene branding
   - Verificar que logo aparece en header
   - Verificar que colores se aplican correctamente

---

## Migraciones

No se requieren migraciones de base de datos. Se usan campos existentes de `TenantSettings`.

---

## Checklist de Implementación

- [ ] Modificar EmailService para obtener branding
- [ ] Actualizar templates de email (verification-email.hbs)
- [ ] Actualizar templates de email (invitation-email.hbs)
- [ ] Actualizar llamadas a EmailService (AuthService, InvitationsService)
- [ ] Modificar WebchatService.getWidgetConfig()
- [ ] Actualizar widget JavaScript para cargar branding
- [ ] Actualizar widget JavaScript para mostrar logo
- [ ] Actualizar widget JavaScript para aplicar colores
- [ ] Agregar PrismaModule a EmailModule
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Verificar URLs absolutas funcionan
- [ ] Verificar fallback a valores por defecto

---

**Última actualización:** 2025-01-XX


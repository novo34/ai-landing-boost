# PRD-07: Autenticación Avanzada + SSO (Google + Microsoft)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **Prioridad:** 🔴 CRÍTICA  
> **Estado:** Pendiente  
> **Bloque:** A - Fundamentos  
> **Dependencias:** PRD-02, PRD-06

---

## Objetivo

Completar el sistema de autenticación implementando SSO con Google y Microsoft, verificación de email, y sistema de invitaciones a equipos, permitiendo a los usuarios autenticarse mediante OAuth2/OIDC además de email/password.

---

## Alcance INCLUIDO

- ✅ Integración SSO con Google OAuth 2.0
- ✅ Integración SSO con Microsoft Azure AD / Office 365
- ✅ Verificación de email en registro
- ✅ Sistema de invitaciones a equipos por email
- ✅ Asociación de identidades SSO a usuarios existentes
- ✅ Creación automática de usuarios desde SSO
- ✅ Gestión de sesiones SSO (logout, revocación)
- ✅ UI para botones "Continuar con Google" y "Continuar con Microsoft"
- ✅ Manejo de errores y casos edge (email ya existe, SSO fallido, etc.)

---

## Alcance EXCLUIDO

- ❌ SAML 2.0 (queda para futura implementación)
- ❌ Otros proveedores SSO (Apple, GitHub, etc.)
- ❌ Autenticación de dos factores (2FA) - queda para futuro
- ❌ Cambio de contraseña desde SSO (no aplica)
- ❌ Migración de usuarios existentes a SSO (manual)

---

## Requisitos Funcionales

### RF-01: SSO con Google OAuth 2.0

**Descripción:** Los usuarios deben poder autenticarse usando su cuenta de Google.

**Flujo:**
1. Usuario hace clic en "Continuar con Google" en login/register
2. Se redirige a Google OAuth consent screen
3. Usuario autoriza acceso
4. Google redirige a callback con código de autorización
5. Backend intercambia código por tokens
6. Backend obtiene información del usuario (email, nombre, foto)
7. Backend busca o crea usuario y asocia identidad SSO
8. Backend genera JWT y establece sesión
9. Usuario es redirigido al dashboard

**Validaciones:**
- Email de Google debe ser único en el sistema
- Si email ya existe con password, se asocia SSO al usuario existente
- Si email ya existe solo con SSO, se inicia sesión normalmente

---

### RF-02: SSO con Microsoft Azure AD

**Descripción:** Los usuarios deben poder autenticarse usando su cuenta de Microsoft (Azure AD / Office 365).

**Flujo:**
1. Usuario hace clic en "Continuar con Microsoft" en login/register
2. Se redirige a Microsoft OAuth consent screen
3. Usuario autoriza acceso
4. Microsoft redirige a callback con código de autorización
5. Backend intercambia código por tokens
6. Backend obtiene información del usuario (email, nombre, foto)
7. Backend busca o crea usuario y asocia identidad SSO
8. Backend genera JWT y establece sesión
9. Usuario es redirigido al dashboard

**Validaciones:**
- Email de Microsoft debe ser único en el sistema
- Si email ya existe con password, se asocia SSO al usuario existente
- Si email ya existe solo con SSO, se inicia sesión normalmente

---

### RF-03: Verificación de Email

**Descripción:** Los usuarios que se registran con email/password deben verificar su email antes de poder usar el sistema completamente.

**Flujo:**
1. Usuario se registra con email/password
2. Sistema envía email de verificación con token único
3. Usuario hace clic en enlace del email
4. Sistema valida token y marca email como verificado
5. Usuario puede iniciar sesión normalmente

**Estados:**
- `emailVerified: false` → Usuario puede iniciar sesión pero con limitaciones (solo ver dashboard, no crear recursos)
- `emailVerified: true` → Usuario tiene acceso completo según su rol

**Reenvío:**
- Usuario puede solicitar reenvío de email de verificación
- Token expira después de 24 horas
- Se genera nuevo token en cada solicitud

---

### RF-04: Sistema de Invitaciones a Equipos

**Descripción:** Los OWNER y ADMIN de un tenant deben poder invitar usuarios por email a unirse al equipo.

**Flujo:**
1. OWNER/ADMIN accede a sección "Equipo" en settings
2. Hace clic en "Invitar miembro"
3. Ingresa email y selecciona rol (ADMIN, AGENT, VIEWER)
4. Sistema envía email de invitación con token único
5. Usuario invitado hace clic en enlace del email
6. Si no tiene cuenta, se registra (con SSO o email/password)
7. Si ya tiene cuenta, inicia sesión
8. Sistema asocia usuario al tenant con el rol especificado
9. Usuario es redirigido al dashboard del tenant

**Validaciones:**
- Email no puede estar ya asociado al tenant
- OWNER no puede ser invitado (solo creado en registro)
- Token de invitación expira después de 7 días
- Usuario puede rechazar invitación

**Casos especiales:**
- Si usuario ya tiene cuenta pero con email no verificado, se le pide verificar primero
- Si usuario ya está en otro tenant, se le permite unirse a múltiples tenants

---

### RF-05: Asociación de Identidades SSO

**Descripción:** Un usuario puede tener múltiples identidades SSO asociadas (Google, Microsoft) y también email/password.

**Flujo:**
1. Usuario con cuenta email/password inicia sesión con Google
2. Sistema detecta que email coincide
3. Sistema asocia identidad Google al usuario existente
4. Usuario puede iniciar sesión con cualquiera de los métodos

**Gestión:**
- Usuario puede ver identidades asociadas en su perfil
- Usuario puede desasociar identidades SSO (excepto si es el único método de autenticación)
- Si usuario desasocia última identidad SSO, debe tener password configurado

---

## Requisitos Técnicos

### RT-01: Modelo de Base de Datos

**Nuevas entidades Prisma:**

```prisma
model UserIdentity {
  id        String   @id @default(cuid())
  userId    String
  provider  String   // 'GOOGLE', 'MICROSOFT'
  providerId String  // ID único del usuario en el proveedor
  email     String   // Email del proveedor (puede diferir del User.email)
  name      String?
  picture   String?  // URL de foto de perfil
  accessToken String? // Encriptado, para refresh si es necesario
  refreshToken String? // Encriptado
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@unique([userId, provider])
  @@index([userId])
  @@index([provider, providerId])
}

model EmailVerification {
  id        String   @id @default(cuid())
  userId    String   @unique
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

model TeamInvitation {
  id        String     @id @default(cuid())
  tenantId  String
  email     String
  role      TenantRole
  token     String     @unique
  invitedBy String     // userId del que envió la invitación
  status    InvitationStatus @default(PENDING)
  expiresAt DateTime
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inviter User  @relation(fields: [invitedBy], references: [id])

  @@unique([tenantId, email, status])
  @@index([token])
  @@index([tenantId])
  @@index([email])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}
```

**Modificaciones a User:**

```prisma
model User {
  // ... campos existentes
  emailVerified Boolean @default(false)
  
  identities      UserIdentity[]
  emailVerification EmailVerification?
  invitationsSent TeamInvitation[] @relation("Inviter")
}
```

---

### RT-02: Variables de Entorno

**Backend (`apps/api/.env`):**

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common  # o 'organizations' o tenant específico
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/microsoft/callback

# Email (para verificación e invitaciones)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@yourapp.com

# Frontend URL (para redirects después de OAuth)
FRONTEND_URL=http://localhost:3000
```

---

### RT-03: Endpoints API

**Autenticación SSO:**

```
GET  /api/v1/auth/google          → Iniciar OAuth Google
GET  /api/v1/auth/google/callback → Callback OAuth Google
GET  /api/v1/auth/microsoft        → Iniciar OAuth Microsoft
GET  /api/v1/auth/microsoft/callback → Callback OAuth Microsoft
```

**Verificación de Email:**

```
POST /api/v1/auth/verify-email        → Verificar email con token
POST /api/v1/auth/resend-verification → Reenviar email de verificación
```

**Invitaciones:**

```
POST   /api/v1/tenants/:tenantId/invitations     → Crear invitación (OWNER/ADMIN)
GET    /api/v1/tenants/:tenantId/invitations    → Listar invitaciones (OWNER/ADMIN)
DELETE /api/v1/tenants/:tenantId/invitations/:id → Cancelar invitación (OWNER/ADMIN)
GET    /api/v1/invitations/:token               → Obtener info de invitación (público)
POST   /api/v1/invitations/:token/accept        → Aceptar invitación (requiere auth)
POST   /api/v1/invitations/:token/reject        → Rechazar invitación (público)
```

**Identidades SSO:**

```
GET    /api/v1/users/me/identities        → Listar identidades asociadas
DELETE /api/v1/users/me/identities/:id    → Desasociar identidad SSO
```

---

### RT-04: Servicios Externos

**Librerías necesarias:**

```json
{
  "dependencies": {
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-microsoft": "^0.0.1", // o @azure/msal-node
    "nodemailer": "^6.9.0",
    "@types/passport-google-oauth20": "^2.0.0"
  }
}
```

---

## Flujos UX

### Flujo 1: Login con Google

```
[Login Page]
  ↓
[Click "Continuar con Google"]
  ↓
[Redirect a Google OAuth]
  ↓
[Usuario autoriza]
  ↓
[Redirect a /auth/google/callback]
  ↓
[Backend procesa y genera JWT]
  ↓
[Redirect a /app (dashboard)]
```

### Flujo 2: Registro con Verificación

```
[Register Page]
  ↓
[Usuario completa formulario]
  ↓
[Submit → Backend crea usuario]
  ↓
[Email de verificación enviado]
  ↓
[Usuario recibe email]
  ↓
[Click en enlace]
  ↓
[Email verificado]
  ↓
[Redirect a /app]
```

### Flujo 3: Invitación a Equipo

```
[Settings → Equipo]
  ↓
[Click "Invitar miembro"]
  ↓
[Modal: Email + Rol]
  ↓
[Submit → Backend crea invitación]
  ↓
[Email de invitación enviado]
  ↓
[Usuario invitado recibe email]
  ↓
[Click en enlace]
  ↓
[Si no tiene cuenta → Register]
  ↓
[Si tiene cuenta → Login]
  ↓
[Asociación automática al tenant]
  ↓
[Redirect a /app]
```

---

## Estructura de DB

Ver RT-01 para modelos Prisma completos.

**Relaciones clave:**
- `User` 1:N `UserIdentity` (múltiples proveedores SSO)
- `User` 1:1 `EmailVerification` (token de verificación)
- `Tenant` 1:N `TeamInvitation` (invitaciones pendientes)
- `User` 1:N `TeamInvitation` (como inviter)

---

## Endpoints API

Ver RT-03 para lista completa.

**Formato de respuestas:**

```typescript
// Éxito
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error_key: "auth.email_already_verified",
  message: "Email already verified"
}
```

---

## Eventos n8n

**Nuevos eventos que se pueden enviar a n8n:**

- `user.registered` → Usuario se registra (con método: email/password, google, microsoft)
- `user.email_verified` → Usuario verifica su email
- `user.sso_linked` → Usuario asocia identidad SSO
- `team.invitation_sent` → Se envía invitación a equipo
- `team.invitation_accepted` → Usuario acepta invitación
- `team.invitation_rejected` → Usuario rechaza invitación

**Payload ejemplo:**

```json
{
  "event": "user.registered",
  "timestamp": "2025-01-XX...",
  "data": {
    "userId": "user_xxx",
    "email": "user@example.com",
    "method": "google", // o "email" o "microsoft"
    "tenantId": "tenant_xxx" // si aplica
  }
}
```

---

## Criterios de Aceptación

### CA-01: SSO Google
- [ ] Usuario puede iniciar sesión con Google
- [ ] Usuario puede registrarse con Google
- [ ] Si email ya existe, se asocia SSO al usuario existente
- [ ] Token JWT se genera correctamente después de SSO
- [ ] Sesión se mantiene después de redirect

### CA-02: SSO Microsoft
- [ ] Usuario puede iniciar sesión con Microsoft
- [ ] Usuario puede registrarse con Microsoft
- [ ] Si email ya existe, se asocia SSO al usuario existente
- [ ] Token JWT se genera correctamente después de SSO
- [ ] Sesión se mantiene después de redirect

### CA-03: Verificación de Email
- [ ] Email de verificación se envía al registrarse
- [ ] Token de verificación es único y expira en 24h
- [ ] Usuario puede verificar email haciendo clic en enlace
- [ ] Usuario puede reenviar email de verificación
- [ ] Usuario con email no verificado tiene acceso limitado

### CA-04: Invitaciones
- [ ] OWNER/ADMIN puede crear invitación
- [ ] Email de invitación se envía correctamente
- [ ] Token de invitación es único y expira en 7 días
- [ ] Usuario invitado puede aceptar/rechazar
- [ ] Usuario se asocia al tenant con rol correcto al aceptar
- [ ] Invitación expirada no puede ser aceptada

### CA-05: Identidades SSO
- [ ] Usuario puede ver identidades asociadas
- [ ] Usuario puede desasociar identidad SSO
- [ ] No se puede desasociar última identidad si no hay password
- [ ] Múltiples identidades funcionan correctamente

### CA-06: Seguridad
- [ ] Tokens OAuth se almacenan encriptados
- [ ] Tokens de verificación/invitación son únicos y seguros
- [ ] Rate limiting en endpoints de autenticación
- [ ] Validación de origen en callbacks OAuth
- [ ] Logs de auditoría para acciones SSO

---

## Consideraciones de Seguridad

- **Tokens OAuth:** Almacenar encriptados, no en texto plano
- **Callbacks OAuth:** Validar `state` parameter para prevenir CSRF
- **Email verification:** Tokens deben ser únicos, aleatorios, y expirar
- **Team invitations:** Validar que inviter tiene permisos (OWNER/ADMIN)
- **Rate limiting:** Limitar intentos de login/verificación por IP
- **Logs:** Registrar todos los intentos de autenticación (éxito y fallo)

---

## Dependencias

- PRD-02: Variables de entorno (para OAuth credentials)
- PRD-06: Guards y CORS (para proteger endpoints)
- Sistema de email configurado (SMTP)

---

## Referencias

- `IA-Specs/04-seguridad-y-compliance.mdc` - Estándares de seguridad
- `docs/02-auth-and-tenants.md` - Autenticación base existente
- `docs/02b-auth-security-hardening.md` - Hardening de seguridad
- Google OAuth 2.0 Documentation
- Microsoft Azure AD OAuth 2.0 Documentation

---

## Notas de Implementación

- Usar Passport.js para estrategias OAuth (estándar en NestJS)
- Considerar usar `@nestjs/passport` para integración con NestJS
- Emails deben ser responsive y mobile-first
- Considerar usar template engine para emails (ej: Handlebars)
- Tokens deben generarse con `crypto.randomBytes()` o similar

---

**Última actualización:** 2025-01-XX








# AI-SPEC-07: Implementación SSO Completo (Google + Microsoft)

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-07  
> **Prioridad:** 🔴 CRÍTICA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts                    [MODIFICAR]
│   │   ├── auth.service.ts                   [MODIFICAR]
│   │   ├── auth.controller.ts                [MODIFICAR]
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts               [EXISTE]
│   │   │   ├── google.strategy.ts            [CREAR]
│   │   │   └── microsoft.strategy.ts         [CREAR]
│   │   └── dto/
│   │       ├── login.dto.ts                  [EXISTE]
│   │       ├── register.dto.ts               [EXISTE]
│   │       ├── verify-email.dto.ts           [CREAR]
│   │       └── accept-invitation.dto.ts     [CREAR]
│   ├── email/
│   │   ├── email.module.ts                   [CREAR]
│   │   ├── email.service.ts                  [CREAR]
│   │   └── templates/
│   │       ├── verification-email.hbs        [CREAR]
│   │       └── invitation-email.hbs        [CREAR]
│   └── invitations/
│       ├── invitations.module.ts             [CREAR]
│       ├── invitations.service.ts            [CREAR]
│       └── invitations.controller.ts         [CREAR]
└── prisma/
    └── schema.prisma                          [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### Backend (NestJS)

#### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar nuevos modelos y modificar User

```prisma
// Agregar después de model User
model UserIdentity {
  id           String   @id @default(cuid())
  userId       String
  provider     String   // 'GOOGLE', 'MICROSOFT'
  providerId   String   // ID único del usuario en el proveedor
  email        String   // Email del proveedor
  name         String?
  picture      String?  // URL de foto
  accessToken  String?  // Encriptado
  refreshToken String?  // Encriptado
  expiresAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

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
  id        String            @id @default(cuid())
  tenantId  String
  email     String
  role      TenantRole
  token     String            @unique
  invitedBy String
  status    InvitationStatus  @default(PENDING)
  expiresAt DateTime
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  inviter User  @relation("Inviter", fields: [invitedBy], references: [id])

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

// Modificar model User
model User {
  // ... campos existentes
  emailVerified Boolean @default(false)
  
  identities      UserIdentity[]
  emailVerification EmailVerification?
  invitationsSent TeamInvitation[] @relation("Inviter")
}
```

---

#### 2. Crear Email Service

**Archivo:** `apps/api/src/modules/email/email.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, name?: string) {
    const template = this.loadTemplate('verification-email.hbs');
    const html = template({ name: name || 'Usuario', token, frontendUrl: process.env.FRONTEND_URL });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verifica tu email',
      html,
    });
  }

  async sendInvitationEmail(email: string, token: string, tenantName: string, inviterName: string) {
    const template = this.loadTemplate('invitation-email.hbs');
    const html = template({ email, token, tenantName, inviterName, frontendUrl: process.env.FRONTEND_URL });

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `Invitación a unirse a ${tenantName}`,
      html,
    });
  }

  private loadTemplate(filename: string) {
    const templatePath = join(__dirname, 'templates', filename);
    const source = readFileSync(templatePath, 'utf-8');
    return handlebars.compile(source);
  }
}
```

**Archivo:** `apps/api/src/modules/email/email.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

---

#### 3. Modificar Auth Service

**Archivo:** `apps/api/src/modules/auth/auth.service.ts`

**Acción:** Agregar métodos para SSO, verificación de email

```typescript
// Agregar imports
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// Agregar al constructor
constructor(
  // ... existentes
  private emailService: EmailService,
) {}

// Agregar métodos nuevos
async loginWithGoogle(profile: GoogleProfile): Promise<AuthTokens> {
  // 1. Buscar identidad SSO existente
  let identity = await this.prisma.userIdentity.findUnique({
    where: {
      provider_providerId: {
        provider: 'GOOGLE',
        providerId: profile.id,
      },
    },
    include: { user: true },
  });

  // 2. Si no existe, buscar por email
  if (!identity) {
    const user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user) {
      // Asociar SSO a usuario existente
      identity = await this.prisma.userIdentity.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerId: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        },
        include: { user: true },
      });
    } else {
      // Crear nuevo usuario
      const newUser = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          emailVerified: true, // Google ya verifica email
        },
      });

      identity = await this.prisma.userIdentity.create({
        data: {
          userId: newUser.id,
          provider: 'GOOGLE',
          providerId: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        },
        include: { user: { id: newUser.id } },
      });
    }
  }

  // 3. Generar JWT
  return this.generateTokens(identity.user);
}

async loginWithMicrosoft(profile: MicrosoftProfile): Promise<AuthTokens> {
  // Similar a loginWithGoogle pero con provider 'MICROSOFT'
  // ...
}

async sendVerificationEmail(userId: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerified) {
    throw new BadRequestException('Email already verified or user not found');
  }

  // Generar token único
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Guardar o actualizar token
  await this.prisma.emailVerification.upsert({
    where: { userId },
    update: { token, expiresAt },
    create: { userId, token, expiresAt },
  });

  // Enviar email
  await this.emailService.sendVerificationEmail(user.email, token, user.name || undefined);
}

async verifyEmail(token: string) {
  const verification = await this.prisma.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verification || verification.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired token');
  }

  await this.prisma.user.update({
    where: { id: verification.userId },
    data: { emailVerified: true },
  });

  await this.prisma.emailVerification.delete({
    where: { id: verification.id },
  });
}
```

---

#### 4. Crear Google Strategy

**Archivo:** `apps/api/src/modules/auth/strategies/google.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      id,
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
      picture: photos[0].value,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
```

---

#### 5. Crear Microsoft Strategy

**Archivo:** `apps/api/src/modules/auth/strategies/microsoft.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor() {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: process.env.MICROSOFT_REDIRECT_URI,
      tenant: process.env.MICROSOFT_TENANT_ID || 'common',
      scope: ['user.read'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
```

---

#### 6. Modificar Auth Controller

**Archivo:** `apps/api/src/modules/auth/auth.controller.ts`

**Acción:** Agregar endpoints para SSO, verificación, invitaciones

```typescript
// Agregar endpoints nuevos
@Get('google')
@UseGuards(AuthGuard('google'))
async googleAuth() {
  // Passport redirige automáticamente
}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthCallback(@Req() req: any, @Res() res: Response) {
  const tokens = await this.authService.loginWithGoogle(req.user);
  // Establecer cookies y redirigir
  this.setAuthCookies(res, tokens);
  res.redirect(`${process.env.FRONTEND_URL}/app`);
}

@Get('microsoft')
@UseGuards(AuthGuard('microsoft'))
async microsoftAuth() {
  // Passport redirige automáticamente
}

@Get('microsoft/callback')
@UseGuards(AuthGuard('microsoft'))
async microsoftAuthCallback(@Req() req: any, @Res() res: Response) {
  const tokens = await this.authService.loginWithMicrosoft(req.user);
  this.setAuthCookies(res, tokens);
  res.redirect(`${process.env.FRONTEND_URL}/app`);
}

@Post('verify-email')
@Public()
async verifyEmail(@Body() dto: VerifyEmailDto) {
  await this.authService.verifyEmail(dto.token);
  return { success: true, message: 'Email verified successfully' };
}

@Post('resend-verification')
@UseGuards(JwtAuthGuard)
async resendVerification(@CurrentUser() user: any) {
  await this.authService.sendVerificationEmail(user.id);
  return { success: true, message: 'Verification email sent' };
}
```

---

#### 7. Crear Invitations Module

**Archivo:** `apps/api/src/modules/invitations/invitations.service.ts`

```typescript
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async createInvitation(tenantId: string, email: string, role: TenantRole, invitedBy: string) {
    // Validar que inviter tiene permisos
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId: invitedBy, tenantId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Only OWNER or ADMIN can invite members');
    }

    // Validar que email no está ya en el tenant
    const existing = await this.prisma.tenantMembership.findFirst({
      where: {
        tenantId,
        user: { email },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this tenant');
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Crear invitación
    const invitation = await this.prisma.teamInvitation.create({
      data: {
        tenantId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
      },
      include: {
        tenant: true,
        inviter: true,
      },
    });

    // Enviar email
    await this.emailService.sendInvitationEmail(
      email,
      token,
      invitation.tenant.name,
      invitation.inviter.name || 'Admin',
    );

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.teamInvitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or already processed invitation');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Verificar que email coincide
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user.email !== invitation.email) {
      throw new BadRequestException('Email does not match invitation');
    }

    // Crear membresía
    await this.prisma.tenantMembership.create({
      data: {
        userId,
        tenantId: invitation.tenantId,
        role: invitation.role,
      },
    });

    // Marcar invitación como aceptada
    await this.prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return { success: true, tenantId: invitation.tenantId };
  }
}
```

---

## Tablas Prisma

Ver sección "1. Modificar Prisma Schema" arriba.

---

## DTOs

### VerifyEmailDto

**Archivo:** `apps/api/src/modules/auth/dto/verify-email.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
```

### AcceptInvitationDto

**Archivo:** `apps/api/src/modules/invitations/dto/accept-invitation.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
```

---

## Controllers

Ver sección "6. Modificar Auth Controller" y crear `invitations.controller.ts` similar.

---

## Services

Ver secciones 2, 3, 7 arriba.

---

## Guards

No se requieren guards nuevos. Usar:
- `JwtAuthGuard` para endpoints protegidos
- `@Public()` para callbacks OAuth y verificación de email
- `TenantContextGuard` + `RbacGuard` para endpoints de invitaciones

---

## Validaciones

- **Email verification token:** Debe existir y no estar expirado
- **Invitation token:** Debe existir, estar en estado PENDING, y no expirado
- **SSO profiles:** Email debe ser válido y único
- **Invitation creation:** Solo OWNER/ADMIN puede crear invitaciones
- **Invitation acceptance:** Email del usuario debe coincidir con invitación

---

## Errores Esperados

```typescript
// Errores comunes
- 'auth.email_already_verified'
- 'auth.invalid_verification_token'
- 'auth.verification_token_expired'
- 'invitations.only_owner_admin_can_invite'
- 'invitations.user_already_member'
- 'invitations.invalid_token'
- 'invitations.expired'
- 'invitations.email_mismatch'
- 'sso.email_already_exists'
- 'sso.provider_error'
```

---

## Test Plan

### Unit Tests

1. **EmailService:**
   - `sendVerificationEmail` envía email correctamente
   - `sendInvitationEmail` envía email correctamente
   - Maneja errores de SMTP

2. **AuthService:**
   - `loginWithGoogle` crea usuario nuevo si no existe
   - `loginWithGoogle` asocia SSO a usuario existente
   - `verifyEmail` marca email como verificado
   - `sendVerificationEmail` genera token único

3. **InvitationsService:**
   - `createInvitation` valida permisos
   - `createInvitation` rechaza si email ya es miembro
   - `acceptInvitation` crea membresía correctamente
   - `acceptInvitation` rechaza si token expirado

### Integration Tests

1. **Flujo completo SSO Google:**
   - Mock OAuth flow
   - Verificar creación de usuario/identidad
   - Verificar generación de JWT

2. **Flujo completo verificación email:**
   - Crear usuario
   - Enviar email
   - Verificar con token
   - Verificar estado actualizado

3. **Flujo completo invitación:**
   - Crear invitación
   - Aceptar invitación
   - Verificar membresía creada

---

## Checklist Final

- [ ] Prisma schema actualizado con nuevos modelos
- [ ] Migración Prisma creada y aplicada
- [ ] EmailService implementado y configurado
- [ ] Templates de email creados (verification, invitation)
- [ ] Google OAuth strategy implementada
- [ ] Microsoft OAuth strategy implementada
- [ ] AuthService con métodos SSO implementados
- [ ] AuthController con endpoints SSO
- [ ] InvitationsService implementado
- [ ] InvitationsController implementado
- [ ] DTOs creados y validados
- [ ] Variables de entorno documentadas
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Documentación de API actualizada
- [ ] Frontend actualizado con botones SSO
- [ ] Frontend con flujo de verificación de email
- [ ] Frontend con UI de invitaciones

---

## Dependencias de Paquetes

```json
{
  "dependencies": {
    "passport-google-oauth20": "^2.0.0",
    "passport-microsoft": "^0.0.1",
    "nodemailer": "^6.9.0",
    "handlebars": "^4.7.8",
    "@types/passport-google-oauth20": "^2.0.0",
    "@types/nodemailer": "^6.4.14"
  }
}
```

---

## Notas de Implementación

- **Encriptación de tokens:** Usar `crypto.createCipher` o librería de encriptación para accessToken/refreshToken
- **Rate limiting:** Aplicar rate limiting a endpoints de autenticación
- **Logs:** Registrar todos los intentos de SSO (éxito y fallo)
- **Emails:** Usar templates responsive y mobile-first
- **Callbacks OAuth:** Validar `state` parameter para prevenir CSRF

---

**Última actualización:** 2025-01-XX








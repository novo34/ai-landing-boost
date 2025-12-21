# AI-SPEC-49: Sistema de Entrega de Emails (Email Delivery)

> **Versión:** 1.0  
> **Fecha:** 2025-01-27  
> **PRD Relacionado:** PRD-49  
> **Prioridad:** 🟠 ALTA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── email/
│   │   ├── email.module.ts                    [CREAR]
│   │   ├── email.controller.ts                [CREAR]
│   │   ├── email.service.ts                   [CREAR]
│   │   ├── services/
│   │   │   ├── email-provider.service.ts      [CREAR]
│   │   │   ├── email-queue.service.ts         [CREAR]
│   │   │   ├── email-worker.service.ts         [CREAR]
│   │   │   ├── email-crypto.service.ts        [CREAR]
│   │   │   └── email-template.service.ts      [CREAR] (opcional v1)
│   │   └── dto/
│   │       ├── smtp-settings.dto.ts            [CREAR]
│   │       ├── send-email.dto.ts              [CREAR]
│   │       └── email-outbox.dto.ts            [CREAR]
│   └── platform/
│       └── platform-email.controller.ts        [CREAR] (o extender platform.controller.ts)
└── prisma/
    └── schema.prisma                          [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### Backend (NestJS)

#### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar modelos para SMTP settings, outbox y logs

```prisma
// Agregar después de modelos existentes

// Configuración SMTP por Tenant
model TenantSmtpSettings {
  id          String   @id @default(cuid())
  tenantId    String   @unique
  fromName    String
  fromEmail   String
  replyTo     String?
  host        String
  port        Int
  secure      Boolean  @default(false)
  username    String
  password    String   @db.Text // Cifrado con AES-256-GCM
  tls         Json?    // Configuración TLS opcional (rejectUnauthorized, ciphers, etc.)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // userId que actualizó
  
  tenant      tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@map("TenantSmtpSettings")
}

// Configuración SMTP Global del Platform
model PlatformSmtpSettings {
  id          String   @id @default(cuid())
  fromName    String
  fromEmail   String
  replyTo     String?
  host        String
  port        Int
  secure      Boolean  @default(false)
  username    String
  password    String   @db.Text // Cifrado con AES-256-GCM
  tls         Json?    // Configuración TLS opcional
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  updatedBy   String?  // userId que actualizó
  
  @@map("PlatformSmtpSettings")
}

// Cola de Envíos (Outbox Pattern)
model EmailOutbox {
  id              String            @id @default(cuid())
  tenantId        String?           // null para emails del platform
  idempotencyKey  String            @unique
  to              String
  cc              Json?             // Array de strings
  bcc             Json?             // Array de strings
  subject         String
  body            String            @db.Text
  bodyType        String            @default("html") // "html" | "text"
  status          EmailOutboxStatus @default(QUEUED)
  attempts        Int               @default(0)
  maxAttempts     Int               @default(5)
  nextRetryAt     DateTime?
  lastError       String?           @db.Text
  sentAt          DateTime?
  provider        String            @default("TENANT") // "TENANT" | "PLATFORM"
  metadata        Json?             // Datos adicionales
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  tenant          tenant?           @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  
  @@index([tenantId, status])
  @@index([status, nextRetryAt])
  @@index([idempotencyKey])
  @@index([createdAt])
  @@map("EmailOutbox")
}

// Enum para estados del outbox
enum EmailOutboxStatus {
  QUEUED
  SENDING
  SENT
  FAILED
  CANCELLED
}

// Logs de Auditoría de Configuración SMTP
model EmailSettingsAuditLog {
  id          String   @id @default(cuid())
  userId      String
  tenantId    String?  // null si es cambio global
  action      String   // "CREATE" | "UPDATE" | "DELETE"
  field       String?  // Campo modificado (opcional)
  oldValue    String?  @db.Text // Hash para password
  newValue    String?  @db.Text // Hash para password
  ipAddress  String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  user        user     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([tenantId])
  @@index([action])
  @@index([createdAt])
  @@map("EmailSettingsAuditLog")
}

// Agregar relación en modelo tenant
// (en model tenant, agregar:)
//   tenantSmtpSettings TenantSmtpSettings?
//   emailOutbox        EmailOutbox[]

// Agregar relación en modelo user
// (en model user, agregar:)
//   emailSettingsAuditLogs EmailSettingsAuditLog[]
```

---

#### 2. Crear Email Crypto Service

**Archivo:** `apps/api/src/modules/email/services/email-crypto.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EmailCryptoService {
  private readonly logger = new Logger(EmailCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits para GCM
  private readonly tagLength = 16; // 128 bits para GCM tag

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Si la key es un string, convertir a Buffer
    // Esperamos que sea hex (64 caracteres) o base64
    let keyBuffer: Buffer;
    if (key.length === 64) {
      // Hex string
      keyBuffer = Buffer.from(key, 'hex');
    } else {
      // Base64 o string directo
      keyBuffer = Buffer.from(key, 'base64');
    }
    
    // Asegurar que tenga exactamente 32 bytes
    if (keyBuffer.length !== this.keyLength) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${this.keyLength} bytes (${this.keyLength * 2} hex characters or ${Math.ceil(this.keyLength * 4 / 3)} base64 characters)`);
    }
    
    return keyBuffer;
  }

  /**
   * Cifra un texto plano usando AES-256-GCM
   * @param plaintext Texto a cifrar
   * @returns String en formato: iv:tag:ciphertext (todo en base64)
   */
  encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      
      // Formato: iv:tag:ciphertext (todo en base64)
      return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext}`;
    } catch (error) {
      this.logger.error(`Encryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Descifra un texto cifrado usando AES-256-GCM
   * @param encrypted Formato: iv:tag:ciphertext (todo en base64)
   * @returns Texto plano
   */
  decrypt(encrypted: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encrypted.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
      }
      
      const [ivBase64, tagBase64, ciphertext] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      this.logger.error(`Decryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Genera un hash para auditoría (no reversible)
   * @param plaintext Texto a hashear
   * @returns Hash SHA-256 en hex
   */
  hashForAudit(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }
}
```

---

#### 3. Crear Email Provider Service

**Archivo:** `apps/api/src/modules/email/services/email-provider.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailCryptoService } from './email-crypto.service';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface SmtpConfig {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  tls?: any;
}

@Injectable()
export class EmailProviderService {
  private readonly logger = new Logger(EmailProviderService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: EmailCryptoService,
  ) {}

  /**
   * Resuelve el provider SMTP efectivo para un tenant
   * Prioridad: Tenant SMTP → Platform SMTP → Error
   */
  async resolveProvider(tenantId?: string): Promise<{ config: SmtpConfig; provider: 'TENANT' | 'PLATFORM' }> {
    // 1. Intentar obtener SMTP del tenant
    if (tenantId) {
      const tenantSmtp = await this.prisma.tenantSmtpSettings.findUnique({
        where: { tenantId },
      });

      if (tenantSmtp && tenantSmtp.isActive) {
        const config = await this.buildSmtpConfig(tenantSmtp);
        return { config, provider: 'TENANT' };
      }
    }

    // 2. Fallback a Platform SMTP
    const platformSmtp = await this.prisma.platformSmtpSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (platformSmtp && platformSmtp.isActive) {
      const config = await this.buildSmtpConfig(platformSmtp);
      return { config, provider: 'PLATFORM' };
    }

    // 3. Error si no hay provider
    throw new NotFoundException('No SMTP configuration available. Please configure SMTP settings.');
  }

  /**
   * Construye configuración SMTP desde modelo de DB
   */
  private async buildSmtpConfig(settings: any): Promise<SmtpConfig> {
    const password = this.cryptoService.decrypt(settings.password);
    
    return {
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      replyTo: settings.replyTo || settings.fromEmail,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password,
      tls: settings.tls ? JSON.parse(settings.tls as any) : undefined,
    };
  }

  /**
   * Crea transporter de nodemailer desde configuración
   */
  createTransporter(config: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true para 465, false para otros puertos
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: config.tls || {
        rejectUnauthorized: true,
      },
    });
  }

  /**
   * Verifica conexión SMTP
   */
  async verifyConnection(tenantId?: string): Promise<boolean> {
    try {
      const { config } = await this.resolveProvider(tenantId);
      const transporter = this.createTransporter(config);
      
      await transporter.verify();
      return true;
    } catch (error) {
      this.logger.error(`SMTP verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Envía email usando SMTP
   */
  async sendEmail(
    config: SmtpConfig,
    to: string,
    subject: string,
    body: string,
    bodyType: 'html' | 'text' = 'html',
    cc?: string[],
    bcc?: string[],
  ): Promise<void> {
    const transporter = this.createTransporter(config);
    
    const mailOptions = {
      from: `"${config.fromName}" <${config.fromEmail}>`,
      replyTo: config.replyTo,
      to,
      cc: cc && cc.length > 0 ? cc : undefined,
      bcc: bcc && bcc.length > 0 ? bcc : undefined,
      subject,
      [bodyType === 'html' ? 'html' : 'text']: body,
    };

    await transporter.sendMail(mailOptions);
  }
}
```

---

#### 4. Crear Email Queue Service

**Archivo:** `apps/api/src/modules/email/services/email-queue.service.ts`

```typescript
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailProviderService } from './email-provider.service';

interface EnqueueEmailDto {
  tenantId?: string;
  idempotencyKey: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyType?: 'html' | 'text';
  maxAttempts?: number;
  metadata?: any;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private prisma: PrismaService,
    private providerService: EmailProviderService,
  ) {}

  /**
   * Encola un email para envío
   * Verifica idempotencia antes de crear
   */
  async enqueue(dto: EnqueueEmailDto): Promise<string> {
    // Verificar idempotencia
    const existing = await this.prisma.emailOutbox.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existing) {
      if (existing.status === 'SENT' || existing.status === 'SENDING') {
        throw new ConflictException('Email with this idempotency key already exists and is being processed');
      }
      // Si está en FAILED o CANCELLED, permitir re-enqueue actualizando el registro
      if (existing.status === 'FAILED' || existing.status === 'CANCELLED') {
        return this.updateAndRequeue(existing.id, dto);
      }
    }

    // Verificar que existe provider disponible
    await this.providerService.resolveProvider(dto.tenantId);

    // Crear registro en outbox
    const email = await this.prisma.emailOutbox.create({
      data: {
        tenantId: dto.tenantId,
        idempotencyKey: dto.idempotencyKey,
        to: dto.to,
        cc: dto.cc ? JSON.stringify(dto.cc) : null,
        bcc: dto.bcc ? JSON.stringify(dto.bcc) : null,
        subject: dto.subject,
        body: dto.body,
        bodyType: dto.bodyType || 'html',
        maxAttempts: dto.maxAttempts || 5,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        status: 'QUEUED',
      },
    });

    this.logger.log(`Email enqueued: ${email.id}, to: ${dto.to}, tenant: ${dto.tenantId || 'platform'}`);
    return email.id;
  }

  /**
   * Actualiza email existente y lo re-encola
   */
  private async updateAndRequeue(emailId: string, dto: EnqueueEmailDto): Promise<string> {
    const email = await this.prisma.emailOutbox.update({
      where: { id: emailId },
      data: {
        to: dto.to,
        cc: dto.cc ? JSON.stringify(dto.cc) : null,
        bcc: dto.bcc ? JSON.stringify(dto.bcc) : null,
        subject: dto.subject,
        body: dto.body,
        bodyType: dto.bodyType || 'html',
        maxAttempts: dto.maxAttempts || 5,
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
        status: 'QUEUED',
        attempts: 0,
        nextRetryAt: null,
        lastError: null,
      },
    });

    this.logger.log(`Email re-queued: ${email.id}`);
    return email.id;
  }
}
```

---

#### 5. Crear Email Worker Service

**Archivo:** `apps/api/src/modules/email/services/email-worker.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailProviderService } from './email-provider.service';
import { $Enums } from '@prisma/client';

@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);
  private readonly BATCH_SIZE = 50;
  private readonly TIMEOUT_MS = 30000; // 30 segundos
  private readonly RATE_LIMIT_PER_TENANT = 10; // emails por minuto
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto

  private rateLimitMap = new Map<string, { count: number; resetAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private providerService: EmailProviderService,
  ) {}

  /**
   * Worker que procesa la cola de emails
   * Se ejecuta cada 30 segundos
   */
  @Cron('*/30 * * * * *') // Cada 30 segundos
  async processQueue() {
    this.logger.debug('🔄 Starting email queue processing...');

    try {
      const emails = await this.getPendingEmails();
      this.logger.debug(`📊 Found ${emails.length} emails to process`);

      let successCount = 0;
      let failedCount = 0;

      for (const email of emails) {
        try {
          await this.processEmail(email);
          successCount++;
        } catch (error) {
          failedCount++;
          this.logger.error(
            `❌ Failed to process email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      if (emails.length > 0) {
        this.logger.log(
          `✅ Queue processing completed: ${successCount} sent, ${failedCount} failed out of ${emails.length} total`,
        );
      }
    } catch (error) {
      this.logger.error(`❌ Error in queue processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtiene emails pendientes de procesar
   */
  private async getPendingEmails() {
    const now = new Date();
    
    return this.prisma.emailOutbox.findMany({
      where: {
        status: 'QUEUED',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: this.BATCH_SIZE,
    });
  }

  /**
   * Procesa un email individual
   */
  private async processEmail(email: any) {
    // Verificar rate limiting
    if (email.tenantId && !this.checkRateLimit(email.tenantId)) {
      this.logger.warn(`Rate limit exceeded for tenant ${email.tenantId}, skipping email ${email.id}`);
      // Programar reintento en 1 minuto
      await this.scheduleRetry(email.id, email.attempts, 60000);
      return;
    }

    // "Claim" el email con transacción
    const claimed = await this.claimEmail(email.id);
    if (!claimed) {
      // Otro worker ya lo procesó
      return;
    }

    try {
      // Resolver provider
      const { config, provider } = await this.providerService.resolveProvider(email.tenantId || undefined);

      // Enviar email con timeout
      await this.sendWithTimeout(config, email, provider);

      // Marcar como enviado
      await this.markAsSent(email.id, provider);
      
      this.logger.log(`✅ Email sent: ${email.id}, to: ${email.to}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Email failed: ${email.id}, error: ${errorMessage}`);

      // Manejar reintento
      await this.handleRetry(email, errorMessage);
    }
  }

  /**
   * "Claim" seguro del email usando transacción
   */
  private async claimEmail(emailId: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const email = await tx.emailOutbox.findUnique({
          where: { id: emailId },
        });

        if (!email || email.status !== 'QUEUED') {
          throw new Error('Email not available for processing');
        }

        await tx.emailOutbox.update({
          where: { id: emailId },
          data: { status: 'SENDING' },
        });
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Envía email con timeout
   */
  private async sendWithTimeout(config: any, email: any, provider: string): Promise<void> {
    return Promise.race([
      this.providerService.sendEmail(
        config,
        email.to,
        email.subject,
        email.body,
        email.bodyType as 'html' | 'text',
        email.cc ? JSON.parse(email.cc as string) : undefined,
        email.bcc ? JSON.parse(email.bcc as string) : undefined,
      ),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Email send timeout')), this.TIMEOUT_MS),
      ),
    ]);
  }

  /**
   * Marca email como enviado
   */
  private async markAsSent(emailId: string, provider: string) {
    await this.prisma.emailOutbox.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        provider,
      },
    });
  }

  /**
   * Maneja reintento de email fallido
   */
  private async handleRetry(email: any, errorMessage: string) {
    const newAttempts = email.attempts + 1;

    if (newAttempts >= email.maxAttempts) {
      // Máximo de intentos alcanzado
      await this.prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          attempts: newAttempts,
          lastError: errorMessage,
        },
      });
    } else {
      // Calcular delay con backoff exponencial + jitter
      const baseDelay = Math.pow(2, newAttempts) * 60000; // 1min, 2min, 4min, 8min, 16min
      const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1); // ±20%
      const delay = Math.max(60000, baseDelay + jitter); // Mínimo 1 minuto

      const nextRetryAt = new Date(Date.now() + delay);

      await this.prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: 'QUEUED',
          attempts: newAttempts,
          nextRetryAt,
          lastError: errorMessage,
        },
      });
    }
  }

  /**
   * Programa reintento manual
   */
  private async scheduleRetry(emailId: string, currentAttempts: number, delayMs: number) {
    const nextRetryAt = new Date(Date.now() + delayMs);
    
    await this.prisma.emailOutbox.update({
      where: { id: emailId },
      data: {
        status: 'QUEUED',
        nextRetryAt,
      },
    });
  }

  /**
   * Verifica rate limiting por tenant
   */
  private checkRateLimit(tenantId: string): boolean {
    const now = new Date();
    const limit = this.rateLimitMap.get(tenantId);

    if (!limit || now > limit.resetAt) {
      // Reset o primera vez
      this.rateLimitMap.set(tenantId, {
        count: 1,
        resetAt: new Date(now.getTime() + this.RATE_LIMIT_WINDOW_MS),
      });
      return true;
    }

    if (limit.count >= this.RATE_LIMIT_PER_TENANT) {
      return false;
    }

    limit.count++;
    return true;
  }
}
```

---

#### 6. Crear Email Service (Principal)

**Archivo:** `apps/api/src/modules/email/email.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailProviderService } from './services/email-provider.service';
import { EmailCryptoService } from './services/email-crypto.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: EmailQueueService,
    private providerService: EmailProviderService,
    private cryptoService: EmailCryptoService,
  ) {}

  /**
   * Obtiene configuración SMTP de un tenant
   */
  async getTenantSmtpSettings(tenantId: string) {
    const settings = await this.prisma.tenantSmtpSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return null;
    }

    // No devolver password real
    return {
      ...settings,
      password: '***', // Omitir campo
    };
  }

  /**
   * Guarda o actualiza configuración SMTP de un tenant
   */
  async saveTenantSmtpSettings(tenantId: string, dto: any, userId: string) {
    const encryptedPassword = this.cryptoService.encrypt(dto.password);

    const settings = await this.prisma.tenantSmtpSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        password: encryptedPassword,
        tls: dto.tls ? JSON.stringify(dto.tls) : null,
        updatedBy: userId,
      },
      update: {
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        password: encryptedPassword,
        tls: dto.tls ? JSON.stringify(dto.tls) : null,
        updatedBy: userId,
      },
    });

    // Registrar auditoría
    await this.logAudit(userId, tenantId, 'UPDATE', null, null);

    return {
      ...settings,
      password: '***',
    };
  }

  /**
   * Envía email de prueba
   */
  async sendTestEmail(tenantId: string | undefined, to: string, subject?: string) {
    const { config } = await this.providerService.resolveProvider(tenantId);
    
    const testSubject = subject || 'Email de prueba';
    const testBody = `
      <h2>Email de prueba</h2>
      <p>Este es un email de prueba enviado desde la configuración SMTP.</p>
      <p>Si recibes este email, la configuración SMTP está funcionando correctamente.</p>
    `;

    // Verificar conexión primero
    const isConnected = await this.providerService.verifyConnection(tenantId);
    if (!isConnected) {
      throw new Error('SMTP connection verification failed');
    }

    // Enviar email
    await this.providerService.sendEmail(config, to, testSubject, testBody, 'html');

    // Registrar en outbox (opcional, para trazabilidad)
    const idempotencyKey = `test-${Date.now()}-${Math.random()}`;
    await this.queueService.enqueue({
      tenantId,
      idempotencyKey,
      to,
      subject: testSubject,
      body: testBody,
      bodyType: 'html',
    });

    return { success: true, message: 'Test email sent successfully' };
  }

  /**
   * Obtiene logs de emails de un tenant
   */
  async getEmailLogs(tenantId: string | undefined, page: number = 1, limit: number = 20, status?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (status) {
      where.status = status;
    }

    const [emails, total] = await Promise.all([
      this.prisma.emailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailOutbox.count({ where }),
    ]);

    return {
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Registra auditoría
   */
  private async logAudit(
    userId: string,
    tenantId: string | null,
    action: string,
    field: string | null,
    oldValue: string | null,
    newValue: string | null = null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.emailSettingsAuditLog.create({
      data: {
        userId,
        tenantId,
        action,
        field,
        oldValue: oldValue ? this.cryptoService.hashForAudit(oldValue) : null,
        newValue: newValue ? this.cryptoService.hashForAudit(newValue) : null,
        ipAddress,
        userAgent,
      },
    });
  }
}
```

---

#### 7. Crear Email Controller

**Archivo:** `apps/api/src/modules/email/email.controller.ts`

```typescript
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { TenantRoles } from '../../common/decorators/tenant-roles.decorator';

@Controller('settings/email')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Get()
  @UseGuards(RbacGuard)
  @TenantRoles('OWNER', 'ADMIN')
  async getSettings(@Req() req: any) {
    const tenantId = req.tenantId;
    const settings = await this.emailService.getTenantSmtpSettings(tenantId);
    return {
      success: true,
      data: settings,
    };
  }

  @Put()
  @UseGuards(RbacGuard)
  @TenantRoles('OWNER', 'ADMIN')
  async updateSettings(@Req() req: any, @Body() dto: any) {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const settings = await this.emailService.saveTenantSmtpSettings(tenantId, dto, userId);
    return {
      success: true,
      data: settings,
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @TenantRoles('OWNER', 'ADMIN')
  async sendTestEmail(@Req() req: any, @Body() dto: { to: string; subject?: string }) {
    const tenantId = req.tenantId;
    const result = await this.emailService.sendTestEmail(tenantId, dto.to, dto.subject);
    return {
      success: true,
      data: result,
    };
  }

  @Get('logs')
  @UseGuards(RbacGuard)
  @TenantRoles('OWNER', 'ADMIN')
  async getLogs(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const tenantId = req.tenantId;
    const result = await this.emailService.getEmailLogs(
      tenantId,
      parseInt(page),
      parseInt(limit),
      status,
    );
    return {
      success: true,
      ...result,
    };
  }
}
```

---

#### 8. Crear Platform Email Controller

**Archivo:** `apps/api/src/modules/platform/platform-email.controller.ts`

```typescript
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformGuard } from '../../common/guards/platform.guard';
import { PlatformRoles } from '../../common/decorators/platform-roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailCryptoService } from '../email/services/email-crypto.service';

@Controller('platform/settings/email')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class PlatformEmailController {
  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
    private cryptoService: EmailCryptoService,
  ) {}

  @Get()
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
  async getSettings() {
    const settings = await this.prisma.platformSmtpSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        ...settings,
        password: '***',
      },
    };
  }

  @Put()
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  async updateSettings(@Req() req: any, @Body() dto: any) {
    const userId = req.user.userId;
    const encryptedPassword = this.cryptoService.encrypt(dto.password);

    const settings = await this.prisma.platformSmtpSettings.upsert({
      where: { id: 'global' }, // O crear con id único
      create: {
        id: 'global',
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        password: encryptedPassword,
        tls: dto.tls ? JSON.stringify(dto.tls) : null,
        updatedBy: userId,
      },
      update: {
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        replyTo: dto.replyTo,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        username: dto.username,
        password: encryptedPassword,
        tls: dto.tls ? JSON.stringify(dto.tls) : null,
        updatedBy: userId,
      },
    });

    return {
      success: true,
      data: {
        ...settings,
        password: '***',
      },
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN')
  async sendTestEmail(@Body() dto: { to: string; subject?: string }) {
    const result = await this.emailService.sendTestEmail(undefined, dto.to, dto.subject);
    return {
      success: true,
      data: result,
    };
  }

  @Get('logs')
  @PlatformRoles('PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    const result = await this.emailService.getEmailLogs(undefined, parseInt(page), parseInt(limit), status);
    return {
      success: true,
      ...result,
    };
  }
}
```

---

#### 9. Crear Email Module

**Archivo:** `apps/api/src/modules/email/email.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailProviderService } from './services/email-provider.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailWorkerService } from './services/email-worker.service';
import { EmailCryptoService } from './services/email-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailProviderService,
    EmailQueueService,
    EmailWorkerService,
    EmailCryptoService,
    PrismaService,
  ],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
```

---

### Frontend (Next.js)

#### 10. Crear Página de Settings Email - Tenant

**Archivo:** `apps/web/app/app/settings/email/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';

export default function EmailSettingsPage() {
  const t = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    fromName: '',
    fromEmail: '',
    replyTo: '',
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings/email');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
        setFormData({
          fromName: data.data.fromName || '',
          fromEmail: data.data.fromEmail || '',
          replyTo: data.data.replyTo || '',
          host: data.data.host || '',
          port: data.data.port || 587,
          secure: data.data.secure || false,
          username: data.data.username || '',
          password: '', // Nunca recibimos password
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        await loadSettings();
        setTestResult({ success: true, message: t('email.settings_saved') });
      } else {
        setTestResult({ success: false, message: data.message || t('email.save_error') });
      }
    } catch (error) {
      setTestResult({ success: false, message: t('email.save_error') });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const to = prompt(t('email.test_email_prompt'));
    if (!to) return;

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: t('email.test_sent_success') });
      } else {
        setTestResult({ success: false, message: data.message || t('email.test_error') });
      }
    } catch (error) {
      setTestResult({ success: false, message: t('email.test_error') });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('email.settings_title')}</CardTitle>
          <CardDescription>{t('email.settings_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('email.from_name')}</Label>
              <Input
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('email.from_email')}</Label>
              <Input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('email.reply_to')} ({t('common.optional')})</Label>
              <Input
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('email.host')}</Label>
              <Input
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <Label>{t('email.port')}</Label>
              <Input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
              />
              <Label htmlFor="secure">{t('email.secure')}</Label>
            </div>
            <div>
              <Label>{t('email.username')}</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('email.password')}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={settings ? t('email.password_unchanged') : ''}
              />
            </div>
          </div>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="animate-spin mr-2" /> : <Mail className="mr-2" />}
              {t('email.send_test')}
            </Button>
          </div>

          {settings && (
            <div className="mt-4">
              <Badge variant="outline">
                {t('email.last_updated')}: {new Date(settings.updatedAt).toLocaleString()}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

#### 11. Agregar Claves i18n

**Archivo:** `apps/web/lib/i18n/locales/es/common.json`

Agregar sección `email`:

```json
{
  "email": {
    "settings_title": "Configuración de Email",
    "settings_description": "Configura tu servidor SMTP para enviar emails",
    "from_name": "Nombre del remitente",
    "from_email": "Email del remitente",
    "reply_to": "Email de respuesta",
    "host": "Servidor SMTP",
    "port": "Puerto",
    "secure": "Usar SSL/TLS",
    "username": "Usuario SMTP",
    "password": "Contraseña SMTP",
    "password_unchanged": "Dejar vacío para no cambiar",
    "settings_saved": "Configuración guardada correctamente",
    "save_error": "Error al guardar configuración",
    "send_test": "Enviar email de prueba",
    "test_email_prompt": "Ingresa el email destinatario:",
    "test_sent_success": "Email de prueba enviado correctamente",
    "test_error": "Error al enviar email de prueba",
    "last_updated": "Última actualización"
  }
}
```

**Archivo:** `apps/web/lib/i18n/locales/en/common.json`

Agregar misma sección en inglés.

---

## Variables de Entorno

**Archivo:** `.env` (backend)

```bash
# Email Encryption Key (32 bytes, hex o base64)
ENCRYPTION_KEY=your-32-byte-key-here-in-hex-or-base64

# Email Worker Configuration (opcional)
EMAIL_WORKER_INTERVAL=30 # segundos
EMAIL_RATE_LIMIT_PER_TENANT=10 # emails por minuto
```

---

## Dependencias NPM

**Archivo:** `apps/api/package.json`

Agregar:

```json
{
  "dependencies": {
    "nodemailer": "^6.9.7",
    "@nestjs/schedule": "^3.0.4",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.14",
    "@types/uuid": "^9.0.6"
  }
}
```

---

## Migración de Base de Datos

**Archivo:** `apps/api/prisma/migrations/XXXXXX_add_email_delivery/migration.sql`

```sql
-- Crear tabla TenantSmtpSettings
CREATE TABLE `TenantSmtpSettings` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191) NOT NULL,
  `fromName` VARCHAR(191) NOT NULL,
  `fromEmail` VARCHAR(191) NOT NULL,
  `replyTo` VARCHAR(191),
  `host` VARCHAR(191) NOT NULL,
  `port` INT NOT NULL,
  `secure` BOOLEAN NOT NULL DEFAULT false,
  `username` VARCHAR(191) NOT NULL,
  `password` TEXT NOT NULL,
  `tls` JSON,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` VARCHAR(191),
  
  UNIQUE INDEX `TenantSmtpSettings_tenantId_key`(`tenantId`),
  INDEX `TenantSmtpSettings_tenantId_idx`(`tenantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear tabla PlatformSmtpSettings
CREATE TABLE `PlatformSmtpSettings` (
  `id` VARCHAR(191) NOT NULL,
  `fromName` VARCHAR(191) NOT NULL,
  `fromEmail` VARCHAR(191) NOT NULL,
  `replyTo` VARCHAR(191),
  `host` VARCHAR(191) NOT NULL,
  `port` INT NOT NULL,
  `secure` BOOLEAN NOT NULL DEFAULT false,
  `username` VARCHAR(191) NOT NULL,
  `password` TEXT NOT NULL,
  `tls` JSON,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` VARCHAR(191),
  
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear enum EmailOutboxStatus
CREATE TABLE `EmailOutbox` (
  `id` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191),
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `to` VARCHAR(191) NOT NULL,
  `cc` JSON,
  `bcc` JSON,
  `subject` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `bodyType` VARCHAR(191) NOT NULL DEFAULT 'html',
  `status` ENUM('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
  `attempts` INT NOT NULL DEFAULT 0,
  `maxAttempts` INT NOT NULL DEFAULT 5,
  `nextRetryAt` DATETIME(3),
  `lastError` TEXT,
  `sentAt` DATETIME(3),
  `provider` VARCHAR(191) NOT NULL DEFAULT 'TENANT',
  `metadata` JSON,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  
  UNIQUE INDEX `EmailOutbox_idempotencyKey_key`(`idempotencyKey`),
  INDEX `EmailOutbox_tenantId_status_idx`(`tenantId`, `status`),
  INDEX `EmailOutbox_status_nextRetryAt_idx`(`status`, `nextRetryAt`),
  INDEX `EmailOutbox_idempotencyKey_idx`(`idempotencyKey`),
  INDEX `EmailOutbox_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear tabla EmailSettingsAuditLog
CREATE TABLE `EmailSettingsAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `tenantId` VARCHAR(191),
  `action` VARCHAR(191) NOT NULL,
  `field` VARCHAR(191),
  `oldValue` TEXT,
  `newValue` TEXT,
  `ipAddress` VARCHAR(191),
  `userAgent` VARCHAR(191),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  INDEX `EmailSettingsAuditLog_userId_idx`(`userId`),
  INDEX `EmailSettingsAuditLog_tenantId_idx`(`tenantId`),
  INDEX `EmailSettingsAuditLog_action_idx`(`action`),
  INDEX `EmailSettingsAuditLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agregar foreign keys
ALTER TABLE `TenantSmtpSettings` ADD CONSTRAINT `TenantSmtpSettings_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EmailOutbox` ADD CONSTRAINT `EmailOutbox_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EmailSettingsAuditLog` ADD CONSTRAINT `EmailSettingsAuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Lista de Tareas de Implementación

### Backend

1. ✅ Instalar dependencias: `nodemailer`, `@nestjs/schedule`, `uuid`
2. ✅ Crear migración Prisma con modelos
3. ✅ Crear `EmailCryptoService` (cifrado AES-256-GCM)
4. ✅ Crear `EmailProviderService` (resolución de SMTP)
5. ✅ Crear `EmailQueueService` (encolar emails)
6. ✅ Crear `EmailWorkerService` (procesar cola con cron)
7. ✅ Crear `EmailService` (lógica principal)
8. ✅ Crear `EmailController` (endpoints tenant)
9. ✅ Crear `PlatformEmailController` (endpoints platform)
10. ✅ Crear `EmailModule` y registrar en `AppModule`
11. ✅ Agregar variable `ENCRYPTION_KEY` a `.env.example`
12. ✅ Configurar guards y RBAC en controllers

### Frontend

13. ✅ Crear página `/app/settings/email/page.tsx`
14. ✅ Crear página `/platform/settings/email/page.tsx` (o extender platform)
15. ✅ Agregar claves i18n en `es/common.json` y `en/common.json`
16. ✅ Crear componentes UI (formularios, tablas de logs)
17. ✅ Agregar rutas en navegación (si aplica)

### Testing y Validación

18. ✅ Probar configuración SMTP tenant
19. ✅ Probar configuración SMTP global
20. ✅ Probar envío de prueba
21. ✅ Probar worker y cola de envíos
22. ✅ Probar cifrado/descifrado
23. ✅ Probar RBAC (permisos correctos)
24. ✅ Probar idempotencia
25. ✅ Probar reintentos y backoff
26. ✅ Verificar que no hay textos hardcodeados
27. ✅ Verificar que password nunca se expone

---

**Última actualización:** 2025-01-27



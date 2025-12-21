import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailProviderService } from './services/email-provider.service';
import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';
import { EmailI18nService } from './services/email-i18n.service';
import { v4 as uuidv4 } from 'uuid';
import { SmtpSettingsDto } from './dto/smtp-settings.dto';
import * as handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: EmailQueueService,
    private providerService: EmailProviderService,
    private cryptoService: CryptoService,
    private i18nService: EmailI18nService,
  ) {}

  /**
   * Obtiene configuración SMTP de un tenant
   */
  async getTenantSmtpSettings(tenantId: string) {
    const settings = await (this.prisma as any).tenantsmtpsettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return null;
    }

    // No devolver password real
    const { password, ...rest } = settings;
    return {
      ...rest,
      password: '***', // Omitir campo
    };
  }

  /**
   * Guarda o actualiza configuración SMTP de un tenant
   */
  async saveTenantSmtpSettings(tenantId: string, dto: SmtpSettingsDto, userId: string) {
    // Si no se envía password, mantener el existente
    const existingSettings = await (this.prisma as any).tenantsmtpsettings.findUnique({
      where: { tenantId },
    });

    const updateData: any = {
      fromName: dto.fromName,
      fromEmail: dto.fromEmail,
      replyTo: dto.replyTo,
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      username: dto.username,
      tls: dto.tls ? JSON.stringify(dto.tls) : null,
      updatedBy: userId,
    };

    // Solo actualizar password si se proporciona uno nuevo (no vacío)
    if (dto.password && dto.password.trim() !== '') {
      // Cifrar password usando CryptoService (formato EncryptedBlobV1)
      const recordId = existingSettings?.id || `tenant-smtp-${tenantId}-${Date.now()}`;
      updateData.password = this.cryptoService.encryptJson(
        { password: dto.password },
        { tenantId, recordId }
      ) as any;
    } else if (existingSettings) {
      // Mantener el password existente si no se proporciona uno nuevo
      updateData.password = existingSettings.password;
    } else {
      // Si no existe configuración y no se proporciona password, usar uno vacío
      const recordId = `tenant-smtp-${tenantId}-${Date.now()}`;
      updateData.password = this.cryptoService.encryptJson(
        { password: '' },
        { tenantId, recordId }
      ) as any;
    }

    const settings = await (this.prisma as any).tenantsmtpsettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...updateData,
      },
      update: updateData,
    });

    // Registrar auditoría
    await this.logAudit(userId, tenantId, 'UPDATE', null, null);

    const { password, ...rest } = settings;
    return {
      ...rest,
      password: '***',
    };
  }

  /**
   * Obtiene configuración SMTP global del platform
   */
  async getPlatformSmtpSettings() {
    const settings = await (this.prisma as any).platformsmtpsettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!settings) {
      return null;
    }

    const { password, ...rest } = settings;
    return {
      ...rest,
      password: '***',
    };
  }

  /**
   * Guarda o actualiza configuración SMTP global del platform
   */
  async savePlatformSmtpSettings(dto: SmtpSettingsDto, userId: string) {
    // Buscar si existe configuración global
    // Type assertion: PrismaService extiende PrismaClient, pero TypeScript puede no reconocer los modelos generados
    const existingSettings = await (this.prisma as any).platformsmtpsettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const updateData: any = {
      fromName: dto.fromName,
      fromEmail: dto.fromEmail,
      replyTo: dto.replyTo,
      host: dto.host,
      port: dto.port,
      secure: dto.secure,
      username: dto.username,
      tls: dto.tls ? JSON.stringify(dto.tls) : null,
      updatedBy: userId,
    };

    // Solo actualizar password si se proporciona uno nuevo (no vacío)
    if (dto.password && dto.password.trim() !== '') {
      // Cifrar password usando CryptoService (recordId = settings.id para platform SMTP)
      const recordId = existingSettings?.id || `platform-smtp-${Date.now()}`;
      updateData.password = this.cryptoService.encryptJson(
        { password: dto.password },
        { tenantId: 'platform', recordId }
      ) as any;
    } else if (existingSettings) {
      // Mantener el password existente si no se proporciona uno nuevo
      updateData.password = existingSettings.password;
    } else {
      // Si no existe configuración y no se proporciona password, usar uno vacío
      const recordId = `platform-smtp-${Date.now()}`;
      updateData.password = this.cryptoService.encryptJson(
        { password: '' },
        { tenantId: 'platform', recordId }
      ) as any;
    }

    const settings = existingSettings
      ? await (this.prisma as any).platformsmtpsettings.update({
          where: { id: existingSettings.id },
          data: updateData,
        })
      : await (this.prisma as any).platformsmtpsettings.create({
          data: updateData,
        });

    // Registrar auditoría
    await this.logAudit(userId, null, 'UPDATE', null, null);

    const { password, ...rest } = settings;
    return {
      ...rest,
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

    // Enviar email directamente (no encolar para test)
    await this.providerService.sendEmail(config, to, testSubject, testBody, 'html');

    // Registrar en outbox (opcional, para trazabilidad)
    const idempotencyKey = `test-${Date.now()}-${Math.random()}`;
    try {
      await this.queueService.enqueue({
        tenantId,
        idempotencyKey,
        to,
        subject: testSubject,
        body: testBody,
        bodyType: 'html',
      });
    } catch (error) {
      // No crítico si falla el enqueue del test
      this.logger.warn(`Failed to enqueue test email: ${error}`);
    }

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
      (this.prisma as any).emailoutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).emailoutbox.count({ where }),
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
   * Encola un email para envío asíncrono
   */
  async enqueueEmail(
    tenantId: string | undefined,
    to: string,
    subject: string,
    body: string,
    bodyType: 'html' | 'text' = 'html',
    cc?: string[],
    bcc?: string[],
    metadata?: any,
  ): Promise<string> {
    const idempotencyKey = uuidv4();
    return this.queueService.enqueue({
      tenantId,
      idempotencyKey,
      to,
      cc,
      bcc,
      subject,
      body,
      bodyType,
      metadata,
    });
  }

  /**
   * Encola email de verificación
   */
  async queueVerificationEmail(
    email: string,
    token: string,
    tenantId: string,
    name?: string,
    userLocale?: string | null,
  ): Promise<string> {
    // Obtener locale del usuario o tenant
    const locale = await this.resolveLocale(tenantId, userLocale);

    // Obtener branding del tenant
    const branding = await this.getTenantBranding(tenantId);

    // Registrar helpers de Handlebars
    this.registerHandlebarsHelpers(locale);

    // Cargar template
    const template = this.loadTemplate('verification-email.hbs', locale);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    // Renderizar template con i18n
    const html = template({
      name: name || 'Usuario',
      verificationUrl,
      frontendUrl,
      locale,
      ...branding,
    });

    // Obtener subject traducido
    const subject = this.i18nService.t(locale, 'emails.verification.subject');

    // Encolar email
    const idempotencyKey = `verification-${email}-${token}`;
    return this.queueService.enqueue({
      tenantId,
      idempotencyKey,
      to: email,
      subject,
      body: html,
      bodyType: 'html',
      metadata: { type: 'verification', token },
    });
  }

  /**
   * Encola email de invitación
   */
  async queueInvitationEmail(
    email: string,
    token: string,
    tenantId: string,
    tenantName: string,
    inviterName: string,
    userLocale?: string | null,
  ): Promise<string> {
    // Obtener locale del usuario o tenant
    const locale = await this.resolveLocale(tenantId, userLocale);

    // Obtener branding del tenant
    const branding = await this.getTenantBranding(tenantId);

    // Registrar helpers de Handlebars
    this.registerHandlebarsHelpers(locale);

    // Cargar template
    const template = this.loadTemplate('invitation-email.hbs', locale);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/auth/accept-invitation?token=${token}`;

    // Renderizar template con i18n
    const html = template({
      email,
      invitationUrl,
      tenantName,
      inviterName,
      frontendUrl,
      locale,
      ...branding,
    });

    // Obtener subject traducido
    const subject = this.i18nService.t(locale, 'emails.invitation.subject', 'es').replace('{{tenantName}}', tenantName);

    // Encolar email
    const idempotencyKey = `invitation-${email}-${token}`;
    return this.queueService.enqueue({
      tenantId,
      idempotencyKey,
      to: email,
      subject,
      body: html,
      bodyType: 'html',
      metadata: { type: 'invitation', token },
    });
  }

  /**
   * Encola email de cambio de rol
   */
  async queueRoleChangeEmail(
    email: string,
    tenantId: string,
    userName: string,
    previousRole: string,
    newRole: string,
    tenantName: string,
    userLocale?: string | null,
  ): Promise<string> {
    // Obtener locale del usuario o tenant
    const locale = await this.resolveLocale(tenantId, userLocale);

    // Obtener branding del tenant
    const branding = await this.getTenantBranding(tenantId);

    // Registrar helpers de Handlebars
    this.registerHandlebarsHelpers(locale);

    // Cargar template
    const template = this.loadTemplate('role-change-email.hbs', locale);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Renderizar template con i18n
    const html = template({
      userName,
      previousRole,
      newRole,
      tenantName,
      frontendUrl,
      locale,
      ...branding,
    });

    // Obtener subject traducido e interpolar variables
    let subject = this.i18nService.t(locale, 'emails.role_change.subject', 'es');
    subject = subject.replace('{{tenantName}}', tenantName);

    // Encolar email
    const idempotencyKey = `role-change-${email}-${Date.now()}`;
    return this.queueService.enqueue({
      tenantId,
      idempotencyKey,
      to: email,
      subject,
      body: html,
      bodyType: 'html',
      metadata: { type: 'role_change', previousRole, newRole },
    });
  }

  /**
   * Resuelve el locale del usuario o tenant
   */
  private async resolveLocale(tenantId: string, userLocale?: string | null): Promise<'es' | 'en'> {
    // Prioridad 1: locale del usuario
    if (userLocale) {
      const normalized = userLocale.toLowerCase().split('-')[0];
      if (normalized === 'es' || normalized === 'en') {
        return normalized as 'es' | 'en';
      }
    }

    // Prioridad 2: locale del tenant
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { defaultLocale: true },
      });

      if (tenant?.defaultLocale) {
        const normalized = tenant.defaultLocale.toLowerCase().split('-')[0];
        if (normalized === 'es' || normalized === 'en') {
          return normalized as 'es' | 'en';
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get tenant locale: ${error}`);
    }

    // Fallback: español
    return 'es';
  }

  /**
   * Obtiene el branding del tenant
   */
  private async getTenantBranding(tenantId: string): Promise<{
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    hasLogo: boolean;
  }> {
    try {
      const settings = await this.prisma.tenantsettings.findUnique({
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
    } catch (error) {
      this.logger.warn(`Failed to get tenant branding: ${error}`);
      return {
        logoUrl: null,
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        hasLogo: false,
      };
    }
  }

  /**
   * Carga un template Handlebars
   */
  private loadTemplate(filename: string, locale: 'es' | 'en' = 'es'): handlebars.TemplateDelegate {
    try {
      const templatePath = join(__dirname, 'templates', filename);
      const source = readFileSync(templatePath, 'utf-8');
      return handlebars.compile(source);
    } catch (error) {
      this.logger.error(`Failed to load email template ${filename}:`, error);
      // Retornar template simple como fallback
      return handlebars.compile(`
        <html>
          <body>
            <h1>{{title}}</h1>
            <p>{{content}}</p>
          </body>
        </html>
      `);
    }
  }

  /**
   * Registra helpers de Handlebars para i18n
   */
  private registerHandlebarsHelpers(locale: 'es' | 'en') {
    // Helper para traducciones con interpolación de variables
    handlebars.registerHelper('t', (key: string, options: any) => {
      const translation = this.i18nService.t(locale, key);
      // Si la traducción tiene variables {{variable}}, interpolarlas con el contexto del template
      if (translation.includes('{{')) {
        // Obtener el contexto del template actual
        const context = options.data?.root || {};
        // Compilar la traducción como un mini-template de Handlebars
        const interpolated = handlebars.compile(translation);
        return new handlebars.SafeString(interpolated(context));
      }
      return new handlebars.SafeString(translation);
    });
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
    await (this.prisma as any).emailsettingsauditlog.create({
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



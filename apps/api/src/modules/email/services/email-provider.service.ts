import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../crypto/crypto.service';
import { EncryptedBlobV1 } from '../../crypto/crypto.types';
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
    private cryptoService: CryptoService,
  ) {}

  /**
   * Resuelve el provider SMTP efectivo para un tenant
   * Prioridad: Tenant SMTP → Platform SMTP → Error
   */
  async resolveProvider(tenantId?: string): Promise<{ config: SmtpConfig; provider: 'TENANT' | 'PLATFORM' }> {
    // 1. Intentar obtener SMTP del tenant
    if (tenantId) {
      const tenantSmtp = await (this.prisma as any).tenantsmtpsettings.findUnique({
        where: { tenantId },
      });

      if (tenantSmtp && tenantSmtp.isActive) {
        const config = await this.buildSmtpConfig(tenantSmtp);
        return { config, provider: 'TENANT' };
      }
    }

    // 2. Fallback a Platform SMTP
    const platformSmtp = await (this.prisma as any).platformsmtpsettings.findFirst({
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
    // Descifrar password (soporta formato legacy y nuevo)
    let password: string;
    try {
      // Intentar formato nuevo (EncryptedBlobV1)
      if (settings.password && typeof settings.password === 'object' && 'v' in settings.password) {
        const blob = settings.password as EncryptedBlobV1;
        // Determinar tenantId y recordId
        const tenantId = settings.tenantId || 'platform';
        const recordId = settings.tenantId || settings.id || 'platform-smtp';
        const decrypted = this.cryptoService.decryptJson<{ password: string }>(blob, {
          tenantId,
          recordId,
        });
        password = decrypted.password;
      } else {
        // Formato legacy (string) - no soportado, debe migrarse
        throw new Error('Legacy format not supported. Please update SMTP settings.');
      }
    } catch (error) {
      this.logger.error(`Failed to decrypt SMTP password: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error('Failed to decrypt SMTP password. Please update SMTP settings.');
    }

    return {
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      replyTo: settings.replyTo || settings.fromEmail,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username,
      password,
      tls: settings.tls ? (typeof settings.tls === 'string' ? JSON.parse(settings.tls) : settings.tls) : undefined,
    };
  }

  /**
   * Crea transporter de nodemailer desde configuración
   */
  createTransporter(config: SmtpConfig): Transporter {
    // Ajustar 'secure' según el puerto si no está configurado correctamente
    let secure = config.secure;
    if (config.port === 465 && !secure) {
      // Puerto 465 requiere SSL/TLS
      secure = true;
      this.logger.warn(`Port 465 detected, enabling secure mode`);
    } else if (config.port === 587 && secure) {
      // Puerto 587 generalmente usa STARTTLS (no SSL directo)
      secure = false;
      this.logger.warn(`Port 587 detected, disabling secure mode (using STARTTLS)`);
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: secure, // true para 465, false para otros puertos (STARTTLS)
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
    let config: SmtpConfig | null = null;
    try {
      const providerResult = await this.resolveProvider(tenantId);
      config = providerResult.config;
      const transporter = this.createTransporter(config);

      await transporter.verify();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMTP verification failed: ${errorMessage}`);
      
      // Proporcionar mensajes más descriptivos para errores comunes
      if (config) {
        if (errorMessage.includes('wrong version number') || errorMessage.includes('SSL')) {
          this.logger.error(`💡 Tip: Port ${config.port} may require different secure/TLS settings. Try: port 465 with secure=true, or port 587/25 with secure=false`);
        } else if (errorMessage.includes('ECONNREFUSED')) {
          this.logger.error(`💡 Tip: Check if SMTP host ${config.host} is correct and accessible`);
        } else if (errorMessage.includes('EAUTH')) {
          this.logger.error(`💡 Tip: Check username and password credentials`);
        }
      } else {
        this.logger.error(`💡 Tip: Could not resolve SMTP provider. Please configure SMTP settings.`);
      }
      
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



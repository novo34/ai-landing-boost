import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailProviderService } from './email-provider.service';

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

    return this.prisma.emailoutbox.findMany({
      where: {
        status: 'QUEUED',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
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
        const email = await tx.emailoutbox.findUnique({
          where: { id: emailId },
        });

        if (!email || email.status !== 'QUEUED') {
          throw new Error('Email not available for processing');
        }

        await tx.emailoutbox.update({
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
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), this.TIMEOUT_MS)),
    ]);
  }

  /**
   * Marca email como enviado
   */
  private async markAsSent(emailId: string, provider: string) {
    await this.prisma.emailoutbox.update({
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
      await this.prisma.emailoutbox.update({
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

      await this.prisma.emailoutbox.update({
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

    await this.prisma.emailoutbox.update({
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



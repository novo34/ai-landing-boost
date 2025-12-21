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
    // CRÍTICO: Incluir tenantId para prevenir colisiones entre tenants
    // tenantId puede ser null para emails de plataforma (globales)
    const existing = await this.prisma.emailoutbox.findFirst({
      where: {
        idempotencyKey: dto.idempotencyKey,
        tenantId: dto.tenantId ?? null, // OBLIGATORIO - Previene colisiones cross-tenant
        // Si tenantId es undefined, usar null (emails de plataforma)
        // Si tenantId es string, usar ese valor (emails de tenant)
      },
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
    const email = await this.prisma.emailoutbox.create({
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
    const email = await this.prisma.emailoutbox.update({
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

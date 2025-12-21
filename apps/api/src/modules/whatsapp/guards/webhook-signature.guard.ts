import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { WebhookSignatureUtil } from '../utils/webhook-signature.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from '../../crypto/crypto.service';
import { EncryptedBlobV1 } from '../../crypto/crypto.types';
import { $Enums } from '@prisma/client';

/**
 * Guard que valida las firmas de webhooks de WhatsApp
 * 
 * Para WhatsApp Cloud API: valida X-Hub-Signature-256
 * Para Evolution API: valida que accountId existe (no hay estándar de firma)
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accountId = request.params?.accountId;
    const provider = request.path?.includes('/cloud/') ? 'cloud' : 'evolution';

    if (!accountId) {
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.invalid_account_id',
      });
    }

    // Obtener cuenta para validar
    const account = await this.prisma.tenantwhatsappaccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      this.logger.warn(`Webhook received for non-existent account: ${accountId}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.account_not_found',
      });
    }

    // Validar según proveedor
    if (provider === 'cloud' && account.provider === $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD) {
      return this.validateCloudWebhook(request, account);
    } else if (provider === 'evolution' && account.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
      // Evolution API no tiene estándar de firma, validamos que accountId existe
      // En producción, considerar validar IP origen o usar webhook secret si Evolution API lo soporta
      return true;
    }

    throw new UnauthorizedException({
      success: false,
      error_key: 'whatsapp.webhook.provider_mismatch',
    });
  }

  private async validateCloudWebhook(request: Request, account: any): Promise<boolean> {
    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    
    if (!signature) {
      this.logger.warn(`WhatsApp Cloud webhook missing signature header for account ${account.id}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.missing_signature',
      });
    }

    // Obtener App Secret desde credenciales encriptadas
    let appSecret: string;
    try {
      // Intentar formato nuevo (EncryptedBlobV1)
      if (account.credentials && typeof account.credentials === 'object' && 'v' in account.credentials) {
        const blob = account.credentials as EncryptedBlobV1;
        const creds = this.cryptoService.decryptJson<any>(blob, {
          tenantId: account.tenantId,
          recordId: account.id,
        });
        appSecret = creds.appSecret || creds.app_secret;
      } else {
        // Formato legacy (string) - no soportado en guard, debe migrarse
        throw new Error('Legacy format not supported. Please re-create the account.');
      }
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for account ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.invalid_credentials',
      });
    }

    if (!appSecret) {
      this.logger.warn(`WhatsApp Cloud account ${account.id} missing App Secret`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.missing_app_secret',
      });
    }

    // Obtener raw body
    // NestJS con rawBody: true expone el raw body en req.rawBody
    // Si no está disponible, intentamos con el body parseado como JSON string
    // Nota: Para validación precisa, se necesita el raw body exacto
    const rawBody = (request as any).rawBody || Buffer.from(JSON.stringify(request.body));
    
    const isValid = WebhookSignatureUtil.validateWhatsAppCloudSignature(
      rawBody,
      signature,
      appSecret,
    );

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for account ${account.id}`);
      throw new UnauthorizedException({
        success: false,
        error_key: 'whatsapp.webhook.invalid_signature',
      });
    }

    return true;
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createData } from '../../common/prisma/create-data.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { EncryptedBlobV1 } from '../crypto/crypto.types';
import { EvolutionProvider } from './providers/evolution.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { $Enums } from '@prisma/client';

@Injectable()
export class WhatsAppMessagingService {
  private readonly logger = new Logger(WhatsAppMessagingService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private evolutionProvider: EvolutionProvider,
    private whatsappCloudProvider: WhatsAppCloudProvider,
  ) {}

  /**
   * Envía un mensaje de WhatsApp
   */
  async sendMessage(
    tenantId: string,
    to: string,
    message: string,
    whatsappAccountId?: string,
  ) {
    // Obtener cuenta WhatsApp
    let account;
    if (whatsappAccountId) {
            account = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          id: whatsappAccountId,
          tenantId,
        },
      });
    } else {
      // Obtener la primera cuenta conectada del tenant
            account = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          tenantId,
          status: 'CONNECTED',
        },
      });
    }

    if (!account) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    // Obtener credenciales: usar connectionId -> decrypt si es Evolution API
    let credentials: any;
    try {
      if (account.provider === $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
        // @ts-ignore - Prisma Client regenerado
        if (!account.connectionId) {
          throw new BadRequestException({
            success: false,
            error_key: 'whatsapp.evolution_connection_not_found',
            message: 'Evolution API account requires a connection. Please reconnect your Evolution API.',
          });
        }

        // Obtener conexión y descifrar credenciales
        // @ts-ignore - Prisma Client regenerado
        const connection = await this.prisma.tenantevolutionconnection.findUnique({
          // @ts-ignore - Prisma Client regenerado
          where: { id: account.connectionId },
        });

        if (!connection) {
          throw new NotFoundException({
            success: false,
            error_key: 'whatsapp.evolution_connection_not_found',
          });
        }

        const encryptedBlob: EncryptedBlobV1 = JSON.parse(connection.encryptedCredentials);
        const connectionCreds = this.cryptoService.decryptJson<{ baseUrl: string; apiKey: string }>(
          encryptedBlob,
          {
            tenantId: connection.tenantId,
            recordId: connection.id,
          }
        );

        // Construir credenciales para Evolution API (necesita instanceName)
        if (!account.instanceName) {
          throw new BadRequestException({
            success: false,
            error_key: 'whatsapp.instance_not_configured',
            message: 'Instance name is required for Evolution API.',
          });
        }

        // @ts-ignore - Prisma Client regenerado
        const normalizedUrl = connection.normalizedUrl || connectionCreds.baseUrl;
        credentials = {
          baseUrl: normalizedUrl,
          apiKey: connectionCreds.apiKey,
          instanceName: account.instanceName,
        };
      } else {
        // WhatsApp Cloud: usar credenciales del account (formato legacy soportado)
        if (account.credentials && typeof account.credentials === 'object' && 'v' in account.credentials) {
          const blob = account.credentials as EncryptedBlobV1;
          credentials = this.cryptoService.decryptJson<any>(blob, {
            tenantId,
            recordId: account.id,
          });
        } else {
          throw new Error('Legacy format not supported in messaging service. Please re-create the account.');
        }
      }
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to decrypt credentials for account ${account.id}: ${error.message}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.invalid_credentials_format',
        message: 'No se pudieron desencriptar las credenciales de la cuenta.',
      });
    }

    // Enviar mensaje a través del proveedor
    try {
      await this.sendMessageViaProvider(account.provider, credentials, to, message);
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw new BadRequestException({
        success: false,
        error_key: 'whatsapp.send_failed',
        error_params: { message: error.message },
      });
    }

    // Buscar o crear conversación
    const conversation = await this.findOrCreateConversation(
      tenantId,
      account.id,
      to,
    );

    // Guardar mensaje en BD
        const savedMessage = await this.prisma.message.create({
      data: createData({
        conversationId: conversation.id,
        tenantId,
        type: $Enums.message_type.TEXT,
        direction: $Enums.message_direction.OUTBOUND,
        content: message,
        status: $Enums.message_status.SENT,
        sentAt: new Date(),
      }),
    });

    // Actualizar última fecha de mensaje en conversación
        await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return {
      success: true,
      data: {
        id: savedMessage.id,
        conversationId: conversation.id,
        status: savedMessage.status,
        sentAt: savedMessage.sentAt,
      },
    };
  }

  /**
   * Busca o crea una conversación
   */
  private async findOrCreateConversation(
    tenantId: string,
    whatsappAccountId: string,
    participantPhone: string,
  ) {
        let conversation = await this.prisma.conversation.findUnique({
      where: {
        tenantId_whatsappAccountId_participantPhone: {
          tenantId,
          whatsappAccountId,
          participantPhone,
        },
      },
    });

    if (!conversation) {
            conversation = await this.prisma.conversation.create({
        data: createData({
          tenantId,
          whatsappAccountId,
          participantPhone,
          status: $Enums.conversation_status.ACTIVE,
        }),
      });
    }

    return conversation;
  }

  /**
   * Envía mensaje a través del proveedor correspondiente
   */
  private async sendMessageViaProvider(
    provider: $Enums.tenantwhatsappaccount_provider,
    credentials: unknown,
    to: string,
    message: string,
  ): Promise<void> {
    switch (provider) {
      case $Enums.tenantwhatsappaccount_provider.EVOLUTION_API:
        return this.evolutionProvider.sendMessage(credentials, to, message);
      case $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD:
        return this.whatsappCloudProvider.sendMessage(credentials, to, message);
      default:
        throw new BadRequestException({
          success: false,
          error_key: 'whatsapp.unsupported_provider',
        });
    }
  }

  /**
   * Resuelve el tenant desde un número de teléfono (nuestro número)
   */
  async resolveTenantFromPhoneNumber(phoneNumber: string): Promise<{
    tenantId: string;
    whatsappAccountId: string;
  } | null> {
        const account = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        phoneNumber,
        status: 'CONNECTED',
      },
    });

    if (!account) {
      return null;
    }

    return {
      tenantId: account.tenantId,
      whatsappAccountId: account.id,
    };
  }
}


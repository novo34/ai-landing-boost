import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { WhatsAppMessagingService } from '../whatsapp-messaging.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EvolutionProvider } from '../providers/evolution.provider';
import { WhatsAppCloudProvider } from '../providers/whatsapp-cloud.provider';
import { ConversationOrchestratorService } from '../../conversations/orchestrator.service';
import { N8nEventService } from '../../n8n-integration/services/n8n-event.service';
import { DocumentProcessorService } from '../../knowledge-base/services/document-processor.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';
import { $Enums } from '@prisma/client';
import { createData } from '../../../common/prisma/create-data.helper';

/**
 * Controlador para recibir webhooks de proveedores de WhatsApp
 * 
 * Endpoints:
 * - POST /webhooks/whatsapp/evolution/:accountId
 * - POST /webhooks/whatsapp/cloud/:accountId
 */
@Controller('webhooks/whatsapp')
@Public()
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private prisma: PrismaService,
    private messagingService: WhatsAppMessagingService,
    private evolutionProvider: EvolutionProvider,
    private whatsappCloudProvider: WhatsAppCloudProvider,
    private orchestrator: ConversationOrchestratorService,
    private n8nEventService: N8nEventService,
    private documentProcessor: DocumentProcessorService,
    private notificationsService: NotificationsService,
  ) {
    // Log de advertencia si no hay rawBody configurado
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Webhook signature validation enabled. Ensure rawBody is configured in main.ts');
    }
  }

  /**
   * Webhook para Evolution API
   * 
   * Nota: Evolution API no tiene estándar de firma de webhook.
   * La validación se hace mediante WebhookSignatureGuard que verifica que accountId existe.
   * En producción, considerar validar IP origen o usar webhook secret si Evolution API lo soporta.
   */
  @Post('evolution/:accountId')
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async handleEvolutionWebhook(
    @Param('accountId') accountId: string,
    @Body() payload: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`Received Evolution webhook for account ${accountId}`);

      // Obtener cuenta WhatsApp
            const account = await this.prisma.tenantwhatsappaccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.provider !== $Enums.tenantwhatsappaccount_provider.EVOLUTION_API) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Procesar webhook según tipo de evento
      const eventData = payload as {
        event?: string;
        instance?: string;
        data?: {
          key?: {
            remoteJid?: string;
            id?: string;
          };
          message?: {
            conversation?: string;
            extendedTextMessage?: {
              text?: string;
            };
          };
          messageType?: string;
          messageTimestamp?: number;
        };
      };

      if (eventData.event === 'messages.upsert') {
        await this.handleIncomingMessage(account, eventData.data);
      } else if (eventData.event === 'messages.update') {
        await this.handleMessageStatus(account, eventData.data);
      }

      return res.json({ received: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing Evolution webhook: ${errorMessage}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Webhook para WhatsApp Cloud API
   * 
   * Valida X-Hub-Signature-256 usando App Secret de las credenciales.
   */
  @Post('cloud/:accountId')
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async handleCloudWebhook(
    @Param('accountId') accountId: string,
    @Body() payload: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.debug(`Received Cloud webhook for account ${accountId}`);

      // Obtener cuenta WhatsApp
            const account = await this.prisma.tenantwhatsappaccount.findUnique({
        where: { id: accountId },
      });

      if (!account || account.provider !== $Enums.tenantwhatsappaccount_provider.WHATSAPP_CLOUD) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // WhatsApp Cloud API envía eventos en formato diferente
      const eventData = payload as {
        object?: string;
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                from?: string;
                id?: string;
                text?: {
                  body?: string;
                };
                timestamp?: string;
              }>;
              statuses?: Array<{
                id?: string;
                status?: string;
                timestamp?: string;
              }>;
            };
          }>;
        }>;
      };

      if (eventData.object === 'whatsapp_business_account') {
        for (const entry of eventData.entry || []) {
          for (const change of entry.changes || []) {
            if (change.value?.messages) {
              // Mensajes entrantes
              for (const message of change.value.messages) {
                await this.handleIncomingCloudMessage(account, message);
              }
            }
            if (change.value?.statuses) {
              // Estados de mensajes
              for (const status of change.value.statuses) {
                await this.handleCloudMessageStatus(account, status);
              }
            }
          }
        }
      }

      return res.json({ received: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing Cloud webhook: ${errorMessage}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Procesa mensaje entrante de Evolution API
   */
  private async handleIncomingMessage(
    account: { id: string; tenantId: string; phoneNumber: string },
    data?: {
      key?: {
        remoteJid?: string;
        id?: string;
      };
      message?: {
        conversation?: string;
        extendedTextMessage?: {
          text?: string;
        };
        imageMessage?: unknown;
        videoMessage?: unknown;
        audioMessage?: unknown;
        documentMessage?: unknown;
      };
      messageTimestamp?: number;
    },
  ) {
    if (!data?.key?.remoteJid || !data.message) {
      return;
    }

    // Verificar si es mensaje multimedia (no soportado actualmente)
    if (data.message.imageMessage || data.message.videoMessage || data.message.audioMessage || data.message.documentMessage) {
      this.logger.warn(`Multimedia message received from ${data.key.remoteJid} but not supported. Only text messages are processed.`);
      // No procesar mensajes multimedia, solo loguear
      return;
    }

    const from = data.key.remoteJid.split('@')[0];
    const phoneNumber = `+${from}`;
    const content =
      data.message.conversation ||
      data.message.extendedTextMessage?.text ||
      '';

    if (!content) {
      this.logger.debug(`Empty message received from ${phoneNumber}, skipping`);
      return;
    }

    // Buscar o crear conversación
        let conversation = await this.prisma.conversation.findUnique({
      where: {
        tenantId_whatsappAccountId_participantPhone: {
          tenantId: account.tenantId,
          whatsappAccountId: account.id,
          participantPhone: phoneNumber,
        },
      },
      include: {
        agent: {
          select: { id: true },
        },
      },
    });

    const isNewConversation = !conversation;
    if (!conversation) {
            conversation = await this.prisma.conversation.create({
        data: createData({
          tenantId: account.tenantId,
          whatsappAccountId: account.id,
          participantPhone: phoneNumber,
          status: $Enums.conversation_status.ACTIVE,
        }),
        include: {
          agent: {
            select: { id: true },
          },
        },
      });
    }

    // Detectar idioma del mensaje
    const detectedLanguage = this.documentProcessor.detectLanguage(content);

    // Guardar mensaje
    const savedMessage = await this.prisma.message.create({
      data: createData({
        conversationId: conversation.id,
        tenantId: account.tenantId,
        type: $Enums.message_type.TEXT,
        direction: $Enums.message_direction.INBOUND,
        content,
        language: detectedLanguage,
        status: $Enums.message_status.DELIVERED,
        providerMessageId: data.key.id,
        sentAt: data.messageTimestamp
          ? new Date(data.messageTimestamp * 1000)
          : new Date(),
      }),
    });

    // Actualizar conversación con idioma detectado
        await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        detectedLanguage: detectedLanguage, // Actualizar idioma detectado
      },
    });

    this.logger.log(`Message received from ${phoneNumber} in conversation ${conversation.id}`);

    // Notificar sobre nueva conversación o mensaje entrante (async, no bloquear)
    this.notifyConversationEvent(account.tenantId, conversation.id, isNewConversation, content, conversation.participantName || phoneNumber)
      .catch((error) => {
        this.logger.warn(`Failed to send conversation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

    // Enviar al orquestador para procesamiento (no bloquear respuesta del webhook)
    this.orchestrator
      .processIncomingMessage({
        conversationId: conversation.id,
        messageId: savedMessage.id,
        tenantId: account.tenantId,
        whatsappAccountId: account.id,
        participantPhone: phoneNumber,
        content,
      })
      .catch((error) => {
        this.logger.error(`Error processing message in orchestrator: ${error.message}`);
      });
  }

  /**
   * Notifica a usuarios sobre eventos de conversación
   */
  private async notifyConversationEvent(
    tenantId: string,
    conversationId: string,
    isNewConversation: boolean,
    messageContent: string,
    participantName: string,
  ) {
    try {
      // Obtener conversación con agente
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          agent: {
            select: { id: true },
          },
        },
      });

      if (!conversation) return;

      // Obtener usuarios a notificar: OWNER, ADMIN, y AGENT asignado
      const whereClause: any = {
        tenantId,
        OR: [{ role: { in: ['OWNER', 'ADMIN'] } }],
      };

      // Si hay agente asignado, incluir usuarios con ese agente
      // Nota: Los agentes no tienen userId directo, se asocian por tenantId
      // Por ahora, solo buscar por rol en el tenant

      const memberships = await this.prisma.tenantmembership.findMany({
        where: whereClause,
        select: { userId: true },
      });

      // Crear notificación para cada usuario
      for (const membership of memberships) {
        if (isNewConversation) {
          await this.notificationsService.createNotification(
            tenantId,
            membership.userId,
            $Enums.notification_type.CONVERSATION_NEW,
            'notifications.conversation.new',
            'notifications.conversation.new_description',
            `/app/conversations/${conversationId}`,
            {
              conversationId,
              participantName,
            },
          );
        } else {
          await this.notificationsService.createNotification(
            tenantId,
            membership.userId,
            $Enums.notification_type.MESSAGE_RECEIVED,
            'notifications.message.received',
            'notifications.message.received_description',
            `/app/conversations/${conversationId}`,
            {
              conversationId,
              messageContent: messageContent.substring(0, 100),
              participantName,
            },
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to notify conversation event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Notifica sobre mensaje fallido
   */
  private async notifyMessageFailed(
    tenantId: string,
    messageId: string,
    conversationId: string,
  ) {
    try {
      // Obtener mensaje y conversación
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            select: {
              participantName: true,
              participantPhone: true,
            },
          },
        },
      });

      if (!message) return;

      // Obtener usuarios a notificar: OWNER, ADMIN
      const memberships = await this.prisma.tenantmembership.findMany({
        where: {
          tenantId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
        select: { userId: true },
      });

      // Crear notificación para cada usuario
      for (const membership of memberships) {
        await this.notificationsService.createNotification(
          tenantId,
          membership.userId,
          $Enums.notification_type.MESSAGE_FAILED,
          'notifications.message.failed',
          'notifications.message.failed_description',
          `/app/conversations/${conversationId}`,
          {
            messageId,
            conversationId,
            participantName: message.conversation.participantName || message.conversation.participantPhone,
            content: message.content?.substring(0, 100),
          },
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to notify message failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Procesa mensaje entrante de WhatsApp Cloud API
   */
  private async handleIncomingCloudMessage(
    account: { id: string; tenantId: string; phoneNumber: string },
    message: {
      from?: string;
      id?: string;
      text?: {
        body?: string;
      };
      image?: unknown;
      video?: unknown;
      audio?: unknown;
      document?: unknown;
      timestamp?: string;
    },
  ) {
    if (!message.from) {
      return;
    }

    // Verificar si es mensaje multimedia (no soportado actualmente)
    if (message.image || message.video || message.audio || message.document) {
      this.logger.warn(`Multimedia message received from ${message.from} but not supported. Only text messages are processed.`);
      // No procesar mensajes multimedia, solo loguear
      return;
    }

    if (!message.text?.body) {
      this.logger.debug(`Empty or non-text message received from ${message.from}, skipping`);
      return;
    }

    const phoneNumber = message.from;
    const content = message.text.body;

    // Buscar o crear conversación
        let conversation = await this.prisma.conversation.findUnique({
      where: {
        tenantId_whatsappAccountId_participantPhone: {
          tenantId: account.tenantId,
          whatsappAccountId: account.id,
          participantPhone: phoneNumber,
        },
      },
    });

    const isNewConversation = !conversation;

    if (!conversation) {
            conversation = await this.prisma.conversation.create({
        data: createData({
          tenantId: account.tenantId,
          whatsappAccountId: account.id,
          participantPhone: phoneNumber,
          status: $Enums.conversation_status.ACTIVE,
        }),
      });

      // Emitir evento de nueva conversación a n8n
      try {
        await this.n8nEventService.emitNewConversation(account.tenantId, {
          conversationId: conversation.id,
          participantPhone: phoneNumber,
          whatsappAccountId: account.id,
        });
      } catch (error) {
        this.logger.warn(`Failed to emit new_conversation event to n8n: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Detectar idioma del mensaje
    const detectedLanguage = this.documentProcessor.detectLanguage(content);

    // Guardar mensaje
        const savedMessage = await this.prisma.message.create({
      data: createData({
        conversationId: conversation.id,
        tenantId: account.tenantId,
        type: $Enums.message_type.TEXT,
        direction: $Enums.message_direction.INBOUND,
        content,
        language: detectedLanguage,
        status: $Enums.message_status.DELIVERED,
        providerMessageId: message.id,
        sentAt: message.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date(),
      }),
    });

    // Actualizar conversación con idioma detectado
        await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        detectedLanguage: detectedLanguage, // Actualizar idioma detectado
      },
    });

    this.logger.log(`Message received from ${phoneNumber} in conversation ${conversation.id}`);

    // Notificar sobre nueva conversación o mensaje entrante (async, no bloquear)
    const isNewConversationCloud = !conversation.lastMessageAt || 
      (conversation.lastMessageAt.getTime() < new Date().getTime() - 60000); // Nueva si no hay mensajes en último minuto
    
    this.notifyConversationEvent(account.tenantId, conversation.id, isNewConversationCloud, content, conversation.participantName || phoneNumber)
      .catch((error) => {
        this.logger.warn(`Failed to send conversation notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

    // Enviar al orquestador para procesamiento (no bloquear respuesta del webhook)
    this.orchestrator
      .processIncomingMessage({
        conversationId: conversation.id,
        messageId: savedMessage.id,
        tenantId: account.tenantId,
        whatsappAccountId: account.id,
        participantPhone: phoneNumber,
        content,
      })
      .catch((error) => {
        this.logger.error(`Error processing message in orchestrator: ${error.message}`);
      });
  }

  /**
   * Procesa actualización de estado de mensaje (Evolution API)
   */
  private async handleMessageStatus(
    account: { id: string; tenantId: string },
    data?: {
      key?: {
        id?: string;
      };
      update?: {
        status?: number;
      };
    },
  ) {
    if (!data?.key?.id) {
      return;
    }

    const providerMessageId = data.key.id;
    let status: $Enums.message_status | null = null;

    // Evolution API usa códigos numéricos para estados
    // 1 = sent, 2 = delivered, 3 = read
    if (data.update?.status === 1) {
      status = $Enums.message_status.SENT;
    } else if (data.update?.status === 2) {
      status = $Enums.message_status.DELIVERED;
    } else if (data.update?.status === 3) {
      status = $Enums.message_status.READ;
    }

    if (status) {
            const message = await this.prisma.message.findFirst({
        where: {
          providerMessageId,
          tenantId: account.tenantId,
        },
      });

      if (message) {
        const updateData: {
          status: $Enums.message_status;
          sentAt?: Date;
          deliveredAt?: Date;
          readAt?: Date;
        } = { status };

        if (status === $Enums.message_status.SENT) {
          updateData.sentAt = new Date();
        } else if (status === $Enums.message_status.DELIVERED) {
          updateData.deliveredAt = new Date();
        } else if (status === $Enums.message_status.READ) {
          updateData.readAt = new Date();
        } else if (status === $Enums.message_status.FAILED) {
          // Notificar sobre mensaje fallido
          await this.notifyMessageFailed(account.tenantId, message.id, message.conversationId)
            .catch((error) => {
              this.logger.warn(`Failed to send message failed notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
        }

                await this.prisma.message.update({
          where: { id: message.id },
          data: updateData,
        });
      }
    }
  }

  /**
   * Procesa actualización de estado de mensaje (WhatsApp Cloud API)
   */
  private async handleCloudMessageStatus(
    account: { id: string; tenantId: string },
    statusData: {
      id?: string;
      status?: string;
      timestamp?: string;
    },
  ) {
    if (!statusData.id || !statusData.status) {
      return;
    }

    const providerMessageId = statusData.id;
    let status: $Enums.message_status | null = null;

    switch (statusData.status) {
      case 'sent':
        status = $Enums.message_status.SENT;
        break;
      case 'delivered':
        status = $Enums.message_status.DELIVERED;
        break;
      case 'read':
        status = $Enums.message_status.READ;
        break;
      case 'failed':
        status = $Enums.message_status.FAILED;
        break;
    }

    if (status) {
            const message = await this.prisma.message.findFirst({
        where: {
          providerMessageId,
          tenantId: account.tenantId,
        },
      });

      if (message) {
        const updateData: {
          status: $Enums.message_status;
          sentAt?: Date;
          deliveredAt?: Date;
          readAt?: Date;
        } = { status };

        const timestamp = statusData.timestamp
          ? new Date(parseInt(statusData.timestamp) * 1000)
          : new Date();

        if (status === $Enums.message_status.SENT) {
          updateData.sentAt = timestamp;
        } else if (status === $Enums.message_status.DELIVERED) {
          updateData.deliveredAt = timestamp;
        } else if (status === $Enums.message_status.READ) {
          updateData.readAt = timestamp;
        } else if (status === $Enums.message_status.FAILED) {
          // Notificar sobre mensaje fallido
          await this.notifyMessageFailed(account.tenantId, message.id, message.conversationId)
            .catch((error) => {
              this.logger.warn(`Failed to send message failed notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
        }

                await this.prisma.message.update({
          where: { id: message.id },
          data: updateData,
        });
      }
    }
  }
}


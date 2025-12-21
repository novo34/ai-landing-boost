import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { createData } from '../../common/prisma/create-data.helper';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppMessagingService } from '../whatsapp/whatsapp-messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { $Enums } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private messagingService: WhatsAppMessagingService,
    private notificationsService: NotificationsService,
  ) {}

  async getConversations(
    tenantId: string,
    filters?: {
      agentId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    try {
      const where: any = {
        tenantId,
      };

      // Filtrar por agente solo si no es "all" y existe
      if (filters?.agentId && filters.agentId !== 'all') {
        where.agentId = filters.agentId;
      }

      // Filtrar por estado solo si no es "all" y existe
      if (filters?.status && filters.status !== 'all') {
        where.status = filters.status as $Enums.conversation_status;
      }

      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const [conversations, total] = await Promise.all([
        this.prisma.conversation.findMany({
          where,
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                message: true,
              },
            },
          },
          orderBy: [
            {
              lastMessageAt: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          take: limit,
          skip: offset,
        }),
        this.prisma.conversation.count({ where }),
      ]);

      return {
        success: true,
        data: conversations.map((conv) => ({
          id: conv.id,
          tenantId: conv.tenantId,
          whatsappAccountId: conv.whatsappAccountId,
          agentId: conv.agentId,
          agent: conv.agent,
          participantPhone: conv.participantPhone,
          participantName: conv.participantName,
          status: conv.status,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
          messageCount: conv._count.message,
          detectedLanguage: conv.detectedLanguage,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error getting conversations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getConversationById(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            message: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversations.not_found',
      });
    }

    return {
      success: true,
      data: {
        id: conversation.id,
        tenantId: conversation.tenantId,
        whatsappAccountId: conversation.whatsappAccountId,
        agentId: conversation.agentId,
        agent: conversation.agent,
        participantPhone: conversation.participantPhone,
        participantName: conversation.participantName,
        status: conversation.status,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
        messageCount: conversation._count.message,
        detectedLanguage: conversation.detectedLanguage,
        summary: conversation.summary,
        metadata: conversation.metadata,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  async getMessages(
    tenantId: string,
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    // Verificar que la conversación pertenece al tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversations.not_found',
      });
    }

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: limit,
        skip: offset,
      }),
      this.prisma.message.count({
        where: {
          conversationId,
        },
      }),
    ]);

    return {
      success: true,
      data: messages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        tenantId: msg.tenantId,
        type: msg.type,
        direction: msg.direction,
        content: msg.content,
        status: msg.status,
        providerMessageId: msg.providerMessageId,
        metadata: msg.metadata,
        sentAt: msg.sentAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt,
        language: msg.language,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async sendMessage(tenantId: string, conversationId: string, dto: SendMessageDto) {
    // Verificar que la conversación pertenece al tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversations.not_found',
      });
    }

    // Obtener la cuenta de WhatsApp por separado
    const whatsappAccount = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        id: conversation.whatsappAccountId,
        tenantId,
      },
    });

    if (!whatsappAccount) {
      throw new NotFoundException({
        success: false,
        error_key: 'whatsapp.account_not_found',
      });
    }

    // Enviar mensaje vía WhatsApp
    try {
      await this.messagingService.sendMessage(
        tenantId,
        conversation.participantPhone,
        dto.content,
        conversation.whatsappAccountId,
      );

      // Guardar mensaje en BD
      const message = await this.prisma.message.create({
        data: createData({
          conversationId: conversation.id,
          tenantId,
          type: (dto.type as $Enums.message_type) || $Enums.message_type.TEXT,
          direction: $Enums.message_direction.OUTBOUND,
          content: dto.content,
          status: $Enums.message_status.SENT,
          sentAt: new Date(),
        }),
      });

      // Notificar si el mensaje falla (async, no bloquear)
      // El estado se actualizará cuando llegue el webhook de estado
      // Por ahora, solo notificamos si hay error en el envío

      // Actualizar última actividad de la conversación
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
        },
      });

      return {
        success: true,
        data: {
          id: message.id,
          conversationId: message.conversationId,
          type: message.type,
          direction: message.direction,
          content: message.content,
          status: message.status,
          createdAt: message.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new ForbiddenException({
        success: false,
        error_key: 'conversations.send_failed',
      });
    }
  }

  async archiveConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversations.not_found',
      });
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: $Enums.conversation_status.ARCHIVED,
      },
    });

    return {
      success: true,
      message: 'Conversation archived',
    };
  }

  async unarchiveConversation(tenantId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversations.not_found',
      });
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: $Enums.conversation_status.ACTIVE,
      },
    });

    return {
      success: true,
      message: 'Conversation unarchived',
    };
  }
}


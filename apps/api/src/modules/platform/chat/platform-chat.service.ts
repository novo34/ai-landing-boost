import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class PlatformChatService {
  private readonly logger = new Logger(PlatformChatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Envía un mensaje en el chat de plataforma
   */
  async sendMessage(tenantId: string, userId: string, message: string) {
    try {
      // Verificar que el tenant existe
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      const chatMessage = await this.prisma.platformchatmessage.create({
        data: createData({
          tenantId,
          userId,
          message,
        }),
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return {
        success: true,
        data: chatMessage,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error sending chat message', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de chat con un tenant
   */
  async getChatHistory(tenantId: string, limit: number = 100) {
    try {
      const messages = await this.prisma.platformchatmessage.findMany({
        where: { tenantId },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      this.logger.error('Error getting chat history', error);
      throw error;
    }
  }

  /**
   * Lista todas las conversaciones activas (tenants con mensajes recientes)
   */
  async listActiveConversations() {
    try {
      // Obtener tenants con mensajes en las últimas 24 horas
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const tenants = await this.prisma.tenant.findMany({
        where: {
          platformchatmessages: {
            some: {
              createdAt: {
                gte: twentyFourHoursAgo,
              },
            },
          },
        },
        include: {
          platformchatmessages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
          _count: {
            select: {
              platformchatmessages: {
                where: {
                  createdAt: {
                    gte: twentyFourHoursAgo,
                  },
                },
              },
            },
          },
        },
        orderBy: {
          platformchatmessages: {
            _count: 'desc',
          },
        },
      });

      return {
        success: true,
        data: tenants.map((tenant) => ({
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
          },
          lastMessage: tenant.platformchatmessages[0] || null,
          unreadCount: tenant._count.platformchatmessages,
        })),
      };
    } catch (error) {
      this.logger.error('Error listing active conversations', error);
      throw error;
    }
  }
}

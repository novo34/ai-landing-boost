import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { $Enums } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  /**
   * Crea una nueva notificación y la envía en tiempo real
   */
  async createNotification(
    tenantId: string,
    userId: string,
    type: $Enums.notification_type,
    title: string,
    description?: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: createData({
          tenantId,
          userId,
          type,
          title,
          description,
          actionUrl,
          metadata: metadata as any,
        }),
      });

      // Enviar notificación en tiempo real
      this.gateway.sendNotification(userId, notification);

      return {
        success: true,
        data: notification,
      };
    } catch (error) {
      this.logger.error(`Error creating notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Obtiene las notificaciones del usuario
   */
  async getNotifications(
    tenantId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
    read?: boolean,
  ) {
    const where: any = {
      tenantId,
      userId,
    };

    if (read !== undefined) {
      where.read = read;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      data: {
        notifications,
        total,
        limit,
        offset,
      },
    };
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  async getUnreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        userId,
        read: false,
      },
    });

    return {
      success: true,
      data: { count },
    };
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException({
        success: false,
        error_key: 'notifications.not_found',
        message: 'Notification not found',
      });
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    // Notificar al cliente que la notificación fue leída
    this.gateway.sendNotificationRead(userId, notificationId);

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId,
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      data: { message: 'All notifications marked as read' },
    };
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        tenantId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException({
        success: false,
        error_key: 'notifications.not_found',
        message: 'Notification not found',
      });
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      success: true,
      data: { message: 'Notification deleted' },
    };
  }
}

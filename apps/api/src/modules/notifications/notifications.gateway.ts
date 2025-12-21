import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Permitir localhost en desarrollo
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      
      // Permitir ngrok en desarrollo
      if (process.env.NODE_ENV !== 'production') {
        const ngrokPattern = /^https?:\/\/.*\.ngrok(-free)?\.(app|dev|io|com)$/;
        if (ngrokPattern.test(origin)) {
          return callback(null, true);
        }
      }
      
      // Verificar origins permitidos
      const allowedOrigins = process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'];
      if (allowedOrigins.some(allowed => origin === allowed.trim())) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['websocket', 'polling'], // Permitir fallback a polling
  allowEIO3: true, // Compatibilidad con versiones anteriores
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Intentar obtener token de diferentes fuentes:
      // 1. Del auth object (si se envía explícitamente)
      // 2. Del header Authorization
      // 3. De las cookies del handshake (HttpOnly cookies se envían automáticamente)
      let token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      // Si no hay token en auth o headers, intentar leer de cookies
      if (!token && client.handshake.headers?.cookie) {
        const cookies = client.handshake.headers.cookie.split('; ');
        const accessTokenCookie = cookies.find(row => row.startsWith('access_token='));
        if (accessTokenCookie) {
          token = accessTokenCookie.split('=')[1];
        }
      }

      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verificar token
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Token verification failed: ${errorMessage}`);
        client.disconnect();
        return;
      }
      
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Invalid token payload');
        client.disconnect();
        return;
      }

      // Obtener tenant del usuario
      const membership = await this.prisma.tenantmembership.findFirst({
        where: { userId },
        include: { tenant: true },
      });

      if (!membership) {
        this.logger.warn(`User ${userId} has no tenant membership`);
        client.disconnect();
        return;
      }

      // Guardar asociación usuario-socket
      this.userSockets.set(userId, client.id);

      // Unir a room del tenant
      client.join(`tenant:${membership.tenantId}`);

      // Unir a room del usuario (para notificaciones individuales)
      client.join(`user:${userId}`);

      this.logger.log(`User ${userId} connected (socket ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    // Encontrar y remover usuario desconectado
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  /**
   * Envía una notificación a un usuario específico
   */
  sendNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Envía una notificación a todos los usuarios de un tenant
   */
  broadcastToTenant(tenantId: string, notification: any) {
    this.server.to(`tenant:${tenantId}`).emit('notification', notification);
  }

  /**
   * Notifica que una notificación fue marcada como leída
   */
  sendNotificationRead(userId: string, notificationId: string) {
    this.server.to(`user:${userId}`).emit('notification_read', { notificationId });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(@ConnectedSocket() client: Socket, @MessageBody() data: { notificationId: string }) {
    // Implementar lógica si es necesario
    // Por ahora, se maneja desde el controller HTTP
  }
}

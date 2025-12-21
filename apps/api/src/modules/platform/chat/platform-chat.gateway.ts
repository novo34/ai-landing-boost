import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { PlatformChatService } from './platform-chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  namespace: '/platform-chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PlatformChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PlatformChatGateway.name);
  private readonly connectedClients = new Map<string, { userId: string; tenantId?: string }>();

  constructor(private readonly chatService: PlatformChatService) {}

  async handleConnection(client: Socket) {
    try {
      // Obtener información del usuario desde el handshake
      const userId = client.handshake.auth?.userId;
      if (!userId) {
        this.logger.warn(`Client ${client.id} connected without userId, disconnecting`);
        client.disconnect();
        return;
      }

      this.connectedClients.set(client.id, { userId });
      this.logger.log(`Client ${client.id} connected (userId: ${userId})`);

      // Unir al cliente a su sala personal
      client.join(`user:${userId}`);
    } catch (error) {
      this.logger.error('Error handling connection', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join-tenant-chat')
  async handleJoinTenantChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return { success: false, error: 'Client not authenticated' };
      }

      // Unir al cliente a la sala del tenant
      await client.join(`tenant:${data.tenantId}`);
      clientInfo.tenantId = data.tenantId;

      this.logger.log(`Client ${client.id} joined tenant chat: ${data.tenantId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error joining tenant chat', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-tenant-chat')
  async handleLeaveTenantChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    try {
      await client.leave(`tenant:${data.tenantId}`);
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.tenantId = undefined;
      }

      this.logger.log(`Client ${client.id} left tenant chat: ${data.tenantId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving tenant chat', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto & { tenantId: string },
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo || !clientInfo.userId) {
        return { success: false, error: 'Client not authenticated' };
      }

      // Guardar mensaje en BD
      const result = await this.chatService.sendMessage(
        data.tenantId,
        clientInfo.userId,
        data.message,
      );

      if (!result.success) {
        return { success: false, error: 'Failed to save message' };
      }

      // Emitir a todos en la sala del tenant
      this.server.to(`tenant:${data.tenantId}`).emit('new-message', result.data);

      return { success: true, data: result.data };
    } catch (error) {
      this.logger.error('Error sending message', error);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; isTyping: boolean },
  ) {
    try {
      const clientInfo = this.connectedClients.get(client.id);
      if (!clientInfo) {
        return { success: false, error: 'Client not authenticated' };
      }

      // Emitir a todos excepto al emisor
      client.to(`tenant:${data.tenantId}`).emit('user-typing', {
        userId: clientInfo.userId,
        isTyping: data.isTyping,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing', error);
      return { success: false, error: error.message };
    }
  }
}

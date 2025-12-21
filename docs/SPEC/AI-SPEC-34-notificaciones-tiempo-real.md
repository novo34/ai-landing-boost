# AI-SPEC-34: Notificaciones en Tiempo Real

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-34  
> **Prioridad:** 🟡 MEDIA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── notifications/
│   │   ├── notifications.module.ts                 [CREAR]
│   │   ├── notifications.service.ts                [CREAR]
│   │   ├── notifications.controller.ts             [CREAR]
│   │   ├── notifications.gateway.ts                [CREAR]
│   │   └── dto/
│   │       ├── create-notification.dto.ts         [CREAR]
│   │       └── mark-read.dto.ts                    [CREAR]
└── prisma/
    └── schema.prisma                                [MODIFICAR]
```

---

## Archivos a Crear/Modificar

### 1. Modificar Prisma Schema

**Archivo:** `apps/api/prisma/schema.prisma`

**Acción:** Agregar modelo Notification y enum NotificationType

```prisma
enum NotificationType {
  MESSAGE_RECEIVED
  MESSAGE_FAILED
  APPOINTMENT_CREATED
  APPOINTMENT_CONFIRMED
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  APPOINTMENT_REMINDER
  TEAM_INVITATION_ACCEPTED
  TEAM_INVITATION_REJECTED
  TEAM_MEMBER_ADDED
  TEAM_ROLE_CHANGED
  TEAM_MEMBER_REMOVED
  PLAN_LIMIT_WARNING
  PLAN_LIMIT_REACHED
  TRIAL_EXPIRING
  PAYMENT_FAILED
}

model Notification {
  id          String           @id @default(cuid())
  tenantId    String
  userId     String
  type        NotificationType
  title       String
  description String?
  read        Boolean          @default(false)
  readAt      DateTime?
  actionUrl   String?
  metadata    Json?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  tenant      Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
  @@index([userId, read])
  @@index([createdAt])
}

// Agregar relación en User
model User {
  // ... campos existentes
  notifications Notification[]
}

// Agregar relación en Tenant
model Tenant {
  // ... campos existentes
  notifications Notification[]
}
```

---

### 2. Crear Notifications Service

**Archivo:** `apps/api/src/modules/notifications/notifications.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { $Enums } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

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
    type: $Enums.NotificationType,
    title: string,
    description?: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type,
          title,
          description,
          actionUrl,
          metadata: metadata as any,
        },
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
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

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
      throw new NotFoundException('Notification not found');
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
```

---

### 3. Crear Notifications Gateway (WebSocket)

**Archivo:** `apps/api/src/modules/notifications/notifications.gateway.ts`

```typescript
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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
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
      // Autenticar con JWT del handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verificar token
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Invalid token payload');
        client.disconnect();
        return;
      }

      // Obtener tenant del usuario
      const membership = await this.prisma.tenantMembership.findFirst({
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

  @SubscribeMessage('mark_read')
  async handleMarkRead(@ConnectedSocket() client: Socket, @MessageBody() data: { notificationId: string }) {
    // Implementar lógica si es necesario
    // Por ahora, se maneja desde el controller HTTP
  }
}
```

---

### 4. Crear Notifications Controller

**Archivo:** `apps/api/src/modules/notifications/notifications.controller.ts`

```typescript
import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { NotificationsService } from './notifications.service';
import { MarkReadDto } from './dto/mark-read.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Lista las notificaciones del usuario
   */
  @Get()
  async getNotifications(
    @CurrentTenant() tenant: { id: string; role: string; userId: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('read') read?: string,
  ) {
    return this.notificationsService.getNotifications(
      tenant.id,
      tenant.userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
      read === 'true' ? true : read === 'false' ? false : undefined,
    );
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentTenant() tenant: { id: string; role: string; userId: string }) {
    return this.notificationsService.getUnreadCount(tenant.id, tenant.userId);
  }

  /**
   * Marca una notificación como leída
   */
  @Put(':id/read')
  async markAsRead(
    @CurrentTenant() tenant: { id: string; role: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenant.id, tenant.userId, id);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Put('read-all')
  async markAllAsRead(@CurrentTenant() tenant: { id: string; role: string; userId: string }) {
    return this.notificationsService.markAllAsRead(tenant.id, tenant.userId);
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  async deleteNotification(
    @CurrentTenant() tenant: { id: string; role: string; userId: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(tenant.id, tenant.userId, id);
  }
}
```

---

### 5. Crear Notifications Module

**Archivo:** `apps/api/src/modules/notifications/notifications.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

---

### 6. Integrar con Módulos Existentes

**Archivo:** `apps/api/src/modules/conversations/conversations.service.ts`

**Acción:** Agregar notificación cuando llega nuevo mensaje

```typescript
// En el método que procesa mensajes entrantes, agregar:
import { NotificationsService } from '../notifications/notifications.service';

// En el constructor:
constructor(
  // ... otros servicios
  private notificationsService: NotificationsService,
) {}

// Cuando se crea un nuevo mensaje:
if (message.senderType === 'USER') {
  // Notificar a agentes asignados
  const agents = await this.getAssignedAgents(conversationId);
  for (const agent of agents) {
    await this.notificationsService.createNotification(
      tenantId,
      agent.userId,
      'MESSAGE_RECEIVED',
      `Nuevo mensaje en ${conversation.participantName || 'Conversación'}`,
      message.content.substring(0, 100),
      `/app/conversations/${conversationId}`,
      { conversationId, messageId: message.id },
    );
  }
}
```

**Similar para:**
- `appointments.service.ts` - Notificar cambios en citas
- `team.service.ts` - Notificar eventos de equipo
- `billing.service.ts` - Notificar límites de plan

---

## DTOs

### MarkReadDto

**Archivo:** `apps/api/src/modules/notifications/dto/mark-read.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class MarkReadDto {
  @IsString()
  @IsNotEmpty()
  notificationId: string;
}
```

---

## Frontend - Cliente WebSocket

### 7. Crear Hook de Notificaciones

**Archivo:** `apps/web/hooks/use-notifications.ts`

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Obtener token JWT
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token='))
      ?.split('=')[1];

    if (!token) return;

    // Conectar a WebSocket
    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications');
    });

    newSocket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    // Cargar notificaciones iniciales
    loadNotifications();

    return () => {
      newSocket.close();
    };
  }, []);

  const loadNotifications = async () => {
    const response = await apiClient.getNotifications();
    if (response.success && response.data) {
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.notifications.filter((n: Notification) => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await apiClient.markNotificationAsRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    refresh: loadNotifications,
  };
}
```

---

### 8. Crear Componente de Centro de Notificaciones

**Archivo:** `apps/web/components/notifications/notifications-center.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/use-notifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function NotificationsCenter() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-950' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {notification.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.description}
                        </p>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full ml-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Validaciones

- **Autenticación WebSocket:** Validar JWT en handshake
- **Permisos:** Solo usuarios autenticados pueden recibir notificaciones
- **Tenant Context:** Notificaciones solo para usuarios del mismo tenant

---

## Errores Esperados

```typescript
- 'notifications.create_failed'
- 'notifications.not_found'
- 'notifications.unauthorized'
- 'websocket.connection_failed'
- 'websocket.authentication_failed'
```

---

## Test Plan

### Unit Tests

1. **NotificationsService:**
   - `createNotification` crea y envía notificación
   - `getNotifications` lista correctamente
   - `markAsRead` marca como leída
   - `getUnreadCount` cuenta correctamente

2. **NotificationsGateway:**
   - `handleConnection` autentica correctamente
   - `sendNotification` envía a usuario correcto
   - `broadcastToTenant` envía a todo el tenant

### Integration Tests

1. **Flujo completo:**
   - Crear notificación desde servicio
   - Verificar que se guarda en BD
   - Verificar que se envía por WebSocket
   - Cliente recibe notificación
   - Marcar como leída
   - Verificar actualización en BD

---

## Checklist Final

- [ ] Prisma schema actualizado
- [ ] Migración Prisma creada
- [ ] NotificationsModule creado
- [ ] NotificationsService implementado
- [ ] NotificationsGateway implementado
- [ ] NotificationsController creado
- [ ] Integración con módulos existentes
- [ ] Hook de notificaciones creado
- [ ] Componente de centro de notificaciones creado
- [ ] Agregar a header del layout
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Socket.IO instalado (`npm install socket.io @nestjs/websockets`)

---

## Dependencias de Paquetes

```json
{
  "dependencies": {
    "socket.io": "^4.7.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0"
  }
}
```

---

**Última actualización:** 2025-01-XX


import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Lista las notificaciones del usuario
   */
  @Get()
  @Throttle({ short: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  async getNotifications(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('read') read?: string,
  ) {
    return this.notificationsService.getNotifications(
      tenant.id,
      user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
      read === 'true' ? true : read === 'false' ? false : undefined,
    );
  }

  /**
   * Obtiene el contador de notificaciones no leídas
   */
  @Get('unread-count')
  @Throttle({ short: { limit: 30, ttl: 60000 } }) // 30 requests por minuto
  async getUnreadCount(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.getUnreadCount(tenant.id, user.id);
  }

  /**
   * Marca una notificación como leída
   */
  @Put(':id/read')
  async markAsRead(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenant.id, user.id, id);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Put('read-all')
  async markAllAsRead(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.markAllAsRead(tenant.id, user.id);
  }

  /**
   * Elimina una notificación
   */
  @Delete(':id')
  async deleteNotification(
    @CurrentTenant() tenant: { id: string; role: string },
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(tenant.id, user.id, id);
  }
}

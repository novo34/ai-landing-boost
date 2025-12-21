import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { $Enums } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailDeliveryService } from '../email/email-delivery.service';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private notificationsService: NotificationsService,
    private emailDeliveryService: EmailDeliveryService,
  ) {}

  async getMembers(tenantId: string, requesterId: string) {
    // Verificar permisos
    const requesterMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      throw new ForbiddenException({
        success: false,
        error_key: 'team.only_owner_admin_can_view',
      });
    }

    const cacheKey = `team-members:${tenantId}`;
    
    // Verificar cache (1 minuto - los miembros cambian poco pero queremos datos relativamente frescos)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Obtener miembros activos (query optimizada)
    const members = await this.prisma.tenantmembership.findMany({
      where: { tenantId },
      select: {
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Obtener invitaciones pendientes (query optimizada)
    const pendingInvitations = await this.prisma.teaminvitation.findMany({
      where: {
        tenantId,
        status: $Enums.teaminvitation_status.PENDING,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const result = {
      success: true,
      data: {
        members: members.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.createdAt,
          status: 'ACTIVE',
        })),
        pendingInvitations: pendingInvitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          invitedBy: i.user.name || i.user.email,
          invitedAt: i.createdAt,
          expiresAt: i.expiresAt,
        })),
      },
    };
    
    // Guardar en cache (1 minuto)
    this.cache.set(cacheKey, result, 60 * 1000);
    
    return result;
  }

  async changeMemberRole(tenantId: string, userId: string, newRole: $Enums.tenantmembership_role, requesterId: string) {
    // Verificar permisos del requester
        const requesterMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException({
        success: false,
        error_key: 'team.requester_not_member',
      });
    }

    // OWNER puede cambiar cualquier rol
    // ADMIN solo puede cambiar AGENT y VIEWER
    if (requesterMembership.role === $Enums.tenantmembership_role.ADMIN) {
            const targetMembership = await this.prisma.tenantmembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (!targetMembership) {
        throw new NotFoundException({
          success: false,
          error_key: 'team.member_not_found',
        });
      }

      if (targetMembership.role === $Enums.tenantmembership_role.OWNER || targetMembership.role === $Enums.tenantmembership_role.ADMIN) {
        throw new ForbiddenException({
          success: false,
          error_key: 'team.admin_cannot_change_owner_or_admin',
        });
      }
    }

    // No permitir cambiar rol de OWNER a menos que sea transferencia
    if (newRole !== $Enums.tenantmembership_role.OWNER && requesterId === userId) {
            const currentMembership = await this.prisma.tenantmembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (currentMembership?.role === $Enums.tenantmembership_role.OWNER) {
        throw new BadRequestException({
          success: false,
          error_key: 'team.owner_cannot_change_own_role',
        });
      }
    }

    // Verificar que el miembro existe
        const targetMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException({
        success: false,
        error_key: 'team.member_not_found',
      });
    }

    // Actualizar rol
        await this.prisma.tenantmembership.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: { role: newRole },
    });

    this.logger.log(`Role changed for user ${userId} to ${newRole} in tenant ${tenantId}`);

    // Obtener información del usuario y tenant para el email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, locale: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Notificar al usuario afectado
    try {
      await this.notificationsService.createNotification(
        tenantId,
        userId,
        $Enums.notification_type.TEAM_ROLE_CHANGED,
        'notifications.team.role_changed',
        'notifications.team.role_changed_description',
        '/app/settings/team',
        {
          newRole,
          previousRole: targetMembership.role,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send role change notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Encolar email de cambio de rol al usuario afectado
    if (user && tenant) {
      try {
        await this.emailDeliveryService.queueRoleChangeEmail(
          user.email,
          tenantId,
          user.name || 'Usuario',
          targetMembership.role,
          newRole,
          tenant.name,
          user.locale,
        );
      } catch (error) {
        this.logger.warn(`Failed to queue role change email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      message: 'Role updated successfully',
    };
  }

  async removeMember(tenantId: string, userId: string, requesterId: string) {
    // Verificar permisos
        const requesterMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (!requesterMembership || (requesterMembership.role !== $Enums.tenantmembership_role.OWNER && requesterMembership.role !== $Enums.tenantmembership_role.ADMIN)) {
      throw new ForbiddenException({
        success: false,
        error_key: 'team.only_owner_admin_can_remove',
      });
    }

    // OWNER no puede remover a sí mismo
    if (requesterId === userId) {
      throw new BadRequestException({
        success: false,
        error_key: 'team.cannot_remove_yourself',
      });
    }

    // ADMIN no puede remover a OWNER
    if (requesterMembership.role === $Enums.tenantmembership_role.ADMIN) {
            const targetMembership = await this.prisma.tenantmembership.findUnique({
        where: {
          userId_tenantId: {
            userId,
            tenantId,
          },
        },
      });

      if (targetMembership?.role === $Enums.tenantmembership_role.OWNER) {
        throw new ForbiddenException({
          success: false,
          error_key: 'team.admin_cannot_remove_owner',
        });
      }
    }

    // Verificar que el miembro existe
        const targetMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException({
        success: false,
        error_key: 'team.member_not_found',
      });
    }

    // Eliminar membresía
    await this.prisma.tenantmembership.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    // Invalidar cache
    this.cache.delete(`team-members:${tenantId}`);

    this.logger.log(`Member ${userId} removed from tenant ${tenantId}`);

    // Notificar al usuario removido
    try {
      await this.notificationsService.createNotification(
        tenantId,
        userId,
        $Enums.notification_type.TEAM_MEMBER_REMOVED,
        'notifications.team.member_removed',
        'notifications.team.member_removed_description',
        '/',
        {
          tenantId,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send removal notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  async transferOwnership(tenantId: string, newOwnerId: string, requesterId: string, confirmationCode?: string) {
    // Verificar que requester es OWNER
        const requesterMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: requesterId,
          tenantId,
        },
      },
    });

    if (requesterMembership?.role !== $Enums.tenantmembership_role.OWNER) {
      throw new ForbiddenException({
        success: false,
        error_key: 'team.only_owner_can_transfer',
      });
    }

    // Verificar que nuevo owner es miembro y es ADMIN
        const newOwnerMembership = await this.prisma.tenantmembership.findUnique({
      where: {
        userId_tenantId: {
          userId: newOwnerId,
          tenantId,
        },
      },
    });

    if (!newOwnerMembership) {
      throw new NotFoundException({
        success: false,
        error_key: 'team.new_owner_not_member',
      });
    }

    if (newOwnerMembership.role !== $Enums.tenantmembership_role.ADMIN) {
      throw new BadRequestException({
        success: false,
        error_key: 'team.new_owner_must_be_admin',
      });
    }

    // TODO: Validar confirmationCode si se implementa doble confirmación
    // Por ahora, solo validamos que existe

    // Transferir ownership (transacción)
    await this.prisma.$transaction([
      // Cambiar rol del OWNER actual a ADMIN
      this.prisma.tenantmembership.update({
        where: {
          userId_tenantId: {
            userId: requesterId,
            tenantId,
          },
        },
        data: { role: $Enums.tenantmembership_role.ADMIN },
      }),
      // Cambiar rol del nuevo OWNER
      this.prisma.tenantmembership.update({
        where: {
          userId_tenantId: {
            userId: newOwnerId,
            tenantId,
          },
        },
        data: { role: $Enums.tenantmembership_role.OWNER },
      }),
    ]);

    // Invalidar cache
    this.cache.delete(`team-members:${tenantId}`);

    this.logger.log(`Ownership transferred from ${requesterId} to ${newOwnerId} in tenant ${tenantId}`);

    // Notificar a ambos usuarios
    try {
      // Notificar al nuevo OWNER
      await this.notificationsService.createNotification(
        tenantId,
        newOwnerId,
        $Enums.notification_type.TEAM_OWNERSHIP_TRANSFERRED,
        'notifications.team.ownership_transferred',
        'notifications.team.ownership_transferred_description',
        '/app/settings/team',
        {
          previousOwnerId: requesterId,
        },
      );

      // Notificar al antiguo OWNER
      await this.notificationsService.createNotification(
        tenantId,
        requesterId,
        $Enums.notification_type.TEAM_OWNERSHIP_TRANSFERRED,
        'notifications.team.ownership_transferred_from',
        'notifications.team.ownership_transferred_from_description',
        '/app/settings/team',
        {
          newOwnerId,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send ownership transfer notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      message: 'Ownership transferred successfully',
    };
  }
}


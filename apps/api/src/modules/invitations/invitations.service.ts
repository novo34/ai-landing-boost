import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailDeliveryService } from '../email/email-delivery.service';
import { N8nEventService } from '../n8n-integration/services/n8n-event.service';
import { $Enums } from '@prisma/client';
import * as crypto from 'crypto';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailDeliveryService: EmailDeliveryService,
    private n8nEventService: N8nEventService,
  ) {}

  async createInvitation(tenantId: string, email: string, role: $Enums.tenantmembership_role, invitedBy: string) {
    // Validar que inviter tiene permisos
    const membership = await this.prisma.tenantmembership.findUnique({
      where: { userId_tenantId: { userId: invitedBy, tenantId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException({
        success: false,
        error_key: 'invitations.only_owner_admin_can_invite',
      });
    }

    // Validar que email no está ya en el tenant
    const existing = await this.prisma.tenantmembership.findFirst({
      where: {
        tenantId,
        user: { email },
      },
    });

    if (existing) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.user_already_member',
      });
    }

    // Cancelar invitaciones pendientes previas para el mismo email
    await this.prisma.teaminvitation.updateMany({
      where: {
        tenantId,
        email,
        status: $Enums.teaminvitation_status.PENDING,
      },
      data: {
        status: $Enums.teaminvitation_status.EXPIRED,
      },
    });

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Crear invitación
    const invitation = await this.prisma.teaminvitation.create({
      data: createData({
        tenantId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
      }),
      include: {
        tenant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Encolar email de invitación
    try {
      await this.emailDeliveryService.queueInvitationEmail(
        email,
        token,
        invitation.tenantId,
        invitation.tenant.name,
        invitation.user.name || 'Admin',
        null, // locale se resuelve desde tenant
      );
    } catch (error) {
      this.logger.warn(`Failed to queue invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // No fallar la creación si el email falla
    }

    // Emitir evento n8n de invitación enviada
    try {
      await this.n8nEventService.emitInvitationSent(tenantId, {
        invitationId: invitation.id,
        email,
        role,
        inviterId: invitedBy,
      });
    } catch (error) {
      this.logger.warn(`Failed to emit invitation_sent event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  async getInvitationByToken(token: string) {
    // Usar findFirst para permitir validación adicional de tenantId si es necesario
    // Token es único, pero findFirst es más seguro para futuras validaciones
    const invitation = await this.prisma.teaminvitation.findFirst({
      where: { token },
      include: {
        tenant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        success: false,
        error_key: 'invitations.invalid_token',
      });
    }

    if (invitation.status !== $Enums.teaminvitation_status.PENDING) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.already_processed',
      });
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.teaminvitation.update({
        where: { id: invitation.id },
        data: { status: $Enums.teaminvitation_status.EXPIRED },
      });
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.expired',
      });
    }

    return {
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
        inviterName: invitation.user.name || 'Admin',
        expiresAt: invitation.expiresAt,
      },
    };
  }

  async acceptInvitation(token: string, userId: string) {
    // Usar findFirst para permitir validación adicional de tenantId si es necesario
    const invitation = await this.prisma.teaminvitation.findFirst({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation || invitation.status !== $Enums.teaminvitation_status.PENDING) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.invalid_token',
      });
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.teaminvitation.update({
        where: { id: invitation.id },
        data: { status: $Enums.teaminvitation_status.EXPIRED },
      });
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.expired',
      });
    }

    // Verificar que email coincide
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        success: false,
        error_key: 'auth.user_not_found',
      });
    }

    if (user.email !== invitation.email) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.email_mismatch',
      });
    }

    // Verificar que no está ya en el tenant
    const existing = await this.prisma.tenantmembership.findUnique({
      where: { userId_tenantId: { userId, tenantId: invitation.tenantId } },
    });

    if (existing) {
      // Marcar invitación como aceptada aunque ya exista
      await this.prisma.teaminvitation.update({
        where: { id: invitation.id },
        data: { status: $Enums.teaminvitation_status.ACCEPTED },
      });
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.user_already_member',
      });
    }

    // Crear membresía
    await this.prisma.tenantmembership.create({
      data: createData({
        userId,
        tenantId: invitation.tenantId,
        role: invitation.role,
      }),
    });

    // Marcar invitación como aceptada
    await this.prisma.teaminvitation.update({
      where: { id: invitation.id },
      data: { status: $Enums.teaminvitation_status.ACCEPTED },
    });

    // Emitir evento n8n de invitación aceptada
    try {
      await this.n8nEventService.emitInvitationAccepted(invitation.tenantId, {
        invitationId: invitation.id,
        email: invitation.email,
        userId,
        role: invitation.role,
      });
    } catch (error) {
      this.logger.warn(`Failed to emit invitation_accepted event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: {
        tenantId: invitation.tenantId,
        tenantName: invitation.tenant.name,
      },
    };
  }

  async rejectInvitation(token: string) {
    // Usar findFirst para permitir validación adicional de tenantId si es necesario
    const invitation = await this.prisma.teaminvitation.findFirst({
      where: { token },
    });

    if (!invitation || invitation.status !== $Enums.teaminvitation_status.PENDING) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.invalid_token',
      });
    }

    await this.prisma.teaminvitation.update({
      where: { id: invitation.id },
      data: { status: $Enums.teaminvitation_status.REJECTED },
    });

    // Emitir evento n8n de invitación rechazada
    try {
      await this.n8nEventService.emitInvitationRejected(invitation.tenantId, {
        invitationId: invitation.id,
        email: invitation.email,
      });
    } catch (error) {
      this.logger.warn(`Failed to emit invitation_rejected event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { success: true };
  }

  async listInvitations(tenantId: string, userId: string) {
    // Validar permisos
    const membership = await this.prisma.tenantmembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException({
        success: false,
        error_key: 'invitations.only_owner_admin_can_view',
      });
    }

    const invitations = await this.prisma.teaminvitation.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        invitedBy: {
          id: inv.user.id,
          name: inv.user.name,
          email: inv.user.email,
        },
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    };
  }

  async cancelInvitation(tenantId: string, invitationId: string, userId: string) {
    // Validar permisos
    const membership = await this.prisma.tenantmembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException({
        success: false,
        error_key: 'invitations.only_owner_admin_can_cancel',
      });
    }

    // CRÍTICO: Validar que la invitación pertenece al tenant antes de operar
    const invitation = await this.prisma.teaminvitation.findFirst({
      where: {
        id: invitationId,
        tenantId, // OBLIGATORIO - Previene acceso cross-tenant
      },
    });

    if (!invitation) {
      throw new NotFoundException({
        success: false,
        error_key: 'invitations.not_found',
      });
    }

    if (invitation.status !== $Enums.teaminvitation_status.PENDING) {
      throw new BadRequestException({
        success: false,
        error_key: 'invitations.already_processed',
      });
    }

    await this.prisma.teaminvitation.update({
      where: { id: invitationId },
      data: { status: $Enums.teaminvitation_status.EXPIRED },
    });

    return { success: true };
  }
}


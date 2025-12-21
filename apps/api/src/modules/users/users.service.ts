import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        timeZone: true,
        platformRole: true, // Asegurar que platformRole se incluye explícitamente
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        tenantmembership: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                trialEndsAt: true,
              },
            },
          },
        },
        useridentity: {
          select: {
            id: true,
            provider: true,
            providerId: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        error_key: 'users.not_found',
      });
    }

    return {
      success: true,
      data: user,
    };
  }

  /**
   * Obtiene las identidades SSO del usuario
   */
  async getUserIdentities(userId: string) {
    const identities = await this.prisma.useridentity.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerId: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: identities,
    };
  }

  /**
   * Elimina una identidad SSO del usuario
   * No permite eliminar si es la única forma de autenticación y el usuario no tiene contraseña
   */
  async deleteUserIdentity(userId: string, identityId: string) {
    // Verificar que la identidad pertenece al usuario
    const identity = await this.prisma.useridentity.findFirst({
      where: {
        id: identityId,
        userId,
      },
      include: {
        user: {
          select: {
            passwordHash: true,
            useridentity: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!identity) {
      throw new NotFoundException({
        success: false,
        error_key: 'users.identity_not_found',
      });
    }

    // Verificar que no sea la única forma de autenticación
    const hasPassword = !!identity.user.passwordHash;
    const identityCount = identity.user.useridentity.length;

    if (!hasPassword && identityCount === 1) {
      throw new ForbiddenException({
        success: false,
        error_key: 'users.cannot_delete_last_identity',
        message: 'Cannot delete the last authentication method. Please set a password first.',
      });
    }

    await this.prisma.useridentity.delete({
      where: { id: identityId },
    });

    return {
      success: true,
      message: 'Identity deleted successfully',
    };
  }
}



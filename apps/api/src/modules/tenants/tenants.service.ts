import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findMyTenants(userId: string) {
    const memberships = await this.prisma.tenantmembership.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            country: true,
            defaultLocale: true,
            dataRegion: true,
            status: true,
            trialEndsAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: memberships.map((m) => ({
        ...m.tenant,
        role: m.role,
        membershipId: m.id,
        joinedAt: m.createdAt,
      })),
    };
  }

  async findCurrentTenant(userId: string, tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException({
        success: false,
        error_key: 'tenants.tenant_id_required',
      });
    }

    // Verificar que el usuario tiene acceso a este tenant
    const membership = await this.prisma.tenantmembership.findFirst({
      where: {
        userId,
        tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!membership) {
      throw new NotFoundException({
        success: false,
        error_key: 'tenants.not_found_or_no_access',
      });
    }

    return {
      success: true,
      data: {
        ...membership.tenant,
        role: membership.role,
        membershipId: membership.id,
      },
    };
  }

  // TODO: Métodos futuros
  // async inviteUser(tenantId: string, email: string, role: TenantRole) {}
  // async changeUserRole(tenantId: string, userId: string, newRole: TenantRole) {}
}






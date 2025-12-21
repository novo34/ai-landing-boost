import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { createData } from '../../common/prisma/create-data.helper';
import { AuditLoggerService } from '../../common/audit/audit-logger.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogger: AuditLoggerService,
  ) {}

  /**
   * Obtiene métricas globales del SaaS
   */
  async getGlobalMetrics() {
    try {
      const [
        totalTenants,
        activeTenants,
        trialTenants,
        suspendedTenants,
        totalUsers,
        activeUsersLast30Days,
        totalAgents,
        totalChannels,
        totalConversations,
        mrr,
      ] = await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        this.prisma.tenant.count({ where: { status: 'TRIAL' } }),
        this.prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        this.prisma.agent.count({ where: { status: 'ACTIVE' } }),
        this.prisma.channel.count({ where: { status: 'ACTIVE' } }),
        this.prisma.conversation.count(),
        this.calculateMRR(),
      ]);

      // Calcular crecimiento de tenants (últimos 30 días)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newTenantsLast30Days = await this.prisma.tenant.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      return {
        success: true,
        data: {
          tenants: {
            total: totalTenants,
            active: activeTenants,
            trial: trialTenants,
            suspended: suspendedTenants,
            newLast30Days: newTenantsLast30Days,
          },
          users: {
            total: totalUsers,
            activeLast30Days: activeUsersLast30Days,
          },
          usage: {
            agents: totalAgents,
            channels: totalChannels,
            conversations: totalConversations,
          },
          revenue: {
            mrr,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error getting global metrics', error);
      throw error;
    }
  }

  /**
   * Calcula MRR (Monthly Recurring Revenue)
   */
  private async calculateMRR(): Promise<number> {
    try {
      const activeSubscriptions = await this.prisma.tenantsubscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
        include: {
          subscriptionplan: true,
        },
      });

      let mrr = 0;
      for (const sub of activeSubscriptions) {
        if (sub.subscriptionplan.interval === 'MONTHLY') {
          mrr += sub.subscriptionplan.priceCents / 100;
        } else if (sub.subscriptionplan.interval === 'YEARLY') {
          mrr += sub.subscriptionplan.priceCents / 100 / 12;
        }
      }

      return mrr;
    } catch (error) {
      this.logger.error('Error calculating MRR', error);
      return 0;
    }
  }

  /**
   * Lista todos los tenants con filtros
   */
  async listTenants(
    filters: {
      status?: string;
      planId?: string;
      country?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    platformUserId?: string,
    request?: { ip?: string; userAgent?: string },
  ) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.planId) {
        where.tenantsubscription = {
          planId: filters.planId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        };
      }

      if (filters.country) {
        where.country = filters.country;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { slug: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [tenants, total] = await Promise.all([
        this.prisma.tenant.findMany({
          where,
          include: {
            tenantsubscription: {
              include: { subscriptionplan: true },
            },
            _count: {
              select: {
                tenantmembership: true,
                agent: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.tenant.count({ where }),
      ]);

      const result = {
        success: true,
        data: {
          tenants: tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            status: t.status,
            country: t.country,
            plan: t.tenantsubscription?.subscriptionplan?.name || null,
            subscriptionStatus: t.tenantsubscription?.status || null,
            userCount: t._count.tenantmembership,
            agentCount: t._count.agent,
            createdAt: t.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };

      // Registrar acceso cross-tenant en audit log
      if (platformUserId) {
        try {
          await this.auditLogger.record('LIST_TENANTS', {
            userId: platformUserId,
            resourceType: 'TENANT',
            metadata: { filters, accessedTenants: 'ALL' },
            ip: request?.ip,
            userAgent: request?.userAgent,
          });
        } catch (error) {
          // No fallar si audit log falla
          this.logger.warn('Failed to log LIST_TENANTS action', error);
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error listing tenants', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles completos de un tenant
   */
  async getTenantDetails(tenantId: string) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          tenantsubscription: {
            include: {
              subscriptionplan: true,
            },
          },
          tenantmembership: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          tenantsettings: true,
          _count: {
            select: {
              agent: true,
              channel: true,
              conversation: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      return {
        success: true,
        data: tenant,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting tenant details', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo tenant
   */
  async createTenant(dto: CreateTenantDto, platformOwnerId: string, request?: { ip?: string; userAgent?: string }) {
    try {
      // Validar que el slug es único
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });

      if (existingTenant) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.slug_exists',
        });
      }

      // Buscar o crear usuario owner
      let owner = await this.prisma.user.findUnique({
        where: { email: dto.ownerEmail },
      });

      if (!owner) {
        // Crear usuario si no existe
        owner = await this.prisma.user.create({
          data: createData({
            email: dto.ownerEmail,
            name: dto.ownerName || dto.ownerEmail.split('@')[0],
            emailVerified: false, // Requerirá verificación
          }),
        });
      }

      // Crear tenant y relaciones en una transacción
      const tenant = await this.prisma.$transaction(async (tx) => {
        // Crear tenant primero
        const newTenant = await tx.tenant.create({
          data: createData({
            name: dto.name,
            slug: dto.slug,
            country: dto.country || 'ES',
            dataRegion: dto.dataRegion || 'EU',
            status: dto.initialStatus || 'TRIAL',
            trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días de trial
          }),
        });

        // Crear settings
        await tx.tenantsettings.create({
          data: createData({
            tenantId: newTenant.id,
            defaultLocale: dto.defaultLocale || 'es',
            timeZone: dto.timeZone || 'Europe/Madrid',
            country: dto.country || 'ES',
            dataRegion: dto.dataRegion || 'EU',
          }),
        });

        // Crear membership
        await tx.tenantmembership.create({
          data: createData({
            userId: owner.id,
            tenantId: newTenant.id,
            role: 'OWNER',
          }),
        });

        // Crear subscription si hay planId
        if (dto.planId) {
          await tx.tenantsubscription.create({
            data: createData({
              tenantId: newTenant.id,
              planId: dto.planId,
              status: 'TRIAL',
              country: dto.country || 'ES',
              trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            }),
          });
        }

        // Retornar tenant con relaciones
        return await tx.tenant.findUnique({
          where: { id: newTenant.id },
          include: {
            tenantmembership: {
              include: {
                user: true,
              },
            },
          },
        });
      });

      // Registrar en audit log
      await this.logAuditAction(
        platformOwnerId,
        'CREATE_TENANT',
        'TENANT',
        tenant.id,
        {
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          ownerEmail: dto.ownerEmail,
        },
        request,
      );

      return {
        success: true,
        data: tenant,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error creating tenant', error);
      throw error;
    }
  }

  /**
   * Actualiza un tenant
   */
  async updateTenant(tenantId: string, dto: UpdateTenantDto, platformOwnerId: string, request?: { ip?: string; userAgent?: string }) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      // Si se cambia el slug, validar unicidad
      if (dto.slug && dto.slug !== tenant.slug) {
        const existing = await this.prisma.tenant.findUnique({
          where: { slug: dto.slug },
        });
        if (existing) {
          throw new BadRequestException({
            success: false,
            error_key: 'platform.slug_exists',
          });
        }
      }

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: dto.name,
          slug: dto.slug,
          country: dto.country,
          dataRegion: dto.dataRegion,
          status: dto.status,
          trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
        },
      });

      // Registrar en audit log
      await this.logAuditAction(
        platformOwnerId,
        'UPDATE_TENANT',
        'TENANT',
        tenantId,
        {
          changes: dto,
        },
        request,
      );

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating tenant', error);
      throw error;
    }
  }

  /**
   * Suspende un tenant
   */
  async suspendTenant(tenantId: string, reason: string, platformOwnerId: string, request?: { ip?: string; userAgent?: string }) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      if (tenant.status === 'SUSPENDED') {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.tenant_already_suspended',
        });
      }

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'SUSPENDED' },
      });

      // Registrar en audit log
      await this.logAuditAction(
        platformOwnerId,
        'SUSPEND_TENANT',
        'TENANT',
        tenantId,
        {
          reason,
          previousStatus: tenant.status,
        },
        request,
      );

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error suspending tenant', error);
      throw error;
    }
  }

  /**
   * Reactiva un tenant
   */
  async reactivateTenant(tenantId: string, platformOwnerId: string, request?: { ip?: string; userAgent?: string }) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      if (tenant.status !== 'SUSPENDED') {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.tenant_not_suspended',
        });
      }

      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' },
      });

      // Registrar en audit log
      await this.logAuditAction(
        platformOwnerId,
        'REACTIVATE_TENANT',
        'TENANT',
        tenantId,
        {
          previousStatus: tenant.status,
        },
        request,
      );

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error reactivating tenant', error);
      throw error;
    }
  }

  /**
   * Elimina un tenant (soft delete)
   */
  async deleteTenant(tenantId: string, platformOwnerId: string, request?: { ip?: string; userAgent?: string }) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          _count: {
            select: {
              tenantmembership: true,
              conversation: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.tenant_not_found',
        });
      }

      // Soft delete: cambiar estado a CANCELLED
      const updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'CANCELLED' },
      });

      // Registrar en audit log
      await this.logAuditAction(
        platformOwnerId,
        'DELETE_TENANT',
        'TENANT',
        tenantId,
        {
          tenantName: tenant.name,
          userCount: tenant._count.tenantmembership,
          conversationCount: tenant._count.conversation,
        },
        request,
      );

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting tenant', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de auditoría
   */
  async getAuditLogs(filters: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.action) {
        where.action = filters.action;
      }

      if (filters.resourceType) {
        where.resourceType = filters.resourceType;
      }

      if (filters.resourceId) {
        where.resourceId = filters.resourceId;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      const [logs, total] = await Promise.all([
        this.prisma.platformauditlog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.platformauditlog.count({ where }),
      ]);

      return {
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error('Error getting audit logs', error);
      throw error;
    }
  }

  /**
   * Registra una acción en el log de auditoría
   * Obtiene platformRole del usuario para logging preciso
   */
  private async logAuditAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: any,
    request?: { ip?: string; userAgent?: string },
  ) {
    try {
      // Obtener platformRole del usuario
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { platformRole: true },
      });

      // Usar AuditLoggerService para consistencia
      await this.auditLogger.record(action, {
        userId,
        platformRole: user?.platformRole || null,
        resourceType,
        resourceId: resourceId || undefined,
        metadata,
        ip: request?.ip,
        userAgent: request?.userAgent,
      });
    } catch (error) {
      // No fallar si audit log falla
      this.logger.error('Error logging audit action', error);
    }
  }
}

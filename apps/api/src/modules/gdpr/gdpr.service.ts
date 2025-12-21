import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { createData } from '../../common/prisma/create-data.helper';
import { DataResidencyService } from './services/data-residency.service';

/**
 * Servicio para cumplimiento GDPR/FADP
 * 
 * Implementa:
 * - Right to be forgotten (anonimización/eliminación)
 * - Exportación de datos
 * - Gestión de consentimientos
 * - Políticas de retención de datos
 * - Data residency (EU/CH)
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private prisma: PrismaService,
    private dataResidencyService: DataResidencyService,
  ) {}

  /**
   * Anonimiza los datos personales de un usuario
   * Mantiene la integridad referencial reemplazando datos sensibles
   */
  async anonymizeUser(tenantId: string, userId: string, reason?: string) {
        const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantmembership: {
          where: { tenantId },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        error_key: 'gdpr.user_not_found',
        message: 'User not found',
      });
    }

    // Verificar que el usuario pertenece al tenant
    const membership = user.tenantmembership?.find((m) => m.tenantId === tenantId);
    if (!membership) {
      throw new BadRequestException({
        success: false,
        error_key: 'gdpr.user_not_in_tenant',
        message: 'User does not belong to this tenant',
      });
    }

    // Generar hash para mantener consistencia en anonimización
    const hash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);

    // Anonimizar datos del usuario
        await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `anonymized-${hash}@deleted.local`,
        name: 'Anonymized User',
        passwordHash: null, // Eliminar hash de contraseña
      },
    });

    // Anonimizar identidades SSO
        await this.prisma.useridentity.updateMany({
      where: { userId },
      data: {
        email: `anonymized-${hash}@deleted.local`,
        name: 'Anonymized User',
        picture: null,
        accessToken: null,
        refreshToken: null,
      },
    });

    // Anonimizar datos en conversaciones
        await this.prisma.conversation.updateMany({
      where: {
        tenantId,
        // Buscar conversaciones donde el participantePhone podría estar relacionado
        // Nota: Esto es una aproximación, puede requerir lógica más específica
      },
      data: {
        participantName: 'Anonymized User',
      },
    });

    // Anonimizar datos en citas
        await this.prisma.appointment.updateMany({
      where: {
        tenantId,
        // Nota: Las citas no tienen userId directo, pero pueden tener participantPhone
      },
      data: {
        participantName: 'Anonymized User',
        notes: null, // Eliminar notas que puedan contener datos personales
      },
    });

    this.logger.log(`User ${userId} anonymized for tenant ${tenantId}. Reason: ${reason || 'Not specified'}`);

    return {
      success: true,
      data: {
        userId,
        anonymizedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Exporta todos los datos de un usuario en formato estructurado
   */
  async exportUserData(tenantId: string, userId: string, format: 'json' | 'csv' = 'json') {
        const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantmembership: {
          where: { tenantId },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        useridentity: true,
        consentlog: {
          where: { tenantId },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        error_key: 'gdpr.user_not_found',
        message: 'User not found',
      });
    }

    // Verificar que el usuario pertenece al tenant
    const membership = user.tenantmembership?.find((m) => m.tenantId === tenantId);
    if (!membership) {
      throw new BadRequestException({
        success: false,
        error_key: 'gdpr.user_not_in_tenant',
        message: 'User does not belong to this tenant',
      });
    }

    // Recopilar datos adicionales del tenant
        const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        // Nota: Las conversaciones no tienen userId directo, esto es una aproximación
        // En un sistema real, necesitarías una relación más clara
      },
    });

        const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        // Similar a conversaciones, las citas no tienen userId directo
      },
    });

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale,
        timeZone: user.timeZone,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenantmembership: user.tenantmembership?.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        role: m.role,
        createdAt: m.createdAt,
      })),
      identities: user.useridentity?.map((i) => ({
        provider: i.provider,
        providerId: i.providerId,
        email: i.email,
        name: i.name,
        createdAt: i.createdAt,
      })),
      consentLogs: user.consentlog?.map((c) => ({
        consentType: c.consentType,
        granted: c.granted,
        createdAt: c.createdAt,
      })),
      conversations: conversations.length,
      appointments: appointments.length,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Convertir a CSV (implementación básica)
      // En producción, usar una librería como csv-stringify
      return {
        success: true,
        data: JSON.stringify(exportData, null, 2),
        format: 'json', // Por ahora solo JSON, CSV requiere librería adicional
      };
    }

    return {
      success: true,
      data: exportData,
      format: 'json',
    };
  }

  /**
   * Elimina completamente los datos de un usuario (Right to be forgotten)
   * ADVERTENCIA: Esta operación es irreversible
   */
  async deleteUserData(tenantId: string, userId: string, reason?: string) {
        const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantmembership: {
          where: { tenantId },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        success: false,
        error_key: 'gdpr.user_not_found',
        message: 'User not found',
      });
    }

    // Verificar que el usuario pertenece al tenant
    const membership = user.tenantmembership?.find((m) => m.tenantId === tenantId);
    if (!membership) {
      throw new BadRequestException({
        success: false,
        error_key: 'gdpr.user_not_in_tenant',
        message: 'User does not belong to this tenant',
      });
    }

    // Eliminar membresía del tenant
        await this.prisma.tenantmembership.delete({
      where: { id: membership.id },
    });

    // Eliminar identidades SSO
        await this.prisma.useridentity.deleteMany({
      where: { userId },
    });

    // Eliminar consentimientos
        await this.prisma.consentlog.deleteMany({
      where: { userId, tenantId },
    });

    // Si el usuario no tiene más membresías, eliminar el usuario
        const remainingMemberships = await this.prisma.tenantmembership.count({
      where: { userId },
    });

    if (remainingMemberships === 0) {
            await this.prisma.user.delete({
        where: { id: userId },
      });
    }

    this.logger.warn(`User ${userId} data deleted for tenant ${tenantId}. Reason: ${reason || 'Not specified'}`);

    return {
      success: true,
      data: {
        userId,
        deletedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Registra un consentimiento del usuario
   */
  async logConsent(
    tenantId: string,
    userId: string | null,
    consentType: string,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
        const consent = await this.prisma.consentlog.create({
      data: createData({
        tenantId,
        userId: userId || null,
        consentType,
        granted,
        ipAddress,
        userAgent,
      }),
    });

    return {
      success: true,
      data: consent,
    };
  }

  /**
   * Obtiene el historial de consentimientos
   */
  async getConsents(tenantId: string, userId?: string) {
    const where: { tenantId: string; userId?: string } = { tenantId };
    if (userId) {
      where.userId = userId;
    }

        const consents = await this.prisma.consentlog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: consents,
    };
  }

  /**
   * Crea una política de retención de datos
   */
  async createRetentionPolicy(tenantId: string, dto: {
    dataType: string;
    retentionDays: number;
    autoDelete: boolean;
  }) {
        const policy = await this.prisma.dataretentionpolicy.upsert({
      where: {
        tenantId_dataType: {
          tenantId,
          dataType: dto.dataType,
        },
      },
      create: createData({
        tenantId,
        dataType: dto.dataType,
        retentionDays: dto.retentionDays,
        autoDelete: dto.autoDelete,
      }),
      update: {
        retentionDays: dto.retentionDays,
        autoDelete: dto.autoDelete,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: policy,
    };
  }

  /**
   * Obtiene las políticas de retención del tenant
   */
  async getRetentionPolicies(tenantId: string) {
        const policies = await this.prisma.dataretentionpolicy.findMany({
      where: { tenantId },
      orderBy: { dataType: 'asc' },
    });

    return {
      success: true,
      data: policies,
    };
  }

  /**
   * Aplica las políticas de retención de datos
   * Elimina datos que han excedido el período de retención
   */
  async applyRetentionPolicies(tenantId?: string) {
    const where: { tenantId?: string } = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

        const policies = await this.prisma.dataretentionpolicy.findMany({
      where,
    });

    const results = [];

    for (const policy of policies) {
      if (policy.retentionDays === 0 || !policy.autoDelete) {
        continue; // Sin límite o eliminación manual
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      let deletedCount = 0;

      try {
        switch (policy.dataType) {
          case 'conversations':
                        const conversations = await this.prisma.conversation.findMany({
              where: {
                tenantId: policy.tenantId,
                lastMessageAt: {
                  lt: cutoffDate,
                },
              },
            });
                        await this.prisma.conversation.deleteMany({
              where: {
                tenantId: policy.tenantId,
                lastMessageAt: {
                  lt: cutoffDate,
                },
              },
            });
            deletedCount = conversations.length;
            break;

          case 'messages':
                        const messages = await this.prisma.message.findMany({
              where: {
                tenantId: policy.tenantId,
                createdAt: {
                  lt: cutoffDate,
                },
              },
            });
                        await this.prisma.message.deleteMany({
              where: {
                tenantId: policy.tenantId,
                createdAt: {
                  lt: cutoffDate,
                },
              },
            });
            deletedCount = messages.length;
            break;

          case 'appointments':
                        const appointments = await this.prisma.appointment.findMany({
              where: {
                tenantId: policy.tenantId,
                startTime: {
                  lt: cutoffDate,
                },
                status: {
                  in: ['COMPLETED', 'CANCELLED'],
                },
              },
            });
                        await this.prisma.appointment.deleteMany({
              where: {
                tenantId: policy.tenantId,
                startTime: {
                  lt: cutoffDate,
                },
                status: {
                  in: ['COMPLETED', 'CANCELLED'],
                },
              },
            });
            deletedCount = appointments.length;
            break;

          case 'leads':
                        const leads = await this.prisma.marketinglead.findMany({
              where: {
                createdAt: {
                  lt: cutoffDate,
                },
              },
            });
                        await this.prisma.marketinglead.deleteMany({
              where: {
                createdAt: {
                  lt: cutoffDate,
                },
              },
            });
            deletedCount = leads.length;
            break;

          default:
            this.logger.warn(`Unknown data type for retention policy: ${policy.dataType}`);
        }

        results.push({
          policyId: policy.id,
          dataType: policy.dataType,
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
        });

        this.logger.log(
          `Applied retention policy for ${policy.dataType}: deleted ${deletedCount} records older than ${policy.retentionDays} days`,
        );
      } catch (error) {
        this.logger.error(
          `Error applying retention policy for ${policy.dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        results.push({
          policyId: policy.id,
          dataType: policy.dataType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      data: {
        appliedAt: new Date().toISOString(),
        results,
      },
    };
  }

  /**
   * Obtiene información sobre data residency y cumplimiento
   */
  async getDataResidencyInfo(tenantId: string) {
    try {
      const info = await this.dataResidencyService.getDataResidencyInfo(tenantId);
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      this.logger.error(
        `Error getting data residency info for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Verifica el cumplimiento de data residency
   */
  async verifyDataResidencyCompliance(tenantId: string) {
    try {
      const compliance = await this.dataResidencyService.verifyCompliance(tenantId);
      return {
        success: true,
        data: compliance,
      };
    } catch (error) {
      this.logger.error(
        `Error verifying data residency compliance for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AgentsService } from '../../agents/agents.service';
import { ChannelsService } from '../../channels/channels.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { createData } from '../../../common/prisma/create-data.helper';
import { $Enums } from '@prisma/client';

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private prisma: PrismaService,
    private agentsService: AgentsService,
    private channelsService: ChannelsService,
    private conversationsService: ConversationsService,
  ) {}

  /**
   * Obtiene el tenant del PLATFORM_OWNER o crea uno si no existe
   */
  async getPlatformOwnerTenant(userId: string): Promise<string> {
    try {
      // Buscar si el usuario tiene un tenant como OWNER
      const membership = await this.prisma.tenantmembership.findFirst({
        where: {
          userId,
          role: 'OWNER',
        },
        include: {
          tenant: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (membership) {
        return membership.tenantId;
      }

      // Si no tiene tenant, crear uno especial para el PLATFORM_OWNER
      // Buscar si ya existe un tenant con slug "platform-owner"
      let platformTenant = await this.prisma.tenant.findUnique({
        where: { slug: 'platform-owner' },
      });

      if (!platformTenant) {
        // Crear tenant para operaciones propias del PLATFORM_OWNER
        platformTenant = await this.prisma.tenant.create({
          data: createData({
            name: 'Platform Owner Operations',
            slug: 'platform-owner',
            country: 'ES',
            dataRegion: 'EU',
            status: 'ACTIVE',
          }),
        });

        // Crear settings
        await this.prisma.tenantsettings.create({
          data: createData({
            tenantId: platformTenant.id,
            defaultLocale: 'es',
            timeZone: 'Europe/Madrid',
            country: 'ES',
            dataRegion: 'EU',
          }),
        });

        // Crear membership para el usuario
        await this.prisma.tenantmembership.create({
          data: createData({
            tenantId: platformTenant.id,
            userId,
            role: 'OWNER',
          }),
        });

        // Crear suscripción ilimitada
        const freePlan = await this.prisma.subscriptionplan.findFirst({
          where: { slug: 'starter' },
        });

        if (freePlan) {
          await this.prisma.tenantsubscription.create({
            data: createData({
              tenantId: platformTenant.id,
              planId: freePlan.id,
              status: 'ACTIVE',
              country: 'ES',
            }),
          });
        }
      } else {
        // Verificar si el usuario ya es miembro
        const existingMembership = await this.prisma.tenantmembership.findFirst({
          where: {
            tenantId: platformTenant.id,
            userId,
          },
        });

        if (!existingMembership) {
          await this.prisma.tenantmembership.create({
            data: createData({
              tenantId: platformTenant.id,
              userId,
              role: 'OWNER',
            }),
          });
        }
      }

      return platformTenant.id;
    } catch (error) {
      this.logger.error('Error getting platform owner tenant', error);
      throw error;
    }
  }

  /**
   * Obtiene agentes del PLATFORM_OWNER
   */
  async getPlatformAgents(userId: string) {
    const tenantId = await this.getPlatformOwnerTenant(userId);
    return this.agentsService.getAgents(tenantId);
  }

  /**
   * Obtiene canales del PLATFORM_OWNER
   */
  async getPlatformChannels(userId: string, filters?: { type?: $Enums.channel_type; status?: $Enums.channel_status }) {
    const tenantId = await this.getPlatformOwnerTenant(userId);
    return this.channelsService.getChannels(tenantId, filters);
  }

  /**
   * Obtiene conversaciones del PLATFORM_OWNER
   */
  async getPlatformConversations(
    userId: string,
    filters?: { agentId?: string; status?: string; limit?: number; offset?: number },
  ) {
    const tenantId = await this.getPlatformOwnerTenant(userId);
    return this.conversationsService.getConversations(tenantId, filters);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { createData } from '../../common/prisma/create-data.helper';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddAgentToChannelDto } from './dto/add-agent-to-channel.dto';
import { $Enums, Prisma } from '@prisma/client';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene todos los canales del tenant
   */
  async getChannels(tenantId: string, filters?: { type?: $Enums.channel_type; status?: $Enums.channel_status }) {
        const channels = await this.prisma.channel.findMany({
      where: {
        tenantId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        channelagent: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: channels,
    };
  }

  /**
   * Obtiene un canal específico por ID
   */
  async getChannelById(tenantId: string, channelId: string) {
        const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
      include: {
        channelagent: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException({
        success: false,
        error_key: 'channel.not_found',
        message: 'Channel not found',
      });
    }

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * Crea un nuevo canal
   */
  async createChannel(tenantId: string, dto: CreateChannelDto) {
        const channel = await this.prisma.channel.create({
      data: createData({
        tenantId,
        type: dto.type,
        name: dto.name,
        status: dto.status || $Enums.channel_status.ACTIVE,
        config: dto.config ? JSON.stringify(dto.config) : null,
      }),
      include: {
        channelagent: true,
      },
    });

    this.logger.log(`Channel ${channel.id} created for tenant ${tenantId}`);

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * Actualiza un canal
   */
  async updateChannel(tenantId: string, channelId: string, dto: UpdateChannelDto) {
    // Verificar que el canal existe y pertenece al tenant
        const existingChannel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!existingChannel) {
      throw new NotFoundException({
        success: false,
        error_key: 'channel.not_found',
        message: 'Channel not found',
      });
    }

        const channel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
        ...(dto.config !== undefined && { config: typeof dto.config === 'string' ? dto.config : JSON.stringify(dto.config) }),
      },
      include: {
        channelagent: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Channel ${channelId} updated for tenant ${tenantId}`);

    return {
      success: true,
      data: channel,
    };
  }

  /**
   * Elimina un canal
   */
  async deleteChannel(tenantId: string, channelId: string) {
    // Verificar que el canal existe y pertenece al tenant
        const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!channel) {
      throw new NotFoundException({
        success: false,
        error_key: 'channel.not_found',
        message: 'Channel not found',
      });
    }

        await this.prisma.channel.delete({
      where: { id: channelId },
    });

    this.logger.log(`Channel ${channelId} deleted for tenant ${tenantId}`);

    return {
      success: true,
      data: { id: channelId },
    };
  }

  /**
   * Agrega un agente a un canal
   */
  async addAgentToChannel(tenantId: string, channelId: string, dto: AddAgentToChannelDto) {
    try {
      this.logger.debug(`Adding agent ${dto.agentId} to channel ${channelId} for tenant ${tenantId}`);
      
      // Verificar que el canal existe y pertenece al tenant
      const channel = await this.prisma.channel.findFirst({
        where: {
          id: channelId,
          tenantId,
        },
      });

      if (!channel) {
        this.logger.warn(`Channel ${channelId} not found for tenant ${tenantId}`);
        throw new NotFoundException({
          success: false,
          error_key: 'channel.not_found',
          message: 'Channel not found',
        });
      }

      // Verificar que el agente existe y pertenece al tenant
      const agent = await this.prisma.agent.findFirst({
        where: {
          id: dto.agentId,
          tenantId,
        },
      });

      if (!agent) {
        this.logger.warn(`Agent ${dto.agentId} not found for tenant ${tenantId}`);
        throw new NotFoundException({
          success: false,
          error_key: 'channel.agent_not_found',
          message: 'Agent not found or does not belong to tenant',
        });
      }

      // Verificar que el agente no esté ya asignado al canal
      const existingAssignment = await this.prisma.channelagent.findFirst({
        where: {
          channelId,
          agentId: dto.agentId,
        },
      });

      if (existingAssignment) {
        this.logger.warn(`Agent ${dto.agentId} already assigned to channel ${channelId}`);
        throw new BadRequestException({
          success: false,
          error_key: 'channel.agent_already_assigned',
          message: 'Agent is already assigned to this channel',
        });
      }

      this.logger.debug(`Creating channelagent record for channel ${channelId} and agent ${dto.agentId}`);
      // channelagent solo tiene id, channelId, agentId, createdAt (no tiene updatedAt)
      const { randomUUID } = require('crypto');
      const channelAgent = await this.prisma.channelagent.create({
        data: {
          id: randomUUID(),
          channelId,
          agentId: dto.agentId,
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      this.logger.log(`Agent ${dto.agentId} added to channel ${channelId}`);

      return {
        success: true,
        data: channelAgent,
      };
    } catch (error: any) {
      this.logger.error(`Error adding agent to channel: ${error.message}`, error.stack);
      // Si ya es una excepción de NestJS, relanzarla
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      // Si no, lanzar una excepción genérica
      throw new BadRequestException({
        success: false,
        error_key: 'channel.add_agent_failed',
        message: error.message || 'Failed to add agent to channel',
      });
    }
  }

  /**
   * Elimina un agente de un canal
   */
  async removeAgentFromChannel(tenantId: string, channelId: string, agentId: string) {
    // Verificar que el canal existe y pertenece al tenant
        const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        tenantId,
      },
    });

    if (!channel) {
      throw new NotFoundException({
        success: false,
        error_key: 'channel.not_found',
        message: 'Channel not found',
      });
    }

    // Verificar que la asignación existe
        const channelAgent = await this.prisma.channelagent.findFirst({
      where: {
        channelId,
        agentId,
      },
    });

    if (!channelAgent) {
      throw new NotFoundException({
        success: false,
        error_key: 'channel.agent_not_assigned',
        message: 'Agent is not assigned to this channel',
      });
    }

        await this.prisma.channelagent.delete({
      where: { id: channelAgent.id },
    });

    this.logger.log(`Agent ${agentId} removed from channel ${channelId}`);

    return {
      success: true,
      data: { channelId, agentId },
    };
  }
}


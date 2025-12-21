import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene todos los agentes del tenant
   */
  async getAgents(tenantId: string) {
        const agents = await this.prisma.agent.findMany({
      where: { tenantId },
      include: {
        tenantwhatsappaccount: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: agents,
    };
  }

  /**
   * Obtiene un agente específico por ID
   */
  async getAgentById(tenantId: string, agentId: string) {
        const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        tenantId,
      },
      include: {
        tenantwhatsappaccount: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
            status: true,
          },
        },
        conversation: {
          select: {
            id: true,
            participantPhone: true,
            status: true,
            lastMessageAt: true,
          },
          take: 5,
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException({
        success: false,
        error_key: 'agent.not_found',
      });
    }

    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Crea un nuevo agente
   */
  async createAgent(tenantId: string, dto: CreateAgentDto) {
    // Validar que la cuenta de WhatsApp existe y pertenece al tenant
        const whatsappAccount = await this.prisma.tenantwhatsappaccount.findFirst({
      where: {
        id: dto.whatsappAccountId,
        tenantId,
      },
    });

    if (!whatsappAccount) {
      throw new NotFoundException({
        success: false,
        error_key: 'agent.whatsapp_account_not_found',
        message: 'WhatsApp account not found or does not belong to tenant',
      });
    }

    // Validar colecciones de conocimiento si se proporcionan
    if (dto.knowledgeCollectionIds && dto.knowledgeCollectionIds.length > 0) {
            const collections = await this.prisma.knowledgecollection.findMany({
        where: {
          id: { in: dto.knowledgeCollectionIds },
          tenantId,
        },
      });

      if (collections.length !== dto.knowledgeCollectionIds.length) {
        throw new BadRequestException({
          success: false,
          error_key: 'agent.invalid_collections',
          message: 'Some knowledge collections not found or do not belong to tenant',
        });
      }
    }

        const agent = await this.prisma.agent.create({
      data: createData({
        tenantId,
        name: dto.name,
        whatsappAccountId: dto.whatsappAccountId,
        status: dto.status || 'ACTIVE',
        languageStrategy: dto.languageStrategy || 'AUTO_DETECT',
        defaultLanguage: dto.defaultLanguage,
        personalitySettings: dto.personalitySettings ? JSON.stringify(dto.personalitySettings) : null,
        knowledgeCollectionIds: dto.knowledgeCollectionIds ? JSON.stringify(dto.knowledgeCollectionIds) : '[]',
        calendarIntegrationId: dto.calendarIntegrationId || null,
        n8nWorkflowId: dto.n8nWorkflowId || null,
      }),
      include: {
        tenantwhatsappaccount: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: agent,
    };
  }

  /**
   * Actualiza un agente
   */
  async updateAgent(tenantId: string, agentId: string, dto: UpdateAgentDto) {
        const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        tenantId,
      },
    });

    if (!agent) {
      throw new NotFoundException({
        success: false,
        error_key: 'agent.not_found',
      });
    }

    // Validar cuenta de WhatsApp si se actualiza
    if (dto.whatsappAccountId) {
            const whatsappAccount = await this.prisma.tenantwhatsappaccount.findFirst({
        where: {
          id: dto.whatsappAccountId,
          tenantId,
        },
      });

      if (!whatsappAccount) {
        throw new NotFoundException({
          success: false,
          error_key: 'agent.whatsapp_account_not_found',
          message: 'WhatsApp account not found or does not belong to tenant',
        });
      }
    }

    // Validar colecciones de conocimiento si se actualizan
    if (dto.knowledgeCollectionIds && dto.knowledgeCollectionIds.length > 0) {
            const collections = await this.prisma.knowledgecollection.findMany({
        where: {
          id: { in: dto.knowledgeCollectionIds },
          tenantId,
        },
      });

      if (collections.length !== dto.knowledgeCollectionIds.length) {
        throw new BadRequestException({
          success: false,
          error_key: 'agent.invalid_collections',
          message: 'Some knowledge collections not found or do not belong to tenant',
        });
      }
    }

        const updated = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        name: dto.name,
        whatsappAccountId: dto.whatsappAccountId,
        status: dto.status,
        languageStrategy: dto.languageStrategy,
        defaultLanguage: dto.defaultLanguage,
        personalitySettings: dto.personalitySettings ? JSON.stringify(dto.personalitySettings) : undefined,
        knowledgeCollectionIds: dto.knowledgeCollectionIds ? JSON.stringify(dto.knowledgeCollectionIds) : undefined,
        calendarIntegrationId: dto.calendarIntegrationId,
        n8nWorkflowId: dto.n8nWorkflowId,
      },
      include: {
        tenantwhatsappaccount: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  /**
   * Elimina un agente
   */
  async deleteAgent(tenantId: string, agentId: string) {
        const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        tenantId,
      },
    });

    if (!agent) {
      throw new NotFoundException({
        success: false,
        error_key: 'agent.not_found',
      });
    }

        await this.prisma.agent.delete({
      where: { id: agentId },
    });

    return {
      success: true,
      data: { id: agentId },
    };
  }
}


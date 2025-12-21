import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateN8nFlowDto } from './dto/create-n8n-flow.dto';
import { UpdateN8nFlowDto } from './dto/update-n8n-flow.dto';
import { N8nApiClient } from './clients/n8n-api.client';
import { $Enums } from '@prisma/client';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class N8nFlowsService {
  private readonly logger = new Logger(N8nFlowsService.name);

  constructor(
    private prisma: PrismaService,
    private n8nApiClient: N8nApiClient,
  ) {}

  /**
   * Crea un nuevo flujo n8n
   */
  async createFlow(tenantId: string, dto: CreateN8nFlowDto) {
    // Validar que el agente existe y pertenece al tenant si se especifica
    if (dto.agentId) {
            const agent = await this.prisma.agent.findFirst({
        where: {
          id: dto.agentId,
          tenantId,
        },
      });

      if (!agent) {
        throw new NotFoundException({
          success: false,
          error_key: 'n8n.agent_not_found',
          message: 'Agent not found or does not belong to tenant',
        });
      }
    }

    // Verificar que no exista otro flujo con el mismo workflowId para el tenant
        const existingFlow = await this.prisma.n8nflow.findFirst({
      where: {
        tenantId,
        workflowId: dto.workflowId,
      },
    });

    if (existingFlow) {
      throw new BadRequestException({
        success: false,
        error_key: 'n8n.workflow_already_registered',
        message: 'A flow with this workflowId is already registered for this tenant',
      });
    }

        const flow = await this.prisma.n8nflow.create({
      data: createData({
        tenantId,
        agentId: dto.agentId || null,
        workflowId: dto.workflowId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      }),
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: flow,
    };
  }

  /**
   * Lista flujos n8n del tenant con filtros
   */
  async getFlows(
    tenantId: string,
    filters?: {
      agentId?: string;
      type?: $Enums.n8nflow_type;
      isActive?: boolean;
    },
  ) {
    const where: {
      tenantId: string;
      agentId?: string;
      type?: $Enums.n8nflow_type;
      isActive?: boolean;
    } = {
      tenantId,
    };

    if (filters?.agentId) {
      where.agentId = filters.agentId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

        const flows = await this.prisma.n8nflow.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: flows,
    };
  }

  /**
   * Obtiene un flujo por ID
   */
  async getFlowById(tenantId: string, flowId: string) {
        const flow = await this.prisma.n8nflow.findFirst({
      where: {
        id: flowId,
        tenantId,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!flow) {
      throw new NotFoundException({
        success: false,
        error_key: 'n8n.flow_not_found',
        message: 'Flow not found',
      });
    }

    return {
      success: true,
      data: flow,
    };
  }

  /**
   * Actualiza un flujo n8n
   */
  async updateFlow(tenantId: string, flowId: string, dto: UpdateN8nFlowDto) {
        const flow = await this.prisma.n8nflow.findFirst({
      where: {
        id: flowId,
        tenantId,
      },
    });

    if (!flow) {
      throw new NotFoundException({
        success: false,
        error_key: 'n8n.flow_not_found',
        message: 'Flow not found',
      });
    }

    // Validar agente si se actualiza
    if (dto.agentId) {
            const agent = await this.prisma.agent.findFirst({
        where: {
          id: dto.agentId,
          tenantId,
        },
      });

      if (!agent) {
        throw new NotFoundException({
          success: false,
          error_key: 'n8n.agent_not_found',
          message: 'Agent not found or does not belong to tenant',
        });
      }
    }

    // Verificar workflowId único si se actualiza
    if (dto.workflowId && dto.workflowId !== flow.workflowId) {
            const existingFlow = await this.prisma.n8nflow.findFirst({
        where: {
          tenantId,
          workflowId: dto.workflowId,
          id: {
            not: flowId,
          },
        },
      });

      if (existingFlow) {
        throw new BadRequestException({
          success: false,
          error_key: 'n8n.workflow_already_registered',
          message: 'A flow with this workflowId is already registered for this tenant',
        });
      }
    }

        const updated = await this.prisma.n8nflow.update({
      where: { id: flowId },
      data: {
        agentId: dto.agentId !== undefined ? (dto.agentId || null) : undefined,
        workflowId: dto.workflowId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
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
   * Elimina un flujo n8n
   */
  async deleteFlow(tenantId: string, flowId: string) {
        const flow = await this.prisma.n8nflow.findFirst({
      where: {
        id: flowId,
        tenantId,
      },
    });

    if (!flow) {
      throw new NotFoundException({
        success: false,
        error_key: 'n8n.flow_not_found',
        message: 'Flow not found',
      });
    }

        await this.prisma.n8nflow.delete({
      where: { id: flowId },
    });

    return {
      success: true,
      data: { id: flowId },
    };
  }

  /**
   * Activa un flujo n8n
   */
  async activateFlow(tenantId: string, flowId: string) {
        const flow = await this.prisma.n8nflow.findFirst({
      where: {
        id: flowId,
        tenantId,
      },
    });

    if (!flow) {
      throw new NotFoundException({
        success: false,
        error_key: 'n8n.flow_not_found',
        message: 'Flow not found',
      });
    }

    // Activar workflow en n8n si está configurado
    if (this.n8nApiClient.isConfigured()) {
      try {
        await this.n8nApiClient.activateWorkflow(flow.workflowId);
        this.logger.log(`Workflow ${flow.workflowId} activated in n8n`);
      } catch (error) {
        this.logger.warn(
          `Failed to activate workflow in n8n, but continuing with DB update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continuamos con la actualización en BD aunque falle en n8n
      }
    } else {
      this.logger.warn('n8n API not configured, only updating database');
    }

    // Actualizar estado en BD
        const updated = await this.prisma.n8nflow.update({
      where: { id: flowId },
      data: { isActive: true },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
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
   * Desactiva un flujo n8n
   */
  async deactivateFlow(tenantId: string, flowId: string) {
        const flow = await this.prisma.n8nflow.findFirst({
      where: {
        id: flowId,
        tenantId,
      },
    });

    if (!flow) {
      throw new NotFoundException({
        success: false,
        error_key: 'n8n.flow_not_found',
        message: 'Flow not found',
      });
    }

    // Desactivar workflow en n8n si está configurado
    if (this.n8nApiClient.isConfigured()) {
      try {
        await this.n8nApiClient.deactivateWorkflow(flow.workflowId);
        this.logger.log(`Workflow ${flow.workflowId} deactivated in n8n`);
      } catch (error) {
        this.logger.warn(
          `Failed to deactivate workflow in n8n, but continuing with DB update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Continuamos con la actualización en BD aunque falle en n8n
      }
    } else {
      this.logger.warn('n8n API not configured, only updating database');
    }

    // Actualizar estado en BD
        const updated = await this.prisma.n8nflow.update({
      where: { id: flowId },
      data: { isActive: false },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }
}


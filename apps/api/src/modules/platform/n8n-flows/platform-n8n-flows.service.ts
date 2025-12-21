import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePlatformFlowDto } from './dto/create-platform-flow.dto';
import { UpdatePlatformFlowDto } from './dto/update-platform-flow.dto';
import axios, { AxiosInstance } from 'axios';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class PlatformN8NFlowsService {
  private readonly logger = new Logger(PlatformN8NFlowsService.name);
  private readonly n8nUrl = process.env.N8N_URL || 'http://localhost:5678';
  private readonly n8nApiKey = process.env.N8N_API_KEY;
  private readonly httpClient: AxiosInstance;

  constructor(
    private prisma: PrismaService,
  ) {
    this.httpClient = axios.create({
      baseURL: this.n8nUrl,
      headers: {
        'X-N8N-API-KEY': this.n8nApiKey || '',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Crea un nuevo flujo de plataforma
   */
  async createFlow(dto: CreatePlatformFlowDto) {
    try {
      const flow = await this.prisma.platformn8nflow.create({
        data: createData({
          name: dto.name,
          description: dto.description || null,
          workflow: dto.workflow,
          category: dto.category,
          isActive: false,
        }),
      });

      return {
        success: true,
        data: flow,
      };
    } catch (error) {
      this.logger.error('Error creating platform flow', error);
      throw error;
    }
  }

  /**
   * Lista todos los flujos de plataforma
   */
  async listFlows(filters?: {
    category?: string;
    isActive?: boolean;
  }) {
    try {
      const where: any = {};
      if (filters?.category) where.category = filters.category;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;

      const flows = await this.prisma.platformn8nflow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: flows,
      };
    } catch (error) {
      this.logger.error('Error listing platform flows', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un flujo
   */
  async getFlowDetails(flowId: string) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found',
        });
      }

      return {
        success: true,
        data: flow,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting flow details', error);
      throw error;
    }
  }

  /**
   * Actualiza un flujo
   */
  async updateFlow(flowId: string, dto: UpdatePlatformFlowDto) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found',
        });
      }

      const updated = await this.prisma.platformn8nflow.update({
        where: { id: flowId },
        data: {
          name: dto.name,
          description: dto.description,
          workflow: dto.workflow,
          category: dto.category,
          isActive: dto.isActive,
        },
      });

      // Si se activa/desactiva, sincronizar con N8N
      if (dto.isActive !== undefined && dto.isActive !== flow.isActive) {
        if (dto.isActive) {
          await this.activateFlowInN8N(flowId);
        } else {
          await this.deactivateFlowInN8N(flowId);
        }
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating flow', error);
      throw error;
    }
  }

  /**
   * Activa un flujo en N8N
   */
  async activateFlow(flowId: string) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found',
        });
      }

      if (flow.isActive) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.flow_already_active',
        });
      }

      await this.activateFlowInN8N(flowId);

      const updated = await this.prisma.platformn8nflow.update({
        where: { id: flowId },
        data: {
          isActive: true,
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error activating flow', error);
      throw error;
    }
  }

  /**
   * Desactiva un flujo en N8N
   */
  async deactivateFlow(flowId: string) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found',
        });
      }

      if (!flow.isActive) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.flow_already_inactive',
        });
      }

      await this.deactivateFlowInN8N(flowId);

      const updated = await this.prisma.platformn8nflow.update({
        where: { id: flowId },
        data: {
          isActive: false,
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deactivating flow', error);
      throw error;
    }
  }

  /**
   * Elimina un flujo
   */
  async deleteFlow(flowId: string) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found',
        });
      }

      // Si está activo, desactivarlo primero en N8N
      if (flow.isActive && flow.n8nWorkflowId) {
        try {
          await this.deactivateFlowInN8N(flowId);
        } catch (error) {
          this.logger.warn('Error deactivating flow in N8N before deletion', error);
        }
      }

      await this.prisma.platformn8nflow.delete({
        where: { id: flowId },
      });

      return {
        success: true,
        message: 'Flow deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting flow', error);
      throw error;
    }
  }

  /**
   * Obtiene logs de ejecución de un flujo desde N8N
   */
  async getFlowExecutionLogs(flowId: string, limit: number = 50) {
    try {
      const flow = await this.prisma.platformn8nflow.findUnique({
        where: { id: flowId },
      });

      if (!flow || !flow.n8nWorkflowId) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.flow_not_found_or_not_activated',
        });
      }

      if (!this.n8nApiKey) {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.n8n_not_configured',
        });
      }

      try {
        const response = await this.httpClient.get('/api/v1/executions', {
          params: {
            workflowId: flow.n8nWorkflowId,
            limit,
          },
          headers: {
            'X-N8N-API-KEY': this.n8nApiKey,
          },
        });

        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        this.logger.error('Error fetching execution logs from N8N', error);
        throw new BadRequestException({
          success: false,
          error_key: 'platform.n8n_connection_error',
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error getting flow execution logs', error);
      throw error;
    }
  }

  /**
   * Activa un flujo en N8N
   */
  private async activateFlowInN8N(flowId: string) {
    const flow = await this.prisma.platformn8nflow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    if (!this.n8nApiKey) {
      this.logger.warn('N8N API key not configured, skipping activation in N8N');
      return;
    }

    try {
      // Si ya tiene un workflowId, activarlo
      if (flow.n8nWorkflowId) {
        await this.httpClient.post(`/api/v1/workflows/${flow.n8nWorkflowId}/activate`, {
          active: true,
        });
      } else {
        // Crear nuevo workflow en N8N
        // Type assertion: workflow es JsonValue pero sabemos que es un objeto con nodes y connections
        const workflowData = flow.workflow as { nodes?: any[]; connections?: Record<string, any> } | null;
        const response = await this.httpClient.post('/api/v1/workflows', {
          name: flow.name,
          nodes: workflowData?.nodes || [],
          connections: workflowData?.connections || {},
          active: true,
        });

        // Actualizar con el workflowId de N8N
        await this.prisma.platformn8nflow.update({
          where: { id: flowId },
          data: {
            n8nWorkflowId: response.data.id.toString(),
          },
        });
      }
    } catch (error) {
      this.logger.error('Error activating flow in N8N', error);
      throw new BadRequestException({
        success: false,
        error_key: 'platform.n8n_activation_failed',
      });
    }
  }

  /**
   * Desactiva un flujo en N8N
   */
  private async deactivateFlowInN8N(flowId: string) {
    const flow = await this.prisma.platformn8nflow.findUnique({
      where: { id: flowId },
    });

    if (!flow || !flow.n8nWorkflowId) {
      return; // No hay nada que desactivar
    }

    if (!this.n8nApiKey) {
      this.logger.warn('N8N API key not configured, skipping deactivation in N8N');
      return;
    }

    try {
      await this.httpClient.post(`/api/v1/workflows/${flow.n8nWorkflowId}/deactivate`, {
        active: false,
      });
    } catch (error) {
      this.logger.error('Error deactivating flow in N8N', error);
      // No lanzar error, solo loguear
    }
  }
}

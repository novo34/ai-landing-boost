import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Cliente para comunicarse con la API de n8n
 * 
 * Documentación: https://docs.n8n.io/api/
 */
@Injectable()
export class N8nApiClient {
  private readonly logger = new Logger(N8nApiClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private client: AxiosInstance;

  constructor() {
    this.baseUrl = process.env.N8N_API_URL || '';
    this.apiKey = process.env.N8N_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('N8N_API_URL or N8N_API_KEY not configured. n8n integration will be disabled.');
      return;
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Verifica si el cliente está configurado
   */
  isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey && !!this.client;
  }

  /**
   * Activa un workflow en n8n
   */
  async activateWorkflow(workflowId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('n8n API not configured, skipping workflow activation');
      return false;
    }

    try {
      // Obtener el workflow actual
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow) {
        throw new BadRequestException({
          success: false,
          error_key: 'n8n.workflow_not_found',
          message: `Workflow ${workflowId} not found in n8n`,
        });
      }

      // Activar el workflow
      await this.client.put(`/api/v1/workflows/${workflowId}/activate`, {
        active: true,
      });

      this.logger.log(`Workflow ${workflowId} activated in n8n`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to activate workflow ${workflowId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException({
        success: false,
        error_key: 'n8n.activation_failed',
        message: `Failed to activate workflow in n8n: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Desactiva un workflow en n8n
   */
  async deactivateWorkflow(workflowId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('n8n API not configured, skipping workflow deactivation');
      return false;
    }

    try {
      // Obtener el workflow actual
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow) {
        throw new BadRequestException({
          success: false,
          error_key: 'n8n.workflow_not_found',
          message: `Workflow ${workflowId} not found in n8n`,
        });
      }

      // Desactivar el workflow
      await this.client.put(`/api/v1/workflows/${workflowId}/activate`, {
        active: false,
      });

      this.logger.log(`Workflow ${workflowId} deactivated in n8n`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to deactivate workflow ${workflowId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException({
        success: false,
        error_key: 'n8n.deactivation_failed',
        message: `Failed to deactivate workflow in n8n: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  /**
   * Obtiene el estado de un workflow en n8n
   */
  async getWorkflowStatus(workflowId: string): Promise<{ active: boolean; exists: boolean }> {
    if (!this.isConfigured()) {
      return { active: false, exists: false };
    }

    try {
      const workflow = await this.getWorkflow(workflowId);
      return {
        active: workflow?.active || false,
        exists: !!workflow,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get workflow status ${workflowId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { active: false, exists: false };
    }
  }

  /**
   * Obtiene un workflow por ID
   */
  private async getWorkflow(workflowId: string): Promise<{ id: string; active: boolean; name: string } | null> {
    try {
      const response = await this.client.get(`/api/v1/workflows/${workflowId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Lista todos los workflows disponibles en n8n
   */
  async listWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await this.client.get('/api/v1/workflows');
      return response.data?.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }
}


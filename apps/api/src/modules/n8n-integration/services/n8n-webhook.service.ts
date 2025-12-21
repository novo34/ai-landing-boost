import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Servicio para enviar webhooks a workflows de n8n
 * 
 * Este servicio permite disparar workflows de n8n mediante webhooks HTTP POST.
 * Los workflows deben tener un nodo Webhook configurado para recibir estos eventos.
 * 
 * Documentación n8n: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
 */
@Injectable()
export class N8nWebhookService {
  private readonly logger = new Logger(N8nWebhookService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_API_URL || '';
    this.apiKey = process.env.N8N_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      this.logger.warn('N8N_API_URL or N8N_API_KEY not configured. n8n webhook service will be disabled.');
    }
  }

  /**
   * Verifica si el servicio está configurado
   */
  isConfigured(): boolean {
    return !!this.baseUrl && !!this.apiKey;
  }

  /**
   * Dispara un workflow de n8n mediante webhook
   * 
   * @param workflowId - ID del workflow en n8n (o path del webhook)
   * @param event - Nombre del evento (ej: 'message.received', 'appointment.created')
   * @param payload - Datos adicionales a enviar al workflow
   * @returns true si el webhook se envió correctamente, false en caso contrario
   * 
   * @example
   * ```typescript
   * await n8nWebhookService.triggerWorkflow(
   *   'workflow-123',
   *   'message.received',
   *   { conversationId: 'conv-456', message: 'Hello' }
   * );
   * ```
   */
  async triggerWorkflow(
    workflowId: string,
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('n8n not configured, skipping webhook trigger');
      return false;
    }

    if (!workflowId || !event) {
      this.logger.error('workflowId and event are required');
      return false;
    }

    try {
      // Construir URL del webhook
      // n8n soporta dos formatos:
      // 1. /webhook/{workflowId} - webhook de producción
      // 2. /webhook-test/{workflowId} - webhook de prueba
      // Usamos el path del workflowId si ya incluye '/webhook', sino lo construimos
      let webhookUrl: string;
      
      if (workflowId.startsWith('http://') || workflowId.startsWith('https://')) {
        // URL completa proporcionada
        webhookUrl = workflowId;
      } else if (workflowId.startsWith('/webhook')) {
        // Path relativo ya incluye /webhook
        webhookUrl = `${this.baseUrl}${workflowId}`;
      } else {
        // Construir path estándar: /webhook/{workflowId}
        webhookUrl = `${this.baseUrl}/webhook/${workflowId}`;
      }

      // Preparar payload con el evento
      const webhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      };

      this.logger.debug(`Triggering n8n webhook: ${webhookUrl}`, { event, payload: webhookPayload });

      // Enviar POST al webhook
      await axios.post(webhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          // Algunas instalaciones de n8n requieren autenticación
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey }),
        },
        timeout: 10000, // 10 segundos
      });

      this.logger.log(`Successfully triggered n8n webhook for workflow ${workflowId} with event ${event}`);
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      
      if (axiosError.response) {
        this.logger.error(
          `Failed to trigger n8n webhook: HTTP ${axiosError.response.status}`,
          { workflowId, event, error: errorMessage, response: axiosError.response.data },
        );
      } else {
        this.logger.error(
          `Failed to trigger n8n webhook: ${errorMessage}`,
          { workflowId, event },
        );
      }
      
      return false;
    }
  }

  /**
   * Dispara un workflow usando el workflowId desde la base de datos
   * 
   * @param workflowId - ID del workflow en n8n (desde la tabla N8nFlow)
   * @param event - Nombre del evento
   * @param payload - Datos adicionales
   * @returns true si se envió correctamente
   */
  async triggerWorkflowById(
    workflowId: string,
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this.triggerWorkflow(workflowId, event, payload);
  }

  /**
   * Dispara múltiples workflows del mismo tipo de evento
   * 
   * @param workflowIds - Array de IDs de workflows
   * @param event - Nombre del evento
   * @param payload - Datos adicionales
   * @returns Array de resultados (true/false) para cada workflow
   */
  async triggerMultipleWorkflows(
    workflowIds: string[],
    event: string,
    payload: Record<string, unknown> = {},
  ): Promise<boolean[]> {
    const promises = workflowIds.map((id) => this.triggerWorkflow(id, event, payload));
    return Promise.all(promises);
  }
}


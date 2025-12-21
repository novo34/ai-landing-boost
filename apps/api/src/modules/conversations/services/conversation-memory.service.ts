import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import OpenAI from 'openai';
import { SemanticSearchService } from '../../knowledge-base/services/semantic-search.service';

export interface ConversationMessage {
  id: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  createdAt: Date;
}

@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private semanticSearchService: SemanticSearchService,
  ) {
    // Inicializar OpenAI si hay API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('OpenAI client initialized for conversation memory');
    } else {
      this.logger.warn('⚠️ OPENAI_API_KEY not configured. Summary generation will be disabled.');
    }
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getConversationHistory(
    conversationId: string,
    tenantId: string,
    limit: number = 50,
  ): Promise<{
    success: boolean;
    message: ConversationMessage[];
    totalCount: number;
  }> {
    // Verificar que la conversación existe y pertenece al tenant
        const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversation.not_found',
      });
    }

    // Obtener mensajes
        const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      select: {
        id: true,
        content: true,
        direction: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });

        const totalCount = await this.prisma.message.count({
      where: {
        conversationId,
      },
    });

    return {
      success: true,
      message: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        direction: msg.direction as 'INBOUND' | 'OUTBOUND',
        createdAt: msg.createdAt,
      })),
      totalCount,
    };
  }

  /**
   * Genera un resumen de la conversación usando OpenAI
   */
  async generateSummary(
    conversationId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    summary: string;
  }> {
    if (!this.openai) {
      throw new BadRequestException({
        success: false,
        error_key: 'memory.openai_not_configured',
        message: 'OpenAI API key not configured. Summary generation is disabled.',
      });
    }

    // Verificar que la conversación existe
        const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversation.not_found',
      });
    }

    // Obtener mensajes recientes (últimos 100 para generar resumen)
        const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      select: {
        content: true,
        direction: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    });

    if (messages.length === 0) {
      throw new BadRequestException({
        success: false,
        error_key: 'memory.no_messages',
        message: 'Conversation has no messages to summarize',
      });
    }

    try {
      // Construir contexto de la conversación
      const conversationText = messages
        .map((msg) => {
          const role = msg.direction === 'INBOUND' ? 'Usuario' : 'Asistente';
          return `${role}: ${msg.content}`;
        })
        .join('\n');

      // Generar resumen con OpenAI
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente que genera resúmenes concisos de conversaciones. Resume los puntos clave, intenciones del usuario y acciones tomadas. Máximo 200 palabras.',
          },
          {
            role: 'user',
            content: `Resume la siguiente conversación:\n\n${conversationText}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const summary = response.choices[0]?.message?.content || '';

      if (!summary) {
        throw new Error('Failed to generate summary');
      }

      // Guardar resumen en la conversación
            await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { summary },
      });

      this.logger.log(`Summary generated for conversation ${conversationId}`);

      return {
        success: true,
        summary,
      };
    } catch (error) {
      this.logger.error(`Error generating summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        success: false,
        error_key: 'memory.summary_generation_failed',
        message: 'Failed to generate conversation summary',
      });
    }
  }

  /**
   * Obtiene contexto relevante de una conversación usando búsqueda semántica
   */
  async getRelevantContext(
    conversationId: string,
    tenantId: string,
    query: string,
    limit: number = 5,
  ): Promise<{
    success: boolean;
    context: ConversationMessage[];
    summary?: string;
  }> {
    // Verificar que la conversación existe
        const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      select: {
        id: true,
        summary: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        success: false,
        error_key: 'conversation.not_found',
      });
    }

    // Obtener mensajes de la conversación
        const allMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
      },
      select: {
        id: true,
        content: true,
        direction: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (allMessages.length === 0) {
      return {
        success: true,
        context: [],
        summary: conversation.summary || undefined,
      };
    }

    // Si hay muchos mensajes, usar búsqueda semántica para encontrar los más relevantes
    // Por ahora, buscamos mensajes que contengan palabras clave de la query
    const queryLower = query.toLowerCase();
    const relevantMessages = allMessages
      .filter((msg) => {
        const contentLower = msg.content.toLowerCase();
        return queryLower.split(' ').some((word) => contentLower.includes(word));
      })
      .slice(0, limit);

    // Si no encontramos mensajes relevantes, devolver los últimos mensajes
    const contextMessages =
      relevantMessages.length > 0
        ? relevantMessages
        : allMessages.slice(-limit);

    return {
      success: true,
      context: contextMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        direction: msg.direction as 'INBOUND' | 'OUTBOUND',
        createdAt: msg.createdAt,
      })),
      summary: conversation.summary || undefined,
    };
  }

  /**
   * Verifica si una conversación necesita resumen (muchos mensajes sin resumen)
   */
  async shouldGenerateSummary(
    conversationId: string,
    tenantId: string,
    threshold: number = 50,
  ): Promise<boolean> {
        const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      select: {
        summary: true,
      },
    });

    if (!conversation) {
      return false;
    }

    // Si ya tiene resumen, no necesita otro (a menos que se actualice manualmente)
    if (conversation.summary) {
      return false;
    }

        const messageCount = await this.prisma.message.count({
      where: {
        conversationId,
      },
    });

    return messageCount >= threshold;
  }

  /**
   * Limpia conversaciones antiguas según políticas de retención del tenant
   * Integrado con DataRetentionPolicy
   */
  async cleanupOldConversations(tenantId: string): Promise<{
    success: boolean;
    deletedCount: number;
    policy?: {
      dataType: string;
      retentionDays: number;
    };
  }> {
    try {
      // Obtener política de retención para conversaciones del tenant
      const policy = await this.prisma.dataretentionpolicy.findFirst({
        where: {
          tenantId,
          dataType: 'conversations',
          autoDelete: true,
        },
      });

      // Si no hay política o autoDelete está desactivado, no hacer nada
      if (!policy || !policy.autoDelete || policy.retentionDays === 0) {
        return {
          success: true,
          deletedCount: 0,
        };
      }

      // Calcular fecha de corte
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      // Buscar conversaciones antiguas
      const oldConversations = await this.prisma.conversation.findMany({
        where: {
          tenantId,
          updatedAt: {
            lt: cutoffDate,
          },
        },
        select: {
          id: true,
        },
      });

      if (oldConversations.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          policy: {
            dataType: policy.dataType,
            retentionDays: policy.retentionDays,
          },
        };
      }

      // Eliminar conversaciones (cascade eliminará mensajes relacionados)
      const conversationIds = oldConversations.map((c) => c.id);
      await this.prisma.conversation.deleteMany({
        where: {
          id: { in: conversationIds },
        },
      });

      this.logger.log(
        `Cleaned up ${oldConversations.length} old conversations for tenant ${tenantId} (older than ${policy.retentionDays} days)`,
      );

      return {
        success: true,
        deletedCount: oldConversations.length,
        policy: {
          dataType: policy.dataType,
          retentionDays: policy.retentionDays,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error cleaning up old conversations for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Limpia conversaciones antiguas para todos los tenants que tengan políticas activas
   * Método para uso en jobs periódicos
   */
  async cleanupAllTenantsOldConversations(): Promise<{
    success: boolean;
    totalDeleted: number;
    tenantsProcessed: number;
  }> {
    try {
      // Obtener todas las políticas de retención activas para conversaciones
      const policies = await this.prisma.dataretentionpolicy.findMany({
        where: {
          dataType: 'conversations',
          autoDelete: true,
        },
      });

      if (policies.length === 0) {
        return {
          success: true,
          totalDeleted: 0,
          tenantsProcessed: 0,
        };
      }

      let totalDeleted = 0;
      const tenantsProcessed = policies.length;

      // Procesar cada tenant
      for (const policy of policies) {
        try {
          const result = await this.cleanupOldConversations(policy.tenantId);
          totalDeleted += result.deletedCount;
        } catch (error) {
          this.logger.error(
            `Error cleaning up conversations for tenant ${policy.tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Continuar con el siguiente tenant aunque falle uno
        }
      }

      this.logger.log(
        `Cleanup completed: ${totalDeleted} conversations deleted across ${tenantsProcessed} tenants`,
      );

      return {
        success: true,
        totalDeleted,
        tenantsProcessed,
      };
    } catch (error) {
      this.logger.error(
        `Error in cleanupAllTenantsOldConversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}


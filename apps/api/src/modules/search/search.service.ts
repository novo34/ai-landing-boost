import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  preview?: string;
  matchField?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  results: {
    conversations: SearchResult[];
    message: SearchResult[];
    appointments: SearchResult[];
    agents: SearchResult[];
    knowledge: SearchResult[];
  };
  total: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Realiza una búsqueda global en todas las entidades
   */
  async search(
    tenantId: string,
    query: string,
    types?: string[],
    limit: number = 10,
  ): Promise<{ success: boolean; data: SearchResponse }> {
    if (!query || query.trim().length === 0) {
      return {
        success: true,
        data: {
          query: '',
          results: {
            conversations: [],
            message: [],
            appointments: [],
            agents: [],
            knowledge: [],
          },
          total: 0,
        },
      };
    }

    const searchTypes = types || ['conversations', 'messages', 'appointments', 'agents', 'knowledge'];
    const searchQuery = query.trim();

    try {
      const results: SearchResponse['results'] = {
        conversations: [],
        message: [],
        appointments: [],
        agents: [],
        knowledge: [],
      };

      // Búsqueda en paralelo para mejor rendimiento
      const promises: Promise<void>[] = [];

      if (searchTypes.includes('conversations')) {
        promises.push(this.searchConversations(tenantId, searchQuery, limit).then(r => {
          results.conversations = r;
        }));
      }

      if (searchTypes.includes('messages')) {
        promises.push(this.searchMessages(tenantId, searchQuery, limit).then(r => {
          results.message = r;
        }));
      }

      if (searchTypes.includes('appointments')) {
        promises.push(this.searchAppointments(tenantId, searchQuery, limit).then(r => {
          results.appointments = r;
        }));
      }

      if (searchTypes.includes('agents')) {
        promises.push(this.searchAgents(tenantId, searchQuery, limit).then(r => {
          results.agents = r;
        }));
      }

      if (searchTypes.includes('knowledge')) {
        promises.push(this.searchKnowledge(tenantId, searchQuery, limit).then(r => {
          results.knowledge = r;
        }));
      }

      await Promise.all(promises);

      const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

      return {
        success: true,
        data: {
          query: searchQuery,
          results,
          total,
        },
      };
    } catch (error) {
      this.logger.error(`Error performing search: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Busca en conversaciones
   */
  private async searchConversations(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        OR: [
          { participantName: { contains: query } },
          { participantPhone: { contains: query } },
        ],
      },
      include: {
        message: {
          where: {
            content: { contains: query },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map(conv => ({
      id: conv.id,
      type: 'conversation',
      title: conv.participantName || conv.participantPhone,
      description: `Conversación ${conv.status}`,
      preview: conv.message[0]?.content?.substring(0, 100),
      matchField: conv.participantName?.toLowerCase().includes(query.toLowerCase())
        ? 'participantName'
        : 'participantPhone',
      url: `/app/conversations/${conv.id}`,
      metadata: {
        conversationId: conv.id,
        status: conv.status,
      },
    }));
  }

  /**
   * Busca en mensajes
   */
  private async searchMessages(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const messages = await this.prisma.message.findMany({
      where: {
        conversation: {
          tenantId,
        },
        content: {
          contains: query,
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            participantName: true,
            participantPhone: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return messages.map(msg => ({
      id: msg.id,
      type: 'message',
      title: `Mensaje en ${msg.conversation.participantName || msg.conversation.participantPhone}`,
      description: new Date(msg.createdAt).toLocaleDateString(),
      preview: msg.content.substring(0, 150),
      matchField: 'content',
      url: `/app/conversations/${msg.conversationId}#msg-${msg.id}`,
      metadata: {
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderType: msg.direction,
      },
    }));
  }

  /**
   * Busca en citas
   */
  private async searchAppointments(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        OR: [
          { participantName: { contains: query } },
          { participantPhone: { contains: query } },
          { notes: { contains: query } },
        ],
      },
      take: limit,
      orderBy: { startTime: 'desc' },
    });

    return appointments.map(apt => ({
      id: apt.id,
      type: 'appointment',
      title: `Cita con ${apt.participantName || apt.participantPhone}`,
      description: `${new Date(apt.startTime).toLocaleDateString()} ${new Date(apt.startTime).toLocaleTimeString()}`,
      preview: apt.notes?.substring(0, 100),
      matchField: apt.participantName?.toLowerCase().includes(query.toLowerCase())
        ? 'participantName'
        : apt.notes?.toLowerCase().includes(query.toLowerCase())
        ? 'notes'
        : 'participantPhone',
      url: `/app/appointments/${apt.id}`,
      metadata: {
        appointmentId: apt.id,
        status: apt.status,
        startTime: apt.startTime,
      },
    }));
  }

  /**
   * Busca en agentes
   */
  private async searchAgents(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const agents = await this.prisma.agent.findMany({
      where: {
        tenantId,
        name: {
          contains: query,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return agents.map(agent => ({
      id: agent.id,
      type: 'agent',
      title: agent.name,
      description: `Agente ${agent.status}`,
      matchField: 'name',
      url: `/app/agents/${agent.id}`,
      metadata: {
        agentId: agent.id,
        status: agent.status,
      },
    }));
  }

  /**
   * Busca en base de conocimiento
   */
  private async searchKnowledge(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const [collections, sources] = await Promise.all([
      // Buscar en colecciones
      this.prisma.knowledgecollection.findMany({
        where: {
          tenantId,
          name: {
            contains: query,
          },
        },
        take: Math.floor(limit / 2),
      }),
      // Buscar en fuentes
      this.prisma.knowledgesource.findMany({
        where: {
          knowledgecollection: {
            tenantId,
          },
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        take: Math.floor(limit / 2),
        include: {
          knowledgecollection: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const results: SearchResult[] = [];

    // Agregar colecciones
    results.push(
      ...collections.map(col => ({
        id: col.id,
        type: 'knowledge_collection',
        title: col.name,
        description: `Colección de conocimiento`,
        preview: col.description?.substring(0, 100),
        matchField: 'name',
        url: `/app/knowledge-base?collection=${col.id}`,
        metadata: {
          collectionId: col.id,
        },
      })),
    );

    // Agregar fuentes
    results.push(
      ...sources.map(src => ({
        id: src.id,
        type: 'knowledge_source',
        title: src.title,
        description: `Fuente en ${src.knowledgecollection.name}`,
        preview: src.content?.substring(0, 150),
        matchField: src.title?.toLowerCase().includes(query.toLowerCase()) ? 'title' : 'content',
        url: `/app/knowledge-base?source=${src.id}`,
        metadata: {
          sourceId: src.id,
          collectionId: src.collectionId,
        },
      })),
    );

    return results.slice(0, limit);
  }
}

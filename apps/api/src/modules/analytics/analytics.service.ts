import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  /**
   * Obtiene los KPIs principales del tenant (con cache)
   */
  async getKPIs(tenantId: string) {
    const cacheKey = `analytics-kpis:${tenantId}`;
    
    // Verificar cache (5 minutos)
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Calcular todas las métricas en paralelo para mejor rendimiento
      const [
        leadsTotal,
        leadsThisMonth,
        agentsActive,
        agentsTotal,
        channelsActive,
        channelsTotal,
        conversationsActive,
        conversationsTotal,
        messagesTotal,
        messagesThisMonth,
        responseMetrics,
      ] = await Promise.all([
        this.getLeadsTotal(tenantId),
        this.getLeadsThisMonth(tenantId),
        this.getAgentsActive(tenantId),
        this.getAgentsTotal(tenantId),
        this.getChannelsActive(tenantId),
        this.getChannelsTotal(tenantId),
        this.getConversationsActive(tenantId),
        this.getConversationsTotal(tenantId),
        this.getMessagesTotal(tenantId),
        this.getMessagesThisMonth(tenantId),
        this.getResponseMetrics(tenantId),
      ]);

      const result = {
        success: true,
        data: {
          leads: {
            total: leadsTotal,
            thisMonth: leadsThisMonth,
          },
          agents: {
            active: agentsActive,
            total: agentsTotal,
          },
          channels: {
            active: channelsActive,
            total: channelsTotal,
          },
          conversations: {
            active: conversationsActive,
            total: conversationsTotal,
          },
          message: {
            total: messagesTotal,
            thisMonth: messagesThisMonth,
          },
          responseRate: {
            averageMinutes: responseMetrics.averageMinutes,
            averageHours: responseMetrics.averageHours,
            formatted: responseMetrics.formatted,
          },
          responseTime: {
            averageMinutes: responseMetrics.averageMinutes,
            formatted: responseMetrics.formatted,
          },
        },
      };
      
      // Guardar en cache (5 minutos)
      this.cache.set(cacheKey, result, 5 * 60 * 1000);
      
      return result;
    } catch (error) {
      this.logger.error(`Error calculating KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Obtiene el total de leads
   * Nota: MarketingLead no tiene tenantId, son leads globales de marketing
   */
  private async getLeadsTotal(tenantId: string): Promise<number> {
    // Los leads de marketing no tienen tenantId, son globales
    // Por ahora retornamos 0, pero en el futuro podríamos asociar leads a tenants
    return 0;
  }

  /**
   * Obtiene los leads del mes actual
   */
  private async getLeadsThisMonth(tenantId: string): Promise<number> {
    // Los leads de marketing no tienen tenantId, son globales
    return 0;
  }

  /**
   * Obtiene el total de agentes activos
   */
  private async getAgentsActive(tenantId: string): Promise<number> {
    return this.prisma.agent.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Obtiene el total de agentes
   */
  private async getAgentsTotal(tenantId: string): Promise<number> {
    return this.prisma.agent.count({
      where: { tenantId },
    });
  }

  /**
   * Obtiene el total de canales activos
   */
  private async getChannelsActive(tenantId: string): Promise<number> {
    return this.prisma.channel.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Obtiene el total de canales
   */
  private async getChannelsTotal(tenantId: string): Promise<number> {
    return this.prisma.channel.count({
      where: { tenantId },
    });
  }

  /**
   * Obtiene el total de conversaciones activas
   */
  private async getConversationsActive(tenantId: string): Promise<number> {
    return this.prisma.conversation.count({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Obtiene el total de conversaciones
   */
  private async getConversationsTotal(tenantId: string): Promise<number> {
    return this.prisma.conversation.count({
      where: { tenantId },
    });
  }

  /**
   * Obtiene el total de mensajes
   */
  private async getMessagesTotal(tenantId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversation: {
          tenantId,
        },
      },
    });
  }

  /**
   * Obtiene los mensajes del mes actual
   */
  private async getMessagesThisMonth(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.message.count({
      where: {
        conversation: {
          tenantId,
        },
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
  }

  /**
   * Calcula métricas de tiempo de respuesta
   * OPTIMIZACIÓN: Limitar a últimas 1000 conversaciones para evitar cargar demasiados datos
   */
  private async getResponseMetrics(tenantId: string): Promise<{
    averageMinutes: number;
    averageHours: number;
    formatted: string;
  }> {
    // OPTIMIZACIÓN: Limitar a conversaciones recientes (últimos 30 días) y máximo 1000
    // Esto reduce significativamente la carga de memoria y tiempo de query
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        message: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 2, // Solo necesitamos el primero y segundo mensaje
        },
      },
      take: 1000, // Limitar a 1000 conversaciones para evitar sobrecarga
      orderBy: {
        createdAt: 'desc',
      },
    });

    const responseTimes: number[] = [];

    for (const conversation of conversations) {
      if (conversation.message.length < 2) continue;

      const firstMessage = conversation.message[0];
      const secondMessage = conversation.message[1];

      // Solo considerar si el segundo mensaje es una respuesta (dirección diferente)
      if (firstMessage.direction === 'INBOUND' && secondMessage.direction === 'OUTBOUND') {
        const timeDiff = secondMessage.createdAt.getTime() - firstMessage.createdAt.getTime();
        const minutes = timeDiff / (1000 * 60);
        if (minutes > 0 && minutes < 10080) { // Solo considerar respuestas razonables (menos de 7 días)
          responseTimes.push(minutes);
        }
      }
    }

    if (responseTimes.length === 0) {
      return {
        averageMinutes: 0,
        averageHours: 0,
        formatted: 'N/A',
      };
    }

    const averageMinutes = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const averageHours = averageMinutes / 60;

    // Formatear para mostrar
    let formatted: string;
    if (averageMinutes < 1) {
      formatted = '< 1 min';
    } else if (averageMinutes < 60) {
      formatted = `${Math.round(averageMinutes)} min`;
    } else {
      formatted = `${averageHours.toFixed(1)} h`;
    }

    return {
      averageMinutes: Math.round(averageMinutes * 10) / 10,
      averageHours: Math.round(averageHours * 100) / 100,
      formatted,
    };
  }

  /**
   * Obtiene tendencia de conversaciones agrupadas por período
   */
  async getConversationsTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
    agentId?: string,
    channelId?: string,
  ) {
    // Validar rango de fechas
    if (startDate > endDate) {
      throw new BadRequestException({
        success: false,
        error_key: 'analytics.invalid_date_range',
        message: 'startDate must be before endDate',
      });
    }

    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 año
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      throw new BadRequestException({
        success: false,
        error_key: 'analytics.range_too_large',
        message: 'Date range cannot exceed 1 year',
      });
    }

    const where: any = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (agentId && agentId !== 'all') {
      where.agentId = agentId;
    }

    if (channelId && channelId !== 'all') {
      where.tenantwhatsappaccountId = channelId;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Agrupar por período
    const grouped: Record<string, number> = {};

    conversations.forEach((conv) => {
      let key: string;
      const date = new Date(conv.createdAt);

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Domingo de la semana
        key = weekStart.toISOString().split('T')[0];
      } else {
        // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      grouped[key] = (grouped[key] || 0) + 1;
    });

    // Convertir a array ordenado
    const result = Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Obtiene estadísticas de mensajes (enviados vs recibidos)
   */
  async getMessagesStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    agentId?: string,
    channelId?: string,
  ) {
    const where: any = {
      tenantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (channelId && channelId !== 'all') {
      where.conversation = {
        whatsappAccountId: channelId,
        tenantId,
      };
    } else {
      where.conversation = {
        tenantId,
      };
    }

    if (agentId && agentId !== 'all') {
      where.conversation.agentId = agentId;
    }

    const messages = await this.prisma.message.findMany({
      where,
      select: {
        direction: true,
        createdAt: true,
      },
    });

    const sent = messages.filter((m) => m.direction === 'OUTBOUND').length;
    const received = messages.filter((m) => m.direction === 'INBOUND').length;

    // Agrupar por día
    const byDay: Record<string, { sent: number; received: number }> = {};
    messages.forEach((msg) => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      if (!byDay[date]) {
        byDay[date] = { sent: 0, received: 0 };
      }
      if (msg.direction === 'OUTBOUND') {
        byDay[date].sent++;
      } else {
        byDay[date].received++;
      }
    });

    const byDayArray = Object.entries(byDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      data: {
        sent,
        received,
        byDay: byDayArray,
      },
    };
  }

  /**
   * Obtiene tiempos de respuesta promedio por agente
   * OPTIMIZACIÓN: Limitar resultados y usar paginación implícita
   */
  async getResponseTimesByAgent(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // OPTIMIZACIÓN: Limitar a 2000 conversaciones para evitar sobrecarga
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        agentId: {
          not: null,
        },
      },
      include: {
        message: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 2,
        },
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 2000, // Limitar para evitar sobrecarga de memoria
      orderBy: {
        createdAt: 'desc',
      },
    });

    const agentTimes: Record<string, { agentId: string; agentName: string; times: number[] }> = {};

    for (const conversation of conversations) {
      if (!conversation.agentId || conversation.message.length < 2) continue;

      const firstMessage = conversation.message[0];
      const secondMessage = conversation.message[1];

      if (firstMessage.direction === 'INBOUND' && secondMessage.direction === 'OUTBOUND') {
        const timeDiff = secondMessage.createdAt.getTime() - firstMessage.createdAt.getTime();
        const minutes = timeDiff / (1000 * 60);

        if (minutes > 0 && minutes < 10080) {
          const agentId = conversation.agentId;
          if (!agentTimes[agentId]) {
            agentTimes[agentId] = {
              agentId,
              agentName: conversation.agent?.name || 'Unknown',
              times: [],
            };
          }
          agentTimes[agentId].times.push(minutes);
        }
      }
    }

    const result = Object.values(agentTimes).map((agent) => {
      const averageMinutes = agent.times.reduce((a, b) => a + b, 0) / agent.times.length;
      return {
        agentId: agent.agentId,
        agentName: agent.agentName,
        averageMinutes: Math.round(averageMinutes * 10) / 10,
        responseCount: agent.times.length,
      };
    });

    return {
      success: true,
      data: result.sort((a, b) => a.averageMinutes - b.averageMinutes),
    };
  }

  /**
   * Obtiene métricas de conversión (funnel: leads → conversaciones → citas)
   */
  async getConversionMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Leads (marketing leads - no tienen tenantId, son globales)
    const leads = await this.prisma.marketinglead.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Conversaciones
    const conversations = await this.prisma.conversation.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Citas
    const appointments = await this.prisma.appointment.count({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calcular tasas de conversión
    const leadToConversationRate = leads > 0 ? (conversations / leads) * 100 : 0;
    const conversationToAppointmentRate = conversations > 0 ? (appointments / conversations) * 100 : 0;
    const overallConversionRate = leads > 0 ? (appointments / leads) * 100 : 0;

    return {
      success: true,
      data: {
        leads,
        conversations,
        appointments,
        conversionRates: {
          leadToConversation: Math.round(leadToConversationRate * 10) / 10,
          conversationToAppointment: Math.round(conversationToAppointmentRate * 10) / 10,
          overall: Math.round(overallConversionRate * 10) / 10,
        },
      },
    };
  }

  /**
   * Obtiene uso de agentes por canal
   * OPTIMIZACIÓN: Usar select específico en lugar de include completo
   */
  async getAgentsUsageByChannel(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // OPTIMIZACIÓN: Solo seleccionar campos necesarios, limitar resultados
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        agentId: {
          not: null,
        },
      },
      select: {
        agentId: true,
        whatsappAccountId: true,
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        tenantwhatsappaccount: {
          select: {
            id: true,
            phoneNumber: true,
          },
        },
      },
      take: 5000, // Limitar para evitar sobrecarga
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usage: Record<string, { agentId: string; agentName: string; channelId: string; channelName: string; count: number }> = {};

    conversations.forEach((conv) => {
      if (!conv.agentId) return;

      const key = `${conv.agentId}-${conv.whatsappAccountId}`;
      if (!usage[key]) {
        usage[key] = {
          agentId: conv.agentId,
          agentName: conv.agent?.name || 'Unknown',
          channelId: conv.whatsappAccountId,
          channelName: conv.tenantwhatsappaccount?.phoneNumber || 'Unknown',
          count: 0,
        };
      }
      usage[key].count++;
    });

    return {
      success: true,
      data: Object.values(usage),
    };
  }

  /**
   * Obtiene todas las métricas combinadas
   */
  async getMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    agentId?: string,
    channelId?: string,
  ) {
    const [
      conversationsTrend,
      messagesStats,
      responseTimes,
      conversions,
      agentsUsage,
    ] = await Promise.all([
      this.getConversationsTrend(tenantId, startDate, endDate, 'day', agentId, channelId),
      this.getMessagesStats(tenantId, startDate, endDate, agentId, channelId),
      this.getResponseTimesByAgent(tenantId, startDate, endDate),
      this.getConversionMetrics(tenantId, startDate, endDate),
      this.getAgentsUsageByChannel(tenantId, startDate, endDate),
    ]);

    return {
      success: true,
      data: {
        conversationsTrend: conversationsTrend.data,
        messagesStats: messagesStats.data,
        responseTimes: responseTimes.data,
        conversions: conversions.data,
        agentsUsage: agentsUsage.data,
      },
    };
  }
}

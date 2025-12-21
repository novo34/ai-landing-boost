import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo lead
   */
  async createLead(dto: CreateLeadDto) {
    try {
      const lead = await this.prisma.lead.create({
        data: createData({
          name: dto.name,
          email: dto.email,
          phone: dto.phone || null,
          source: dto.source,
          interest: dto.interest || null,
          notes: dto.notes || null,
          conversationId: dto.conversationId || null,
          status: 'NEW',
          stage: 'LEAD_CAPTURED',
        }),
        include: {
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { leadnotes: true },
          },
        },
      });

      return {
        success: true,
        data: lead,
      };
    } catch (error) {
      this.logger.error('Error creating lead', error);
      throw error;
    }
  }

  /**
   * Lista leads con filtros
   */
  async listLeads(filters: {
    status?: string;
    stage?: string;
    source?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (filters.status) where.status = filters.status;
      if (filters.stage) where.stage = filters.stage;
      if (filters.source) where.source = filters.source;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;

      const [leads, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          include: {
            assignedTo: {
              select: { id: true, email: true, name: true },
            },
            _count: {
              select: { leadnotes: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.lead.count({ where }),
      ]);

      return {
        success: true,
        data: {
          leads,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error('Error listing leads', error);
      throw error;
    }
  }

  /**
   * Obtiene el pipeline de ventas (leads agrupados por stage)
   */
  async getPipeline() {
    try {
      const leads = await this.prisma.lead.findMany({
        where: {
          status: { not: 'LOST' },
        },
        include: {
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { leadnotes: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Agrupar por stage
      const pipeline = {
        LEAD_CAPTURED: leads.filter((l) => l.stage === 'LEAD_CAPTURED'),
        CONTACTED: leads.filter((l) => l.stage === 'CONTACTED'),
        QUALIFIED: leads.filter((l) => l.stage === 'QUALIFIED'),
        DEMO: leads.filter((l) => l.stage === 'DEMO'),
        PROPOSAL: leads.filter((l) => l.stage === 'PROPOSAL'),
        NEGOTIATION: leads.filter((l) => l.stage === 'NEGOTIATION'),
        CLOSED_WON: leads.filter((l) => l.stage === 'CLOSED_WON'),
        CLOSED_LOST: leads.filter((l) => l.stage === 'CLOSED_LOST'),
      };

      // Calcular métricas
      const metrics = {
        total: leads.length,
        byStage: {
          LEAD_CAPTURED: pipeline.LEAD_CAPTURED.length,
          CONTACTED: pipeline.CONTACTED.length,
          QUALIFIED: pipeline.QUALIFIED.length,
          DEMO: pipeline.DEMO.length,
          PROPOSAL: pipeline.PROPOSAL.length,
          NEGOTIATION: pipeline.NEGOTIATION.length,
          CLOSED_WON: pipeline.CLOSED_WON.length,
          CLOSED_LOST: pipeline.CLOSED_LOST.length,
        },
        conversionRate: leads.length > 0
          ? (pipeline.CLOSED_WON.length / leads.length) * 100
          : 0,
      };

      return {
        success: true,
        data: {
          pipeline,
          metrics,
        },
      };
    } catch (error) {
      this.logger.error('Error getting pipeline', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un lead
   */
  async getLeadDetails(leadId: string) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          leadnotes: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!lead) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.lead_not_found',
        });
      }

      return {
        success: true,
        data: lead,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting lead details', error);
      throw error;
    }
  }

  /**
   * Actualiza un lead
   */
  async updateLead(leadId: string, dto: UpdateLeadDto) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.lead_not_found',
        });
      }

      const updated = await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          interest: dto.interest,
          status: dto.status,
          stage: dto.stage,
          assignedToId: dto.assignedToId,
          notes: dto.notes,
        },
        include: {
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating lead', error);
      throw error;
    }
  }

  /**
   * Agrega una nota a un lead
   */
  async addNote(leadId: string, dto: AddNoteDto, userId: string) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.lead_not_found',
        });
      }

      const note = await this.prisma.leadnote.create({
        data: createData({
          leadId,
          userId,
          note: dto.note,
        }),
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      return {
        success: true,
        data: note,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error adding note to lead', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de ventas
   */
  async getSalesMetrics() {
    try {
      const [
        totalLeads,
        newLeads,
        contactedLeads,
        qualifiedLeads,
        closedWon,
        closedLost,
        leadsBySource,
      ] = await Promise.all([
        this.prisma.lead.count(),
        this.prisma.lead.count({ where: { status: 'NEW' } }),
        this.prisma.lead.count({ where: { status: 'CONTACTED' } }),
        this.prisma.lead.count({ where: { status: 'QUALIFIED' } }),
        this.prisma.lead.count({ where: { stage: 'CLOSED_WON' } }),
        this.prisma.lead.count({ where: { stage: 'CLOSED_LOST' } }),
        this.prisma.lead.groupBy({
          by: ['source'],
          _count: true,
        }),
      ]);

      const conversionRate = totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0;

      return {
        success: true,
        data: {
          total: totalLeads,
          byStatus: {
            new: newLeads,
            contacted: contactedLeads,
            qualified: qualifiedLeads,
          },
          byOutcome: {
            won: closedWon,
            lost: closedLost,
          },
          conversionRate,
          bySource: leadsBySource.reduce((acc, item) => {
            acc[item.source] = item._count;
            return acc;
          }, {} as Record<string, number>),
        },
      };
    } catch (error) {
      this.logger.error('Error getting sales metrics', error);
      throw error;
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { createData } from '../../../common/prisma/create-data.helper';

@Injectable()
export class SupportTicketsService {
  private readonly logger = new Logger(SupportTicketsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo ticket de soporte
   */
  async createTicket(dto: CreateTicketDto, createdById: string) {
    try {
      const ticket = await this.prisma.supportticket.create({
        data: createData({
          tenantId: dto.tenantId || null,
          createdById,
          assignedToId: dto.assignedToId || null,
          subject: dto.subject,
          description: dto.description,
          category: dto.category,
          priority: dto.priority,
          status: 'OPEN',
        }),
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      this.logger.error('Error creating ticket', error);
      throw error;
    }
  }

  /**
   * Lista tickets con filtros
   */
  async listTickets(filters: {
    status?: string;
    category?: string;
    priority?: string;
    assignedToId?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (filters.status) where.status = filters.status;
      if (filters.category) where.category = filters.category;
      if (filters.priority) where.priority = filters.priority;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.tenantId) where.tenantId = filters.tenantId;

      const [tickets, total] = await Promise.all([
        this.prisma.supportticket.findMany({
          where,
          include: {
            tenant: {
              select: { id: true, name: true, slug: true },
            },
            createdBy: {
              select: { id: true, email: true, name: true },
            },
            assignedTo: {
              select: { id: true, email: true, name: true },
            },
            _count: {
              select: { messages: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.supportticket.count({ where }),
      ]);

      return {
        success: true,
        data: {
          tickets,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error('Error listing tickets', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de un ticket
   */
  async getTicketDetails(ticketId: string) {
    try {
      const ticket = await this.prisma.supportticket.findUnique({
        where: { id: ticketId },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, status: true },
          },
          createdBy: {
            select: { id: true, email: true, name: true },
          },
          assignedTo: {
            select: { id: true, email: true, name: true },
          },
          messages: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!ticket) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.ticket_not_found',
        });
      }

      return {
        success: true,
        data: ticket,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error getting ticket details', error);
      throw error;
    }
  }

  /**
   * Actualiza un ticket
   */
  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    try {
      const ticket = await this.prisma.supportticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.ticket_not_found',
        });
      }

      const updated = await this.prisma.supportticket.update({
        where: { id: ticketId },
        data: {
          subject: dto.subject,
          description: dto.description,
          category: dto.category,
          priority: dto.priority,
          status: dto.status,
          assignedToId: dto.assignedToId,
          lastActivityAt: new Date(),
        },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          createdBy: {
            select: { id: true, email: true, name: true },
          },
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
      this.logger.error('Error updating ticket', error);
      throw error;
    }
  }

  /**
   * Agrega un mensaje a un ticket
   */
  async addMessage(ticketId: string, dto: AddMessageDto, userId: string) {
    try {
      const ticket = await this.prisma.supportticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.ticket_not_found',
        });
      }

      const message = await this.prisma.ticketmessage.create({
        data: createData({
          ticketId,
          userId,
          message: dto.message,
          isInternal: dto.isInternal || false,
        }),
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      });

      // Actualizar última actividad del ticket
      await this.prisma.supportticket.update({
        where: { id: ticketId },
        data: { lastActivityAt: new Date() },
      });

      return {
        success: true,
        data: message,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error adding message to ticket', error);
      throw error;
    }
  }

  /**
   * Cierra un ticket
   */
  async closeTicket(ticketId: string) {
    try {
      const ticket = await this.prisma.supportticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        throw new NotFoundException({
          success: false,
          error_key: 'platform.ticket_not_found',
        });
      }

      if (ticket.status === 'CLOSED') {
        throw new BadRequestException({
          success: false,
          error_key: 'platform.ticket_already_closed',
        });
      }

      const updated = await this.prisma.supportticket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          lastActivityAt: new Date(),
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
      this.logger.error('Error closing ticket', error);
      throw error;
    }
  }
}

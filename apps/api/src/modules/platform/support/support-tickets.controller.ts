import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { PlatformUser } from '../../../common/decorators/platform-user.decorator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Controller('platform/support/tickets')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  /**
   * Crea un nuevo ticket
   */
  @Post()
  async createTicket(
    @Body() dto: CreateTicketDto,
    @PlatformUser() platformUser: { userId: string },
  ) {
    return this.supportTicketsService.createTicket(dto, platformUser.userId);
  }

  /**
   * Lista tickets con filtros
   */
  @Get()
  async listTickets(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.supportTicketsService.listTickets({
      status,
      category,
      priority,
      assignedToId,
      tenantId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Obtiene detalles de un ticket
   */
  @Get(':ticketId')
  async getTicketDetails(@Param('ticketId') ticketId: string) {
    return this.supportTicketsService.getTicketDetails(ticketId);
  }

  /**
   * Actualiza un ticket
   */
  @Put(':ticketId')
  async updateTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportTicketsService.updateTicket(ticketId, dto);
  }

  /**
   * Agrega un mensaje a un ticket
   */
  @Post(':ticketId/messages')
  async addMessage(
    @Param('ticketId') ticketId: string,
    @Body() dto: AddMessageDto,
    @PlatformUser() platformUser: { userId: string },
  ) {
    return this.supportTicketsService.addMessage(ticketId, dto, platformUser.userId);
  }

  /**
   * Cierra un ticket
   */
  @Post(':ticketId/close')
  async closeTicket(@Param('ticketId') ticketId: string) {
    return this.supportTicketsService.closeTicket(ticketId);
  }
}

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
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformGuard } from '../../../common/guards/platform.guard';
import { PlatformUser } from '../../../common/decorators/platform-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AddNoteDto } from './dto/add-note.dto';

@Controller('platform/leads')
@UseGuards(JwtAuthGuard, PlatformGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Crea un nuevo lead
   */
  @Post()
  async createLead(@Body() dto: CreateLeadDto) {
    return this.leadsService.createLead(dto);
  }

  /**
   * Lista leads con filtros
   */
  @Get()
  async listLeads(
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.listLeads({
      status,
      stage,
      source,
      assignedToId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Obtiene el pipeline de ventas
   */
  @Get('pipeline')
  async getPipeline() {
    return this.leadsService.getPipeline();
  }

  /**
   * Obtiene métricas de ventas
   */
  @Get('metrics')
  async getSalesMetrics() {
    return this.leadsService.getSalesMetrics();
  }

  /**
   * Obtiene detalles de un lead
   */
  @Get(':leadId')
  async getLeadDetails(@Param('leadId') leadId: string) {
    return this.leadsService.getLeadDetails(leadId);
  }

  /**
   * Actualiza un lead
   */
  @Put(':leadId')
  async updateLead(
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.updateLead(leadId, dto);
  }

  /**
   * Agrega una nota a un lead
   */
  @Post(':leadId/notes')
  async addNote(
    @Param('leadId') leadId: string,
    @Body() dto: AddNoteDto,
    @PlatformUser() platformUser: { userId: string },
  ) {
    return this.leadsService.addNote(leadId, dto, platformUser.userId);
  }
}

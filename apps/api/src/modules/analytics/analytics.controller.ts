import { Controller, Get, UseGuards, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AnalyticsService } from './analytics.service';
import { PdfService } from './pdf.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { $Enums } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Obtiene los KPIs principales del dashboard
   */
  @Get('kpis')
  async getKPIs(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.analyticsService.getKPIs(tenant.id);
  }

  /**
   * Obtiene todas las métricas combinadas
   */
  @Get('metrics')
  async getMetrics(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getMetrics(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
      filters.agentId,
      filters.channelId,
    );
  }

  /**
   * Obtiene tendencia de conversaciones
   */
  @Get('conversations-trend')
  async getConversationsTrend(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getConversationsTrend(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
      filters.groupBy || 'day',
      filters.agentId,
      filters.channelId,
    );
  }

  /**
   * Obtiene estadísticas de mensajes
   */
  @Get('messages-stats')
  async getMessagesStats(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getMessagesStats(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
      filters.agentId,
      filters.channelId,
    );
  }

  /**
   * Obtiene tiempos de respuesta por agente
   */
  @Get('response-times')
  async getResponseTimes(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getResponseTimesByAgent(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
    );
  }

  /**
   * Obtiene métricas de conversión
   */
  @Get('conversions')
  async getConversions(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getConversionMetrics(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
    );
  }

  /**
   * Obtiene uso de agentes por canal
   */
  @Get('agents-usage')
  async getAgentsUsage(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
  ) {
    return this.analyticsService.getAgentsUsageByChannel(
      tenant.id,
      new Date(filters.startDate),
      new Date(filters.endDate),
    );
  }

  /**
   * Exporta analytics a PDF
   * Requiere email verificado
   */
  @Get('export/pdf')
  @UseGuards(EmailVerifiedGuard)
  @Roles($Enums.tenantmembership_role.OWNER, $Enums.tenantmembership_role.ADMIN)
  async exportPdf(
    @CurrentTenant() tenant: { id: string; role: string },
    @Query() filters: AnalyticsFiltersDto,
    @Res() res: Response,
  ) {
    const pdf = await this.pdfService.generateAnalyticsReport(
      tenant.id,
      filters.startDate ? new Date(filters.startDate) : undefined,
      filters.endDate ? new Date(filters.endDate) : undefined,
      filters.agentId,
      filters.channelId,
    );

    const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMarketingLeadDto } from './dto/create-marketing-lead.dto';
import { N8nEventService } from '../n8n-integration/services/n8n-event.service';
import { createData } from '../../common/prisma/create-data.helper';

@Injectable()
export class MarketingLeadsService {
  private readonly logger = new Logger(MarketingLeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nEventService: N8nEventService,
  ) {}

  async create(createLeadDto: CreateMarketingLeadDto) {
    // Crear el lead
        const lead = await this.prisma.marketinglead.create({
      data: createData({
        name: createLeadDto.name,
        email: createLeadDto.email,
        phone: createLeadDto.phone,
        company: createLeadDto.company,
        message: createLeadDto.message,
        locale: createLeadDto.locale || 'es',
        source: createLeadDto.source || 'landing',
        utmSource: createLeadDto.utmSource,
        utmMedium: createLeadDto.utmMedium,
        utmCampaign: createLeadDto.utmCampaign,
      }),
    });

    // Si hay datos de ROI, crear la estimación asociada
    if (
      createLeadDto.numPeople !== undefined &&
      createLeadDto.hoursPerWeek !== undefined &&
      createLeadDto.hourlyCost !== undefined &&
      createLeadDto.automationRate !== undefined &&
      createLeadDto.yearlyHours !== undefined &&
      createLeadDto.currentYearlyCost !== undefined &&
      createLeadDto.estimatedSavings !== undefined &&
      createLeadDto.projectBudgetMin !== undefined &&
      createLeadDto.projectBudgetMax !== undefined &&
      createLeadDto.monthlyRetainer !== undefined
    ) {
            await this.prisma.roiestimate.create({
        data: createData({
          numPeople: createLeadDto.numPeople,
          hoursPerWeek: createLeadDto.hoursPerWeek,
          hourlyCost: createLeadDto.hourlyCost,
          automationRate: createLeadDto.automationRate,
          yearlyHours: createLeadDto.yearlyHours,
          currentYearlyCost: createLeadDto.currentYearlyCost,
          estimatedSavings: createLeadDto.estimatedSavings,
          projectBudgetMin: createLeadDto.projectBudgetMin,
          projectBudgetMax: createLeadDto.projectBudgetMax,
          monthlyRetainer: createLeadDto.monthlyRetainer,
          leadId: lead.id,
        }),
      });
    }

    // Emitir evento a n8n (si hay flujos activos configurados)
    // Nota: Los leads de marketing no tienen tenantId, por lo que se emite a todos los tenants
    // que tengan flujos activos de tipo LEAD_INTAKE sin filtro de tenant
    try {
      // Buscar todos los tenants que tengan flujos activos de tipo LEAD_INTAKE
            const activeFlows = await this.prisma.n8nflow.findMany({
        where: {
          type: 'LEAD_INTAKE',
          isActive: true,
        },
        select: {
          tenantId: true,
          workflowId: true,
        },
        distinct: ['tenantId'],
      });

      // Emitir evento a cada tenant con flujos activos
      for (const flow of activeFlows) {
        await this.n8nEventService.emitNewLead(flow.tenantId, {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source,
          locale: lead.locale,
          utmSource: createLeadDto.utmSource,
          utmMedium: createLeadDto.utmMedium,
          utmCampaign: createLeadDto.utmCampaign,
        }).catch((error) => {
          this.logger.warn(`Failed to emit new_lead event to n8n for tenant ${flow.tenantId}: ${error.message}`);
        });
      }
    } catch (error) {
      // No bloquear la creación del lead si falla el evento
      this.logger.warn(`Failed to emit new_lead event to n8n: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: true,
      data: {
        id: lead.id,
        email: lead.email,
        createdAt: lead.createdAt,
      },
    };
  }
}


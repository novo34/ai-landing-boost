import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
// @ts-ignore - jsPDF types may not be available
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types may not be available
import autoTable from 'jspdf-autotable';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  async generateAnalyticsReport(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    agentId?: string,
    channelId?: string,
  ): Promise<Buffer> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Obtener branding del tenant
    const settings = await this.prisma.tenantsettings.findUnique({
      where: { tenantId },
      select: { logoUrl: true, primaryColor: true },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(50, 50, 50);
    doc.text('Reporte de Analytics', 14, yPosition);
    yPosition += 10;

    // Información del tenant y fecha
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (tenant?.name) {
      doc.text(`Tenant: ${tenant.name}`, 14, yPosition);
      yPosition += 6;
    }
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, yPosition);
    yPosition += 6;
    if (startDate && endDate) {
      doc.text(`Período: ${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`, 14, yPosition);
      yPosition += 10;
    } else {
      yPosition += 4;
    }

    // Obtener KPIs
    const kpisResult = await this.analyticsService.getKPIs(tenantId);
    const kpis = (kpisResult as { success: boolean; data: any }).data;

    // Tabla de KPIs principales
    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: [
        ['Agentes Activos', kpis.agents.active.toString()],
        ['Agentes Totales', kpis.agents.total.toString()],
        ['Canales Activos', kpis.channels.active.toString()],
        ['Canales Totales', kpis.channels.total.toString()],
        ['Conversaciones Activas', kpis.conversations.active.toString()],
        ['Conversaciones Totales', kpis.conversations.total.toString()],
        ['Mensajes Totales', kpis.message.total.toString()],
        ['Mensajes Este Mes', kpis.message.thisMonth.toString()],
        ['Tiempo Promedio de Respuesta', kpis.responseTime.formatted || 'N/A'],
      ],
      theme: 'striped',
      headStyles: { fillColor: settings?.primaryColor ? this.hexToRgb(settings.primaryColor) : [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Obtener métricas detalladas
    const metricsResult = await this.analyticsService.getMetrics(
      tenantId,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date(),
      agentId,
      channelId,
    );

    const metrics = (metricsResult as { success: boolean; data: any }).data;

    // Tabla de tendencia de conversaciones (últimos 10 días)
    if (metrics.conversationsTrend && metrics.conversationsTrend.length > 0) {
      const trendData = metrics.conversationsTrend.slice(-10).map((item: any) => [
        new Date(item.date).toLocaleDateString('es-ES'),
        item.count.toString(),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Conversaciones']],
        body: trendData,
        theme: 'striped',
        headStyles: { fillColor: settings?.primaryColor ? this.hexToRgb(settings.primaryColor) : [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla de estadísticas de mensajes
    if (metrics.messagesStats) {
      const msgStats = metrics.messagesStats;
      autoTable(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: [
          ['Mensajes Enviados', msgStats.sent?.toString() || '0'],
          ['Mensajes Recibidos', msgStats.received?.toString() || '0'],
        ],
        theme: 'striped',
        headStyles: { fillColor: settings?.primaryColor ? this.hexToRgb(settings.primaryColor) : [59, 130, 246] },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla de tiempos de respuesta por agente
    if (metrics.responseTimes && metrics.responseTimes.length > 0) {
      const responseData = metrics.responseTimes.map((item: any) => [
        item.agentName || 'N/A',
        `${item.averageMinutes?.toFixed(1) || '0'} min`,
        item.responseCount?.toString() || '0',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Agente', 'Tiempo Promedio', 'Respuestas']],
        body: responseData,
        theme: 'striped',
        headStyles: { fillColor: settings?.primaryColor ? this.hexToRgb(settings.primaryColor) : [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla de métricas de conversión
    if (metrics.conversions) {
      const conv = metrics.conversions;
      autoTable(doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor', 'Tasa']],
        body: [
          ['Leads', conv.leads?.toString() || '0', '-'],
          ['Conversaciones', conv.conversations?.toString() || '0', conv.conversionRates?.leadToConversation ? `${(conv.conversionRates.leadToConversation * 100).toFixed(1)}%` : '-'],
          ['Citas', conv.appointments?.toString() || '0', conv.conversionRates?.conversationToAppointment ? `${(conv.conversionRates.conversationToAppointment * 100).toFixed(1)}%` : '-'],
        ],
        theme: 'striped',
        headStyles: { fillColor: settings?.primaryColor ? this.hexToRgb(settings.primaryColor) : [59, 130, 246] },
        styles: { fontSize: 9 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount} - Generado por AutomAI`,
        14,
        doc.internal.pageSize.height - 10,
      );
    }

    // Convertir a Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  }

  /**
   * Convierte color hex a RGB para jsPDF
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [59, 130, 246]; // Default blue
  }
}

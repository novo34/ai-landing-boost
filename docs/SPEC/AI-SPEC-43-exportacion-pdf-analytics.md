# AI-SPEC-43: Exportación PDF de Analytics

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-43  
> **Estado:** Pendiente de Implementación

---

## Resumen Ejecutivo

Este SPEC detalla la implementación de exportación a PDF para reportes de analytics usando jsPDF y jspdf-autotable.

---

## Implementación Detallada

### 1. Instalar Dependencias

```bash
cd apps/api
npm install jspdf@^2.5.1 jspdf-autotable@^3.8.2
```

---

### 2. Crear PDFService

**Archivo:** `apps/api/src/modules/analytics/pdf.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private prisma: PrismaService) {}

  async generateAnalyticsReport(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    const doc = new jsPDF();
    
    // Obtener branding del tenant
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { logoUrl: true, primaryColor: true },
    });

    // Header con logo (si existe)
    if (settings?.logoUrl) {
      // Nota: jsPDF no soporta imágenes directamente, necesitaría convertir a base64
      // Por ahora, solo texto
      doc.setFontSize(20);
      doc.text('Reporte de Analytics', 14, 20);
    } else {
      doc.setFontSize(20);
      doc.text('Reporte de Analytics', 14, 20);
    }

    // Fecha de generación
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);

    // Obtener KPIs
    const kpis = await this.getKPIs(tenantId, startDate, endDate);

    // Agregar KPIs como tabla
    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor']],
      body: [
        ['Agentes Activos', kpis.agents.active.toString()],
        ['Canales Activos', kpis.channels.active.toString()],
        ['Conversaciones Activas', kpis.conversations.active.toString()],
        ['Mensajes Totales', kpis.messages.total.toString()],
        ['Mensajes Este Mes', kpis.messages.thisMonth.toString()],
      ],
    });

    // Convertir a Buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  private async getKPIs(tenantId: string, startDate?: Date, endDate?: Date) {
    // Lógica para obtener KPIs (similar a AnalyticsService)
    // ...
  }
}
```

---

### 3. Agregar Endpoint en AnalyticsController

```typescript
import { PdfService } from './pdf.service';
import { Response } from 'express';

@Get('export/pdf')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
@Roles(TenantRole.OWNER, TenantRole.ADMIN)
async exportPdf(
  @CurrentTenant() tenant: { id: string },
  @Query() filters: ExportAnalyticsDto,
  @Res() res: Response,
) {
  const pdf = await this.pdfService.generateAnalyticsReport(
    tenant.id,
    filters.startDate ? new Date(filters.startDate) : undefined,
    filters.endDate ? new Date(filters.endDate) : undefined,
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="analytics-report.pdf"');
  res.send(pdf);
}
```

---

## Checklist

- [ ] Instalar dependencias
- [ ] Crear PdfService
- [ ] Agregar endpoint en controller
- [ ] Agregar botón en UI
- [ ] Tests

---

**Última actualización:** 2025-01-XX


# AI-SPEC-39: Métricas Avanzadas y Analytics

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-39  
> **Prioridad:** 🟢 BAJA

---

## Arquitectura

### Módulos NestJS a Modificar

```
apps/api/src/
├── modules/
│   └── analytics/
│       ├── analytics.service.ts                   [MODIFICAR - Agregar métodos avanzados]
│       └── analytics.controller.ts                [MODIFICAR - Agregar endpoints]
```

---

## Archivos a Crear/Modificar

### 1. Expandir Analytics Service

**Archivo:** `apps/api/src/modules/analytics/analytics.service.ts`

**Acción:** Agregar métodos para métricas avanzadas

```typescript
/**
 * Obtiene tendencia de conversaciones
 */
async getConversationsTrend(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  // Implementar agregación por período
  // Retornar array de { date, count }
}

/**
 * Obtiene estadísticas de mensajes
 */
async getMessagesStats(
  tenantId: string,
  startDate: Date,
  endDate: Date,
) {
  // Contar enviados vs recibidos
  // Retornar { sent: number, received: number, byDay: Array }
}

/**
 * Obtiene tiempos de respuesta por agente
 */
async getResponseTimesByAgent(
  tenantId: string,
  startDate: Date,
  endDate: Date,
) {
  // Calcular tiempo promedio por agente
  // Retornar Array<{ agentId, agentName, averageMinutes }>
}

/**
 * Obtiene métricas de conversión
 */
async getConversionMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date,
) {
  // Calcular funnel: leads → conversaciones → citas
  // Retornar { leads, conversations, appointments, conversionRate }
}
```

---

### 2. Expandir Analytics Controller

**Archivo:** `apps/api/src/modules/analytics/analytics.controller.ts`

**Acción:** Agregar endpoints nuevos

```typescript
@Get('metrics')
async getMetrics(
  @CurrentTenant() tenant: { id: string },
  @Query() filters: AnalyticsFiltersDto,
) {
  // Llamar a múltiples métodos y combinar resultados
}

@Get('conversations-trend')
async getConversationsTrend(
  @CurrentTenant() tenant: { id: string },
  @Query() filters: AnalyticsFiltersDto,
) {
  return this.analyticsService.getConversationsTrend(
    tenant.id,
    new Date(filters.startDate),
    new Date(filters.endDate),
    filters.groupBy,
  );
}

// Similar para otros endpoints...
```

---

## Frontend - Página de Analytics

### 3. Crear Página de Analytics

**Archivo:** `apps/web/app/app/analytics/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n/client';
import { Download } from 'lucide-react';

export default function AnalyticsPage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    agentId: 'all',
    channelId: 'all',
  });
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAnalyticsMetrics(filters);
      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleExport = async (format: 'pdf' | 'csv') => {
    const response = await apiClient.exportAnalytics(format, filters);
    if (response.success && response.data) {
      // Descargar archivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('analytics.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            {t('analytics.export_csv')}
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            {t('analytics.export_pdf')}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t('analytics.start_date')}</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('analytics.end_date')}</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            {/* Más filtros... */}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      {data && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.conversations_trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.conversationsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Más gráficos... */}
        </div>
      )}
    </div>
  );
}
```

---

## DTOs

### AnalyticsFiltersDto

**Archivo:** `apps/api/src/modules/analytics/dto/analytics-filters.dto.ts`

```typescript
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class AnalyticsFiltersDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}
```

---

## Validaciones

- **Fechas:** Validar que startDate < endDate
- **Rango:** Limitar rango máximo (ej: 1 año)
- **Permisos:** Todos los roles pueden ver analytics

---

## Errores Esperados

```typescript
- 'analytics.invalid_date_range'
- 'analytics.range_too_large'
- 'analytics.calculation_failed'
```

---

## Test Plan

### Unit Tests

1. **AnalyticsService:**
   - Métodos calculan métricas correctamente
   - Filtros funcionan correctamente
   - Agregaciones por período funcionan

### Integration Tests

1. **Flujo completo:**
   - Crear datos de prueba
   - Llamar a endpoints
   - Verificar que métricas coinciden

---

## Checklist Final

- [ ] AnalyticsService expandido
- [ ] AnalyticsController expandido
- [ ] DTOs creados
- [ ] Página de analytics creada
- [ ] Gráficos implementados (recharts)
- [ ] Filtros funcionan
- [ ] Exportación PDF implementada
- [ ] Exportación CSV implementada
- [ ] Cliente API actualizado
- [ ] Traducciones agregadas
- [ ] Tests escritos

---

## Dependencias de Paquetes

```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.0"
  }
}
```

---

**Última actualización:** 2025-01-XX


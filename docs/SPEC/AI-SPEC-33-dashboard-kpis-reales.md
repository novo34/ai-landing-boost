# AI-SPEC-33: KPIs Reales en Dashboard

> **Versión:** 1.0  
> **Fecha:** 2025-01-XX  
> **PRD Relacionado:** PRD-33  
> **Prioridad:** 🟡 MEDIA

---

## Arquitectura

### Módulos NestJS a Crear/Modificar

```
apps/api/src/
├── modules/
│   ├── analytics/
│   │   ├── analytics.module.ts                    [CREAR]
│   │   ├── analytics.service.ts                   [CREAR]
│   │   ├── analytics.controller.ts                [CREAR]
│   │   └── dto/
│   │       └── kpis-response.dto.ts              [CREAR]
└── prisma/
    └── schema.prisma                              [SIN CAMBIOS]
```

---

## Archivos a Crear/Modificar

### 1. Crear Analytics Module

**Archivo:** `apps/api/src/modules/analytics/analytics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

---

### 2. Crear Analytics Service

**Archivo:** `apps/api/src/modules/analytics/analytics.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene los KPIs principales del tenant
   */
  async getKPIs(tenantId: string) {
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

      return {
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
          messages: {
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
    } catch (error) {
      this.logger.error(`Error calculating KPIs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Obtiene el total de leads
   */
  private async getLeadsTotal(tenantId: string): Promise<number> {
    return this.prisma.marketingLead.count({
      where: { tenantId },
    });
  }

  /**
   * Obtiene los leads del mes actual
   */
  private async getLeadsThisMonth(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.marketingLead.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });
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
   */
  private async getResponseMetrics(tenantId: string): Promise<{
    averageMinutes: number;
    averageHours: number;
    formatted: string;
  }> {
    // Obtener conversaciones con al menos 2 mensajes (pregunta + respuesta)
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 2, // Solo necesitamos el primero y segundo mensaje
        },
      },
    });

    const responseTimes: number[] = [];

    for (const conversation of conversations) {
      if (conversation.messages.length < 2) continue;

      const firstMessage = conversation.messages[0];
      const secondMessage = conversation.messages[1];

      // Solo considerar si el segundo mensaje es una respuesta (no del mismo sender)
      if (firstMessage.senderType === 'USER' && secondMessage.senderType === 'AGENT') {
        const timeDiff = secondMessage.createdAt.getTime() - firstMessage.createdAt.getTime();
        const minutes = timeDiff / (1000 * 60);
        responseTimes.push(minutes);
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
}
```

---

### 3. Crear Analytics Controller

**Archivo:** `apps/api/src/modules/analytics/analytics.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextGuard } from '../../common/guards/tenant-context.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantContextGuard, RbacGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Obtiene los KPIs principales del dashboard
   */
  @Get('kpis')
  async getKPIs(@CurrentTenant() tenant: { id: string; role: string }) {
    return this.analyticsService.getKPIs(tenant.id);
  }
}
```

---

### 4. Actualizar App Module

**Archivo:** `apps/api/src/app.module.ts`

**Acción:** Agregar `AnalyticsModule` a imports

```typescript
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // ... otros módulos
    AnalyticsModule,
  ],
})
export class AppModule {}
```

---

## Frontend - Actualizar Dashboard

### 5. Agregar Método al Cliente API

**Archivo:** `apps/web/lib/api/client.ts`

**Acción:** Agregar método para obtener KPIs

```typescript
/**
 * Obtiene los KPIs del dashboard
 */
async getKPIs(): Promise<ApiResponse<{
  leads: { total: number; thisMonth: number };
  agents: { active: number; total: number };
  channels: { active: number; total: number };
  conversations: { active: number; total: number };
  messages: { total: number; thisMonth: number };
  responseRate: { averageMinutes: number; averageHours: number; formatted: string };
  responseTime: { averageMinutes: number; formatted: string };
}>> {
  return this.get('/analytics/kpis');
}
```

---

### 6. Actualizar Página del Dashboard

**Archivo:** `apps/web/app/app/page.tsx`

**Acción:** Reemplazar valores hardcodeados con datos reales

```typescript
// Agregar estado para KPIs
const [kpis, setKPIs] = useState<{
  leads: { total: number; thisMonth: number };
  agents: { active: number; total: number };
  channels: { active: number; total: number };
  conversations: { active: number; total: number };
  messages: { total: number; thisMonth: number };
  responseRate: { averageMinutes: number; formatted: string };
  responseTime: { averageMinutes: number; formatted: string };
} | null>(null);

// En loadDashboardData, agregar:
const kpisResponse = await apiClient.getKPIs();
if (kpisResponse.success && kpisResponse.data) {
  setKPIs(kpisResponse.data);
}

// Reemplazar valores hardcodeados:
// Antes: <CardTitle className="text-3xl">0</CardTitle>
// Después: <CardTitle className="text-3xl">{kpis?.leads.total || 0}</CardTitle>
```

---

## DTOs

No se requieren DTOs adicionales. La respuesta sigue el formato estándar `ApiResponse`.

---

## Validaciones

- **Autenticación:** Solo usuarios autenticados pueden acceder
- **Tenant Context:** Solo se calculan KPIs del tenant del usuario
- **Permisos:** Todos los roles pueden ver KPIs (son datos de solo lectura)

---

## Errores Esperados

```typescript
- 'analytics.calculation_failed' - Error al calcular métricas
- 'analytics.database_error' - Error de base de datos
```

---

## Test Plan

### Unit Tests

1. **AnalyticsService:**
   - `getKPIs` devuelve datos correctos
   - `getLeadsTotal` cuenta leads correctamente
   - `getAgentsActive` cuenta solo agentes activos
   - `getResponseMetrics` calcula tiempos correctamente
   - Manejo de casos sin datos (devuelve 0)

### Integration Tests

1. **Flujo completo:**
   - Crear datos de prueba (leads, agentes, canales, conversaciones, mensajes)
   - Llamar a endpoint `/analytics/kpis`
   - Verificar que los números coinciden con los datos creados

---

## Checklist Final

- [ ] AnalyticsModule creado
- [ ] AnalyticsService implementado
- [ ] AnalyticsController creado
- [ ] AppModule actualizado
- [ ] Cliente API actualizado
- [ ] Dashboard UI actualizado
- [ ] Tests unitarios escritos
- [ ] Tests de integración escritos
- [ ] Manejo de errores implementado
- [ ] Estados de carga implementados

---

## Optimizaciones Futuras

- Implementar caché Redis (ver PRD-41: Caché y Optimización)
- Agregar índices en BD si es necesario
- Considerar materialized views para métricas complejas

---

**Última actualización:** 2025-01-XX

